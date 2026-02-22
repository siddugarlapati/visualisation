# 🚀 Deployment Guide for VisualWave

This guide will walk you through deploying your VisualWave application using **Render (Docker)** for the Backend and **Vercel** for the Frontend.

## 📋 Prerequisites

1.  **GitHub Repo**: Ensure your code is pushed to GitHub.
2.  **Database URL**: Your connection string from Supabase/Neon.
3.  **API Keys**: `GROQ_API_KEY`.

---

## 🛠️ Step 1: Deploy Backend (Render with Docker)

We will use Render's Docker runtime. **You do NOT need to build the image yourself.** Render will build it for you using the `Dockerfile` in your repo.

1.  **Log in** to [Render.com](https://render.com/).
2.  Click **New +** -> **Web Service**.
3.  Connect your GitHub repository.
4.  **Configuration**:

    - **Name**: `visualwave-backend`
    - **Region**: Choose the one closest to you.
    - **Runtime**: **Docker** (Crucial Step).
    - **Root Directory**: `backend` (⚠️ **Crucial**: This tells Render to look for the Dockerfile in the backend folder).
    - **Plan**: Free

5.  **Environment Variables** (Scroll to "Advanced"):
    Add these exact keys:

    - `DATABASE_URL`: `[Your Supabase/Neon connection string]`
      > ⚠️ **SUPABASE USERS**: Use the **Connection Pooler URL** (IPv4, typically port 6543/5432).
    - `GROQ_API_KEY`: `[Your Groq API Key]`
    - `SECRET_KEY`: `[A random long string]`

6.  Click **Create Web Service**.
    - Render will now "Build" your Docker image. This may take a few minutes.
    - Once done, it will deploy and say "Live".
    - **Copy the Backend URL** (e.g., `https://visualwave-backend.onrender.com`).

---

## 🎨 Step 2: Deploy Frontend (Vercel)

We will use Vercel for the React frontend, which is faster and easier for static sites/SPAs.

1.  **Log in** to [Vercel.com](https://vercel.com/).
2.  Click **Add New** -> **Project**.
3.  Import your GitHub repository.
4.  **Configure Project**:
    - **Framework Preset**: Vite (auto-detected).
    - **Root Directory**: Click "Edit" and select `frontend`.
5.  **Environment Variables**:

    - Key: `VITE_API_URL`
    - Value: `[Your Render Backend URL from Step 1]`
      - _Example_: `https://visualwave-backend.onrender.com` (No trailing slash)

6.  Click **Deploy**.
    - Wait for completion. 🎉

---

## ✅ Step 3: Verify

1.  Open your new Vercel URL.
2.  **Test Sign Up**: Creates a user in the database.
3.  **Test Visualization**: Uses Groq API to generate a graph.

### Troubleshooting

- **Build Fail on Render?** Check the logs. If it says "Context not found" or "Cannot copy requirements.txt", ensure you set **Root Directory** to `backend`.
- **Database Error?** Check `DATABASE_URL` in Render.
- **Frontend "Network Error"?** Check `VITE_API_URL` in Vercel.
