"""
Input Resolver Module

Core input resolution logic for VisualWave LeetCode Visualizer.

This module implements the mandatory input resolution step:
- If user provides valid custom input → use it (mode=CUSTOM)
- If user input is invalid → auto-generate valid input (mode=AUTO)
- If no user input → auto-generate valid input (mode=AUTO)

The resolved input is the ONLY input passed to:
- Prompt generation
- Visualization steps
- Explanation logic

No branching beyond this point.
"""

from typing import Optional
from input_models import VisualWaveExecutionInput, InputMode, InputConstraints
from input_validator import validate_input
from input_generator import generate_input


def resolve_input(
    problem_id: int,
    problem_title: str,
    problem_description: str,
    raw_user_input: Optional[str],
    constraints: InputConstraints
) -> VisualWaveExecutionInput:
    """
    Resolve input for visualization execution.
    
    This is the core input resolution function that implements the two-mode logic:
    
    1. USER-DEFINED INPUT MODE:
       - User provided custom input
       - Validate against constraints
       - If valid: use it (mode=CUSTOM)
       - If invalid: fall back to auto-generation (mode=AUTO, keep errors for UI)
    
    2. AUTO-GENERATED INPUT MODE:
       - No user input provided
       - Generate valid random input based on constraints
       - Always valid (mode=AUTO)
    
    Args:
        problem_id: LeetCode problem ID
        problem_title: Problem title
        problem_description: Problem description
        raw_user_input: Optional user-provided input string
        constraints: Input constraints for validation/generation
    
    Returns:
        VisualWaveExecutionInput: Immutable input object for downstream systems
    
    Design Principles:
    - Deterministic: Same input always produces same output
    - Safe: Invalid input never reaches visualization
    - Graceful: Failures fall back to auto-generation
    - Debuggable: Tracks validation errors and mode
    """
    
    # Check if user provided input
    has_user_input = raw_user_input is not None and raw_user_input.strip() != ""
    
    # Check if this problem needs a target value
    title_lower = problem_title.lower()
    needs_target = (
        "sum" in title_lower or           # Two Sum, 3Sum, 4Sum, etc.
        "search" in title_lower or         # Binary Search, Search in Rotated Array
        "find" in title_lower or           # Find First and Last, Find Peak
        "target" in title_lower            # Problems with "target" in title
    )
    
    if has_user_input:
        # USER-DEFINED INPUT MODE
        # Try to parse and validate user input
        parsed_value, validation_errors, target_value = validate_input(raw_user_input, constraints)
        
        # Generate default target if needed but not provided
        if needs_target and target_value is None and parsed_value and isinstance(parsed_value, list) and len(parsed_value) >= 2:
            # For Sum problems: use sum of first two elements
            if "sum" in title_lower:
                target_value = parsed_value[0] + parsed_value[1]
            # For Search problems: use an element that exists in the array
            elif "search" in title_lower or "find" in title_lower:
                target_value = parsed_value[len(parsed_value) // 2]  # Middle element
        
        if not validation_errors:
            # User input is VALID - use it
            return VisualWaveExecutionInput(
                problem_id=problem_id,
                problem_title=problem_title,
                input_mode=InputMode.CUSTOM,
                raw_user_input=raw_user_input,
                parsed_input=parsed_value,
                target_value=target_value,
                constraints=constraints,
                validation_errors=[]
            )
        else:
            # User input is INVALID - fall back to auto-generation
            # But keep the validation errors for UI feedback
            auto_generated_value = generate_input(constraints, problem_title, problem_description)
            
            # Generate a sensible target if needed
            auto_target = None
            if needs_target and auto_generated_value and isinstance(auto_generated_value, list) and len(auto_generated_value) >= 2:
                if "sum" in title_lower:
                    auto_target = auto_generated_value[0] + auto_generated_value[1]
                elif "search" in title_lower or "find" in title_lower:
                    auto_target = auto_generated_value[len(auto_generated_value) // 2]
            
            return VisualWaveExecutionInput(
                problem_id=problem_id,
                problem_title=problem_title,
                input_mode=InputMode.AUTO,  # Fell back to auto
                raw_user_input=raw_user_input,  # Keep original for reference
                parsed_input=auto_generated_value,
                target_value=auto_target,
                constraints=constraints,
                validation_errors=validation_errors  # Keep errors for UI
            )
    else:
        # AUTO-GENERATED INPUT MODE
        # No user input provided - generate valid input
        auto_generated_value = generate_input(constraints, problem_title, problem_description)
        
        # Generate a sensible target if needed
        auto_target = None
        if needs_target and auto_generated_value and isinstance(auto_generated_value, list) and len(auto_generated_value) >= 2:
            if "sum" in title_lower:
                auto_target = auto_generated_value[0] + auto_generated_value[1]
                print(f"🎯 Generated Sum target: {auto_target} from {auto_generated_value[0]} + {auto_generated_value[1]}")
            elif "search" in title_lower or "find" in title_lower:
                auto_target = auto_generated_value[len(auto_generated_value) // 2]
                print(f"🎯 Generated Search target: {auto_target} (middle element of {auto_generated_value})")
        
        print(f"🔍 DEBUG: auto_generated_value type={type(auto_generated_value)}, value={auto_generated_value}")
        print(f"🔍 DEBUG: auto_target type={type(auto_target)}, value={auto_target}")
        
        return VisualWaveExecutionInput(
            problem_id=problem_id,
            problem_title=problem_title,
            input_mode=InputMode.AUTO,
            raw_user_input=None,
            parsed_input=auto_generated_value,
            target_value=auto_target,
            constraints=constraints,
            validation_errors=[]
        )


def format_input_for_prompt(resolved_input: VisualWaveExecutionInput) -> str:
    """
    Format resolved input for inclusion in LLM prompt.
    
    This creates a human-readable representation of the resolved input
    to be injected into the prompt, with explicit instructions.
    
    Args:
        resolved_input: The resolved input object
    
    Returns:
        Formatted string for prompt injection
    """
    
    # Format the parsed input based on type
    data_type = resolved_input.constraints.data_type
    parsed = resolved_input.parsed_input
    target = resolved_input.target_value
    
    # FIRST: Check for dictionary input (Dynamic Multi-Input)
    if isinstance(parsed, dict):
        formatted = "Multi-Argument Input:\n"
        for arg_name, arg_value in parsed.items():
            formatted += f"   - Argument '{arg_name}': {arg_value}\n"
            
        prompt_section = (
            f"RESOLVED INPUT (THIS IS THE ONLY INPUT YOU SHOULD VISUALIZE):\n"
            f"- Input Mode: {resolved_input.input_mode}\n"
            f"- Data Type: Multiple Arguments (Dynamic)\n"
            f"{formatted}\n"
            f"\nCRITICAL INSTRUCTIONS:\n"
            f"- You MUST use these exact argument names and values.\n"
            f"- Do NOT generate new example inputs.\n"
            f"- For example, if input is 'nums', use viz.createArrayAPI('nums', ...)\n"
        )
        return prompt_section

    if data_type == "array" or data_type == "linkedlist":
        formatted = f"Array: {parsed}"
        if target is not None:
            formatted += f", Target: {target}"
    elif data_type == "tree":
        formatted = f"Tree (level-order): {parsed}"
    elif data_type == "graph":
        formatted = f"Graph (edge list): {parsed}"
    elif data_type == "matrix":
        formatted = f"Matrix: {parsed}"
    elif data_type == "string":
        formatted = f'String: "{parsed}"'
    elif data_type == "number":
        formatted = f"Number: {parsed}"
    else:
        formatted = f"Input: {parsed}"
    
    # Build prompt section
    prompt_section = (
        f"RESOLVED INPUT (THIS IS THE ONLY INPUT YOU SHOULD VISUALIZE):\n"
        f"- Input Mode: {resolved_input.input_mode}\n"
        f"- Data Type: {data_type}\n"
        f"- {formatted}\n"
    )
    
    # Add target explicitly for problems that need it
    if target is not None:
        prompt_section += f"- Target Value: {target}\n"
    
    prompt_section += (
        "\nCRITICAL INSTRUCTIONS:\n"
        "- You MUST visualize using the RESOLVED INPUT above.\n"
        "- Do NOT generate new example inputs.\n"
        "- Do NOT use generic placeholder values.\n"
        "- Visualize EXACTLY the parsed input provided.\n"
    )
    
    # Add specific examples based on type
    if data_type == "array":
        prompt_section += (
            f"- If the input is {parsed}, you must create array cells with these exact values in order.\n"
            f"- Use viz.createArrayAPI('arr', {parsed}, x, y) with these exact values.\n"
        )
        if target is not None:
            problem_title = resolved_input.problem_title.lower()
            if "sum" in problem_title:
                prompt_section += (
                    f"- The TARGET SUM is {target}. Find elements that sum to this target.\n"
                    f"- Highlight elements when they sum to the target {target}.\n"
                )
            elif "search" in problem_title or "find" in problem_title:
                prompt_section += (
                    f"- The TARGET to SEARCH for is {target}. Find this value in the array.\n"
                    f"- Highlight the element when found, show search steps.\n"
                )
    elif data_type == "tree":
        prompt_section += (
            f"- Use the exact node values from the level-order array: {parsed}\n"
            f"- Null values indicate empty nodes in the tree structure.\n"
        )
    elif data_type == "graph":
        prompt_section += (
            f"- Create graph nodes for each unique node ID in the edges.\n"
            f"- Draw edges exactly as specified: {parsed}\n"
        )
    
    return prompt_section

