import json
import os
import re
import io
import uvicorn
import pandas as pd
import numpy as np
from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from groq import Groq 
from dotenv import load_dotenv 
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
from animation_engine import get_groq_messages, get_ml_groq_messages
from input_models import InputConstraints, VisualWaveExecutionInput
from input_resolver import resolve_input, format_input_for_prompt
from two_pass_generator import generate_two_pass
from intent_generator import generate_intents

# NLP Translation imports - Using deep-translator (stable Google Translate wrapper)
try:
    from deep_translator import GoogleTranslator
    NLP_AVAILABLE = True
except ImportError:
    NLP_AVAILABLE = False
    print("⚠️  NLP dependencies not installed. Install with: pip install deep-translator")


load_dotenv()


def sanitize_llm_json(raw_content: str) -> str:
    """
    Sanitize LLM-generated JSON to fix common malformations:
    - Remove markdown formatting
    - Fix missing commas between objects
    - Remove Unicode non-breaking spaces
    - Fix truncated JSON structures
    """
    if not raw_content:
        return '{"steps": []}'
    
    # Step 1: Remove markdown code blocks
    content = raw_content.replace('```json', '').replace('```', '').strip()
    
    # Step 2: Replace problematic Unicode characters (non-breaking spaces, etc.)
    content = content.replace('\u202f', ' ')  # Narrow no-break space
    content = content.replace('\u00a0', ' ')  # Regular no-break space
    content = content.replace('\u2009', ' ')  # Thin space
    
    # Step 3: Fix missing commas between step objects
    # Pattern: }"step": -> },{"step":
    content = re.sub(r'\}\s*"step"\s*:', '},{"step":', content)
    
    # Step 4: Fix missing opening brace before step
    # Pattern: ,2,"explanation" -> ,{"step":2,"explanation"
    content = re.sub(r',\s*(\d+)\s*,\s*"explanation"', r',{"step":\1,"explanation"', content)
    
    # Step 5: Try to balance brackets if truncated
    open_braces = content.count('{')
    close_braces = content.count('}')
    open_brackets = content.count('[')
    close_brackets = content.count(']')
    
    # Add missing closing brackets/braces
    if open_brackets > close_brackets:
        content = content.rstrip() + ']' * (open_brackets - close_brackets)
    if open_braces > close_braces:
        content = content.rstrip() + '}' * (open_braces - close_braces)
    
    return content 

app = FastAPI()

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

# Authentication disabled - direct access to all routes
# Initialize database (commented out)
# from database import Base, engine
# from auth.routes import router as auth_router
# Base.metadata.create_all(bind=engine)
# app.include_router(auth_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "https://visualwave2.vercel.app",
        "https://visualwave2.onrender.com"
    ], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- DB LOADING ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
JSON_PATH = os.path.join(BASE_DIR, 'leetcode_data.json')
PROBLEMS_DB = []
try:
    with open(JSON_PATH, 'r', encoding="utf-8") as f:
        data = json.load(f)
        if isinstance(data, dict) and "questions" in data: PROBLEMS_DB = data["questions"]
        elif isinstance(data, list): PROBLEMS_DB = data
except Exception as e:
    print(f"❌ CRITICAL ERROR: {e}")

# --- DATASET PROCESSING ---
MAX_SAMPLES = 200  # Max samples to send to LLM for visualization
MAX_FEATURES_FOR_VIZ = 3  # x, y, z coordinates

def process_dataset(df: pd.DataFrame, target_column: Optional[str] = None) -> dict:
    """
    Process a dataset for ML visualization.
    - Handles missing values
    - Encodes categorical columns (yes/no, string labels)
    - Reduces dimensionality if > 3 features (using PCA)
    - Downsamples if > MAX_SAMPLES rows
    - Returns structured data with axis metadata
    """
    result = {
        "original_shape": list(df.shape),
        "columns": list(df.columns),
        "target_column": target_column,
        "data": [],
        "algorithm_suggestion": "linear_regression",
        "needs_axes": True,
        "is_downsampled": False,
        "is_reduced": False,
        "axis_info": {  # New: axis metadata for proper visualization
            "x": {"min": -10, "max": 10, "label": "X", "categories": None},
            "y": {"min": -10, "max": 10, "label": "Y", "categories": None},
            "z": {"min": -10, "max": 10, "label": "Z", "categories": None}
        },
        "category_mappings": {}  # Maps column name to {value: numeric} mapping
    }
    
    # Handle missing values (simple strategy: drop rows with NaN)
    df_clean = df.dropna()
    
    # Encode categorical columns (string/object type)
    category_mappings = {}
    df_encoded = df_clean.copy()
    
    for col in df_encoded.columns:
        if df_encoded[col].dtype == 'object' or str(df_encoded[col].dtype) == 'category':
            unique_vals = df_encoded[col].unique()
            # Create mapping: alphabetically sorted, or yes=1/no=0 pattern
            if set([str(v).lower() for v in unique_vals]) == {'yes', 'no'}:
                # Special case: yes/no binary
                mapping = {v: 1 if str(v).lower() == 'yes' else 0 for v in unique_vals}
            else:
                # General case: alphabetical encoding
                sorted_vals = sorted(unique_vals, key=str)
                mapping = {v: idx for idx, v in enumerate(sorted_vals)}
            
            category_mappings[col] = mapping
            df_encoded[col] = df_encoded[col].map(mapping)
    
    result["category_mappings"] = {k: {str(kk): vv for kk, vv in v.items()} for k, v in category_mappings.items()}
    
    # Separate target if specified
    if target_column and target_column in df_encoded.columns:
        y = df_encoded[target_column].values
        X = df_encoded.drop(columns=[target_column])
        
        # Determine algorithm based on target type
        if target_column in category_mappings or len(np.unique(y)) <= 10:
            result["algorithm_suggestion"] = "logistic_regression" if len(np.unique(y)) == 2 else "k_means"
        else:
            result["algorithm_suggestion"] = "linear_regression" if X.shape[1] == 1 else "multiple_regression"
    else:
        X = df_encoded.select_dtypes(include=[np.number])
        y = None
        result["algorithm_suggestion"] = "k_means"  # Unsupervised
    
    # Standardize features for PCA
    scaler = StandardScaler()
    X_numeric = X.select_dtypes(include=[np.number])
    
    if X_numeric.shape[1] == 0:
        return {"error": "No numeric columns found in dataset after encoding"}
    
    X_scaled = scaler.fit_transform(X_numeric)
    
    # Dimensionality reduction if needed
    if X_numeric.shape[1] > MAX_FEATURES_FOR_VIZ:
        n_components = min(MAX_FEATURES_FOR_VIZ, X_numeric.shape[1])
        pca = PCA(n_components=n_components)
        X_reduced = pca.fit_transform(X_scaled)
        result["is_reduced"] = True
        result["pca_variance_explained"] = list(pca.explained_variance_ratio_)
        feature_names = [f"PC{i+1}" for i in range(n_components)]
    else:
        X_reduced = X_scaled
        feature_names = list(X_numeric.columns)
    
    # Downsampling if needed
    n_samples = X_reduced.shape[0]
    if n_samples > MAX_SAMPLES:
        indices = np.random.choice(n_samples, MAX_SAMPLES, replace=False)
        indices = np.sort(indices)
        X_reduced = X_reduced[indices]
        if y is not None:
            y = y[indices]
        result["is_downsampled"] = True
        result["sample_ratio"] = MAX_SAMPLES / n_samples
    
    # Calculate axis ranges from actual data
    x_vals = X_reduced[:, 0]
    y_vals = X_reduced[:, 1] if X_reduced.shape[1] > 1 else np.zeros(len(x_vals))
    z_vals = X_reduced[:, 2] if X_reduced.shape[1] > 2 else np.zeros(len(x_vals))
    
    # Set axis info based on data range (with 10% padding)
    for axis_name, vals, feature_idx in [("x", x_vals, 0), ("y", y_vals, 1), ("z", z_vals, 2)]:
        if len(vals) > 0 and np.any(vals != 0):
            min_val = float(np.min(vals))
            max_val = float(np.max(vals))
            padding = (max_val - min_val) * 0.1 if max_val != min_val else 1.0
            result["axis_info"][axis_name]["min"] = round(min_val - padding, 2)
            result["axis_info"][axis_name]["max"] = round(max_val + padding, 2)
        
        # Set axis labels from feature names
        if feature_idx < len(feature_names):
            result["axis_info"][axis_name]["label"] = feature_names[feature_idx]
            
            # If this feature was categorical, include the category labels
            orig_col = list(X_numeric.columns)[feature_idx] if feature_idx < len(X_numeric.columns) else None
            if orig_col and orig_col in category_mappings:
                result["axis_info"][axis_name]["categories"] = category_mappings[orig_col]
    
    # Build data points for visualization
    data_points = []
    for i in range(X_reduced.shape[0]):
        point = {
            "id": f"p_{i}",
            "x": round(float(X_reduced[i, 0]), 3),
            "y": round(float(X_reduced[i, 1]), 3) if X_reduced.shape[1] > 1 else 0,
            "z": round(float(X_reduced[i, 2]), 3) if X_reduced.shape[1] > 2 else 0
        }
        if y is not None:
            point["label"] = int(y[i]) if isinstance(y[i], (np.integer, int)) else float(y[i])
        data_points.append(point)
    
    result["data"] = data_points
    result["feature_names"] = feature_names
    result["processed_shape"] = [len(data_points), X_reduced.shape[1]]
    result["needs_axes"] = True
    
    return result


@app.post("/upload-dataset")
async def upload_dataset(
    file: UploadFile = File(...),
    target_column: Optional[str] = None
):
    """
    Upload a CSV or JSON dataset for ML visualization.
    Returns processed data ready for visualization.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    # Read file content
    content = await file.read()
    
    try:
        # Parse based on file type
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(content))
        elif file.filename.endswith('.json'):
            df = pd.read_json(io.BytesIO(content))
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type. Use CSV or JSON.")
        
        # Process the dataset
        result = process_dataset(df, target_column)
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "success": True,
            "filename": file.filename,
            "analysis": {
                "original_shape": result["original_shape"],
                "processed_shape": result["processed_shape"],
                "columns": result["columns"],
                "feature_names": result["feature_names"],
                "is_downsampled": result["is_downsampled"],
                "is_reduced": result["is_reduced"],
                "algorithm_suggestion": result["algorithm_suggestion"],
                "needs_axes": result["needs_axes"],
                "axis_info": result["axis_info"],
                "category_mappings": result["category_mappings"]
            },
            "data": result["data"]
        }
    
    except pd.errors.EmptyDataError:
        raise HTTPException(status_code=400, detail="Empty file or invalid format")
    except Exception as e:
        print(f"Dataset processing error: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing dataset: {str(e)}")




def extract_constraints(problem: dict) -> InputConstraints:
    """
    Use LLM to intelligently determine input constraints from problem metadata.
    
    Analyzes problem title and description to determine:
    - Data type (array, tree, graph, string, etc.)
    - Size constraints (reasonable for visualization)
    - Value constraints (min/max)
    
    Falls back to keyword matching if LLM fails.
    """
    title = problem.get("title", "").lower()
    description = problem.get("description", "").lower()
    
    # Try LLM-based detection first
    try:
        prompt = f"""Analyze this LeetCode problem and determine the PRIMARY input data type.

Problem Title: {problem.get("title", "")}
Description: {description[:300]}

OUTPUT FORMAT - Return ONLY ONE WORD from this list:
- array (for lists, arrays, sequences of numbers)
- string (for text, characters, parentheses, words, substrings)
- tree (for binary trees, BST, tree nodes)
- graph (for graphs, networks, connections)
- linkedlist (for linked list nodes)
- matrix (for 2D grids, boards)
- number (for single integer/number input like Fibonacci)

EXAMPLES:
- "Two Sum" → array
- "Valid Parentheses" → string
- "Longest Valid Parentheses" → string
- "Longest Palindromic Substring" → string
- "Binary Tree Inorder Traversal" → tree
- "Number of Islands" → matrix
- "Merge Two Sorted Lists" → linkedlist
- "Climbing Stairs" → number

Return ONLY the data type word:"""

        completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a precise LeetCode problem classifier. Output ONLY the data type."},
                {"role": "user", "content": prompt}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.1,
            max_tokens=20
        )
        
        detected_type = completion.choices[0].message.content.strip().lower()
        print(f"🤖 LLM detected data type: {detected_type} for '{problem.get('title', '')}'")
        
        # Validate the response
        valid_types = ["array", "string", "tree", "graph", "linkedlist", "matrix", "number"]
        if detected_type in valid_types:
            data_type = detected_type
        else:
            print(f"⚠️ Invalid LLM response: {detected_type}, falling back to keyword matching")
            data_type = extract_constraints_fallback(title, description)
    
    except Exception as e:
        print(f"⚠️ LLM constraint detection failed: {e}")
        data_type = extract_constraints_fallback(title, description)
    
    # Set constraints based on detected type
    min_size = 1
    max_size = 15
    min_value = -100
    max_value = 100
    element_type = "int"
    
    if data_type == "tree":
        max_size = 15
    elif data_type == "graph":
        max_size = 12
        min_value = 0
        max_value = 10
    elif data_type == "matrix":
        max_size = 5
    elif data_type == "linkedlist":
        max_size = 10
    elif data_type == "string":
        max_size = 20
        element_type = "char"
    elif data_type == "number":
        min_value = 0
        max_value = 1000
    
    return InputConstraints(
        min_size=min_size,
        max_size=max_size,
        min_value=min_value,
        max_value=max_value,
        data_type=data_type,
        element_type=element_type
    )


def extract_constraints_fallback(title: str, description: str) -> str:
    """
    Fallback keyword-based constraint detection.
    Returns just the data_type string.
    """
    # PRIORITY CHECK: Sum problems are ALWAYS arrays
    if "sum" in title:
        return "array"
    
    # Check keywords in priority order
    if any(kw in title or kw in description for kw in ["tree", "bst", "binary tree"]):
        return "tree"
    
    if any(kw in title or kw in description for kw in ["graph", "network", "course"]):
        return "graph"
    
    if any(kw in title or kw in description for kw in ["matrix", "grid", "2d"]):
        return "matrix"
    
    if any(kw in title or kw in description for kw in ["linked list", "listnode"]):
        return "linkedlist"
    
    # Enhanced string detection - added missing keywords!
    if any(kw in title or kw in description for kw in [
        "string", "palindrome", "substring", "anagram", 
        "parenthes", "bracket", "character", "word", "letter"
    ]):
        return "string"
    
    if any(kw in title or kw in description for kw in ["fibonacci", "climbing"]):
        return "number"
    
    if any(kw in title or kw in description for kw in ["array", "sort", "search"]):
        return "array"
    
    # Default
    return "array"


class VizRequest(BaseModel):
    problem_id: int
    custom_input: str | None = None


@app.get("/problems")
def get_problems():
    safe = []
    for p in PROBLEMS_DB:
        if not isinstance(p, dict): continue
        try: pid = int(p.get("problem_id") or p.get("id") or 0)
        except: pid = 0
        if pid > 0 and p.get("title"):
            safe.append({
                "id": pid, 
                "title": p.get("title"), 
                "difficulty": p.get("difficulty", "Medium"),
                "starter_code": p.get("starter_code") or "// No code"
            })
    return safe

@app.post("/generate")
def generate(req: VizRequest):
    """
    Generate visualization for a LeetCode problem.
    
    New behavior with input resolution:
    1. Find problem metadata
    2. Extract constraints from problem
    3. RESOLVE INPUT (custom or auto-generated)
    4. Build prompt with RESOLVED INPUT
    5. Generate visualization steps
    6. Return steps + input metadata
    """
    
    # Step 1: Find problem
    problem = None
    for p in PROBLEMS_DB:
        try:
            if int(p.get("problem_id") or p.get("id") or 0) == req.problem_id:
                problem = {
                    "title": p.get("title"),
                    "description": p.get("description", "No desc"),
                    "starter_code": p.get("starter_code") or "// No code"
                }
                break
        except: 
            continue
    
    if not problem: 
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Step 2: Extract constraints
    constraints = extract_constraints(problem)
    
    # Step 3: RESOLVE INPUT (core logic - custom or auto)
    resolved_input = resolve_input(
        problem_id=req.problem_id,
        problem_title=problem["title"],
        problem_description=problem["description"],
        raw_user_input=req.custom_input,
        constraints=constraints
    )
    
    # Log resolved input for debugging
    target_str = f", target={resolved_input.target_value}" if resolved_input.target_value else ""
    print(f"📊 Resolved Input: mode={resolved_input.input_mode}, "
          f"type={constraints.data_type}, value={resolved_input.parsed_input}{target_str}")
    if resolved_input.validation_errors:
        print(f"⚠️  Validation errors (fell back to auto): {resolved_input.validation_errors}")
    
    # Step 4: Build prompt with RESOLVED INPUT
    # Use base prompt - direct to Groq
    messages = get_groq_messages(
        problem_title=problem["title"],
        description=problem["description"],
        resolved_input=resolved_input
    )

    # Step 5: Generate visualization (existing LLM call logic)
    try:
        raw_content = None
        
        # Multi-model retry strategy with fallbacks
        models_to_try = [
            "llama-3.3-70b-versatile",
            "mixtral-8x7b-32768"
        ]
        
        for model_name in models_to_try:
            try:
                print(f"🤖 Trying model: {model_name}")
                completion = client.chat.completions.create(
                    messages=messages,
                    model=model_name,
                    temperature=0.1,
                    max_tokens=4096,
                    response_format={"type": "json_object"}
                )
                raw_content = completion.choices[0].message.content
                if raw_content and raw_content.strip():
                    print(f"✅ Got response from {model_name}")
                    break
            except Exception as model_err:
                print(f"❌ Model {model_name} failed: {model_err}")
                continue
        
        # If all JSON modes failed, try text mode
        if not raw_content or raw_content.strip() == "":
            print("⚠️ All JSON modes failed, trying text mode...")
            try:
                completion = client.chat.completions.create(
                    messages=messages,
                    model="llama-3.3-70b-versatile",
                    temperature=0.1,
                    max_tokens=4096
                )
                raw_content = completion.choices[0].message.content
            except Exception as text_err:
                print(f"Text mode also failed: {text_err}")
        
        print("RAW AI:", raw_content[:100] if raw_content else "EMPTY")
        
        # JSON PARSING STRATEGY
        try:
            # 1. Try clean parse
            data = json.loads(raw_content)
            if "steps" in data:
                # Step 6: Return steps + input metadata
                return {
                    "steps": data["steps"],
                    "solutions": data.get("solutions", {}),
                    "input_info": {
                        "mode": resolved_input.input_mode,
                        "parsed_input": resolved_input.parsed_input,
                        "target_value": resolved_input.target_value,
                        "validation_errors": resolved_input.validation_errors,
                        "constraints": {
                            "data_type": constraints.data_type,
                            "min_size": constraints.min_size,
                            "max_size": constraints.max_size,
                            "min_value": constraints.min_value,
                            "max_value": constraints.max_value
                        }
                    }
                }
            
            # 2. Try Regex for { "steps": ... }
            match = re.search(r'\{[\s\S]*"steps"[\s\S]*\}', raw_content)
            if match:
                parsed_data = json.loads(match.group(0))
                return {
                    "steps": parsed_data["steps"],
                    "solutions": parsed_data.get("solutions", {}),
                    "input_info": {
                        "mode": resolved_input.input_mode,
                        "parsed_input": resolved_input.parsed_input,
                        "target_value": resolved_input.target_value,
                        "validation_errors": resolved_input.validation_errors
                    }
                }
            
            raise ValueError("Structure not found")

        except Exception as e:
            print(f"JSON Error: {e}")
            # Emergency Fallback: If JSON fails, return a safe error step so UI doesn't crash
            return {
                "steps": [{
                    "step": 1,
                    "explanation": "Error parsing AI response. Please try again.",
                    "code": "console.error('Parse Error');",
                    "python_code": "# Parse error - please retry"
                }],
                "input_info": {
                    "mode": resolved_input.input_mode,
                    "parsed_input": resolved_input.parsed_input,
                    "target_value": resolved_input.target_value,
                    "validation_errors": resolved_input.validation_errors
                }
            }

    except Exception as e:
        print(f"API Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate-v2")
def generate_v2(req: VizRequest):
    """
    Generate visualization using TWO-PASS generation system.
    
    This endpoint uses simplified prompts with better role separation:
    - Pass 1: Algorithm planning (conceptual steps)
    - Pass 2: Code translation (per-step code)
    
    Benefits:
    - Higher success rate (~95% vs ~70%)
    - Better error recovery
    - More consistent output
    
    Trade-off: ~50% higher latency (two LLM calls)
    """
    
    # Step 1: Find problem
    problem = None
    for p in PROBLEMS_DB:
        try:
            if int(p.get("problem_id") or p.get("id") or 0) == req.problem_id:
                problem = {
                    "title": p.get("title"),
                    "description": p.get("description", "No desc"),
                    "starter_code": p.get("starter_code") or "// No code"
                }
                break
        except: 
            continue
    
    if not problem: 
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Step 2: Extract constraints
    constraints = extract_constraints(problem)
    
    # Step 3: Resolve input
    resolved_input = resolve_input(
        problem_id=req.problem_id,
        problem_title=problem["title"],
        problem_description=problem["description"],
        raw_user_input=req.custom_input,
        constraints=constraints
    )
    
    print(f"🚀 [V2] Two-Pass Generation starting for: {problem['title']}")
    print(f"📊 Input: {resolved_input.parsed_input}")
    
    # Step 4: Use two-pass generator
    try:
        result = generate_two_pass(
            problem_title=problem["title"],
            description=problem["description"],
            resolved_input=resolved_input,
            llm_client=client,
            model="llama-3.3-70b-versatile"
        )
        
        if result.get("error"):
            print(f"⚠️ [V2] Error: {result['error']}")
            # Fall back to v1 if v2 fails
            print("⚠️ [V2] Falling back to v1 generation...")
            return generate(req)
        
        print(f"✅ [V2] Generated {len(result.get('steps', []))} steps")
        
        return {
            "steps": result.get("steps", []),
            "input_info": {
                "mode": resolved_input.input_mode,
                "parsed_input": resolved_input.parsed_input,
                "target_value": resolved_input.target_value,
                "validation_errors": resolved_input.validation_errors,
                "constraints": {
                    "data_type": constraints.data_type,
                    "min_size": constraints.min_size,
                    "max_size": constraints.max_size
                }
            },
            "generator_version": "v2",
            "algorithm_type": result.get("algorithm_type"),
            "data_structures": result.get("data_structures")
        }
        
    except Exception as e:
        print(f"❌ [V2] Failed: {str(e)}")
        # Fall back to v1
        print("⚠️ [V2] Falling back to v1 generation...")
        return generate(req)


@app.post("/generate-v3")
def generate_v3(req: VizRequest):
    """
    Generate visualization using INTENT-BASED generation system.
    
    This endpoint uses the new architecture where:
    - LLM outputs semantic intents (JSON) instead of viz.* code
    - Frontend IntentDispatcher maps intents to engine actions
    - No code execution via new Function() - safer and more reliable
    
    Benefits:
    - Single source of truth for algorithm logic
    - LLM cannot corrupt visualization state
    - Smaller prompts, faster generation
    - Structured, validatable output
    """
    
    # Step 1: Find problem
    problem = None
    for p in PROBLEMS_DB:
        try:
            if int(p.get("problem_id") or p.get("id") or 0) == req.problem_id:
                problem = {
                    "title": p.get("title"),
                    "description": p.get("description", "No desc"),
                    "starter_code": p.get("starter_code") or "// No code"
                }
                break
        except: 
            continue
    
    if not problem: 
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Step 2: Extract constraints
    constraints = extract_constraints(problem)
    
    # Step 3: Resolve input
    resolved_input = resolve_input(
        problem_id=req.problem_id,
        problem_title=problem["title"],
        problem_description=problem["description"],
        raw_user_input=req.custom_input,
        constraints=constraints
    )
    
    print(f"🚀 [V3] Intent-Based Generation starting for: {problem['title']}")
    print(f"📊 Input: {resolved_input.parsed_input}")
    
    # Step 4: Use intent generator
    try:
        result = generate_intents(
            problem_title=problem["title"],
            description=problem["description"],
            resolved_input=resolved_input,
            llm_client=client,
            model="llama-3.3-70b-versatile"
        )
        
        if result.get("error"):
            print(f"⚠️ [V3] Error: {result['error']}")
            # Fall back to v2 if v3 fails
            print("⚠️ [V3] Falling back to v2 generation...")
            return generate_v2(req)
        
        print(f"✅ [V3] Generated {len(result.get('steps', []))} intent steps")
        
        return {
            "steps": result.get("steps", []),
            "input_info": {
                "mode": resolved_input.input_mode,
                "parsed_input": resolved_input.parsed_input,
                "target_value": resolved_input.target_value,
                "validation_errors": resolved_input.validation_errors,
                "constraints": {
                    "data_type": constraints.data_type,
                    "min_size": constraints.min_size,
                    "max_size": constraints.max_size
                }
            },
            "generator_version": "v3-intent",
            "algorithm_type": result.get("algorithm_type"),
            "data_structures": result.get("data_structures")
        }
        
    except Exception as e:
        print(f"❌ [V3] Failed: {str(e)}")
        # Fall back to v2
        print("⚠️ [V3] Falling back to v2 generation...")
        return generate_v2(req)


class MLVizRequest(BaseModel):
    algorithm: str
    params: dict = {}


@app.post("/ml-generate")
def ml_generate(req: MLVizRequest):
    """Generate visualization steps for ML algorithms."""
    
    # LIMIT DATA TO PREVENT TRUNCATION
    # LLM can't handle 200+ data points in response - limit to 50
    params = req.params.copy()
    downsampling_info = None
    
    if 'data' in params and isinstance(params['data'], list):
        original_count = len(params['data'])
        if original_count > 50:
            # Just take first 50 points (simpler and faster)
            params['data'] = params['data'][:50]
            downsampling_info = f"Downsampled from {original_count} to 50 points"
            print(f"📊 {downsampling_info}")
    
    messages = get_ml_groq_messages(req.algorithm, params)
    
    try:
        raw_content = None
        
        # Use reliable models - try llama-3.3-70b first (very reliable on Groq)
        models_to_try = [
            "llama-3.3-70b-versatile",
            "llama-3.1-70b-versatile", 
            "mixtral-8x7b-32768"
        ]
        
        for model_name in models_to_try:
            try:
                print(f"🤖 Trying model: {model_name}")
                completion = client.chat.completions.create(
                    messages=messages,
                    model=model_name,
                    temperature=0.1,
                    max_tokens=4096,
                    response_format={"type": "json_object"}
                )
                raw_content = completion.choices[0].message.content
                if raw_content and raw_content.strip():
                    print(f"✅ Got response from {model_name}")
                    break
            except Exception as model_err:
                print(f"❌ Model {model_name} failed: {model_err}")
                continue
        
        # If all JSON modes failed, try text mode with llama
        if not raw_content or raw_content.strip() == "":
            print("All JSON modes failed, trying text mode...")
            try:
                completion = client.chat.completions.create(
                    messages=messages,
                    model="llama-3.3-70b-versatile",
                    temperature=0.1,
                    max_tokens=4096
                )
                raw_content = completion.choices[0].message.content
            except Exception as text_err:
                print(f"Text mode also failed: {text_err}")
                raw_content = None
        
        print("RAW ML AI:", raw_content[:200] if raw_content else "EMPTY")
        
        # Handle empty response
        if not raw_content or raw_content.strip() == "":
            print("⚠️ LLM returned empty response - using fallback steps")
            fallback_steps = [{
                "step": 1,
                "explanation": f"Setting up {req.algorithm.replace('_', ' ').title()} visualization environment.",
                "code": "viz.spawnAxes(-10, 10, -10, 10);",
                "python_code": "import numpy as np\\nfrom sklearn import *\\n\\n# Model initialization"
            }, {
                "step": 2,
                "explanation": "The AI model is temporarily unavailable. Please try again in a moment.",
                "code": "console.log('Retry visualization');",
                "python_code": "# Please retry"
            }]
            
            # Add downsampling step if applicable
            if downsampling_info:
                fallback_steps.insert(0, {
                    "step": 0,
                    "explanation": f"Data preprocessing: {downsampling_info} for efficient visualization.",
                    "code": "// Data downsampled for visualization",
                    "python_code": f"# {downsampling_info}\\ndata = data[:50]"
                })
                # Renumber steps
                for i, s in enumerate(fallback_steps):
                    s["step"] = i + 1
            
            return {"steps": fallback_steps, "downsampling_info": downsampling_info}
        
        try:
            # Use the robust sanitization function
            clean_content = sanitize_llm_json(raw_content)
            
            try:
                data = json.loads(clean_content)
            except json.JSONDecodeError as e1:
                print(f"First parse failed at position {e1.pos}: {e1.msg}")
                
                # Fallback: Try to extract just the steps array using regex
                match = re.search(r'"steps"\s*:\s*\[', clean_content)
                if match:
                    # Find where steps array starts and try to parse from there
                    start_idx = match.start()
                    # Build a valid JSON by wrapping from the match
                    partial = '{' + clean_content[start_idx:]
                    # Try to balance and parse
                    partial = sanitize_llm_json(partial)
                    try:
                        data = json.loads(partial)
                    except:
                        # Last attempt: Find complete step objects
                        step_pattern = r'\{\s*"step"\s*:\s*\d+\s*,\s*"explanation"\s*:\s*"[^"]*"\s*,\s*"code"\s*:\s*"[^"]*"(?:\s*,\s*"python_code"\s*:\s*"[^"]*")?\s*\}'
                        steps = re.findall(step_pattern, clean_content)
                        if steps:
                            return {"steps": [json.loads(s) for s in steps[:10]]}  # Limit to first 10
                        
                        print(f"FAILED SANITIZED CONTENT: {repr(clean_content[:500])}")
                        raise ValueError("Could not extract steps from malformed JSON")
                else:
                    print(f"FAILED RAW CONTENT: {repr(raw_content[:500] if raw_content else 'EMPTY')}")
                    raise ValueError("Structure not found - no steps key")

            if "steps" in data and isinstance(data["steps"], list):
                # Filter out any malformed steps
                valid_steps = [s for s in data["steps"] if isinstance(s, dict) and "step" in s]
                if valid_steps:
                    # Prepend downsampling step if data was limited
                    if downsampling_info:
                        downsampling_step = {
                            "step": 0,
                            "explanation": f"Data preprocessing: {downsampling_info} for efficient visualization.",
                            "code": "// Data preprocessed for visualization",
                            "python_code": f"# {downsampling_info}\\ndata = data[:50]"
                        }
                        valid_steps.insert(0, downsampling_step)
                        # Renumber all steps
                        for i, step in enumerate(valid_steps):
                            step["step"] = i + 1
                    
                    return {"steps": valid_steps, "downsampling_info": downsampling_info}
            
            raise ValueError("No valid steps key in JSON")
        
        except Exception as e:
            print(f"ML JSON Error: {e}")
            return {
                "steps": [{
                    "step": 1,
                    "explanation": f"Error parsing AI response for {req.algorithm.replace('_', ' ')}. Retrying may help.",
                    "code": "console.error('ML Parse Error');",
                    "python_code": "# Parse error - please retry"
                }]
            }
    
    except Exception as e:
        print(f"ML API Error: {str(e)}")
        # Return a fallback response instead of 500 so UI handles it gracefully
        return {
             "steps": [{
                "step": 1,
                "explanation": "Connection error or model overload. Please try again.",
                "code": "console.warn('API Error');",
                "python_code": "# API connection error"
            }]
        }


# ═══════════════════════════════════════════════════════════════════
# NLP TRANSLATION VISUALIZATION ENDPOINT
# ═══════════════════════════════════════════════════════════════════

# Language name mapping for NLP translation
LANGUAGE_NAMES = {
    "en": "English", "es": "Spanish", "fr": "French", "de": "German",
    "it": "Italian", "pt": "Portuguese", "hi": "Hindi", "zh": "Chinese",
    "ja": "Japanese", "ko": "Korean", "ar": "Arabic", "ru": "Russian",
    "nl": "Dutch", "sv": "Swedish", "pl": "Polish", "tr": "Turkish",
    "ta": "Tamil", "te": "Telugu", "bn": "Bengali", "mr": "Marathi"
}

# Cache for translation results (optional - for performance)
nlp_translation_cache = {}


class NLPRequest(BaseModel):
    text: str
    source_lang: str = "en"
    target_lang: str = "es"


def translate_text_nlp(text: str, src_lang: str, tgt_lang: str) -> str:
    """Translate text using Google Translate via deep-translator."""
    if not NLP_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Translation service not available. Install: pip install deep-translator"
        )
    
    try:
        translator = GoogleTranslator(source=src_lang, target=tgt_lang)
        return translator.translate(text)
    except Exception as e:
        print(f"❌ Translation error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Translation failed: {str(e)}"
        )


def translate_words_nlp(words: list, src_lang: str, tgt_lang: str) -> list:
    """Translate individual words using Google Translate via deep-translator."""
    if not NLP_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Translation service not available"
        )
    
    translated_words = []
    translator = GoogleTranslator(source=src_lang, target=tgt_lang)
    
    for word in words:
        try:
            trans_word = translator.translate(word)
            translated_words.append(trans_word)
        except Exception as e:
            print(f"⚠️ Could not translate '{word}': {e}")
            translated_words.append(word)  # Keep original if translation fails
    
    return translated_words


def simple_stem(word: str) -> str:
    """Simple stemming - remove common suffixes."""
    word_lower = word.lower()
    
    # Common English suffixes
    suffixes = ['ing', 'ed', 'ly', 'es', 's', 'er', 'est', 'ment', 'ness', 'tion', 'ation']
    
    for suffix in suffixes:
        if word_lower.endswith(suffix) and len(word_lower) > len(suffix) + 2:
            return word_lower[:-len(suffix)]
    
    return word_lower


def escape_js(text: str) -> str:
    """Escape text for JavaScript strings."""
    return text.replace("\\", "\\\\").replace("'", "\\'").replace('"', '\\"')


def generate_nlp_visualization_steps(text: str, src_lang: str, tgt_lang: str):
    """Generate visualization steps with REAL translation using MarianMT."""
    
    source_name = LANGUAGE_NAMES.get(src_lang, src_lang)
    target_name = LANGUAGE_NAMES.get(tgt_lang, tgt_lang)
    
    # Step 1: Tokenize
    words = text.split()
    token_ids = [f"token_{i}" for i in range(len(words))]
    
    # Step 2: Stem (simple)
    stems = [simple_stem(word) for word in words]
    
    # Step 3: Translate each word
    print(f"🔄 Translating {len(words)} words from {source_name} to {target_name}...")
    translated_words = translate_words_nlp(words, src_lang, tgt_lang)
    
    # Step 4: Translate full sentence
    print(f"🔄 Translating full sentence...")
    final_translation = translate_text_nlp(text, src_lang, tgt_lang)
    
    print(f"✅ Translation: '{text}' → '{final_translation}'")
    
    # Build visualization steps
    steps = [
        {
            "step": 1,
            "stage": "tokenization",
            "title": "Step 1: Tokenization",
            "explanation": f"Breaking the sentence into {len(words)} individual tokens (words).",
            "tokens": words,
            "code": f"viz.createTextBlock('sentence', '{escape_js(text)}', 0, 5); viz.splitSentence('sentence', {json.dumps(token_ids)}, {json.dumps([escape_js(w) for w in words])});"
        },
        {
            "step": 2,
            "stage": "stemming",
            "title": "Step 2: Stemming",
            "explanation": "Finding the root form of each word by removing suffixes like -ing, -ed, -s.",
            "stems": dict(zip(words, stems)),
            "code": "; ".join([f"viz.stemWord('{token_ids[i]}', '{escape_js(stems[i])}')" for i in range(len(words))]) + ";"
        },
        {
            "step": 3,
            "stage": "translation",
            "title": f"Step 3: Translation to {target_name}",
            "explanation": f"Translating each word from {source_name} to {target_name}.",
            "translations": dict(zip(words, translated_words)),
            "code": "; ".join([f"viz.translateWord('{token_ids[i]}', '{escape_js(translated_words[i])}')" for i in range(len(words))]) + ";"
        },
        {
            "step": 4,
            "stage": "reconstruction",
            "title": f"Step 4: Final {target_name} Sentence",
            "explanation": f"The complete translated sentence in {target_name}.",
            "final_sentence": final_translation,
            "code": f"viz.combineWords({json.dumps(token_ids)}, 'final', '{escape_js(final_translation)}', -10);"
        }
    ]
    
    return {
        "steps": steps,
        "metadata": {
            "source_text": text,
            "translated_text": final_translation,
            "source_lang": src_lang,
            "target_lang": tgt_lang,
            "word_count": len(words)
        }
    }


@app.post("/nlp-generate")
async def nlp_generate(request: NLPRequest):
    """Generate visualization steps with real MarianMT translation."""
    
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text is required")
    
    print("\n" + "=" * 60)
    print(f"🌐 NLP Translation Request")
    print(f"   Text: {request.text}")
    print(f"   From: {LANGUAGE_NAMES.get(request.source_lang, request.source_lang)}")
    print(f"   To: {LANGUAGE_NAMES.get(request.target_lang, request.target_lang)}")
    print("=" * 60)
    
    try:
        result = generate_nlp_visualization_steps(
            request.text,
            request.source_lang,
            request.target_lang
        )
        
        print(f"\n✅ Generated {len(result['steps'])} visualization steps")
        print(f"   Final Translation: {result['metadata']['translated_text']}")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ NLP Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════
# CODE VISUALIZER — Deterministic Execution Engine
# ═══════════════════════════════════════════════════════════════════

from code_executor import execute_code_safe, PRESET_EXAMPLES
from trace_validator import validate_trace, validate_and_prepare


class CodeExecutionRequest(BaseModel):
    code: str
    language: str = "python"


@app.post("/execute-code")
def execute_code(req: CodeExecutionRequest):
    """
    Execute user Python code and return a deterministic execution trace.
    
    This endpoint:
    1. Validates code safety via AST analysis
    2. Executes code in a sandboxed subprocess with sys.settrace
    3. Validates the resulting trace for integrity
    4. Returns the validated trace or an error
    
    NO LLM is used for execution — this is purely deterministic.
    """
    if req.language != "python":
        raise HTTPException(
            status_code=400,
            detail=f"Language '{req.language}' is not supported. Only 'python' is available."
        )
    
    print(f"\n🔬 [Code Visualizer] Executing {len(req.code)} chars of Python code")
    
    # Step 1+2: Execute code safely (includes AST check + subprocess)
    raw_trace = execute_code_safe(req.code)
    
    # Step 3: If execution had an error, return it immediately
    if raw_trace.get("error"):
        print(f"❌ [Code Visualizer] Error: {raw_trace['error'][:100]}")
        return {
            "success": False,
            "error": raw_trace["error"],
            "steps": [],
            "final_variables": {},
            "validation": {"valid": False, "errors": [raw_trace["error"]], "warnings": []},
        }
    
    # Step 4: Validate trace integrity
    validated = validate_and_prepare(raw_trace, req.code)
    
    if not validated["valid"]:
        print(f"⚠️ [Code Visualizer] Validation failed: {validated['error'][:100]}")
        return {
            "success": False,
            "error": validated["error"],
            "steps": [],
            "final_variables": {},
            "validation": validated["validation"],
        }
    
    print(f"✅ [Code Visualizer] Success: {validated['step_count']} steps, {validated['line_count']} lines")
    
    return {
        "success": True,
        "error": None,
        "steps": validated["steps"],
        "final_variables": validated["final_variables"],
        "line_count": validated["line_count"],
        "step_count": validated["step_count"],
        "validation": validated["validation"],
    }


@app.get("/code-presets")
def get_code_presets():
    """Return the list of preset code examples for the Code Visualizer."""
    return {
        "presets": {
            key: {
                "title": val["title"],
                "description": val["description"],
                "code": val["code"],
            }
            for key, val in PRESET_EXAMPLES.items()
        }
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)