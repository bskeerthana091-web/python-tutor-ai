import subprocess
import tempfile
import os
import ast
import sys
import json

# Windows does not support the 'resource' module for memory limits.
# For production on Linux, we would use:
# import resource
# def set_limits():
#     resource.setrlimit(resource.RLIMIT_AS, (50 * 1024 * 1024, 50 * 1024 * 1024))

BANNED_IMPORTS = {'os', 'sys', 'subprocess', 'socket', 'requests', 'shutil', 'pathlib'}
BANNED_FUNCTIONS = {'eval', 'exec', 'open', '__import__'}

class SecurityAnalyzer(ast.NodeVisitor):
    def __init__(self):
        self.violations = []

    def visit_Import(self, node):
        for alias in node.names:
            if alias.name.split('.')[0] in BANNED_IMPORTS:
                self.violations.append(f"Importing '{alias.name}' is not allowed.")
        self.generic_visit(node)

    def visit_ImportFrom(self, node):
        if node.module and node.module.split('.')[0] in BANNED_IMPORTS:
            self.violations.append(f"Importing from '{node.module}' is not allowed.")
        self.generic_visit(node)

    def visit_Call(self, node):
        if isinstance(node.func, ast.Name):
            if node.func.id in BANNED_FUNCTIONS:
                self.violations.append(f"Function '{node.func.id}' is not allowed.")
        self.generic_visit(node)

def analyze_code(code):
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        return [f"Syntax Error: {e.msg} at line {e.lineno}"]
        
    analyzer = SecurityAnalyzer()
    analyzer.visit(tree)
    return analyzer.violations

def clean_traceback(stderr: str) -> str:
    if not stderr:
        return ""
    import re
    # Replace temporary directory paths with clean 'main.py' reference matching the editor
    return re.sub(r'File ".*?[\\/](?:main|script)\.py"', 'File "main.py"', stderr)

def execute_code(code: str, timeout: int = 5):
    # 1. Static Analysis Security Check
    violations = analyze_code(code)
    if violations:
        return "", "\n".join(["Security Violation: " + v for v in violations])

    # 2. Create isolated temp directory and write student code directly to main.py
    # No hidden preamble so line numbers in error tracebacks match the user's editor exactly!
    with tempfile.TemporaryDirectory() as tmpdir:
        file_path = os.path.join(tmpdir, "main.py")
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(code)
            
        try:
            env = os.environ.copy()
            env["PYTHONIOENCODING"] = "utf-8"
            process = subprocess.run(
                [sys.executable, "main.py"],
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                env=env,
                timeout=timeout,
                cwd=tmpdir
            )
            return process.stdout, clean_traceback(process.stderr)
            
        except subprocess.TimeoutExpired:
            return "", f"Execution timed out after {timeout} seconds."
        except Exception as e:
            return "", str(e)

def execute_code_with_test_cases(code: str, test_cases: list = None, timeout: int = 5):
    # 1. Run base execution
    stdout, stderr = execute_code(code, timeout=timeout)
    if stderr:
        return stdout, stderr, False, []

    if not test_cases:
        return stdout, "", True, []

    # 2. Run test cases
    results = []
    all_passed = True

    for idx, tc in enumerate(test_cases):
        test_call = tc.get("call", "")
        expected = str(tc.get("expected", "")).strip()
        
        # Construct test execution directly without prepending headers so line numbers remain exact
        if test_call:
            test_script = (
                code
                + "\n\n# Test Run\n"
                + "try:\n"
                + f"    _res = {test_call}\n"
                + "    if _res is not None:\n"
                + "        print('__PYAI_RES__:' + str(_res).strip())\n"
                + "    else:\n"
                + "        print('__PYAI_RES__:[NONE]')\n"
                + "except Exception as _e:\n"
                + "    print('__PYAI_ERR__:' + str(_e))\n"
            )
        else:
            test_script = code

        tc_stdout, tc_stderr = execute_code(test_script, timeout=timeout)
        actual_raw = tc_stdout.strip()

        # Parse delimited result or error
        test_err = None
        extracted_res = None
        for line in actual_raw.splitlines():
            if line.startswith("__PYAI_ERR__:"):
                test_err = line.replace("__PYAI_ERR__:", "").strip()
            elif line.startswith("__PYAI_RES__:"):
                extracted_res = line.replace("__PYAI_RES__:", "").strip()

        if tc_stderr or test_err:
            all_passed = False
            err_detail = test_err or tc_stderr.strip()
            error_msg = f"This code encountered an error for input '{test_call or 'Case ' + str(idx+1)}': {err_detail}"
            results.append({"passed": False, "call": test_call, "expected": expected, "actual": err_detail, "message": error_msg})
        else:
            # Check return value or captured stdout
            if extracted_res is not None and extracted_res != "[NONE]":
                actual_val = extracted_res
            else:
                # Filter out marker lines to get pure printed output
                clean_lines = [l for l in actual_raw.splitlines() if not l.startswith("__PYAI_")]
                actual_val = "\n".join(clean_lines).strip()

            passed = (actual_val == expected or actual_val.endswith(expected))
            # Also try numeric/float equivalence (e.g. 5.0 vs 5)
            if not passed:
                try:
                    passed = (float(actual_val) == float(expected))
                except Exception:
                    pass

            if not passed:
                all_passed = False
                error_msg = f"Output mismatch for '{test_call or 'Case ' + str(idx+1)}'. Expected '{expected}', got '{actual_val}'."
                results.append({"passed": False, "call": test_call, "expected": expected, "actual": actual_val, "message": error_msg})
            else:
                results.append({"passed": True, "call": test_call, "expected": expected, "actual": actual_val, "message": f"Passed test case '{test_call}'"})

    fail_messages = [r["message"] for r in results if not r["passed"]]
    if fail_messages:
        stderr_output = "\n".join(fail_messages)
        return stdout, stderr_output, False, results

    # SUCCESS: Return empty stderr so frontend never interprets success as an error!
    success_text = (stdout.strip() + "\n\n" if stdout.strip() else "") + "✅ All test inputs passed successfully!"
    return success_text, "", True, results


def trace_code_execution(code: str, timeout: int = 5, max_steps: int = 150):
    # 1. Security Check
    violations = analyze_code(code)
    if violations:
        return {"success": False, "error": "\n".join(["Security Violation: " + v for v in violations]), "steps": [], "total_steps": 0}

    # 2. Syntax Check
    try:
        ast.parse(code)
    except SyntaxError as e:
        return {"success": False, "error": f"Syntax Error on line {e.lineno}: {e.msg}", "steps": [], "total_steps": 0}
    except Exception as e:
        return {"success": False, "error": str(e), "steps": [], "total_steps": 0}

    # 3. Create isolated temp directory and run tracer script
    RUNNER_CODE = '''import sys
import io
import json

code_path = "main.py"
with open(code_path, "r", encoding="utf-8") as f:
    code_text = f.read()

code_lines = code_text.splitlines()

steps = []
stdout_capture = io.StringIO()
old_stdout = sys.stdout
prev_vars = {}
max_steps = 150

def trace_func(frame, event, arg):
    if len(steps) >= max_steps:
        return None
    if not frame.f_code.co_filename.endswith("main.py"):
        return trace_func
        
    if event in ("line", "return"):
        locs = {}
        for k, v in frame.f_locals.items():
            if not k.startswith("__"):
                try:
                    if isinstance(v, (int, float, bool, str, list, dict, set, tuple)):
                        locs[k] = repr(v)
                    elif callable(v):
                        locs[k] = f"<function {getattr(v, '__name__', 'func')}>"
                    else:
                        locs[k] = f"<{type(v).__name__}>"
                except Exception:
                    locs[k] = "<object>"
                    
        changed = [k for k, v in locs.items() if k not in prev_vars or prev_vars[k] != v]
        lineno = frame.f_lineno
        line_content = code_lines[lineno - 1].strip() if 1 <= lineno <= len(code_lines) else ""
        
        steps.append({
            "step": len(steps) + 1,
            "line": lineno,
            "event": event,
            "code_line": line_content,
            "variables": dict(locs),
            "changed_vars": changed,
            "stdout": stdout_capture.getvalue(),
            "func_name": frame.f_code.co_name
        })
        prev_vars.clear()
        prev_vars.update(locs)
        
    return trace_func

sys.stdout = stdout_capture
try:
    with open("main.py", "r", encoding="utf-8") as f:
        compiled = compile(f.read(), "main.py", "exec")
    sys.settrace(trace_func)
    exec(compiled, {"__name__": "__main__"})
except Exception as e:
    steps.append({
        "step": len(steps) + 1,
        "line": getattr(e, "lineno", len(code_lines)),
        "event": "error",
        "code_line": f"Error: {type(e).__name__}: {str(e)}",
        "variables": dict(prev_vars),
        "changed_vars": [],
        "stdout": stdout_capture.getvalue(),
        "error": f"{type(e).__name__}: {str(e)}"
    })
finally:
    sys.settrace(None)
    sys.stdout = old_stdout

print("__JSON_START__")
print(json.dumps({
    "steps": steps,
    "stdout": stdout_capture.getvalue()
}))
print("__JSON_END__")
'''

    with tempfile.TemporaryDirectory() as tmpdir:
        main_path = os.path.join(tmpdir, "main.py")
        runner_path = os.path.join(tmpdir, "runner.py")
        with open(main_path, "w", encoding="utf-8") as f:
            f.write(code)
        with open(runner_path, "w", encoding="utf-8") as f:
            f.write(RUNNER_CODE)
            
        try:
            env = os.environ.copy()
            env["PYTHONIOENCODING"] = "utf-8"
            proc = subprocess.run(
                [sys.executable, "runner.py"],
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                env=env,
                timeout=timeout,
                cwd=tmpdir
            )
            raw = proc.stdout
            if "__JSON_START__" in raw and "__JSON_END__" in raw:
                json_part = raw.split("__JSON_START__")[1].split("__JSON_END__")[0].strip()
                parsed = json.loads(json_part)
                return {
                    "success": True,
                    "steps": parsed.get("steps", []),
                    "total_steps": len(parsed.get("steps", [])),
                    "stdout": parsed.get("stdout", ""),
                    "error": None
                }
            elif proc.stderr:
                return {
                    "success": False,
                    "error": clean_traceback(proc.stderr),
                    "steps": [],
                    "total_steps": 0
                }
            else:
                return {
                    "success": True,
                    "steps": [],
                    "total_steps": 0,
                    "stdout": raw,
                    "error": None
                }
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "error": f"Execution timed out after {timeout} seconds (infinite loop detected).",
                "steps": [],
                "total_steps": 0
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "steps": [],
                "total_steps": 0
            }


