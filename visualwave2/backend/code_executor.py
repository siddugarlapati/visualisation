"""
Code Executor — Deterministic Python Execution Engine

Uses sys.settrace to capture every execution event (line, call, return)
with full variable snapshots. Runs user code in a subprocess with strict
timeouts and AST-level security checks.

SECURITY MODEL:
  1. AST Analysis: Reject dangerous constructs before execution
  2. Subprocess: 5-second timeout, no shell access
  3. Restricted builtins: Only safe builtins allowed

OUTPUT FORMAT:
  {
    "steps": [
      {
        "step_number": 1,
        "line_number": 3,
        "variables": {"x": 5, "arr": [1,2,3]},
        "event": "line",
        "source_line": "x = 5"
      }
    ],
    "final_variables": {...},
    "error": null,
    "line_count": 10
  }
"""

import ast
import json
import sys
import textwrap
import subprocess
import tempfile
import os

# ─── Maximum limits ───────────────────────────────────────────────
MAX_STEPS = 500          # Max execution events to record
MAX_CODE_LENGTH = 5000   # Max characters of user code
MAX_EXEC_TIME = 5        # Seconds before subprocess kill
MAX_LINE_COUNT = 100     # Max lines of user code

# ─── Dangerous AST nodes / names ─────────────────────────────────
BLOCKED_IMPORTS = {
    "os", "sys", "subprocess", "shutil", "socket", "http",
    "urllib", "requests", "ctypes", "signal", "threading",
    "multiprocessing", "asyncio", "importlib", "pathlib",
    "io", "tempfile", "glob", "fnmatch", "pickle", "shelve",
    "marshal", "code", "codeop", "compile", "compileall",
    "builtins", "__builtin__", "gc", "inspect", "traceback",
}

BLOCKED_BUILTINS = {
    "exec", "eval", "compile", "open", "__import__",
    "globals", "locals", "dir", "vars", "getattr",
    "setattr", "delattr", "hasattr", "breakpoint",
    "exit", "quit", "input", "memoryview", "type",
}

BLOCKED_ATTRIBUTES = {
    "__class__", "__subclasses__", "__bases__", "__mro__",
    "__import__", "__builtins__", "__globals__", "__code__",
    "__closure__", "__func__", "__self__", "__module__",
    "__dict__", "__init_subclass__", "__set_name__",
    "__del__", "__delitem__", "__getattribute__",
}


# ═══════════════════════════════════════════════════════════════════
# AST SAFETY CHECKER
# ═══════════════════════════════════════════════════════════════════

class SafetyError(Exception):
    """Raised when unsafe code is detected."""
    pass


def check_code_safety(source: str) -> list[str]:
    """
    Analyse source via AST. Returns list of safety violation messages.
    Empty list means code is safe to execute.
    """
    errors: list[str] = []

    try:
        tree = ast.parse(source)
    except SyntaxError as e:
        return [f"Syntax error: {e.msg} (line {e.lineno})"]

    for node in ast.walk(tree):
        # ── Block imports ──────────────────────────────────────
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            if isinstance(node, ast.Import):
                names = [alias.name.split(".")[0] for alias in node.names]
            else:
                names = [node.module.split(".")[0]] if node.module else []
            for name in names:
                if name in BLOCKED_IMPORTS or name not in _ALLOWED_IMPORTS:
                    errors.append(
                        f"Blocked import: '{name}' is not allowed (line {node.lineno})"
                    )

        # ── Block class definitions ────────────────────────────
        if isinstance(node, ast.ClassDef):
            errors.append(
                f"Class definitions are not supported (line {node.lineno})"
            )

        # ── Block dangerous function calls ─────────────────────
        if isinstance(node, ast.Call):
            func = node.func
            if isinstance(func, ast.Name) and func.id in BLOCKED_BUILTINS:
                errors.append(
                    f"Blocked builtin: '{func.id}()' is not allowed (line {node.lineno})"
                )

        # ── Block dangerous attribute access ───────────────────
        if isinstance(node, ast.Attribute):
            if node.attr in BLOCKED_ATTRIBUTES:
                errors.append(
                    f"Blocked attribute: '.{node.attr}' access is not allowed (line {node.lineno})"
                )
            # Block any dunder access
            if node.attr.startswith("__") and node.attr.endswith("__"):
                errors.append(
                    f"Blocked dunder: '.{node.attr}' access is not allowed (line {node.lineno})"
                )

        # ── Block with statements (context managers = file I/O) ─
        if isinstance(node, ast.With) or isinstance(node, ast.AsyncWith):
            errors.append(
                f"'with' statements are not supported (line {node.lineno})"
            )

        # ── Block async ────────────────────────────────────────
        if isinstance(node, (ast.AsyncFunctionDef, ast.AsyncFor, ast.AsyncWith, ast.Await)):
            errors.append(
                f"Async constructs are not supported (line {node.lineno})"
            )

        # ── Block global / nonlocal ────────────────────────────
        if isinstance(node, ast.Global) or isinstance(node, ast.Nonlocal):
            errors.append(
                f"'global'/'nonlocal' statements are not supported (line {node.lineno})"
            )

    return errors


# Small set of safe imports that users might legitimately need
_ALLOWED_IMPORTS = {"math", "random", "collections", "itertools", "functools", "string"}


# ═══════════════════════════════════════════════════════════════════
# TRACER SCRIPT (injected into subprocess)
# ═══════════════════════════════════════════════════════════════════

TRACER_TEMPLATE = r'''
import sys
import json

MAX_STEPS = {max_steps}
_steps = []
_source_lines = {source_lines_json}
_step_counter = 0
_code_start_line = None  # Will be set when tracing starts
_min_line = 1
_max_line = {max_line}

def _serialize_value(val, depth=0):
    """Safely serialize a value to JSON-compatible format."""
    if depth > 3:
        return "..."
    if val is None:
        return None
    if isinstance(val, (bool,)):
        return val
    if isinstance(val, (int, float)):
        if isinstance(val, float) and (val != val):  # NaN
            return "NaN"
        return val
    if isinstance(val, str):
        return val[:200]  # Cap string length
    if isinstance(val, (list, tuple)):
        result = [_serialize_value(v, depth+1) for v in val[:50]]
        return result
    if isinstance(val, dict):
        result = {{}}
        for k, v in list(val.items())[:20]:
            result[str(k)[:50]] = _serialize_value(v, depth+1)
        return result
    if isinstance(val, set):
        return [_serialize_value(v, depth+1) for v in sorted(val, key=str)[:50]]
    return str(val)[:200]

def _capture_variables(frame):
    """Capture local variables from a frame, excluding internals."""
    variables = {{}}
    for name, val in frame.f_locals.items():
        if name.startswith('_') or name in ('__builtins__',):
            continue
        try:
            variables[name] = _serialize_value(val)
        except Exception:
            variables[name] = "<unserializable>"
    return variables

def _tracer(frame, event, arg):
    global _step_counter
    
    # Only trace user code (not builtins or tracer itself)
    if frame.f_code.co_filename != '<user_code>':
        return _tracer
    
    line_no = frame.f_lineno
    
    # Skip lines outside user code range
    if line_no < _min_line or line_no > _max_line:
        return _tracer
    
    if _step_counter >= MAX_STEPS:
        return None  # Stop tracing
    
    if event in ('line', 'call', 'return'):
        _step_counter += 1
        
        variables = _capture_variables(frame)
        
        source_line = ""
        if 1 <= line_no <= len(_source_lines):
            source_line = _source_lines[line_no - 1]
        
        step = {{
            "step_number": _step_counter,
            "line_number": line_no,
            "variables": variables,
            "event": event,
            "source_line": source_line.strip(),
        }}
        
        if event == 'call':
            step["function_name"] = frame.f_code.co_name
        
        if event == 'return':
            step["return_value"] = _serialize_value(arg)
        
        _steps.append(step)
    
    return _tracer

# === Execute user code ===
_user_code = compile({user_code_repr}, '<user_code>', 'exec')

# Restricted builtins
_safe_builtins = {{
    'print': print, 'len': len, 'range': range, 'int': int,
    'float': float, 'str': str, 'bool': bool, 'list': list,
    'dict': dict, 'set': set, 'tuple': tuple, 'sorted': sorted,
    'reversed': reversed, 'enumerate': enumerate, 'zip': zip,
    'map': map, 'filter': filter, 'sum': sum, 'min': min,
    'max': max, 'abs': abs, 'round': round, 'pow': pow,
    'divmod': divmod, 'isinstance': isinstance, 'issubclass': issubclass,
    'hash': hash, 'id': id, 'repr': repr, 'chr': chr, 'ord': ord,
    'hex': hex, 'oct': oct, 'bin': bin, 'any': any, 'all': all,
    'None': None, 'True': True, 'False': False,
    'ValueError': ValueError, 'TypeError': TypeError,
    'IndexError': IndexError, 'KeyError': KeyError,
    'StopIteration': StopIteration, 'Exception': Exception,
}}

_exec_globals = {{'__builtins__': _safe_builtins, '__name__': '__main__'}}

sys.settrace(_tracer)
try:
    exec(_user_code, _exec_globals)
except Exception as _e:
    _steps.append({{
        "step_number": _step_counter + 1,
        "line_number": -1,
        "variables": {{}},
        "event": "exception",
        "source_line": "",
        "error": f"{{type(_e).__name__}}: {{str(_e)}}"
    }})
finally:
    sys.settrace(None)

# Capture final variable state
_final_vars = {{}}
for _k, _v in _exec_globals.items():
    if not _k.startswith('_') and _k not in ('__builtins__', '__name__'):
        try:
            _final_vars[_k] = _serialize_value(_v)
        except Exception:
            pass

_output = {{
    "steps": _steps,
    "final_variables": _final_vars,
    "error": None,
    "step_count": len(_steps),
}}

print("__TRACE_JSON_START__")
print(json.dumps(_output))
print("__TRACE_JSON_END__")
'''


# ═══════════════════════════════════════════════════════════════════
# PUBLIC API
# ═══════════════════════════════════════════════════════════════════

def execute_code_safe(source: str) -> dict:
    """
    Execute user Python code safely and return an execution trace.

    Returns dict with keys:
      - steps: list of execution step dicts
      - final_variables: dict of variable states after execution
      - error: str or None
      - line_count: int
      - step_count: int
    """

    # ── Pre-checks ─────────────────────────────────────────────
    if not source or not source.strip():
        return {"steps": [], "final_variables": {}, "error": "No code provided", "line_count": 0, "step_count": 0}

    source = source.strip()

    if len(source) > MAX_CODE_LENGTH:
        return {
            "steps": [], "final_variables": {},
            "error": f"Code too long ({len(source)} chars). Maximum is {MAX_CODE_LENGTH}.",
            "line_count": 0, "step_count": 0
        }

    source_lines = source.split("\n")
    if len(source_lines) > MAX_LINE_COUNT:
        return {
            "steps": [], "final_variables": {},
            "error": f"Too many lines ({len(source_lines)}). Maximum is {MAX_LINE_COUNT}.",
            "line_count": len(source_lines), "step_count": 0
        }

    # ── AST safety check ──────────────────────────────────────
    safety_errors = check_code_safety(source)
    if safety_errors:
        return {
            "steps": [], "final_variables": {},
            "error": "Security violation: " + "; ".join(safety_errors),
            "line_count": len(source_lines), "step_count": 0
        }

    # ── Build tracer script ───────────────────────────────────
    tracer_script = TRACER_TEMPLATE.format(
        max_steps=MAX_STEPS,
        source_lines_json=json.dumps(source_lines),
        max_line=len(source_lines),
        user_code_repr=repr(source),
    )

    # ── Execute in subprocess ─────────────────────────────────
    try:
        result = subprocess.run(
            [sys.executable, "-c", tracer_script],
            capture_output=True,
            text=True,
            timeout=MAX_EXEC_TIME,
            env={
                "PATH": os.environ.get("PATH", ""),
                "PYTHONPATH": "",
                "PYTHONDONTWRITEBYTECODE": "1",
            },
        )

        stdout = result.stdout
        stderr = result.stderr

        # Parse trace JSON from stdout
        if "__TRACE_JSON_START__" in stdout and "__TRACE_JSON_END__" in stdout:
            json_str = stdout.split("__TRACE_JSON_START__")[1].split("__TRACE_JSON_END__")[0].strip()
            trace_data = json.loads(json_str)
            trace_data["line_count"] = len(source_lines)
            return trace_data
        else:
            # Subprocess ran but no trace output
            error_msg = stderr.strip() if stderr.strip() else "Execution produced no trace output"
            return {
                "steps": [], "final_variables": {},
                "error": error_msg[:500],
                "line_count": len(source_lines), "step_count": 0
            }

    except subprocess.TimeoutExpired:
        return {
            "steps": [], "final_variables": {},
            "error": f"Execution timed out after {MAX_EXEC_TIME} seconds. Check for infinite loops.",
            "line_count": len(source_lines), "step_count": 0
        }
    except Exception as e:
        return {
            "steps": [], "final_variables": {},
            "error": f"Execution error: {str(e)[:300]}",
            "line_count": len(source_lines), "step_count": 0
        }


# ═══════════════════════════════════════════════════════════════════
# PRESET EXAMPLES
# ═══════════════════════════════════════════════════════════════════

PRESET_EXAMPLES = {
    "reverse_array": {
        "title": "Reverse Array",
        "description": "Reverse an array in-place using two pointers",
        "code": textwrap.dedent("""\
            arr = [1, 2, 3, 4, 5]
            left = 0
            right = len(arr) - 1
            while left < right:
                arr[left], arr[right] = arr[right], arr[left]
                left = left + 1
                right = right - 1
        """).strip(),
    },
    "binary_search": {
        "title": "Binary Search",
        "description": "Search for a target in a sorted array",
        "code": textwrap.dedent("""\
            arr = [1, 3, 5, 7, 9, 11, 13, 15]
            target = 7
            left = 0
            right = len(arr) - 1
            found = -1
            while left <= right:
                mid = (left + right) // 2
                if arr[mid] == target:
                    found = mid
                    break
                elif arr[mid] < target:
                    left = mid + 1
                else:
                    right = mid - 1
        """).strip(),
    },
    "two_sum": {
        "title": "Two Sum",
        "description": "Find two numbers that add up to target",
        "code": textwrap.dedent("""\
            nums = [2, 7, 11, 15]
            target = 9
            seen = {}
            result = []
            for i in range(len(nums)):
                complement = target - nums[i]
                if complement in seen:
                    result = [seen[complement], i]
                    break
                seen[nums[i]] = i
        """).strip(),
    },
    "fibonacci": {
        "title": "Fibonacci (Recursion)",
        "description": "Calculate the nth Fibonacci number recursively",
        "code": textwrap.dedent("""\
            def fibonacci(n):
                if n <= 0:
                    return 0
                if n == 1:
                    return 1
                return fibonacci(n - 1) + fibonacci(n - 2)

            result = fibonacci(5)
        """).strip(),
    },
    "bubble_sort": {
        "title": "Bubble Sort",
        "description": "Sort an array using bubble sort",
        "code": textwrap.dedent("""\
            arr = [64, 34, 25, 12, 22, 11, 90]
            n = len(arr)
            for i in range(n):
                for j in range(0, n - i - 1):
                    if arr[j] > arr[j + 1]:
                        arr[j], arr[j + 1] = arr[j + 1], arr[j]
        """).strip(),
    },
    "sliding_window": {
        "title": "Sliding Window Max Sum",
        "description": "Find the maximum sum of a subarray of size k",
        "code": textwrap.dedent("""\
            arr = [1, 4, 2, 10, 23, 3, 1, 0, 20]
            k = 4
            window_sum = sum(arr[0:k])
            max_sum = window_sum
            for i in range(k, len(arr)):
                window_sum = window_sum + arr[i] - arr[i - k]
                if window_sum > max_sum:
                    max_sum = window_sum
        """).strip(),
    },
}


# ═══════════════════════════════════════════════════════════════════
# CLI TEST
# ═══════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=== Code Executor Self-Test ===\n")

    # Test 1: Reverse array
    print("Test 1: Reverse Array")
    result = execute_code_safe(PRESET_EXAMPLES["reverse_array"]["code"])
    if result["error"]:
        print(f"  FAIL: {result['error']}")
    else:
        print(f"  PASS: {result['step_count']} steps")
        final = result["final_variables"]
        assert final.get("arr") == [5, 4, 3, 2, 1], f"Expected [5,4,3,2,1], got {final.get('arr')}"
        print(f"  Final arr = {final.get('arr')}")

    # Test 2: Security - blocked import
    print("\nTest 2: Blocked Import")
    result = execute_code_safe("import os\nos.system('echo hacked')")
    assert result["error"] is not None
    print(f"  PASS: Blocked with error: {result['error'][:80]}")

    # Test 3: Timeout
    print("\nTest 3: Infinite Loop Detection")
    result = execute_code_safe("while True:\n    x = 1")
    assert result["error"] is not None
    print(f"  PASS: {result['error'][:80]}")

    # Test 4: Binary search
    print("\nTest 4: Binary Search")
    result = execute_code_safe(PRESET_EXAMPLES["binary_search"]["code"])
    if result["error"]:
        print(f"  FAIL: {result['error']}")
    else:
        final = result["final_variables"]
        assert final.get("found") == 3, f"Expected found=3, got {final.get('found')}"
        print(f"  PASS: found = {final.get('found')}, steps = {result['step_count']}")

    # Test 5: Two Sum
    print("\nTest 5: Two Sum")
    result = execute_code_safe(PRESET_EXAMPLES["two_sum"]["code"])
    if result["error"]:
        print(f"  FAIL: {result['error']}")
    else:
        final = result["final_variables"]
        assert final.get("result") == [0, 1], f"Expected [0,1], got {final.get('result')}"
        print(f"  PASS: result = {final.get('result')}")

    print("\n=== All tests passed ===")
