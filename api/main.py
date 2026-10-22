from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Dict, List
import json
import asyncio
import ast
import datetime as dt

from database import get_db, Student, Submission, Progress, CompletedChallenge, CompletedQuest
from sandbox import execute_code, execute_code_with_test_cases, trace_code_execution
from plagiarism import PlagiarismDetector, get_embedding, cosine_similarity
import numpy as np
from pydantic import BaseModel

app = FastAPI(title="Python AI Tutor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

frontend_dist_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))
if os.path.exists(frontend_dist_dir):
    assets_dir = os.path.join(frontend_dist_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

# --- Python Knowledge Base for Semantic Tutor Q&A ---
KNOWLEDGE_BASE = [
    {
        "keys": ["what is python", "about python", "tell me about python", "python language", "why python"],
        "answer": "Python is a high-level, interpreted, general-purpose programming language. Its design philosophy emphasizes code readability with the use of significant indentation. Its language constructs and object-oriented approach aim to help programmers write clear, logical code for small and large-scale projects."
    },
    {
        "keys": ["variable", "define variable", "variables in python", "declare variable", "how to store data", "types of variables"],
        "answer": "A variable in Python is a named location used to store data in memory. Unlike static languages, you don't need to declare a variable's type before using it; Python dynamically infers it.\n\nExample:\n```python\nx = 10          # Integer\npi = 3.14159    # Float\nname = \"Keerthana\"   # String\nis_active = True # Boolean\n\nprint(name)     # Output: Keerthana\n```"
    },
    {
        "keys": ["loops", "for loop", "while loop", "how to repeat code", "iteration", "range function"],
        "answer": "Python supports two main types of loops for repeating actions:\n\n1. For Loop (iterates over a sequence or range):\n```python\nfor i in range(1, 6):\n    print(f\"Number {i}\")\n```\n\n2. While Loop (repeats as long as a condition is True):\n```python\ncount = 0\nwhile count < 3:\n    print(f\"Count: {count}\")\n    count += 1\n```"
    },
    {
        "keys": ["lists", "list", "array", "how to append", "list methods", "indexing", "slice list"],
        "answer": "A List in Python is an ordered, mutable (changeable) collection of items. Lists are defined using square brackets [].\n\nExample:\n```python\nfruits = [\"apple\", \"banana\"]\nfruits.append(\"cherry\")   # Adds to the end\nfruits.insert(1, \"mango\") # Inserts at index 1\n\nprint(fruits)          # Output: ['apple', 'mango', 'banana', 'cherry']\nprint(fruits[0])       # Output: 'apple' (0-indexed)\n```"
    },
    {
        "keys": ["dictionaries", "dictionary", "dict", "key value pairs", "map", "retrieve values"],
        "answer": "A Dictionary stores data as key: value pairs. Keys must be unique and immutable (like strings or integers). Dictionaries are defined using curly braces {}.\n\nExample:\n```python\nstudent = {\n    \"name\": \"Keerthana\",\n    \"score\": 95,\n    \"topic\": \"Python OOP\"\n}\n\nprint(student[\"name\"])  # Output: Keerthana\nstudent[\"grade\"] = \"A\"  # Add a new key-value pair\n```"
    },
    {
        "keys": ["functions", "define function", "how to write a function", "parameters", "arguments", "return statement"],
        "answer": "A Function is a reusable block of code designed to perform a specific task. You define functions using the def keyword.\n\nExample:\n```python\ndef greet_user(name):\n    return f\"Hello, {name}! Welcome to PyAI Tutor.\"\n\nmessage = greet_user(\"Keerthana\")\nprint(message)  # Output: Hello, Keerthana! Welcome to PyAI Tutor.\n```"
    },
    {
        "keys": ["classes", "oop", "object oriented programming", "class", "objects", "init method", "self keyword", "inheritance"],
        "answer": "Python supports Object-Oriented Programming (OOP) through Classes and Objects.\n\n- Class: A blueprint or template for creating objects.\n- __init__: The constructor method, used to initialize object attributes.\n\nExample:\n```python\nclass StudentProfile:\n    def __init__(self, name, xp):\n        self.name = name\n        self.xp = xp\n\n    def show_profile(self):\n        return f\"Student: {self.name} has {self.xp} XP points.\"\n\n# Create an object instance\nprofile = StudentProfile(\"Keerthana\", 350)\nprint(profile.show_profile())\n```"
    },
    {
        "keys": ["exception", "handle error", "try except", "errors", "zero division", "finally block"],
        "answer": "Exceptions in Python are handled using try and except blocks to prevent your application from crashing when an error occurs.\n\nExample:\n```python\ntry:\n    number = 10 / 0\nexcept ZeroDivisionError:\n    print(\"Error: You cannot divide a number by zero.\")\nfinally:\n    print(\"Execution completed.\")\n```"
    },
    {
        "keys": ["recursion", "recursive function", "factorial", "function calls itself"],
        "answer": "Recursion is a programming technique where a function calls itself to solve a smaller instance of the same problem. It requires a base case to terminate.\n\nExample (Factorial of 5):\n```python\ndef factorial(n):\n    if n <= 1:  # Base Case\n        return 1\n    return n * factorial(n - 1)  # Recursive call\n\nprint(factorial(5))  # Output: 120\n```"
    },
    {
        "keys": ["simple code", "python example", "write a simple code", "give me code", "sample code", "hello world"],
        "answer": "Here is a simple, complete Python program that iterates through a list of scores and filters out those above 80:\n\n```python\nscores = [45, 82, 95, 60, 88]\nhigh_scores = []\n\nfor score in scores:\n    if score > 80:\n        high_scores.append(score)\n\nprint(\"Scores above 80:\", high_scores)  # Output: [82, 95, 88]\n```\nTry pasting this code in the editor on the right and click Run Code to watch it execute!"
    },
    {
        "keys": ["run code", "sandbox", "ast check", "execute code", "how to compile"],
        "answer": "When you click the Run Code button, the platform runs secure static analysis using Python's AST (Abstract Syntax Tree) to block dangerous library imports (e.g. os, sys, subprocess) and executes the script in an isolated process with a strict 5-second timeout."
    }
]

@app.on_event("startup")
def startup_event():
    print("Pre-calculating Knowledge Base embeddings...")
    for item in KNOWLEDGE_BASE:
        item["embeddings"] = [get_embedding(k) for k in item["keys"]]
    print("Knowledge Base embeddings initialized!")

# --- Pydantic Models ---
class QuestionRequest(BaseModel):
    question: str

class CodeExecutionRequest(BaseModel):
    student_id: int
    code: str
    time_spent: int = 10
    test_cases: List[dict] = []

class ProgressRequest(BaseModel):
    student_id: int
    topic: str
    score: float
    time_spent: int
    mistakes: int

# --- API Endpoints ---

@app.get("/")
def read_root():
    index_html = os.path.join(frontend_dist_dir, "index.html")
    if os.path.exists(index_html):
        return FileResponse(index_html)
    return {"message": "Welcome to Python AI Tutor API"}

@app.get("/api/health")
def api_health():
    return {"status": "ok", "service": "Python AI Tutor API"}

def clean_answer(text: str) -> str:
    if not text:
        return ""
    # Strip all markdown asterisks so no '*' symbol ever appears in any answer
    cleaned = text.replace("**", "").replace("*", "-")
    while "--" in cleaned:
        cleaned = cleaned.replace("--", "-")
    return cleaned.replace("*", "")

@app.post("/ask")
def ask_ai(req: QuestionRequest):
    user_query = req.question.strip()
    if not user_query:
        return {"answer": "Hi! Please type a question about Python and I'll explain it."}
    
    query_emb = get_embedding(user_query)
    
    best_match_score = -1
    best_answer = None
    
    # Calculate similarity matches
    for item in KNOWLEDGE_BASE:
        for emb in item["embeddings"]:
            sim = cosine_similarity(query_emb, emb)
            if sim > best_match_score:
                best_match_score = sim
                best_answer = item["answer"]
                
    # If the semantic similarity is strong enough, return it
    if best_match_score > 0.45:
        return {"answer": clean_answer(best_answer)}
    
    # Fallback to direct keyword matches
    query_lower = user_query.lower()
    for item in KNOWLEDGE_BASE:
        for key in item["keys"]:
            if key in query_lower:
                return {"answer": clean_answer(item["answer"])}
                
    # Generic intelligent response
    return {
        "answer": clean_answer(f"I see you are asking about '{user_query}'. I am your PyAI Tutor, specializing in Python syntax and features. Try asking me about variables, loops, lists, dictionaries, functions, or classes, or type Python code in the compiler on the right to run it!")
    }

@app.post("/explain")
def explain_topic(topic: str, level: str):
    return {"explanation": f"Explaining {topic} at {level} level."}

@app.post("/analyze")
def analyze_code_req(code: str, error: str):
    # Pass code and error to AI model to get suggestion
    return {"suggestion": "Check line 4. It looks like you missed a colon at the end of the if statement."}

@app.post("/execute")
def execute_python(req: CodeExecutionRequest, db: Session = Depends(get_db)):
    if req.test_cases:
        stdout, stderr, all_passed, test_results = execute_code_with_test_cases(req.code, req.test_cases)
    else:
        stdout, stderr = execute_code(req.code)
        all_passed = True if not stderr else False
        test_results = []
    
    # Plagiarism Check
    detector = PlagiarismDetector(db)
    is_plagiarized, sim_score = detector.check_submission(req.student_id, req.code, req.time_spent)
    
    # Save submission
    embedding_json = json.dumps(get_embedding(req.code).tolist())
    sub = Submission(
        student_id=req.student_id,
        code=req.code,
        output=stdout,
        error=stderr,
        embedding=embedding_json
    )
    db.add(sub)
    db.commit()
    
    return {
        "stdout": stdout, 
        "stderr": stderr, 
        "passed": all_passed,
        "test_results": test_results,
        "plagiarism_flagged": is_plagiarized,
        "similarity_score": sim_score
    }

# --- Adaptive Quiz Bank (Expanded Multi-Topic Curriculum) ---
QUIZ_BANK = {
    "Variables": {
        "Beginner": [
            {
                "id": 1,
                "question": "Which of the following is a valid Python variable name?",
                "options": ["my_var", "2myvar", "my-var", "my var"],
                "answer": "my_var",
                "explanation": "Variable names must start with a letter or underscore, and can only contain letters, numbers, and underscores."
            },
            {
                "id": 2,
                "question": "How do you create a variable named x with the numeric value 5?",
                "options": ["x = 5", "int x = 5", "x := 5", "var x = 5"],
                "answer": "x = 5",
                "explanation": "In Python, variables are created by assignment without declaring the data type."
            },
            {
                "id": 101,
                "question": "What is the data type of the value 3.14 in Python?",
                "options": ["float", "int", "double", "decimal"],
                "answer": "float",
                "explanation": "Numbers with decimal points are classified as float in Python."
            },
            {
                "id": 121,
                "question": "What is the result of type('123') in Python?",
                "options": ["<class 'str'>", "<class 'int'>", "<class 'number'>", "<class 'text'>"],
                "answer": "<class 'str'>",
                "explanation": "Any value enclosed in quotation marks is of type str (string)."
            },
            {
                "id": 122,
                "question": "Which operator is used to calculate the remainder of division in Python?",
                "options": ["%", "//", "/", "**"],
                "answer": "%",
                "explanation": "The modulus operator % returns the remainder of the division."
            },
            {
                "id": 123,
                "question": "How do you convert the string '42' into an integer?",
                "options": ["int('42')", "str(42)", "float('42')", "parse('42')"],
                "answer": "int('42')",
                "explanation": "The int() built-in constructor converts a valid numeric string into an integer."
            }
        ],
        "Intermediate": [
            {
                "id": 3,
                "question": "What is the output of: x, y = 5, 'hello'; print(type(y))",
                "options": ["<class 'str'>", "<class 'int'>", "<class 'tuple'>", "SyntaxError"],
                "answer": "<class 'str'>",
                "explanation": "Python supports multiple assignment. y is assigned the string 'hello'."
            },
            {
                "id": 102,
                "question": "Which function converts an integer to its binary string representation?",
                "options": ["bin()", "binary()", "to_bin()", "hex()"],
                "answer": "bin()",
                "explanation": "bin() converts an integer to a binary string prefixed with '0b'."
            },
            {
                "id": 124,
                "question": "What will bool(0) and bool('False') evaluate to?",
                "options": ["False and True", "False and False", "True and True", "True and False"],
                "answer": "False and True",
                "explanation": "0 is falsy, but non-empty strings including 'False' evaluate to True."
            },
            {
                "id": 125,
                "question": "What is the result of: a = [1]; b = a; b += [2]; print(a)",
                "options": ["[1, 2]", "[1]", "[2]", "TypeError"],
                "answer": "[1, 2]",
                "explanation": "The in-place operator += mutates the existing list object referred to by both a and b."
            },
            {
                "id": 126,
                "question": "Which keyword is used to declare that a variable inside a function is from the outer non-global scope?",
                "options": ["nonlocal", "global", "outer", "scope"],
                "answer": "nonlocal",
                "explanation": "nonlocal allows you to reassign variables in the nearest enclosing non-global scope."
            }
        ],
        "Advanced": [
            {
                "id": 4,
                "question": "What happens when you run: x = [1, 2]; y = x; y.append(3); print(x)",
                "options": ["[1, 2, 3]", "[1, 2]", "AttributeError", "TypeError"],
                "answer": "[1, 2, 3]",
                "explanation": "Lists are mutable and variables hold references. y = x binds y to the same list object as x."
            },
            {
                "id": 103,
                "question": "What is the id() function in Python used for?",
                "options": ["Unique memory identity of an object", "Database primary key", "Type identification", "Variable name string"],
                "answer": "Unique memory identity of an object",
                "explanation": "id() returns the identity of an object, which is guaranteed to be unique and constant for this object during its lifetime."
            },
            {
                "id": 127,
                "question": "What does the 'is' keyword compare in Python?",
                "options": ["Memory identity (same object)", "Value equality", "Data type only", "Hash equality"],
                "answer": "Memory identity (same object)",
                "explanation": "'is' checks if two variables refer to the exact same object in memory, while '==' compares values."
            },
            {
                "id": 128,
                "question": "Why does a, b = (1, 2) work in Python?",
                "options": ["Sequence tuple unpacking", "Type coercion", "Automatic referencing", "Dynamic pointer arithmetic"],
                "answer": "Sequence tuple unpacking",
                "explanation": "Python unpacks the elements of the iterable tuple into individual variable names."
            },
            {
                "id": 129,
                "question": "What happens when defining a function with a mutable default argument like def f(x=[]): x.append(1); return x?",
                "options": ["The list persists and grows across subsequent calls", "A fresh list is created every call", "Raises a SyntaxError", "Raises a ValueError"],
                "answer": "The list persists and grows across subsequent calls",
                "explanation": "Default argument expressions are evaluated once when the function is defined, so the same mutable list object is shared."
            }
        ]
    },
    "Loops": {
        "Beginner": [
            {
                "id": 5,
                "question": "What is the output of: for i in range(3): print(i)",
                "options": ["0 1 2", "1 2 3", "0 1 2 3", "1 2"],
                "answer": "0 1 2",
                "explanation": "range(3) generates numbers starting from 0 up to (but not including) 3."
            },
            {
                "id": 104,
                "question": "Which keyword is used to skip the rest of the current loop iteration?",
                "options": ["continue", "break", "pass", "skip"],
                "answer": "continue",
                "explanation": "'continue' ends the current iteration and jumps to the next cycle of the loop."
            },
            {
                "id": 130,
                "question": "How many times does 'while False:' execute?",
                "options": ["0 times", "1 time", "Infinite times", "Depends on condition"],
                "answer": "0 times",
                "explanation": "Since the condition is False from the start, the loop body never runs."
            },
            {
                "id": 131,
                "question": "What does range(2, 6) produce?",
                "options": ["2, 3, 4, 5", "2, 3, 4, 5, 6", "0, 1, 2, 3, 4, 5", "2, 4, 6"],
                "answer": "2, 3, 4, 5",
                "explanation": "range(start, stop) starts at 2 and stops before 6."
            },
            {
                "id": 132,
                "question": "Which function provides both the index and the value while looping over a list?",
                "options": ["enumerate()", "zip()", "range()", "index()"],
                "answer": "enumerate()",
                "explanation": "enumerate() yields (index, item) pairs as you iterate."
            }
        ],
        "Intermediate": [
            {
                "id": 6,
                "question": "How do you break out of a loop prematurely in Python?",
                "options": ["break", "stop", "exit", "continue"],
                "answer": "break",
                "explanation": "The 'break' statement terminates the loop containing it immediately."
            },
            {
                "id": 105,
                "question": "What is the output of: i = 1; while i < 4: i += 1; print(i)",
                "options": ["4", "3", "1 2 3 4", "Infinite Loop"],
                "answer": "4",
                "explanation": "The loop increments i until it reaches 4, and print(i) outputs 4."
            },
            {
                "id": 133,
                "question": "What is the output of: list(range(10, 0, -2))?",
                "options": ["[10, 8, 6, 4, 2]", "[10, 8, 6, 4, 2, 0]", "[8, 6, 4, 2, 0]", "[]"],
                "answer": "[10, 8, 6, 4, 2]",
                "explanation": "A negative step decrements from 10 down towards but not including 0."
            },
            {
                "id": 134,
                "question": "What does zip([1, 2], ['a', 'b']) yield when iterated?",
                "options": ["(1, 'a') and (2, 'b')", "[1, 'a', 2, 'b']", "[(1, 2), ('a', 'b')]", "{1: 'a', 2: 'b'}"],
                "answer": "(1, 'a') and (2, 'b')",
                "explanation": "zip pairs elements from each iterable at corresponding positions into tuples."
            },
            {
                "id": 135,
                "question": "What happens if you use 'pass' inside a loop body?",
                "options": ["Nothing, it acts as a null statement placeholder", "Skips to next iteration", "Exits the loop", "Raises an exception"],
                "answer": "Nothing, it acts as a null statement placeholder",
                "explanation": "'pass' is a no-operation statement used when syntactically a statement is required."
            }
        ],
        "Advanced": [
            {
                "id": 7,
                "question": "What is the output of: print([x for x in range(5) if x % 2 == 0])",
                "options": ["[0, 2, 4]", "[2, 4]", "[0, 1, 2, 3, 4]", "SyntaxError"],
                "answer": "[0, 2, 4]",
                "explanation": "This list comprehension filters out odd numbers, returning even numbers 0, 2, and 4."
            },
            {
                "id": 106,
                "question": "When does the 'else' block in a Python 'for ... else' loop execute?",
                "options": ["When the loop completes without hitting a 'break'", "Only if an error occurs", "Every iteration", "When the loop breaks"],
                "answer": "When the loop completes without hitting a 'break'",
                "explanation": "The else block of a loop executes only if the loop finishes normally without being terminated by a break statement."
            },
            {
                "id": 136,
                "question": "What type of object does a generator expression (x*2 for x in range(5)) create?",
                "options": ["A generator iterator", "A list", "A tuple", "A range object"],
                "answer": "A generator iterator",
                "explanation": "Parentheses around a comprehension produce a memory-efficient generator iterator."
            },
            {
                "id": 137,
                "question": "Which method on an iterator retrieves the next item?",
                "options": ["next() or __next__()", "get()", "advance()", "step()"],
                "answer": "next() or __next__()",
                "explanation": "The built-in next(iter) calls the iterator's __next__() method."
            },
            {
                "id": 138,
                "question": "What exception is raised when an iterator has no more items to produce?",
                "options": ["StopIteration", "IndexError", "ValueError", "EndError"],
                "answer": "StopIteration",
                "explanation": "Python iterators raise StopIteration to signal that iteration is finished."
            }
        ]
    },
    "Functions": {
        "Beginner": [
            {
                "id": 107,
                "question": "Which keyword is used to declare a function in Python?",
                "options": ["def", "function", "fn", "define"],
                "answer": "def",
                "explanation": "'def' begins a function definition in Python."
            },
            {
                "id": 108,
                "question": "What is the default return value of a Python function that does not have a return statement?",
                "options": ["None", "0", "False", "undefined"],
                "answer": "None",
                "explanation": "Functions without an explicit return statement implicitly return None."
            },
            {
                "id": 139,
                "question": "How do you call a function named calculate_area that takes width and height?",
                "options": ["calculate_area(5, 10)", "call calculate_area(5, 10)", "run calculate_area[5, 10]", "calculate_area: 5, 10"],
                "answer": "calculate_area(5, 10)",
                "explanation": "Functions are invoked by placing parentheses with arguments after the function name."
            },
            {
                "id": 140,
                "question": "What are the variables defined in a function header called?",
                "options": ["Parameters", "Arguments", "Constants", "Literals"],
                "answer": "Parameters",
                "explanation": "Parameters are defined in the function signature; arguments are the actual values passed in during invocation."
            },
            {
                "id": 141,
                "question": "Can a Python function return multiple values separated by commas?",
                "options": ["Yes, it returns them as a tuple", "No, Python only allows returning one value", "Only if returning integers", "Only with an array"],
                "answer": "Yes, it returns them as a tuple",
                "explanation": "Returning 'return a, b' automatically packs the values into a tuple."
            }
        ],
        "Intermediate": [
            {
                "id": 109,
                "question": "What does args in a function parameter list like def f(*args) allow you to do?",
                "options": ["Pass an arbitrary number of positional arguments", "Pass keyword arguments as a dictionary", "Create global variables", "Enforce static types"],
                "answer": "Pass an arbitrary number of positional arguments",
                "explanation": "args prefixed with a single asterisk collects variable positional arguments into a tuple."
            },
            {
                "id": 110,
                "question": "What is a lambda function in Python?",
                "options": ["An anonymous, single-expression function", "A recursive function", "A class constructor", "A multithreaded worker"],
                "answer": "An anonymous, single-expression function",
                "explanation": "Lambda functions are small anonymous functions defined with the lambda keyword."
            },
            {
                "id": 142,
                "question": "What does kwargs in def f(**kwargs) capture?",
                "options": ["Arbitrary keyword arguments as a dictionary", "Positional arguments as a list", "Only string variables", "Global variables"],
                "answer": "Arbitrary keyword arguments as a dictionary",
                "explanation": "Two asterisks before a parameter name collect arbitrary keyword arguments into a dict."
            },
            {
                "id": 143,
                "question": "What is recursion in programming?",
                "options": ["A function calling itself until a base condition is met", "A loop that never ends", "Importing external packages", "Memory reallocation"],
                "answer": "A function calling itself until a base condition is met",
                "explanation": "Recursion occurs when a function calls itself to solve smaller sub-problems."
            },
            {
                "id": 144,
                "question": "What is the purpose of docstrings in Python functions?",
                "options": ["To document the function and populate the help() text", "To define variable types", "To speed up execution", "To check syntax"],
                "answer": "To document the function and populate the help() text",
                "explanation": "Triple-quoted strings placed right under def serve as official docstrings accessible via __doc__."
            }
        ],
        "Advanced": [
            {
                "id": 111,
                "question": "What is a closure in Python?",
                "options": ["A nested function that retains access to variables in its enclosing scope", "A function that terminates a process", "A syntax error handler", "A method decorator"],
                "answer": "A nested function that retains access to variables in its enclosing scope",
                "explanation": "A closure is a function object that remembers values in enclosing scopes even if they are not present in memory."
            },
            {
                "id": 145,
                "question": "What does a decorator in Python do?",
                "options": ["Wraps another function to modify or extend its behavior", "Deletes unused variables", "Formats source code indentation", "Compiles code to C"],
                "answer": "Wraps another function to modify or extend its behavior",
                "explanation": "Decorators take a function as input and return an augmented function."
            },
            {
                "id": 146,
                "question": "Which module provides functools.wraps to preserve function metadata in decorators?",
                "options": ["functools", "itertools", "sys", "inspect"],
                "answer": "functools",
                "explanation": "functools.wraps copies the original function's name and docstring to the wrapper."
            },
            {
                "id": 147,
                "question": "What keyword is used in generator functions to yield values one by one?",
                "options": ["yield", "return", "produce", "emit"],
                "answer": "yield",
                "explanation": "The 'yield' statement produces a value and suspends function execution until the next request."
            },
            {
                "id": 148,
                "question": "What is function currying?",
                "options": ["Translating a function taking multiple arguments into a sequence of functions taking single arguments", "Cooking with spice in Python", "Caching function return values", "Parallel execution"],
                "answer": "Translating a function taking multiple arguments into a sequence of functions taking single arguments",
                "explanation": "Currying decomposes a multi-argument function into a chain of nested single-argument functions."
            }
        ]
    },
    "Lists": {
        "Beginner": [
            {
                "id": 112,
                "question": "Which method is used to add an element to the end of a list in Python?",
                "options": ["append()", "push()", "add()", "insert()"],
                "answer": "append()",
                "explanation": "append() adds a single element to the end of the list."
            },
            {
                "id": 113,
                "question": "What is the index of the first element in a Python list?",
                "options": ["0", "1", "-1", "None"],
                "answer": "0",
                "explanation": "Python lists are zero-indexed."
            },
            {
                "id": 149,
                "question": "How do you find the total number of items in a list?",
                "options": ["len(list)", "list.length()", "list.size()", "count(list)"],
                "answer": "len(list)",
                "explanation": "len() is the standard Python built-in function to get length."
            },
            {
                "id": 150,
                "question": "What does list[-1] refer to in Python?",
                "options": ["The last element", "The first element", "An invalid index", "None"],
                "answer": "The last element",
                "explanation": "Negative indexing counts backward from the end, where -1 is the last item."
            },
            {
                "id": 151,
                "question": "Which method removes and returns the last element from a list?",
                "options": ["pop()", "remove()", "delete()", "discard()"],
                "answer": "pop()",
                "explanation": "pop() without arguments removes and returns the item at the highest index."
            }
        ],
        "Intermediate": [
            {
                "id": 114,
                "question": "What does list[1:4] return for list = [10, 20, 30, 40, 50]?",
                "options": ["[20, 30, 40]", "[10, 20, 30]", "[20, 30, 40, 50]", "[10, 20, 30, 40]"],
                "answer": "[20, 30, 40]",
                "explanation": "Slicing starts at index 1 (20) and goes up to but not including index 4 (50)."
            },
            {
                "id": 152,
                "question": "What does list[::-1] do in Python?",
                "options": ["Reverses the list", "Deletes the list", "Sorts the list", "Doubles the list"],
                "answer": "Reverses the list",
                "explanation": "A slice with a step of -1 traverses from right to left, reversing the sequence."
            },
            {
                "id": 153,
                "question": "What is the difference between append() and extend() on a list?",
                "options": ["append adds one object; extend unpacks an iterable into items", "There is no difference", "extend adds to the beginning", "append is faster"],
                "answer": "append adds one object; extend unpacks an iterable into items",
                "explanation": "extend() iterates over its argument adding each element, whereas append() adds the argument as a single element."
            },
            {
                "id": 154,
                "question": "What does [1, 2] + [3, 4] produce in Python?",
                "options": ["[1, 2, 3, 4]", "[4, 6]", "[[1, 2], [3, 4]]", "TypeError"],
                "answer": "[1, 2, 3, 4]",
                "explanation": "The '+' operator on lists concatenates them into a new combined list."
            },
            {
                "id": 155,
                "question": "How do you count how many times the value 5 appears in a list?",
                "options": ["list.count(5)", "count(list, 5)", "list.find(5)", "len(list, 5)"],
                "answer": "list.count(5)",
                "explanation": "The count() method returns the number of occurrences of the specified value."
            }
        ],
        "Advanced": [
            {
                "id": 115,
                "question": "What is the difference between list.sort() and sorted(list)?",
                "options": ["sort() modifies in place; sorted() returns a new sorted list", "sort() is slower", "sorted() only works on tuples", "There is no difference"],
                "answer": "sort() modifies in place; sorted() returns a new sorted list",
                "explanation": "list.sort() modifies the list in-place and returns None, while sorted() returns a new list."
            },
            {
                "id": 156,
                "question": "What is the time complexity of looking up an item by index in a Python list (e.g. list[i])?",
                "options": ["O(1)", "O(n)", "O(log n)", "O(n^2)"],
                "answer": "O(1)",
                "explanation": "Python lists are implemented as dynamic contiguous arrays of pointers, giving constant O(1) random access."
            },
            {
                "id": 157,
                "question": "What is the difference between copy.copy() and copy.deepcopy() for nested lists?",
                "options": ["deepcopy copies recursively all nested objects; copy creates shallow references", "They are identical", "copy is only for tuples", "deepcopy converts lists to strings"],
                "answer": "deepcopy copies recursively all nested objects; copy creates shallow references",
                "explanation": "Shallow copy shares child objects, whereas deepcopy creates full independent copies recursively."
            },
            {
                "id": 158,
                "question": "What does [x**2 for x in range(10) if x % 2 == 1] compute?",
                "options": ["Squares of all odd numbers from 0 to 9", "Squares of all even numbers", "Numbers divisible by 2", "SyntaxError"],
                "answer": "Squares of all odd numbers from 0 to 9",
                "explanation": "It iterates through 0-9, keeps odd numbers (1, 3, 5, 7, 9) and squares them."
            },
            {
                "id": 159,
                "question": "Why is inserting at index 0 (list.insert(0, val)) O(n) in Python lists?",
                "options": ["Every subsequent element must be shifted in memory", "Python searches for duplicates", "Lists are linked lists", "Memory reallocation is always triggered"],
                "answer": "Every subsequent element must be shifted in memory",
                "explanation": "Because array elements are stored contiguously, inserting at the start requires shifting all N elements one position to the right."
            }
        ]
    },
    "Dictionaries": {
        "Beginner": [
            {
                "id": 116,
                "question": "Which brackets are used to create a dictionary in Python?",
                "options": ["{}", "[]", "()", "<>"],
                "answer": "{}",
                "explanation": "Dictionaries use curly braces {} with key: value pairs."
            },
            {
                "id": 160,
                "question": "How do you access the value associated with key 'name' in dict user?",
                "options": ["user['name']", "user.name", "user(name)", "user->name"],
                "answer": "user['name']",
                "explanation": "Values in dictionaries are accessed using square brackets with the key name."
            },
            {
                "id": 161,
                "question": "How do you add a new key 'age' with value 25 to dictionary d?",
                "options": ["d['age'] = 25", "d.add('age', 25)", "d.insert('age', 25)", "d.push('age', 25)"],
                "answer": "d['age'] = 25",
                "explanation": "Assignment to a new key creates the key-value pair in the dictionary."
            },
            {
                "id": 162,
                "question": "Which keyword checks if a key exists in a dictionary?",
                "options": ["in", "has", "contains", "exists"],
                "answer": "in",
                "explanation": "'key in dict' checks for membership among keys and returns True or False."
            },
            {
                "id": 163,
                "question": "Which method returns all keys in a dictionary?",
                "options": ["keys()", "all_keys()", "get_keys()", "names()"],
                "answer": "keys()",
                "explanation": "dict.keys() returns a view object of all dictionary keys."
            }
        ],
        "Intermediate": [
            {
                "id": 117,
                "question": "What does dict.get('missing_key', 0) return if 'missing_key' is not in the dictionary?",
                "options": ["0", "KeyError", "None", "False"],
                "answer": "0",
                "explanation": "The get() method returns the specified default value (0) if the key is not found, avoiding a KeyError."
            },
            {
                "id": 164,
                "question": "What does dict.items() return?",
                "options": ["(key, value) pairs as tuples", "Only keys", "Only values", "A list of strings"],
                "answer": "(key, value) pairs as tuples",
                "explanation": "dict.items() provides view pairs of (key, value) useful in for loops."
            },
            {
                "id": 165,
                "question": "What does the update() method do on a dictionary?",
                "options": ["Merges keys and values from another dictionary", "Sorts the dictionary", "Clears the dictionary", "Changes dictionary type"],
                "answer": "Merges keys and values from another dictionary",
                "explanation": "update() adds or overwrites key-value pairs from another dict or iterable."
            },
            {
                "id": 166,
                "question": "How do you remove a key and return its value from a dictionary?",
                "options": ["dict.pop('key')", "dict.remove('key')", "del dict['key']", "dict.discard('key')"],
                "answer": "dict.pop('key')",
                "explanation": "pop('key') deletes the key and returns its associated value."
            },
            {
                "id": 167,
                "question": "What does {k: v for k, v in [('a', 1), ('b', 2)]} produce?",
                "options": ["{'a': 1, 'b': 2}", "[('a', 1), ('b', 2)]", "{'a', 'b', 1, 2}", "TypeError"],
                "answer": "{'a': 1, 'b': 2}",
                "explanation": "This is a dictionary comprehension creating a dictionary from key-value tuples."
            }
        ],
        "Advanced": [
            {
                "id": 118,
                "question": "Can a Python list be used as a dictionary key?",
                "options": ["No, because lists are mutable and unhashable", "Yes, any object can be a key", "Yes, if the list is sorted", "Only if it contains integers"],
                "answer": "No, because lists are mutable and unhashable",
                "explanation": "Dictionary keys must be hashable and immutable. Lists are mutable and raise TypeError: unhashable type: 'list'."
            },
            {
                "id": 168,
                "question": "What average time complexity does dictionary key lookup have in Python?",
                "options": ["O(1)", "O(n)", "O(log n)", "O(n^2)"],
                "answer": "O(1)",
                "explanation": "Python dictionaries use hash tables, giving average O(1) constant time lookup."
            },
            {
                "id": 169,
                "question": "What does collections.defaultdict(int) return for an uninitialized key?",
                "options": ["0", "KeyError", "None", "Empty string"],
                "answer": "0",
                "explanation": "defaultdict calls int() when a missing key is accessed, yielding 0 automatically."
            },
            {
                "id": 170,
                "question": "Since Python 3.7, how do standard dictionaries behave regarding key ordering?",
                "options": ["They preserve insertion order", "They sort keys alphabetically", "Order is random", "Order depends on hash value"],
                "answer": "They preserve insertion order",
                "explanation": "Insertion order preservation is an official language guarantee since Python 3.7."
            },
            {
                "id": 171,
                "question": "Which operator merges two dictionaries in Python 3.9+ (e.g. d1 | d2)?",
                "options": ["|", "+", "&", "^"],
                "answer": "|",
                "explanation": "The union operator | merges two dictionaries, with right-side values taking precedence."
            }
        ]
    },
    "Conditionals": {
        "Beginner": [
            {
                "id": 172,
                "question": "Which keyword is used for 'else if' in Python?",
                "options": ["elif", "else if", "elseif", "elsif"],
                "answer": "elif",
                "explanation": "Python uses the concise keyword 'elif' for chaining conditional branches."
            },
            {
                "id": 173,
                "question": "Which character must come at the end of an 'if' statement line in Python?",
                "options": [":", ";", "{", "then"],
                "answer": ":",
                "explanation": "In Python, a colon : terminates header statements like if, for, while, def."
            },
            {
                "id": 174,
                "question": "What is the boolean operator for logical AND in Python?",
                "options": ["and", "&&", "&", "AND"],
                "answer": "and",
                "explanation": "Python uses plain English words 'and', 'or', 'not' for boolean operations."
            },
            {
                "id": 175,
                "question": "What is the comparison operator for checking if two values are equal?",
                "options": ["==", "=", "===", "eq"],
                "answer": "==",
                "explanation": "== tests equality, while = is the assignment operator."
            },
            {
                "id": 176,
                "question": "What does 'not True' evaluate to?",
                "options": ["False", "True", "None", "0"],
                "answer": "False",
                "explanation": "'not' negates a boolean value, so not True is False."
            }
        ],
        "Intermediate": [
            {
                "id": 177,
                "question": "What is the output of: x = 10; print('High' if x > 5 else 'Low')?",
                "options": ["High", "Low", "True", "SyntaxError"],
                "answer": "High",
                "explanation": "This is Python's ternary conditional operator; since 10 > 5 is True, 'High' is returned."
            },
            {
                "id": 178,
                "question": "How does short-circuit evaluation work with 'and' in Python?",
                "options": ["If the first operand is False, the second is not evaluated", "Both operands are always evaluated", "The second operand is evaluated first", "Throws an error if either is False"],
                "answer": "If the first operand is False, the second is not evaluated",
                "explanation": "Because False and anything is False, Python stops evaluating immediately after seeing False."
            },
            {
                "id": 179,
                "question": "What does '10 < x < 20' evaluate to if x = 15 in Python?",
                "options": ["True, Python supports chained comparisons", "False", "SyntaxError", "TypeError"],
                "answer": "True, Python supports chained comparisons",
                "explanation": "Python natively supports chained comparisons equivalent to (10 < x and x < 20)."
            },
            {
                "id": 180,
                "question": "Which of the following is considered falsy in Python?",
                "options": ["Empty list []", "String '0'", "List [0]", "Boolean True"],
                "answer": "Empty list []",
                "explanation": "Empty collections ([], {}, '', set()), None, and 0 are falsy in Python."
            },
            {
                "id": 181,
                "question": "What does 'a or b' return if a = '' and b = 'Python'?",
                "options": ["'Python'", "True", "''", "False"],
                "answer": "'Python'",
                "explanation": "'or' returns the first truthy operand, or the last operand if neither is truthy."
            }
        ],
        "Advanced": [
            {
                "id": 182,
                "question": "What new pattern matching construct was introduced in Python 3.10?",
                "options": ["match / case", "switch / case", "select / when", "choose / branch"],
                "answer": "match / case",
                "explanation": "Python 3.10 introduced structural pattern matching using the match and case keywords."
            },
            {
                "id": 183,
                "question": "What is the walrus operator (:=) used for?",
                "options": ["Assignment expressions within conditions", "Deep equality check", "Type casting", "Pointer dereferencing"],
                "answer": "Assignment expressions within conditions",
                "explanation": "The walrus operator := assigns values to variables as part of a larger expression."
            },
            {
                "id": 184,
                "question": "What does all([True, True, False]) return?",
                "options": ["False", "True", "None", "TypeError"],
                "answer": "False",
                "explanation": "all() returns True only if all elements in the iterable evaluate to True."
            },
            {
                "id": 185,
                "question": "What does any([False, 0, 'hello']) return?",
                "options": ["True", "False", "'hello'", "None"],
                "answer": "True",
                "explanation": "any() returns True if at least one element is truthy ('hello' is truthy)."
            },
            {
                "id": 186,
                "question": "What is the result of comparing ('a', 2) < ('a', 3) in Python?",
                "options": ["True", "False", "TypeError", "SyntaxError"],
                "answer": "True",
                "explanation": "Tuples are compared lexicographically: 'a' equals 'a', then 2 < 3 evaluates to True."
            }
        ]
    }
}

class AdaptiveQuizRequest(BaseModel):
    student_id: int = 1
    email: str = ''

@app.post("/get-adaptive-quiz")
def get_adaptive_quiz(req: AdaptiveQuizRequest, db: Session = Depends(get_db)):
    # 1. Resolve student record (auto-create if new user)
    student = None
    if req.email:
        student = db.query(Student).filter(Student.email == req.email).first()
        if not student:
            display_name = req.email.split('@')[0].capitalize()
            student = Student(
                name=display_name,
                email=req.email,
                level="Beginner",
                xp_points=100,
                badges="First Code",
                streak_days=1
            )
            db.add(student)
            db.commit()
            db.refresh(student)
    if not student and req.student_id:
        student = db.query(Student).filter(Student.id == req.student_id).first()
    student_id = student.id if student else req.student_id

    # 2. Query user's recent progress to avoid repeating recently taken topics
    recent = db.query(Progress).filter(Progress.student_id == student_id).order_by(Progress.completed_at.desc()).limit(20).all()
    recent_topics = [r.topic for r in recent]
    
    all_topics = list(QUIZ_BANK.keys())
    # Deterministic rotation unique per student ID, email hash, day of year & progress count
    import hashlib
    email_seed = int(hashlib.md5((req.email or str(student_id)).encode()).hexdigest()[:6], 16)
    today_num = dt.datetime.utcnow().timetuple().tm_yday
    seed_idx = (today_num * 31 + student_id * 17 + email_seed + len(recent) * 7)
    
    # Exclude topic if taken in last 2 attempts to guarantee rotation
    available_topics = [t for t in all_topics if recent_topics[:2].count(t) == 0] or all_topics
    topic = available_topics[seed_idx % len(available_topics)]

    # 3. Dynamic difficulty adaptation
    avg_score = sum(r.score for r in recent) / len(recent) if recent else 0
    if avg_score > 80:
        difficulty = 'Advanced'
    elif avg_score > 50:
        difficulty = 'Intermediate'
    else:
        difficulty = 'Beginner'

    # 4. Standard 5 questions per quiz
    TARGET_COUNT = 5
    t_bank = QUIZ_BANK.get(topic, QUIZ_BANK["Variables"])
    candidates = list(t_bank.get(difficulty) or [])

    # If candidates has fewer than TARGET_COUNT, backfill from other difficulties of the same topic
    if len(candidates) < TARGET_COUNT:
        for other_diff in ["Beginner", "Intermediate", "Advanced"]:
            if other_diff != difficulty:
                for q in t_bank.get(other_diff, []):
                    if q not in candidates:
                        candidates.append(q)
                    if len(candidates) >= TARGET_COUNT * 2:
                        break

    # If still fewer than TARGET_COUNT, backfill from adjacent topics
    if len(candidates) < TARGET_COUNT:
        for other_topic, diffs in QUIZ_BANK.items():
            if other_topic != topic:
                for q in diffs.get(difficulty, []):
                    if q not in candidates:
                        candidates.append(q)
                    if len(candidates) >= TARGET_COUNT * 2:
                        break

    # 5. Shuffle questions & options uniquely per user using seed
    import random
    rng = random.Random(seed_idx)
    shuffled_questions = list(candidates)
    rng.shuffle(shuffled_questions)

    final_questions = []
    for q in shuffled_questions[:TARGET_COUNT]:
        opts = list(q['options'])
        rng.shuffle(opts)
        final_questions.append({
            "id": q["id"],
            "question": q["question"],
            "options": opts,
            "answer": q["answer"],
            "explanation": q["explanation"]
        })

    return {
        "topic": topic,
        "difficulty": difficulty,
        "questions": final_questions
    }

@app.post("/progress")
def save_progress(req: ProgressRequest, db: Session = Depends(get_db)):
    prog = Progress(**req.dict())
    db.add(prog)
    db.commit()
    return {"status": "success"}

class ClaimQuestRequest(BaseModel):
    email: str
    quest_id: int
    xp_reward: int
    quest_title: str = ""

@app.get("/student/{email}")
def get_student(email: str, name: str = None, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.email == email).first()
    if not student:
        display_name = name or email.split('@')[0].capitalize()
        student = Student(
            name=display_name,
            email=email,
            level="Beginner",
            xp_points=280,
            badges="First Code,First Steps,Week Warrior",
            streak_days=4
        )
        db.add(student)
        db.commit()
        db.refresh(student)

    today_str = dt.datetime.utcnow().strftime('%Y-%m-%d')
    completed_q = db.query(CompletedQuest).filter(
        CompletedQuest.student_id == student.id,
        CompletedQuest.completed_date == today_str
    ).all()
    claimed_ids = [q.quest_id for q in completed_q]

    return {
        "id": student.id,
        "name": student.name,
        "email": student.email,
        "level": student.level,
        "xp": student.xp_points,
        "streak": student.streak_days,
        "badges": [b.strip() for b in student.badges.split(',') if b.strip()],
        "claimed_quests": claimed_ids
    }

@app.post("/gamification/claim-quest")
def claim_quest(req: ClaimQuestRequest, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.email == req.email).first()
    if not student:
        display_name = req.email.split('@')[0].capitalize()
        student = Student(
            name=display_name,
            email=req.email,
            level="Beginner",
            xp_points=280,
            badges="First Code,First Steps,Week Warrior",
            streak_days=4
        )
        db.add(student)
        db.commit()
        db.refresh(student)

    today_str = dt.datetime.utcnow().strftime('%Y-%m-%d')
    existing = db.query(CompletedQuest).filter(
        CompletedQuest.student_id == student.id,
        CompletedQuest.quest_id == req.quest_id,
        CompletedQuest.completed_date == today_str
    ).first()

    if existing:
        all_claimed = [q.quest_id for q in db.query(CompletedQuest).filter(
            CompletedQuest.student_id == student.id,
            CompletedQuest.completed_date == today_str
        ).all()]
        return {
            "status": "already_claimed",
            "message": "Quest already claimed today!",
            "xp_gained": 0,
            "total_xp": student.xp_points,
            "level": student.level,
            "badges": [b.strip() for b in student.badges.split(',') if b.strip()],
            "claimed_quests": all_claimed
        }

    # Award XP
    student.xp_points += req.xp_reward

    # Recalculate level
    if student.xp_points >= 1000:
        student.level = "Python Master"
    elif student.xp_points >= 600:
        student.level = "Advanced Coder"
    elif student.xp_points >= 300:
        student.level = "Intermediate Coder"
    else:
        student.level = "Beginner Coder"

    # Evaluate badges
    badges = set([b.strip() for b in student.badges.split(',') if b.strip()])
    badges.add("First Code")
    badges.add("First Steps")
    if student.streak_days >= 4:
        badges.add("Week Warrior")
    if student.xp_points >= 350:
        badges.add("Bug Crusher")
    if student.xp_points >= 1000:
        badges.add("Python Master")
    student.badges = ",".join(badges)

    # Record quest
    new_quest = CompletedQuest(
        student_id=student.id,
        quest_id=req.quest_id,
        completed_date=today_str,
        xp_reward=req.xp_reward
    )
    db.add(new_quest)
    db.commit()
    db.refresh(student)

    all_claimed = [q.quest_id for q in db.query(CompletedQuest).filter(
        CompletedQuest.student_id == student.id,
        CompletedQuest.completed_date == today_str
    ).all()]

    return {
        "status": "success",
        "message": f"Successfully claimed +{req.xp_reward} XP!",
        "xp_gained": req.xp_reward,
        "total_xp": student.xp_points,
        "level": student.level,
        "badges": list(badges),
        "claimed_quests": all_claimed
    }

@app.post("/gamification")
def award_xp(student_id: int = 1, action: str = "submit_code", db: Session = Depends(get_db)):
    xp_map = {
        "complete_lesson": 10,
        "correct_quiz": 20,
        "submit_code": 30,
        "fix_error": 15,
        "daily_login": 5,
        "help_peer": 25
    }
    gained = xp_map.get(action, 0)
    
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    student.xp_points += gained
    
    # Check levels
    if student.xp_points >= 1000: student.level = "Python Master"
    elif student.xp_points >= 600: student.level = "Advanced Coder"
    elif student.xp_points >= 300: student.level = "Intermediate Coder"
    elif student.xp_points >= 100: student.level = "Beginner Coder"
    
    badges = set(student.badges.split(',')) if student.badges else set()
    if student.xp_points > 10: badges.add("First Code")
    if student.xp_points > 1000: badges.add("Python Master")
    
    student.badges = ",".join(filter(None, badges))
    
    db.commit()
    return {"xp_gained": gained, "total_xp": student.xp_points, "level": student.level}

@app.get("/leaderboard")
def get_leaderboard(db: Session = Depends(get_db)):
    top_students = db.query(Student).order_by(desc(Student.xp_points)).limit(10).all()
    return [{"name": s.name, "email": s.email, "xp": s.xp_points, "level": s.level} for s in top_students]

class ASTFlowVisitor(ast.NodeVisitor):
    def __init__(self):
        self.flow = []
        
    def visit_Assign(self, node):
        targets = [t.id for t in node.targets if isinstance(t, ast.Name)]
        var_name = ", ".join(targets) if targets else "variable"
        val = "value"
        if isinstance(node.value, ast.Constant):
            val = repr(node.value.value)
        elif isinstance(node.value, ast.Name):
            val = node.value.id
        elif isinstance(node.value, ast.BinOp):
            val = "calculation"
        elif isinstance(node.value, ast.List):
            val = f"list [{len(node.value.elts)} items]"
        elif isinstance(node.value, ast.Dict):
            val = f"dict [{len(node.value.keys)} items]"
        elif isinstance(node.value, ast.Call):
            func_name = getattr(node.value.func, 'id', 'function')
            val = f"{func_name}()"
        self.flow.append({
            "type": "Assignment",
            "label": f"Assign: {var_name} = {val}",
            "details": f"Stores the value {val} in variable '{var_name}' (Line {node.lineno})",
            "line": node.lineno
        })
        self.generic_visit(node)

    def visit_AugAssign(self, node):
        target = node.target.id if isinstance(node.target, ast.Name) else "variable"
        op_map = {ast.Add: "+=", ast.Sub: "-=", ast.Mult: "*=", ast.Div: "/="}
        op = op_map.get(type(node.op), "=")
        val = repr(node.value.value) if isinstance(node.value, ast.Constant) else "value"
        self.flow.append({
            "type": "Assignment",
            "label": f"Update: {target} {op} {val}",
            "details": f"Updates '{target}' with operator {op} {val} (Line {node.lineno})",
            "line": node.lineno
        })
        self.generic_visit(node)

    def visit_Expr(self, node):
        if isinstance(node.value, ast.Call):
            func_name = ""
            if isinstance(node.value.func, ast.Name):
                func_name = node.value.func.id
            elif isinstance(node.value.func, ast.Attribute):
                func_name = f"{getattr(node.value.func.value, 'id', 'obj')}.{node.value.func.attr}"
            
            if func_name == "print":
                args_repr = []
                for a in node.value.args[:3]:
                    if isinstance(a, ast.Constant):
                        args_repr.append(repr(a.value))
                    elif isinstance(a, ast.Name):
                        args_repr.append(a.id)
                    else:
                        args_repr.append("...")
                self.flow.append({
                    "type": "Output",
                    "label": f"Print: {', '.join(args_repr)}",
                    "details": f"Outputs data to the terminal console (Line {node.lineno})",
                    "line": node.lineno
                })
            else:
                self.flow.append({
                    "type": "Call",
                    "label": f"Call: {func_name or 'function'}()",
                    "details": f"Executes function call '{func_name or 'function'}' (Line {node.lineno})",
                    "line": node.lineno
                })
        self.generic_visit(node)
        
    def visit_For(self, node):
        target = node.target.id if isinstance(node.target, ast.Name) else "item"
        iter_name = "sequence"
        if isinstance(node.iter, ast.Call) and isinstance(node.iter.func, ast.Name) and node.iter.func.id == "range":
            args = [str(arg.value) for arg in node.iter.args if isinstance(arg, ast.Constant)]
            iter_name = f"range({', '.join(args)})"
        elif isinstance(node.iter, ast.Name):
            iter_name = node.iter.id
        self.flow.append({
            "type": "Loop",
            "label": f"For: iterate '{target}' through '{iter_name}'",
            "details": f"Repeats code block for each element in '{iter_name}' (Line {node.lineno})",
            "line": node.lineno
        })
        self.generic_visit(node)

    def visit_While(self, node):
        self.flow.append({
            "type": "Loop",
            "label": "While: loop while condition holds",
            "details": f"Repeats block continuously as long as loop condition evaluates to True (Line {node.lineno})",
            "line": node.lineno
        })
        self.generic_visit(node)

    def visit_If(self, node):
        self.flow.append({
            "type": "Decision",
            "label": "If: branch condition",
            "details": f"Checks condition to decide which code block to execute (Line {node.lineno})",
            "line": node.lineno
        })
        self.generic_visit(node)

    def visit_FunctionDef(self, node):
        args = [arg.arg for arg in node.args.args]
        self.flow.append({
            "type": "Function",
            "label": f"Def: function '{node.name}({', '.join(args)})'",
            "details": f"Creates a reusable function named '{node.name}' accepting parameters: {', '.join(args)} (Line {node.lineno})",
            "line": node.lineno
        })
        self.generic_visit(node)

    def visit_Return(self, node):
        val = "None"
        if isinstance(node.value, ast.Name): val = node.value.id
        elif isinstance(node.value, ast.Constant): val = repr(node.value.value)
        elif node.value is not None: val = "expression"
        self.flow.append({
            "type": "Return",
            "label": f"Return: {val}",
            "details": f"Returns value '{val}' back to the caller (Line {node.lineno})",
            "line": node.lineno
        })
        self.generic_visit(node)

    def visit_Import(self, node):
        names = [a.name for a in node.names]
        self.flow.append({
            "type": "Module",
            "label": f"Import: {', '.join(names)}",
            "details": f"Loads module {', '.join(names)} (Line {node.lineno})",
            "line": node.lineno
        })
        self.generic_visit(node)

    def visit_ImportFrom(self, node):
        names = [a.name for a in node.names]
        self.flow.append({
            "type": "Module",
            "label": f"From {node.module} import {', '.join(names)}",
            "details": f"Imports specific symbols from {node.module} (Line {node.lineno})",
            "line": node.lineno
        })
        self.generic_visit(node)

class SyntaxCheckRequest(BaseModel):
    code: str

@app.post("/check-syntax")
def check_syntax(req: SyntaxCheckRequest):
    try:
        ast.parse(req.code)
        return {"valid": True, "error": None}
    except SyntaxError as e:
        return {
            "valid": False,
            "error": {
                "line": e.lineno,
                "offset": e.offset or 1,
                "message": e.msg
            }
        }
    except Exception as e:
        return {"valid": False, "error": {"line": 1, "offset": 1, "message": str(e)}}

class VisualizeRequest(BaseModel):
    code: str

@app.post("/visualize-ast")
def visualize_ast(req: VisualizeRequest):
    try:
        root = ast.parse(req.code)
        visitor = ASTFlowVisitor()
        visitor.visit(root)
        return {"success": True, "flow": visitor.flow}
    except Exception as e:
        return {"success": False, "error": str(e), "flow": []}

@app.post("/visualize-trace")
def visualize_trace(req: VisualizeRequest):
    try:
        return trace_code_execution(req.code)
    except Exception as e:
        return {"success": False, "error": str(e), "steps": [], "total_steps": 0}

# --- Code Explanation Endpoint ---
class ExplainRequest(BaseModel):
    code: str
    lang: str = 'en'

@app.post('/explain-code')
def explain_code(req: ExplainRequest):
    explanations = []
    try:
        lines = req.code.split('\n')
        tree = ast.parse(req.code)
        # Walk each node and generate explanations
        for node in ast.walk(tree):
            if isinstance(node, ast.Assign):
                targets = [t.id for t in node.targets if isinstance(t, ast.Name)]
                val = ''
                if isinstance(node.value, ast.Constant): val = repr(node.value.value)
                elif isinstance(node.value, ast.List): val = 'a list'
                elif isinstance(node.value, ast.Dict): val = 'a dictionary'
                elif isinstance(node.value, ast.Call): val = 'a function call result'
                else: val = 'an expression'
                explanations.append({'line': node.lineno, 'code': lines[node.lineno-1].strip() if node.lineno <= len(lines) else '', 'explanation': f"Creates variable(s) {', '.join(targets)} and assigns {val}", 'concept': 'Variables', 'level': 'Beginner'})
            elif isinstance(node, ast.For):
                target = node.target.id if isinstance(node.target, ast.Name) else 'item'
                explanations.append({'line': node.lineno, 'code': lines[node.lineno-1].strip() if node.lineno <= len(lines) else '', 'explanation': f"Starts a for loop that iterates using variable '{target}'", 'concept': 'Loops', 'level': 'Beginner'})
            elif isinstance(node, ast.While):
                explanations.append({'line': node.lineno, 'code': lines[node.lineno-1].strip() if node.lineno <= len(lines) else '', 'explanation': 'Starts a while loop that repeats as long as the condition is True', 'concept': 'Loops', 'level': 'Intermediate'})
            elif isinstance(node, ast.If):
                explanations.append({'line': node.lineno, 'code': lines[node.lineno-1].strip() if node.lineno <= len(lines) else '', 'explanation': 'Checks a condition and runs different code based on whether it is True or False', 'concept': 'Conditionals', 'level': 'Beginner'})
            elif isinstance(node, ast.FunctionDef):
                args = [a.arg for a in node.args.args]
                explanations.append({'line': node.lineno, 'code': lines[node.lineno-1].strip() if node.lineno <= len(lines) else '', 'explanation': f"Defines a function named '{node.name}' with parameters: {', '.join(args) if args else 'none'}", 'concept': 'Functions', 'level': 'Intermediate'})
            elif isinstance(node, ast.ClassDef):
                explanations.append({'line': node.lineno, 'code': lines[node.lineno-1].strip() if node.lineno <= len(lines) else '', 'explanation': f"Defines a class named '{node.name}' (Object-Oriented Programming)", 'concept': 'OOP', 'level': 'Advanced'})
            elif isinstance(node, ast.Return):
                explanations.append({'line': node.lineno, 'code': lines[node.lineno-1].strip() if node.lineno <= len(lines) else '', 'explanation': 'Returns a value from the function to the caller', 'concept': 'Functions', 'level': 'Intermediate'})
            elif isinstance(node, ast.Import) or isinstance(node, ast.ImportFrom):
                explanations.append({'line': node.lineno, 'code': lines[node.lineno-1].strip() if node.lineno <= len(lines) else '', 'explanation': 'Imports an external module/library for use', 'concept': 'Modules', 'level': 'Beginner'})
        explanations.sort(key=lambda x: x['line'])
        # Remove duplicates by line
        seen = set()
        unique = []
        for e in explanations:
            if e['line'] not in seen:
                seen.add(e['line'])
                unique.append(e)
        return {'success': True, 'explanations': unique}
    except SyntaxError as e:
        return {'success': False, 'error': f'Syntax error at line {e.lineno}: {e.msg}', 'explanations': []}
    except Exception as e:
        return {'success': False, 'error': str(e), 'explanations': []}

# --- Chapter Curriculum System ---
CHAPTERS_BANK = [
    {
        "id": 1,
        "level": "Beginner",
        "chapter_number": 1,
        "title": "Chapter 1: Intro to Printing & Variables",
        "description": "Welcome to Python! Learn how to display text on screen and create basic variables.",
        "content": "In Python, use print() to output messages. Variables store data values (e.g. name = 'Python AI'). Write code to print 'Hello, Python AI!'.",
        "starter_code": "# Write code to print 'Hello, Python AI!'\n",
        "test_cases": [
            {"call": "print('Hello, Python AI!')", "expected": "Hello, Python AI!"}
        ]
    },
    {
        "id": 2,
        "level": "Beginner",
        "chapter_number": 2,
        "title": "Chapter 2: Numbers & Basic Operations",
        "description": "Slight progression from Ch 1: Perform mathematical calculations (+, -, *, /) using variables.",
        "content": "Python supports integers and floats. Write a function `add_numbers(a, b)` that returns the sum of a and b.",
        "starter_code": "def add_numbers(a, b):\n    # Write your code here\n    pass\n",
        "test_cases": [
            {"call": "add_numbers(5, 10)", "expected": "15"},
            {"call": "add_numbers(-3, 8)", "expected": "5"}
        ]
    },
    {
        "id": 3,
        "level": "Beginner",
        "chapter_number": 3,
        "title": "Chapter 3: Strings & Concatenation",
        "description": "Manipulate string variables, format strings with f-strings, and join multiple words.",
        "content": "Write a function `full_greeting(first, last)` that combines first and last name into 'Hello First Last'.",
        "starter_code": "def full_greeting(first, last):\n    # Write your code here\n    pass\n",
        "test_cases": [
            {"call": "full_greeting('John', 'Doe')", "expected": "Hello John Doe"},
            {"call": "full_greeting('Py', 'Tutor')", "expected": "Hello Py Tutor"}
        ]
    },
    {
        "id": 4,
        "level": "Beginner",
        "chapter_number": 4,
        "title": "Chapter 4: Conditional Logic (If / Else)",
        "description": "Make decisions in code using if, elif, and else statements.",
        "content": "Write a function `check_even_odd(n)` that returns 'Even' if n is even, or 'Odd' if n is odd.",
        "starter_code": "def check_even_odd(n):\n    # Write your code here\n    pass\n",
        "test_cases": [
            {"call": "check_even_odd(4)", "expected": "Even"},
            {"call": "check_even_odd(7)", "expected": "Odd"}
        ]
    },
    {
        "id": 5,
        "level": "Intermediate",
        "chapter_number": 5,
        "title": "Chapter 5: For Loops & Range Iteration",
        "description": "Repeat actions automatically using for loops and range().",
        "content": "Write a function `sum_up_to(n)` that calculates the sum of numbers from 1 to n.",
        "starter_code": "def sum_up_to(n):\n    # Write your code here\n    pass\n",
        "test_cases": [
            {"call": "sum_up_to(5)", "expected": "15"},
            {"call": "sum_up_to(10)", "expected": "55"}
        ]
    },
    {
        "id": 6,
        "level": "Intermediate",
        "chapter_number": 6,
        "title": "Chapter 6: While Loops & Control Signals",
        "description": "Execute blocks continuously while a condition remains True.",
        "content": "Write a function `count_digits(n)` that counts how many digits an integer `n` has.",
        "starter_code": "def count_digits(n):\n    # Write your code here\n    pass\n",
        "test_cases": [
            {"call": "count_digits(12345)", "expected": "5"},
            {"call": "count_digits(9)", "expected": "1"}
        ]
    },
    {
        "id": 7,
        "level": "Intermediate",
        "chapter_number": 7,
        "title": "Chapter 7: Python Lists & Operations",
        "description": "Store ordered collections of data in lists and manipulate items.",
        "content": "Write a function `filter_positive(numbers)` that returns a new list with only positive numbers.",
        "starter_code": "def filter_positive(numbers):\n    # Write your code here\n    pass\n",
        "test_cases": [
            {"call": "filter_positive([-2, 5, 0, 10, -1])", "expected": "[5, 10]"},
            {"call": "filter_positive([-5, -3])", "expected": "[]"}
        ]
    },
    {
        "id": 8,
        "level": "Intermediate",
        "chapter_number": 8,
        "title": "Chapter 8: Dictionaries & Key-Value Pairs",
        "description": "Store mapped data in key-value format using dictionaries.",
        "content": "Write a function `get_score(scores, name)` that returns the score or 'Not Found'.",
        "starter_code": "def get_score(scores, name):\n    # Write your code here\n    pass\n",
        "test_cases": [
            {"call": "get_score({'Alice': 95, 'Bob': 88}, 'Alice')", "expected": "95"},
            {"call": "get_score({'Alice': 95}, 'Charlie')", "expected": "Not Found"}
        ]
    },
    {
        "id": 9,
        "level": "Intermediate",
        "chapter_number": 9,
        "title": "Chapter 9: Reusable Functions & Arguments",
        "description": "Create modular functions with arguments and return statements.",
        "content": "Write a function `calculate_bmi(w, h)` rounded to 1 decimal place.",
        "starter_code": "def calculate_bmi(w, h):\n    # Write your code here\n    pass\n",
        "test_cases": [
            {"call": "calculate_bmi(70, 1.75)", "expected": "22.9"},
            {"call": "calculate_bmi(60, 1.6)", "expected": "23.4"}
        ]
    },
    {
        "id": 10,
        "level": "Advanced",
        "chapter_number": 10,
        "title": "Chapter 10: Exception Handling (Try / Except)",
        "description": "Prevent code crashes gracefully when unexpected errors occur.",
        "content": "Write a function `safe_divide(a, b)` that returns a / b or 'Division by zero error'.",
        "starter_code": "def safe_divide(a, b):\n    # Write your code here\n    pass\n",
        "test_cases": [
            {"call": "safe_divide(10, 2)", "expected": "5.0"},
            {"call": "safe_divide(5, 0)", "expected": "Division by zero error"}
        ]
    },
    {
        "id": 11,
        "level": "Advanced",
        "chapter_number": 11,
        "title": "Chapter 11: Object-Oriented Programming (Classes)",
        "description": "Build real-world abstractions using Classes, __init__, and Methods.",
        "content": "Create a class `BankAccount` with `deposit(amount)` and `get_balance()`.",
        "starter_code": "class BankAccount:\n    # Write your class here\n    pass\n",
        "test_cases": [
            {"call": "(lambda: (_a := BankAccount(100), _a.deposit(50), _a.get_balance())[-1])()", "expected": "150"}
        ]
    },
    {
        "id": 12,
        "level": "Advanced",
        "chapter_number": 12,
        "title": "Chapter 12: File Handling & Recursion",
        "description": "Master recursive algorithms and advanced problem-solving techniques.",
        "content": "Write a recursive function `factorial(n)` that returns the factorial of n.",
        "starter_code": "def factorial(n):\n    # Write your code here\n    pass\n",
        "test_cases": [
            {"call": "factorial(5)", "expected": "120"},
            {"call": "factorial(1)", "expected": "1"}
        ]
    }
]

@app.get('/chapters')
def get_chapters():
    return {'chapters': CHAPTERS_BANK}

@app.get('/chapter/{chapter_id}')
def get_chapter(chapter_id: int):
    ch = next((c for c in CHAPTERS_BANK if c['id'] == chapter_id), None)
    if not ch:
        raise HTTPException(status_code=404, detail="Chapter not found")
    return ch

# --- Daily Challenge System ---
DAILY_CHALLENGES = [
    {'id': 0, 'title': '🚀 Space Rocket Countdown', 'description': 'Write a function `space_countdown(start)` that returns a string counting down from `start` to 1, followed by "Blastoff!".\n\nExample: space_countdown(3) → "3 2 1 Blastoff!"', 'difficulty': 'Beginner', 'starter_code': '# Write your Python solution here...\n', 'expected_output': '3 2 1 Blastoff!', 'concept': 'Loops & Strings', 'xp_reward': 100, 'test_cases': [{'call': 'space_countdown(3)', 'expected': '3 2 1 Blastoff!'}, {'call': 'space_countdown(5)', 'expected': '5 4 3 2 1 Blastoff!'}]},
    {'id': 1, 'title': '🔐 Secret Emoji Password Encoder', 'description': 'Write a function `encode_emoji(text)` that replaces "happy" with "😊" and "code" with "💻".\n\nExample: encode_emoji("I happy code") → "I 😊 💻"', 'difficulty': 'Beginner', 'starter_code': '# Write your Python solution here...\n', 'expected_output': 'I 😊 💻', 'concept': 'String Replacement', 'xp_reward': 100, 'test_cases': [{'call': 'encode_emoji("I happy code")', 'expected': 'I 😊 💻'}]},
    {'id': 2, 'title': '⚡ Superhero Power Index', 'description': 'Write a function `superhero_power(powers)` that takes a list of integers and returns the sum of powers multiplied by 2.\n\nExample: superhero_power([10, 20, 30]) → 120', 'difficulty': 'Beginner', 'starter_code': '# Write your Python solution here...\n', 'expected_output': '120', 'concept': 'Lists & Math', 'xp_reward': 100, 'test_cases': [{'call': 'superhero_power([10, 20, 30])', 'expected': '120'}, {'call': 'superhero_power([5, 5])', 'expected': '20'}]},
    {'id': 3, 'title': '🔮 Magic Number Doubler', 'description': 'Write a function `magic_double(n)` that doubles a number `n` if it is even, or triples it if it is odd.\n\nExample: magic_double(4) → 8, magic_double(3) → 9', 'difficulty': 'Beginner', 'starter_code': '# Write your Python solution here...\n', 'expected_output': '8', 'concept': 'Conditionals & Logic', 'xp_reward': 100, 'test_cases': [{'call': 'magic_double(4)', 'expected': '8'}, {'call': 'magic_double(3)', 'expected': '9'}]},
    {'id': 4, 'title': 'Reverse a String', 'description': 'Write a function `reverse_str(s)` that returns the reversed version of a string.\n\nExample: reverse_str("hello") → "olleh"', 'difficulty': 'Beginner', 'starter_code': '# Write your Python solution here...\n', 'expected_output': 'olleh', 'concept': 'Strings', 'xp_reward': 100, 'test_cases': [{'call': 'reverse_str("hello")', 'expected': 'olleh'}, {'call': 'reverse_str("world")', 'expected': 'dlrow'}]},
    {'id': 5, 'title': 'Count Vowels', 'description': 'Write a function `count_vowels(s)` that counts the number of vowels (a, e, i, o, u) in a string.\n\nExample: count_vowels("hello world") → 3', 'difficulty': 'Beginner', 'starter_code': '# Write your Python solution here...\n', 'expected_output': '3', 'concept': 'Strings & Loops', 'xp_reward': 100, 'test_cases': [{'call': 'count_vowels("hello world")', 'expected': '3'}, {'call': 'count_vowels("xyz")', 'expected': '0'}]},
    {'id': 6, 'title': 'Palindrome Check', 'description': 'Write a function `is_palindrome(s)` that checks if a string is a palindrome.\n\nExample: is_palindrome("racecar") → True', 'difficulty': 'Intermediate', 'starter_code': '# Write your Python solution here...\n', 'expected_output': 'True', 'concept': 'Strings & Logic', 'xp_reward': 100, 'test_cases': [{'call': 'is_palindrome("racecar")', 'expected': 'True'}, {'call': 'is_palindrome("hello")', 'expected': 'False'}]},
    {'id': 7, 'title': 'Fibonacci Sequence', 'description': 'Write a function `fibonacci(n)` that returns a list of the first n Fibonacci numbers.\n\nExample: fibonacci(7) → [0, 1, 1, 2, 3, 5, 8]', 'difficulty': 'Advanced', 'starter_code': '# Write your Python solution here...\n', 'expected_output': '[0, 1, 1, 2, 3, 5, 8]', 'concept': 'Recursion & Lists', 'xp_reward': 100, 'test_cases': [{'call': 'fibonacci(7)', 'expected': '[0, 1, 1, 2, 3, 5, 8]'}]}
]

@app.get('/daily-challenge')
def get_daily_challenge(email: str = '', db: Session = Depends(get_db)):
    today = dt.datetime.now()
    today_str = today.strftime('%Y-%m-%d')
    student = None
    completed_ids = set()
    completed_today = False
    
    if email:
        student = db.query(Student).filter(Student.email == email).first()
        if not student:
            display_name = email.split('@')[0].capitalize()
            student = Student(
                name=display_name,
                email=email,
                level="Beginner",
                xp_points=100,
                badges="First Code",
                streak_days=1
            )
            db.add(student)
            db.commit()
            db.refresh(student)
    if not student:
        student = db.query(Student).first()
        
    if student:
        completed = db.query(CompletedChallenge).filter(CompletedChallenge.student_id == student.id).all()
        completed_ids = {c.challenge_id for c in completed}
        for c in completed:
            if c.completed_at and c.completed_at.strftime('%Y-%m-%d') == today_str:
                completed_today = True
        
    # Select uncompleted challenges for this user
    uncompleted = [c for c in DAILY_CHALLENGES if c['id'] not in completed_ids]
    
    if not uncompleted:
        # If student completed all challenges, reset cycle
        uncompleted = DAILY_CHALLENGES
        
    # Seed challenge by day of year + student ID + email hash to ensure every user gets a different, non-repeating challenge
    import hashlib
    email_seed = int(hashlib.md5((email or 'student').encode()).hexdigest()[:6], 16) if email else 42
    day_seed = (today.year * 1000 + today.timetuple().tm_yday + (student.id if student else 1) * 13 + email_seed)
    challenge = uncompleted[day_seed % len(uncompleted)]
    
    tomorrow = (today + dt.timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    seconds_remaining = int((tomorrow - today).total_seconds())
    
    return {
        **challenge,
        'seconds_remaining': seconds_remaining,
        'date': today_str,
        'total_completed': len(completed_ids),
        'completed_today': completed_today
    }

class DailySubmitRequest(BaseModel):
    code: str
    challenge_id: int
    email: str = ''

@app.post('/submit-daily')
def submit_daily(req: DailySubmitRequest, db: Session = Depends(get_db)):
    challenge = next((c for c in DAILY_CHALLENGES if c['id'] == req.challenge_id), DAILY_CHALLENGES[0])
    test_cases = challenge.get('test_cases', [])
    
    if test_cases:
        stdout, stderr, passed, _ = execute_code_with_test_cases(req.code, test_cases)
    else:
        stdout, stderr = execute_code(req.code)
        passed = (stdout.strip() == challenge['expected_output'].strip()) if not stderr else False

    actual = stdout.strip()
    expected = challenge['expected_output'].strip()
    xp = 0

    if passed:
        xp = challenge['xp_reward']
        student = None
        if req.email:
            student = db.query(Student).filter(Student.email == req.email).first()
            if not student:
                student = Student(
                    name=req.email.split('@')[0].capitalize(),
                    email=req.email,
                    level="Beginner",
                    xp_points=100,
                    badges="First Code",
                    streak_days=1
                )
                db.add(student)
                db.commit()
                db.refresh(student)
        if not student:
            student = db.query(Student).first()

        if student:
            student.xp_points += xp
            # Record challenge completion so it won't repeat
            already_done = db.query(CompletedChallenge).filter(
                CompletedChallenge.student_id == student.id,
                CompletedChallenge.challenge_id == challenge['id']
            ).first()
            if not already_done:
                new_done = CompletedChallenge(student_id=student.id, challenge_id=challenge['id'])
                db.add(new_done)
            db.commit()

    return {
        'passed': passed,
        'output': actual,
        'error': stderr,
        'expected': expected,
        'xp_awarded': xp
    }

# --- Interview Prep System ---
INTERVIEW_BANK = {
    'Fresher': [
        {'id': 1, 'category': 'Core Python', 'type': 'theory', 'question': 'What is the difference between a list and a tuple in Python?', 'keywords': ['mutable', 'immutable', 'square brackets', 'parentheses', 'changeable'], 'ideal_answer': 'Lists are mutable (can be changed after creation) and use square brackets []. Tuples are immutable (cannot be changed) and use parentheses (). Lists are slower but more flexible, tuples are faster and used for fixed data.'},
        {'id': 2, 'category': 'Core Python', 'type': 'theory', 'question': 'What are Python decorators and how do they work?', 'keywords': ['function', 'wrapper', 'modify', 'behavior', '@'], 'ideal_answer': 'Decorators are functions that modify the behavior of other functions. They use the @ symbol. A decorator takes a function as input, adds functionality, and returns a modified function.'},
        {'id': 3, 'category': 'Data Structures', 'type': 'code', 'question': 'Write a function to check if two strings are anagrams of each other.', 'keywords': ['sorted', 'counter', 'frequency', 'compare'], 'ideal_answer': 'def are_anagrams(s1, s2): return sorted(s1.lower()) == sorted(s2.lower())'},
        {'id': 4, 'category': 'OOP', 'type': 'theory', 'question': 'Explain the four pillars of Object-Oriented Programming with Python examples.', 'keywords': ['encapsulation', 'inheritance', 'polymorphism', 'abstraction', 'class'], 'ideal_answer': 'The four pillars are: 1) Encapsulation - bundling data and methods in a class, 2) Inheritance - creating new classes from existing ones, 3) Polymorphism - same method behaving differently, 4) Abstraction - hiding complex implementation.'},
        {'id': 5, 'category': 'Problem Solving', 'type': 'code', 'question': 'Write a Python function to find the second largest number in a list without using sort().', 'keywords': ['loop', 'comparison', 'max', 'largest', 'second'], 'ideal_answer': 'Track the largest and second largest while iterating through the list once.'},
        {'id': 6, 'category': 'Core Python', 'type': 'theory', 'question': 'What is the difference between `==` and `is` in Python?', 'keywords': ['value', 'identity', 'object', 'memory', 'reference'], 'ideal_answer': '== compares values (equality), while is checks if two variables point to the same object in memory (identity).'},
        {'id': 7, 'category': 'Data Structures', 'type': 'theory', 'question': 'What is a dictionary comprehension? Give an example.', 'keywords': ['key', 'value', 'curly', 'one line', 'comprehension'], 'ideal_answer': 'A concise way to create dictionaries. Example: {x: x**2 for x in range(5)} creates {0:0, 1:1, 2:4, 3:9, 4:16}'},
        {'id': 8, 'category': 'Problem Solving', 'type': 'code', 'question': 'Write a function that removes duplicates from a list while preserving order.', 'keywords': ['set', 'seen', 'order', 'unique', 'preserve'], 'ideal_answer': 'def remove_dupes(lst): seen = set(); return [x for x in lst if not (x in seen or seen.add(x))]'},
        {'id': 9, 'category': 'OOP', 'type': 'theory', 'question': 'What is the difference between `__init__` and `__new__` in Python?', 'keywords': ['constructor', 'instance', 'creation', 'initialize', 'allocate'], 'ideal_answer': '__new__ creates and returns a new instance of the class. __init__ initializes the instance after it is created. __new__ runs first.'},
        {'id': 10, 'category': 'Core Python', 'type': 'theory', 'question': 'Explain list slicing in Python with examples.', 'keywords': ['start', 'stop', 'step', 'colon', 'index', 'negative'], 'ideal_answer': 'Slicing extracts parts of a list using [start:stop:step]. Example: lst[1:4] gets elements at index 1,2,3. Negative indices count from end.'}
    ]
}

class InterviewRequest(BaseModel):
    difficulty: str = 'Fresher'
    count: int = 5

@app.post('/get-interview-questions')
def get_interview_questions(req: InterviewRequest):
    import random
    questions = INTERVIEW_BANK.get(req.difficulty, INTERVIEW_BANK['Fresher'])
    selected = random.sample(questions, min(req.count, len(questions)))
    # Don't send ideal_answer to client
    safe = [{'id': q['id'], 'category': q['category'], 'type': q['type'], 'question': q['question']} for q in selected]
    return {'difficulty': req.difficulty, 'questions': safe, 'time_limit_minutes': 30}

class EvaluateAnswerRequest(BaseModel):
    question_id: int
    answer: str
    difficulty: str = 'Fresher'

@app.post('/evaluate-answer')
def evaluate_answer(req: EvaluateAnswerRequest):
    questions = INTERVIEW_BANK.get(req.difficulty, INTERVIEW_BANK['Fresher'])
    question = next((q for q in questions if q['id'] == req.question_id), None)
    if not question:
        return {'score': 0, 'feedback': 'Question not found.', 'ideal_answer': ''}
    answer_lower = req.answer.lower()
    matched = sum(1 for kw in question['keywords'] if kw.lower() in answer_lower)
    score = min(100, int((matched / len(question['keywords'])) * 100))
    if score >= 80: feedback = 'Excellent! You covered all key points.'
    elif score >= 50: feedback = 'Good attempt, but you missed some important concepts.'
    elif score >= 20: feedback = 'Needs improvement. Review the core concepts.'
    else: feedback = 'Try to include more specific Python terminology and examples.'
    return {'score': score, 'feedback': feedback, 'ideal_answer': question['ideal_answer'], 'keywords_matched': matched, 'total_keywords': len(question['keywords'])}

# --- Learning Metrics Endpoint ---
@app.get('/learning-metrics/{student_id}')
def get_learning_metrics(student_id: int, db: Session = Depends(get_db)):
    all_progress = db.query(Progress).filter(Progress.student_id == student_id).order_by(Progress.completed_at).all()
    # Weekly averages
    weekly = {}
    for p in all_progress:
        week = p.completed_at.strftime('%Y-W%U') if p.completed_at else 'Unknown'
        weekly.setdefault(week, []).append(p.score)
    weekly_avg = {w: round(sum(scores)/len(scores), 1) for w, scores in weekly.items()}
    # Topic scores
    topic_data = {}
    for p in all_progress:
        topic_data.setdefault(p.topic, []).append(p.score)
    topic_avg = {t: round(sum(s)/len(s), 1) for t, s in topic_data.items()}
    # Time to solve trends
    time_trends = [{'quiz': i+1, 'time': p.time_spent, 'score': p.score} for i, p in enumerate(all_progress)]
    # Pathway position
    pathway = ['Variables', 'Loops', 'Functions', 'OOP', 'Data Structures', 'Algorithms']
    mastered = [t for t, avg in topic_avg.items() if avg >= 70]
    current_pos = len([p for p in pathway if p in mastered])
    return {'weekly_averages': weekly_avg, 'topic_scores': topic_avg, 'time_trends': time_trends, 'pathway_position': current_pos, 'pathway_total': len(pathway), 'total_quizzes': len(all_progress), 'mastered_topics': mastered}

# --- Activity Heatmap Endpoint ---
@app.get('/activity-heatmap/{email}')
def get_activity_heatmap(email: str, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.email == email).first()
    if not student:
        return {'heatmap': []}
    ninety_days_ago = dt.datetime.utcnow() - dt.timedelta(days=90)
    submissions = db.query(Submission).filter(Submission.student_id == student.id, Submission.timestamp >= ninety_days_ago).all()
    date_counts = {}
    for sub in submissions:
        if sub.timestamp:
            date_str = sub.timestamp.strftime('%Y-%m-%d')
            date_counts[date_str] = date_counts.get(date_str, 0) + 1
    heatmap = []
    for i in range(90):
        day = (dt.datetime.utcnow() - dt.timedelta(days=89-i)).strftime('%Y-%m-%d')
        heatmap.append({'date': day, 'count': date_counts.get(day, 0)})
    return {'heatmap': heatmap}

# --- Static Frontend Serving & Single-Port Production Routing ---
if os.path.exists(frontend_dist_dir):
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Exclude API endpoints from static catch-all
        api_prefixes = (
            "ask", "execute", "get-adaptive-quiz", "chapters", "visualize-ast",
            "visualize-trace", "explain", "explain-code", "check-syntax",
            "daily-challenge", "submit-daily", "leaderboard", "student",
            "gamification", "learning-metrics", "activity-heatmap",
            "get-interview-questions", "evaluate-answer", "collaborate", "api"
        )
        first_segment = full_path.split("/")[0] if full_path else ""
        if first_segment in api_prefixes:
            raise HTTPException(status_code=404, detail="API route not found")

        # Serve static file if it exists in frontend/dist (e.g. logo.png, manifest.json, sw.js)
        target = os.path.join(frontend_dist_dir, full_path)
        if full_path and os.path.exists(target) and os.path.isfile(target):
            return FileResponse(target)

        # Fallback to SPA entry point
        index_html = os.path.join(frontend_dist_dir, "index.html")
        if os.path.exists(index_html):
            return FileResponse(index_html)
        return {"message": "Frontend index.html not found"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
