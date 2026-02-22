"""
Intent-Based Generation System for LeetCode Visualization
==========================================================

This module implements the intent-based architecture where the LLM
outputs semantic intents instead of executable visualization code.

The LLM outputs structured JSON intents that are mapped to engine
actions by the IntentDispatcher on the frontend.

Key Changes from two-pass system:
- Single pass: LLM outputs intents directly
- No code generation: intents are JSON objects
- Structured schema: validated on frontend
"""

import json

# ============================================================================
# INTENT GENERATION PROMPT
# ============================================================================

INTENT_GENERATION_PROMPT = """
You are an Algorithm Intent Generator for a visualization system.

Your task is to break down an algorithm into semantic INTENTS using a ROBUST 4-PHASE LIFECYCLE.

LIFECYCLE PHASES:
1. PHASE 1: SETUP (Mandatory)
   - Create ALL input arrays, strings, or numbers.
   - Create ALL auxiliary data structures (HashMap, Stack, Set) BEFORE they are used.
   - Initialize temporary variables (e.g., 'maxLength', 'totalSum') using LABEL_ADD.

2. PHASE 2: EXECUTION (Reasoning)
   - Step-by-step algorithmic logic.
   - Each explanation MUST explain THE WHY (reasoning) and THE WHAT.
   - Include Invariants where possible (e.g., "All elements before 'i' are sorted").

3. PHASE 3: CONCLUSION (Mandatory)
   - Do NOT stop abruptly.
   - Mandatory "Final Result" step.
   - Use EMPHASIS with "result" on the final answer.
   - Use FOCUS_CAMERA on the final result.

OUTPUT FORMAT (strict JSON):
{
  "algorithm_type": "string",
  "data_structures": ["array", "hashmap"],
  "steps": [
    {
      "step": 1,
      "intent": { "action": "ACTION_NAME", "targets": { ... } },
      "explanation": "THE WHY + THE WHAT reasoning",
      "state": { "variableName": "value" },
      "emphasis": ["tag"]
    }
  ]
}

AVAILABLE ACTIONS:
- ARRAY_CREATE: { arrayId, values, x?, y? }
- ARRAY_HIGHLIGHT: { arrayId, index, color? }
- ARRAY_COMPARE: { arrayId, indices: [i, j] }
- ARRAY_SWAP: { arrayId, indices: [i, j] }
- ARRAY_UPDATE: { arrayId, index, value }
- ARRAY_INSERT: { arrayId, index, value }
- ARRAY_DELETE: { arrayId, index }
- ARRAY_MOVE_POINTER: { arrayId, index, pointerId }
- ARRAY_CLEAR_HIGHLIGHTS: { arrayId, indices? }
- HASHMAP_CREATE: { hashmapId, x: 0, y: -6 }
- HASHMAP_SET: { hashmapId, key, value }
- HASHMAP_GET: { hashmapId, key }
- HASHMAP_HIGHLIGHT: { hashmapId, key }
- STACK_CREATE: { stackId, x?, y? }
- STACK_PUSH: { stackId, value }
- STACK_POP: { stackId }
- HEAP_INIT: { heapId, values, x?, y? }
- HEAP_INSERT: { heapId, value }
- HEAP_EXTRACT: { heapId }
- HEAP_PEEK: { heapId }
- BST_CREATE: { nodeId, value }
- BST_INSERT: { value }
- GRAPH_CREATE_NODE: { nodeId, value, x, y }
- GRAPH_CONNECT: { fromId, toId, directed? }
- GRAPH_HIGHLIGHT: { nodeId }
- EMPHASIS: { targetId, effect }
- FOCUS_CAMERA: { targetId }
- LABEL_ADD: { arrayId?, index?, text, labelId?, x?, y?, color? }
- LABEL_REMOVE: { labelId }

EMPHASIS EFFECTS:
- "compare": Yellow pulse
- "success": Green confetti
- "failure": Red shake
- "current": Blue pulse
- "result": Green highlight + focus
- "visited": Gray out

RULES:
1. Output valid JSON only.
2. Initialize ALL data structures in Phase 1.
3. CRITICAL: Initialize POINTERS (e.g. 'left', 'right') by moving them to index 0 at the start.
4. CRITICAL: SYNC POINTERS. Whenever you mention a pointer (like i, j, k) moving or being at an index, you MUST output an ARRAY_MOVE_POINTER intent.
5. HEAPS/PRIORITY QUEUES: ALWAYS use HEAP_* actions. Do NOT use STACK actions for heaps. Visualizing a heap as a stack (rods) is INCORRECT.
6. EXPLANATION RULE: SHOW THE MATH. Never say "we check the sum". Instead say "Sum = nums[i] (-1) + nums[j] (0) + nums[k] (2) = 1. Target is 0."
7. ALWAYS show the values being compared in parentheses. Example: "Compare nums[i] (5) with nums[j] (3)".
8. DATA VERIFICATION: Before any branching logic (if/else), explicitly state the current value in the explanation to prevent hallucination. E.g. "Current char at index 5 is '('. This is an OPENING parenthesis, so we push...". Verify this against the input string/array.
9. POSITIONING GUIDANCE: If using a Stack or Queue alongside an Array, create them at `y: -4` or `y: 4` to avoid visual overlap. Do NOT create them at `y: 0` if an array exists.
9. STEP LIMIT: Keep the visualization concise. Aim for 8-20 steps. If the input is large, summarize repetitive iterations.
10. Maintain a 'state' object for active variables (pointers, counters).
11. Ensure a clear concluding step with a focus on the final answer.

EXAMPLE for Two Sum (Target 9, [2, 7]):
{
  "algorithm_type": "searching",
  "data_structures": ["array", "hashmap"],
  "steps": [
    {
      "step": 1,
      "intent": { "action": "ARRAY_CREATE", "targets": { "arrayId": "nums", "values": [2, 7] } },
      "explanation": "SETUP: Initialize input array with values [2, 7].",
      "state": { "target": 9 }
    },
    {
      "step": 2,
      "intent": { "action": "HASHMAP_CREATE", "targets": { "hashmapId": "seen" } },
      "explanation": "SETUP: Create a hashmap to store numbers we have already visited.",
      "state": {}
    },
    {
      "step": 3,
      "intent": { "action": "ARRAY_HIGHLIGHT", "targets": { "arrayId": "nums", "index": 1 } },
      "explanation": "REASONING: Value at index 1 is 7. We need its complement: target (9) - current (7) = 2.",
      "state": { "current": 7, "need": 2 }
    },
    {
      "step": 4,
      "intent": { "action": "HASHMAP_HIGHLIGHT", "targets": { "hashmapId": "seen", "key": 2 } },
      "explanation": "CONCLUSION: Complement 2 is found in the hashmap. Indices [0, 1] is the result.",
      "state": { "ans": [0, 1] },
      "emphasis": ["result"]
    }
  ]
}
"""


def build_intent_prompt(problem_title, description, resolved_input):
    """Build the intent generation prompt."""
    
    data_type = resolved_input.constraints.data_type
    parsed = resolved_input.parsed_input
    target = resolved_input.target_value
    
    user_prompt = f"""
Generate visualization intents for this problem:

PROBLEM: {problem_title}
DESCRIPTION: {description[:500]}

INPUT DATA:
- Type: {data_type}
- Value: {parsed}
{"- Target: " + str(target) if target else ""}

Generate the step-by-step intents (JSON format from system prompt).
Focus on algorithm logic. Use the available actions only.
"""
    
    return [
        {"role": "system", "content": INTENT_GENERATION_PROMPT},
        {"role": "user", "content": user_prompt}
    ]


# ============================================================================
# VALIDATION & POST-PROCESSING
# ============================================================================

def validate_intent_response(raw_response):
    """Validate and parse the LLM's JSON response."""
    if not raw_response:
        return {"steps": [], "error": "Empty response"}
    
    # Remove markdown code fences
    content = raw_response.replace('```json', '').replace('```', '').strip()
    
    try:
        data = json.loads(content)
        if not data.get("steps"):
            return {"steps": [], "error": "No steps in response"}
        return data
    except json.JSONDecodeError as e:
        # Try to extract steps array
        import re
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
        return {"steps": [], "error": f"JSON parse error: {str(e)}"}


def format_step_for_frontend(step):
    """Format a step for the frontend, ensuring proper structure."""
    return {
        "step": step.get("step", 1),
        "explanation": step.get("explanation", "Processing..."),
        "intent": step.get("intent", {}),
        "state": step.get("state", {}),
        "emphasis": step.get("emphasis", [])
    }


# ============================================================================
# MAIN INTENT GENERATION FUNCTION
# ============================================================================

def generate_intents(problem_title, description, resolved_input, llm_client, model="llama-3.3-70b-versatile"):
    """
    Main entry point for intent-based generation.
    
    Args:
        problem_title: LeetCode problem title
        description: Problem description
        resolved_input: VisualWaveExecutionInput object
        llm_client: Groq or compatible client
        model: Model name to use
    
    Returns:
        dict with "steps" key containing intent-based steps
    """
    
    # Build prompt
    messages = build_intent_prompt(problem_title, description, resolved_input)
    
    try:
        response = llm_client.chat.completions.create(
            messages=messages,
            model=model,
            temperature=0.3,
            max_tokens=3000,
            response_format={"type": "json_object"}
        )
        raw = response.choices[0].message.content
        data = validate_intent_response(raw)
    except Exception as e:
        print(f"Intent generation failed: {e}")
        return {"steps": [], "error": str(e)}
    
    if not data.get("steps"):
        return {"steps": [], "error": data.get("error", "No steps generated")}
    
    # Format steps for frontend
    formatted_steps = [format_step_for_frontend(s) for s in data["steps"]]
    
    return {
        "steps": formatted_steps,
        "algorithm_type": data.get("algorithm_type", "other"),
        "data_structures": data.get("data_structures", ["array"])
    }

