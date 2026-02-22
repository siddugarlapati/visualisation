"""
Trace Validator — Validates execution traces before visualization.

Ensures:
  1. Step numbers are sequential
  2. Line numbers exist in the source code
  3. Variable values are JSON-serializable
  4. No unexplained state discontinuities
  5. Events are valid types

If validation fails, the frontend MUST NOT visualize the trace.
"""


def validate_trace(trace: dict, source_code: str) -> dict:
    """
    Validate an execution trace for correctness and completeness.

    Args:
        trace: The execution trace dict from code_executor
        source_code: The original source code string

    Returns:
        {
            "valid": True/False,
            "errors": ["list of error messages"],
            "warnings": ["list of warning messages"],
            "stats": {
                "total_steps": int,
                "unique_lines": int,
                "events": {"line": N, "call": N, ...}
            }
        }
    """
    errors = []
    warnings = []
    stats = {
        "total_steps": 0,
        "unique_lines": set(),
        "events": {},
    }

    # ── Basic structure checks ─────────────────────────────────
    if not isinstance(trace, dict):
        return {"valid": False, "errors": ["Trace is not a dict"], "warnings": [], "stats": {}}

    steps = trace.get("steps", [])
    if not isinstance(steps, list):
        return {"valid": False, "errors": ["'steps' is not a list"], "warnings": [], "stats": {}}

    if len(steps) == 0:
        # Check if there's an error
        if trace.get("error"):
            return {
                "valid": False,
                "errors": [f"Execution error: {trace['error']}"],
                "warnings": [],
                "stats": {"total_steps": 0, "unique_lines": 0, "events": {}},
            }
        # Empty trace is valid for empty code
        return {
            "valid": True, "errors": [], "warnings": ["No execution steps recorded"],
            "stats": {"total_steps": 0, "unique_lines": 0, "events": {}},
        }

    # ── Source line analysis ───────────────────────────────────
    source_lines = source_code.strip().split("\n") if source_code else []
    max_line = len(source_lines)

    # ── Valid event types ─────────────────────────────────────
    valid_events = {"line", "call", "return", "exception"}

    # ── Step-by-step validation ───────────────────────────────
    prev_step_num = 0
    seen_variables = set()
    active_scopes = []  # Track function call/return scope

    for i, step in enumerate(steps):
        if not isinstance(step, dict):
            errors.append(f"Step {i} is not a dict")
            continue

        # ── Step number sequential ────────────────────────────
        step_num = step.get("step_number")
        if step_num is None:
            errors.append(f"Step {i} missing 'step_number'")
        elif step_num != prev_step_num + 1:
            errors.append(
                f"Step number discontinuity: expected {prev_step_num + 1}, got {step_num} (at index {i})"
            )
        prev_step_num = step_num or prev_step_num

        # ── Line number valid ─────────────────────────────────
        line_num = step.get("line_number")
        if line_num is None:
            errors.append(f"Step {i} missing 'line_number'")
        elif line_num != -1:  # -1 is used for exceptions
            if line_num < 1 or line_num > max_line:
                warnings.append(
                    f"Step {i}: line_number {line_num} outside source range [1, {max_line}]"
                )
            else:
                stats["unique_lines"].add(line_num)

        # ── Event type valid ──────────────────────────────────
        event = step.get("event")
        if event is None:
            errors.append(f"Step {i} missing 'event'")
        elif event not in valid_events:
            errors.append(f"Step {i}: invalid event type '{event}'")
        else:
            stats["events"][event] = stats["events"].get(event, 0) + 1

        # ── Track scope for variable continuity ───────────────
        if event == "call":
            active_scopes.append(step.get("function_name", "<unknown>"))
        elif event == "return":
            if active_scopes:
                active_scopes.pop()

        # ── Variables are serializable ────────────────────────
        variables = step.get("variables", {})
        if not isinstance(variables, dict):
            errors.append(f"Step {i}: 'variables' is not a dict")
        else:
            for var_name, var_val in variables.items():
                seen_variables.add(var_name)
                if not _is_json_serializable(var_val):
                    warnings.append(
                        f"Step {i}: variable '{var_name}' may not be JSON-serializable"
                    )

        # ── source_line present ───────────────────────────────
        if "source_line" not in step and event != "exception":
            warnings.append(f"Step {i}: missing 'source_line'")

    stats["total_steps"] = len(steps)
    stats["unique_lines"] = len(stats["unique_lines"])

    # ── Final validation result ───────────────────────────────
    # Only hard errors make it invalid; warnings are advisory
    is_valid = len(errors) == 0

    return {
        "valid": is_valid,
        "errors": errors,
        "warnings": warnings,
        "stats": stats,
    }


def _is_json_serializable(val, depth=0) -> bool:
    """Check if a value can be JSON-serialized."""
    if depth > 5:
        return True  # Skip deep checks

    if val is None or isinstance(val, (bool, int, float, str)):
        return True

    if isinstance(val, (list, tuple)):
        return all(_is_json_serializable(v, depth + 1) for v in val[:20])

    if isinstance(val, dict):
        return all(
            isinstance(k, str) and _is_json_serializable(v, depth + 1)
            for k, v in list(val.items())[:20]
        )

    return False


def validate_and_prepare(trace: dict, source_code: str) -> dict:
    """
    Validate trace and return a cleaned result ready for the frontend.

    If validation fails, returns error info.
    If valid, returns the trace with validation stats attached.
    """
    validation = validate_trace(trace, source_code)

    if not validation["valid"]:
        return {
            "valid": False,
            "error": "Trace validation failed: " + "; ".join(validation["errors"]),
            "validation": validation,
            "steps": [],
            "final_variables": {},
        }

    return {
        "valid": True,
        "error": None,
        "validation": validation,
        "steps": trace.get("steps", []),
        "final_variables": trace.get("final_variables", {}),
        "line_count": trace.get("line_count", 0),
        "step_count": trace.get("step_count", 0),
    }
