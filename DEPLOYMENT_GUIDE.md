# 🌐 Deployment Guide - Python AI Tutor Platform

This repository is fully configured for single-click, production-grade deployment.

---

## ⚡ Option 1: Instant Live Public URL (Local Tunnel)

If you want a live public link to open on your phone or share with your teacher/evaluator right now without creating cloud accounts:

1. Make sure your local server is running on port 8000:
   ```bash
   cd api
   python -m uvicorn main:app --host 0.0.0.0 --port 8000
   ```
2. In a second terminal, launch a public tunnel:
   ```bash
   lt --port 8000
   ```
3. It will give you a public URL (e.g. `https://swift-otter-42.loca.lt`).
4. Open the link! If prompted for a tunnel password, visit [localtunnel.me/mytunnelpassword](https://localtunnel.me/mytunnelpassword) to find your external IP and enter it.

---

## 🚀 Option 2: Free 24/7 Cloud Hosting on Render.com (Recommended)

Render offers free web hosting with automatic continuous deployment directly from your GitHub repository.

### Step 1: Push your project to GitHub
```bash
git init
git add .
git commit -m "Complete Python AI Tutor Platform"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/python-tutor-ai.git
git push -u origin main
```

### Step 2: Deploy on Render
1. Go to [https://dashboard.render.com](https://dashboard.render.com) and click **"New +"** -> **"Web Service"**.
2. Select **"Build and deploy from a Git repository"** and choose your repository.
3. Configure the settings:
   - **Name**: `python-tutor-ai`
   - **Region**: Closest to you (e.g., Singapore / Frankfurt / Oregon)
   - **Branch**: `main`
   - **Runtime**: `Python 3`
   - **Build Command**:
     ```bash
     cd frontend && npm install && npm run build && cd ../ && pip install -r requirements.txt
     ```
   - **Start Command**:
     ```bash
     cd api && uvicorn main:app --host 0.0.0.0 --port $PORT
     ```
4. Click **"Deploy Web Service"**!
5. In a few minutes, Render will provide a permanent public HTTPS domain:
   `https://python-tutor-ai.onrender.com`

---

## 🐳 Option 3: Docker & Docker Compose (Any Cloud VPS)

You can run the entire platform inside a single optimized Docker container on any VPS (AWS EC2, DigitalOcean, Linode, Google Cloud):

### Run with Docker Compose:
```bash
docker compose up --build -d
```
Your fullstack platform will be live at `http://localhost:8000` (or `http://YOUR_SERVER_IP:8000`).

### Or Build & Run with Docker directly:
```bash
docker build -t python-tutor-ai .
docker run -p 8000:8000 python-tutor-ai
```

---

## 🚂 Option 4: Deploy on Railway.app

1. Go to [https://railway.app](https://railway.app) and click **"New Project"**.
2. Select **"Deploy from GitHub repo"** and select this repository.
3. Railway will automatically detect the `Procfile` and `Dockerfile` and deploy the entire project in one step!
