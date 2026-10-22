# AI-Powered Python Tutor Platform

A comprehensive, full-stack interactive learning platform for Python, featuring a custom-built PyTorch AI model, a secure code sandbox, plagiarism detection, and a premium React frontend.

## 🚀 Setup Instructions

### Prerequisites
- Python 3.9+
- Node.js 18+
- PostgreSQL (running locally)
- Redis (running locally)

### 1. Database Setup
Ensure PostgreSQL and Redis are running. The default backend expects PostgreSQL at `postgresql://postgres:postgres@localhost:5432/python_tutor` and Redis at `redis://localhost:6379/0`.

Create the PostgreSQL database:
```bash
createdb python_tutor
```

### 2. Backend & AI Model Setup
Navigate to the root directory and install Python dependencies:
```bash
pip install -r requirements.txt
```

#### Train the AI Model (Optional, takes time)
To train the model from scratch:
1. Collect data: `python data/collect_data.py`
2. Clean data: `python data/clean_data.py`
3. Build vocabulary: `python model/build_vocab.py`
4. Train the model: `python model/train.py`

*Note: If you skip training, the backend will still run but the AI endpoints will use mock data.*

#### Start the API Server
Start the FastAPI server:
```bash
cd api
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
The API will be available at `http://localhost:8000`

### 3. Frontend Setup
Open a new terminal window, navigate to the `frontend` directory, and install the Node.js dependencies:
```bash
cd frontend
npm install
```

Start the Vite development server:
```bash
npm run dev
```
The UI will be available at `http://localhost:3000`

## 🌟 Key Features
- **Custom PyTorch Seq2Seq Model**: Handles natural language queries about Python.
- **Secure Sandbox**: Executes untrusted code using AST validation and `subprocess` isolation.
- **Emotion Detection**: Integrates `face-api.js` to dynamically adjust difficulty based on user expressions.
- **Real-Time Collaboration**: Pair-programming functionality using WebSockets.
- **Plagiarism Detection**: 4-Layer checking using SentenceTransformers.
- **Gamification**: XP, badges, and streaks to keep students engaged.
