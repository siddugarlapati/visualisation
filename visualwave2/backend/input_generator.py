"""
Input Generator Module - LLM-Powered Contextual Generation

Uses Groq LLM to intelligently generate test inputs based on problem descriptions.
This replaces manual heuristics with context-aware generation.

Examples:
- "Valid Parentheses" → generates strings like "()[]{}", "((()))", "([)]"
- "Two Sum" → generates arrays with pairs that sum to a target
- "Longest Palindrome" → generates strings with palindromic substrings
"""

import os
import json
from typing import Any
from groq import Groq
from input_models import InputConstraints


def generate_input_with_llm(
    problem_title: str,
    problem_description: str,
    constraints: InputConstraints
) -> Any:
    """
    Use LLM to generate contextually appropriate test input.
    
    Args:
        problem_title: LeetCode problem title
        problem_description: Problem description
        constraints: Input constraints (type, size, value ranges)
    
    Returns:
        Generated input value that's contextually valid for the problem
    """
    
    # Initialize Groq client (lazy initialization to ensure env vars are loaded)
    client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
    
    # Build LLM prompt for intelligent input generation
    prompt = f"""You are a LeetCode test case generator.

Problem: {problem_title}
Description: {problem_description[:400]}

Input Constraints:
- Data type: {constraints.data_type}
- Size range: {constraints.min_size} to {constraints.max_size}
- Value range: {constraints.min_value} to {constraints.max_value}

TASK: Generate a SINGLE, VALID test input that is:
1. Contextually appropriate for this specific problem
2. Within the size and value constraints
3. Interesting for visualization (not trivial edge cases)
4. Demonstrates the algorithm clearly

CRITICAL OUTPUT RULES:
- Return ONLY the raw input value, nothing else
- No explanations, no JSON wrapping, no markdown
- Format based on data_type:
  * array: [1, 2, 3, 4] (just the array literal)
  * string: ()[]{{}} (just the string, no quotes)
  * tree: [1, 2, 3, null, 5] (level-order array)
  * graph: [[0,1],[1,2],[0,2]] (edge list)
  * matrix: [[1,2],[3,4]] (2D array)
  * number: 42 (just the integer)

EXAMPLES:
- "Valid Parentheses" → ()[]{{}}
- "Two Sum" → [2, 7, 11, 15]
- "Longest Palindrome" → abccba
- "Binary Tree Inorder" → [1, null, 2, 3]
- "Fibonacci" → 10

Generate the input now (raw value only):"""
    
    try:
        # Call Groq LLM with minimal temperature for deterministic output
        completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a precise test case generator. Output ONLY the raw input value."},
                {"role": "user", "content": prompt}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.2,
            max_tokens=200
        )
        
        raw_response = completion.choices[0].message.content.strip()
        print(f"🤖 LLM Generated Input: {raw_response}")
        
        # Parse the response based on expected data type
        data_type = constraints.data_type.lower()
        
        if data_type == "array" or data_type == "linkedlist":
            # Parse array: [1, 2, 3, 4]
            return json.loads(raw_response)
        
        elif data_type == "tree":
            # Parse tree: [1, 2, 3, null, 5]
            tree_str = raw_response.replace("null", "None")
            return eval(tree_str)
        
        elif data_type == "graph":
            # Parse graph: [[0,1],[1,2]]
            return json.loads(raw_response)
        
        elif data_type == "matrix":
            # Parse matrix: [[1,2],[3,4]]
            return json.loads(raw_response)
        
        elif data_type == "string":
            # Remove any surrounding quotes if present
            result = raw_response.strip('"').strip("'")
            return result
        
        elif data_type == "number":
            # Parse number
            return int(raw_response)
        
        else:
            # Default: try JSON parse, else return as-is
            try:
                return json.loads(raw_response)
            except:
                return raw_response
    
    except Exception as e:
        print(f"⚠️ LLM generation failed: {e}")
        print(f"Falling back to manual generation for {constraints.data_type}")
        # Fall back to simple manual generation
        return generate_fallback_input(constraints)


def generate_fallback_input(constraints: InputConstraints) -> Any:
    """
    Fallback to simple manual generation if LLM fails.
    
    This is a simplified version for emergency use only.
    """
    import random
    
    data_type = constraints.data_type.lower()
    
    if data_type == "array" or data_type == "linkedlist":
        return [2, 7, 11, 15]  # Classic Two Sum example
    
    elif data_type == "tree":
        return [1, 2, 3, None, 4, 5]
    
    elif data_type == "graph":
        return [[0, 1], [1, 2], [0, 2]]
    
    elif data_type == "matrix":
        return [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
    
    elif data_type == "string":
        return "abc"
    
    elif data_type == "number":
        return random.randint(
            constraints.min_value or 0,
            constraints.max_value or 100
        )
    
    else:
        return [1, 2, 3, 4, 5]


def generate_input(
    constraints: InputConstraints,
    problem_title: str = "",
    problem_description: str = ""
) -> Any:
    """
    Main generation function - now uses LLM for contextual input generation.
    
    Args:
        constraints: Input constraints
        problem_title: Problem title (for context)
        problem_description: Problem description (for context)
    
    Returns:
        Generated input value (list, dict, str, int, etc.)
    """
    
    # If problem context is provided, use LLM
    if problem_title and problem_description:
        return generate_input_with_llm(problem_title, problem_description, constraints)
    else:
        # No context - use fallback
        print("⚠️ No problem context provided, using fallback generation")
        return generate_fallback_input(constraints)
