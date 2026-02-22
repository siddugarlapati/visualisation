"""
Two-Pass Generation System for LeetCode Visualization
=====================================================

This module implements a simplified prompt architecture that splits
the monolithic generation into two focused passes:

Pass 1: Algorithm Planning (conceptual steps, no code)
Pass 2: Code Translation (per-step code generation)

This reduces cognitive load on the LLM and improves success rates.
"""

# ============================================================================
# PASS 1: PLANNING PROMPT
# ============================================================================
# Role: Educational Explainer
# Focus: What happens algorithmically, not how to render it
# Output: Conceptual steps with key values

PLANNING_SYSTEM_PROMPT = """
You are an Algorithm Educator explaining step-by-step how an algorithm works.

Your ONLY task is to break down the algorithm into clear, conceptual steps.
Do NOT write any visualization code. Just explain what happens.

OUTPUT FORMAT (strict JSON):
{
  "algorithm_type": "sorting|searching|graph|tree|string|dynamic_programming|other",
  "data_structures_used": ["array", "stack", "hashmap"],
  "steps": [
    {
      "step": 1,
      "action": "initialize|compare|swap|insert|delete|update|traverse|highlight|result",
      "description": "What happens in plain English (WITH MATH)",
      "elements": ["element1", "element2"],
      "values": {"index": 0, "value": 5, "color": "green"},
      "state_change": "Brief description of what changed"
    }
  ]
}

RULES:
1. Keep descriptions short but SPECIFIC.
2. EXPLANATION RULE: SHOW THE MATH. Never say "we check the sum". Instead say "Sum = 2 + 7 = 9. Target is 9."
3. ALWAYS include exact values: "Compare 5 with 3" instead of "Compare values".
4. Include specific indices in descriptions: "Move pointer 'i' to index 2".
5. 8-20 steps depending on algorithm complexity.
6. Action types help the code translator choose the right API.

EXAMPLE for Two Sum with [2, 7, 11, 15], target=9:
{
  "algorithm_type": "searching",
  "data_structures_used": ["array", "hashmap"],
  "steps": [
    {"step": 1, "action": "initialize", "description": "Create array and empty hashmap. Target is 9.", "elements": ["array"], "values": {"data": [2,7,11,15], "target": 9}},
    {"step": 2, "action": "traverse", "description": "Check index 0: value is 2", "elements": ["arr_0"], "values": {"index": 0, "value": 2}},
    {"step": 3, "action": "compare", "description": "Calculate need: 9 - 2 = 7. Check if 7 is in hashmap.", "elements": ["hashmap"], "values": {"need": 7, "found": false}},
    {"step": 4, "action": "insert", "description": "Add 2 (index 0) to hashmap", "elements": ["hashmap"], "values": {"key": 2, "value": 0}},
    {"step": 5, "action": "traverse", "description": "Check index 1: value is 7", "elements": ["arr_1"], "values": {"index": 1, "value": 7}},
    {"step": 6, "action": "compare", "description": "Calculate need: 9 - 7 = 2. Found 2 in hashmap!", "elements": ["hashmap", "arr_0"], "values": {"need": 2, "found": true}},
    {"step": 7, "action": "result", "description": "Return indices [0, 1] as answer", "elements": ["arr_0", "arr_1"], "values": {"result": [0, 1]}}
  ]
}
"""

def build_planning_prompt(problem_title, description, resolved_input):
    """Build the planning prompt for Pass 1."""
    
    data_type = resolved_input.constraints.data_type
    parsed = resolved_input.parsed_input
    target = resolved_input.target_value
    
    user_prompt = f"""
Explain step-by-step how to solve this problem:

PROBLEM: {problem_title}
DESCRIPTION: {description[:500]}

INPUT DATA:
- Type: {data_type}
- Value: {parsed}
{"- Target: " + str(target) if target else ""}

Generate the conceptual steps (JSON format from system prompt).
Focus on algorithm logic, not visualization.
"""
    
    return [
        {"role": "system", "content": PLANNING_SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt}
    ]


# ============================================================================
# PASS 2: CODE TRANSLATION PROMPT
# ============================================================================
# Role: Code Translator
# Focus: Convert one conceptual step to visualization code
# Output: JavaScript viz.* code

CODE_TRANSLATION_SYSTEM_PROMPT = """
You are a Code Translator converting algorithm steps to visualization code.

AVAILABLE FUNCTIONS (use ONLY these):
- viz.createArrayAPI(id, values, x, y, material?) - Create array
- viz.arrayHighlight(id, index, color) - Highlight cell
- viz.arrayCompare(id, i, j) - Compare two cells
- viz.arrayUpdate(id, index, value) - Update value
- viz.arrayInsert(id, index, value) - Insert value
- viz.arrayDelete(id, index) - Delete element
- viz.arraySwap(id, i, j) - Swap elements
- viz.focusCamera(id, padding) - Focus on element
- viz.focusGroup([ids], padding) - Focus on group
- viz.pulse(id) - Pulse animation
- viz.confetti(id) - Celebration effect

COLORS:
- 0x22c55e (green) - success, found, sorted
- 0xef4444 (red) - error, not found, active
- 0x3b82f6 (blue) - current, processing
- 0xfbbf24 (yellow) - comparing, temporary

CRITICAL SPATIAL LAYOUT RULES (prevent overlapping):
- Main array: x=-6, y=0 (centered)
- Variables (max_sum, current_sum, etc.): x=10, y=8 (TOP-RIGHT, far above array)
- Stack/Hashmap: x=-8, y=-6 (BOTTOM-LEFT, far below array)
- Result: x=0, y=8 (TOP-CENTER)
- Pointers: y=-3 (just below array)

NEVER place auxiliary structures at same Y as main array!

OUTPUT FORMAT:
Return ONLY the viz.* code as a single line, semicolon-separated.
Example: viz.createArrayAPI('arr', [-2,1,-3,4], -6, 0); viz.createArrayAPI('sum', [0], 10, 8);

RULES:
1. 1-3 viz.* calls per step
2. Use literal values only (no variables)
3. All IDs must be quoted strings
4. End each call with semicolon
5. Use single quotes inside strings
6. ALWAYS use the LAYOUT positions provided - never overlap!
"""

def build_code_prompt(step, algorithm_type, layout_info):
    """Build code translation prompt for one step."""
    
    action = step.get("action", "highlight")
    elements = step.get("elements", [])
    values = step.get("values", {})
    description = step.get("description", "")
    
    # Provide action-specific hints
    action_hints = {
        "initialize": "Create the data structure(s). Use createArrayAPI for arrays.",
        "compare": "Highlight the elements being compared with blue or yellow.",
        "swap": "Use arraySwap and highlight both elements.",
        "insert": "Use arrayInsert and pulse the new element.",
        "delete": "Use arrayDelete.",
        "update": "Use arrayUpdate and highlight the changed cell.",
        "traverse": "Highlight current element with blue, use focusCamera.",
        "highlight": "Highlight the specified elements.",
        "result": "Highlight result elements with green, use confetti."
    }
    
    hint = action_hints.get(action, "Choose appropriate viz functions.")
    
    user_prompt = f"""
Convert this algorithm step to visualization code:

ACTION: {action}
DESCRIPTION: {description}
ELEMENTS: {elements}
VALUES: {values}

HINT: {hint}
LAYOUT: {layout_info}

Return only the viz.* code (1-3 calls, semicolon-separated):
"""
    
    return [
        {"role": "system", "content": CODE_TRANSLATION_SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt}
    ]


# ============================================================================
# LAYOUT PLANNING
# ============================================================================

def compute_layout(algorithm_type, data_structures):
    """
    Pre-compute spatial layout for data structures.
    
    LAYOUT ZONES (to prevent overlapping):
    - Main array: Center, y=0
    - Variables/Result: Top, y=8 (well above array labels)
    - Pointers: Below array, y=-2
    - Stack/Queue/Hashmap: Bottom, y=-6 (far below main content)
    
    X-axis separation:
    - Main content: x=-6 to x=6
    - Left auxiliary (stack): x=-12
    - Right auxiliary (queue/vars): x=10
    """
    
    layout = {
        # Main data structure - centered
        "array": {"x": -6, "y": 0, "z": 0, "description": "Main array, centered"},
        
        # Auxiliary structures - FAR below main content (y=-6)
        "stack": {"x": -12, "y": -6, "z": 0, "description": "Stack on left, below"},
        "queue": {"x": 10, "y": -6, "z": 0, "description": "Queue on right, below"},
        "hashmap": {"x": -8, "y": -6, "z": 0, "description": "Hashmap below array"},
        
        # Variables and results - FAR above main content (y=8)
        "result": {"x": 0, "y": 8, "z": 0, "description": "Result at top center"},
        "variable": {"x": 10, "y": 8, "z": 0, "description": "Variables top-right"},
        "max_sum": {"x": 10, "y": 8, "z": 0, "description": "Max sum variable"},
        "current_sum": {"x": 10, "y": 6, "z": 0, "description": "Current sum variable"},
        
        # Pointers - just below array
        "pointer": {"x": 0, "y": -3, "z": 0, "description": "Pointers below array"},
        "left_pointer": {"x": -4, "y": -3, "z": 0, "description": "Left pointer"},
        "right_pointer": {"x": 4, "y": -3, "z": 0, "description": "Right pointer"}
    }
    
    # Return only relevant structures
    return {k: v for k, v in layout.items() if k in data_structures}


# ============================================================================
# VALIDATION & POST-PROCESSING
# ============================================================================

def validate_step(code):
    """Validate and fix common issues in generated code."""
    import re
    
    if not code or not code.strip():
        return "viz.pulse('arr');"  # Fallback
    
    # Ensure semicolons at end
    if not code.strip().endswith(';'):
        code = code.strip() + ';'
    
    # Fix common API mistakes
    fixes = [
        (r"viz\.highlight\(", "viz.arrayHighlight("),
        (r"viz\.create\(", "viz.createArrayAPI("),
        (r'"([^"]+)"', r"'\1'"),  # Double to single quotes
    ]
    
    for pattern, replacement in fixes:
        code = re.sub(pattern, replacement, code)
    
    return code


def validate_json(raw_response):
    """Validate and fix JSON structure."""
    import json
    import re
    
    if not raw_response:
        return {"steps": []}
    
    # Remove markdown
    content = raw_response.replace('```json', '').replace('```', '').strip()
    
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        # Try to extract steps array
        match = re.search(r'"steps"\s*:\s*\[', content)
        if match:
            try:
                partial = '{' + content[match.start():]
                # Balance brackets
                open_b = partial.count('{') - partial.count('}')
                open_s = partial.count('[') - partial.count(']')
                partial += ']' * open_s + '}' * open_b
                return json.loads(partial)
            except:
                pass
        return {"steps": []}


# ============================================================================
# MAIN TWO-PASS GENERATION FUNCTION
# ============================================================================

def generate_two_pass(problem_title, description, resolved_input, llm_client, model="llama-3.3-70b-versatile"):
    """
    Main entry point for two-pass generation.
    
    Args:
        problem_title: LeetCode problem title
        description: Problem description
        resolved_input: VisualWaveExecutionInput object
        llm_client: Groq or compatible client
        model: Model name to use
    
    Returns:
        dict with "steps" key containing visualization steps
    """
    import json
    
    # ========== PASS 1: Planning ==========
    planning_messages = build_planning_prompt(problem_title, description, resolved_input)
    
    try:
        planning_response = llm_client.chat.completions.create(
            messages=planning_messages,
            model=model,
            temperature=0.3,  # Higher temp for creativity
            max_tokens=2048,
            response_format={"type": "json_object"}
        )
        planning_raw = planning_response.choices[0].message.content
        planning_data = validate_json(planning_raw)
    except Exception as e:
        print(f"Pass 1 failed: {e}")
        return {"steps": [], "error": str(e)}
    
    if not planning_data.get("steps"):
        print("Pass 1 returned no steps")
        return {"steps": [], "error": "Planning failed"}
    
    # Extract algorithm info
    algorithm_type = planning_data.get("algorithm_type", "other")
    data_structures = planning_data.get("data_structures_used", ["array"])
    layout = compute_layout(algorithm_type, data_structures)
    
    # ========== PASS 2: Code Translation ==========
    final_steps = []
    
    for concept_step in planning_data["steps"]:
        code_messages = build_code_prompt(concept_step, algorithm_type, layout)
        
        try:
            code_response = llm_client.chat.completions.create(
                messages=code_messages,
                model=model,
                temperature=0.1,  # Low temp for syntax
                max_tokens=256
            )
            code_raw = code_response.choices[0].message.content.strip()
            code = validate_step(code_raw)
        except Exception as e:
            print(f"Pass 2 failed for step {concept_step.get('step')}: {e}")
            code = "viz.pulse('arr');"  # Fallback
        
        final_steps.append({
            "step": concept_step.get("step", len(final_steps) + 1),
            "explanation": concept_step.get("description", "Processing..."),
            "code": code,
            "python_code": "# " + concept_step.get("description", "")
        })
    
    return {
        "steps": final_steps,
        "algorithm_type": algorithm_type,
        "data_structures": data_structures
    }
