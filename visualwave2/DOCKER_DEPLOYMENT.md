# 🐳 Docker Deployment Guide

Complete guide for deploying VisualWave using Docker. This allows you to run the entire application (frontend + backend) on any system with Docker installed.

---

## 📋 Prerequisites

1. **Docker Desktop** installed
   - Windows: [Download Docker Desktop](https://www.docker.com/products/docker-desktop/)
   - After installation, verify: `docker --version` and `docker-compose --version`

2. **Git** (to clone/pull updates)

3. **Environment Variables** (database URL, API keys)

---

## 🚀 Quick Start (Local Development)

### 1. Set Up Environment Variables

Copy the template and fill in your values:

```powershell
# Copy the template
Copy-Item .env.docker .env

# Edit .env with your actual values
notepad .env
```

**Required values in `.env`:**

```env
DATABASE_URL=postgresql://user:password@host:port/database
GROQ_API_KEY=your_groq_api_key_here
SECRET_KEY=your_random_secret_key_here
VITE_API_URL=http://backend:8000
```

> [!IMPORTANT]
> **For Supabase users:** Use the **IPv4 Session Pooler URL** (port 6543 or 5432), not the IPv6 URL.

### 2. Build and Run

```powershell
# Build the Docker images (first time only, or after code changes)
docker-compose build

# Start the application
docker-compose up
```

**What happens:**

- Backend starts on `http://localhost:8000`
- Frontend starts on `http://localhost:80`
- Both containers are connected via Docker network

### 3. Access the Application

- **Frontend:** Open browser to `http://localhost` or `http://localhost:80`
- **Backend API Docs:** `http://localhost:8000/docs`

### 4. Stop the Application

```powershell
# Stop containers (Ctrl+C in the terminal, then)
docker-compose down

# Stop and remove volumes (clears any cached data)
docker-compose down -v
```

---

## 🔧 Development Workflow

### Hot Reload (Optional)

If you want code changes to reflect immediately without rebuilding:

**For backend:**

```yaml
# Add to docker-compose.yml under backend service:
volumes:
  - ./backend:/app
```

**For frontend:**
You'll need to rebuild: `docker-compose build frontend`

### View Logs

```powershell
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Rebuild After Changes

```powershell
# Rebuild specific service
docker-compose build backend
docker-compose build frontend

# Rebuild and restart
docker-compose up --build
```

---

## 🌐 Production Deployment

### Option 1: Deploy to Render (Recommended)

Render supports Docker deployments via `docker-compose.yml`.

1. **Push your code to GitHub** (already done ✅)

2. **Create a new Web Service on Render:**
   - Go to [Render Dashboard](https://render.com/dashboard)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - **Runtime:** Docker
   - **Docker Command:** Leave blank (uses `docker-compose.yml`)

3. **Set Environment Variables:**
   Add these in Render's environment variables section:
   - `DATABASE_URL`
   - `GROQ_API_KEY`
   - `SECRET_KEY`
   - `VITE_API_URL` (use your Render backend URL)

4. **Deploy!**

### Option 2: Deploy to Railway

1. **Install Railway CLI:**

   ```powershell
   npm install -g @railway/cli
   railway login
   ```

2. **Initialize and Deploy:**

   ```powershell
   railway init
   railway up
   ```

3. **Set Environment Variables:**
   ```powershell
   railway variables set DATABASE_URL=your_value
   railway variables set GROQ_API_KEY=your_value
   railway variables set SECRET_KEY=your_value
   railway variables set VITE_API_URL=http://backend:8000
   ```

### Option 3: Deploy to DigitalOcean App Platform

1. **Connect GitHub repository**
2. **Select Docker as runtime**
3. **Configure environment variables**
4. **Deploy**

---

## ✅ Verification Checklist

After deployment, verify everything works:

- [ ] **Backend Health Check**
  - Visit `http://localhost:8000/docs` (local) or your production URL
  - Should see FastAPI Swagger documentation

- [ ] **Frontend Loads**
  - Visit `http://localhost` (local) or your production URL
  - Should see VisualWave homepage

- [ ] **Navigation Works**
  - Click "Home" → loads correctly
  - Click "LeetCode Visualizer" → loads correctly
  - Click "NLP Visualizer" → loads correctly ✨ (new feature!)

- [ ] **API Communication**
  - Try signing up/logging in
  - Try using a visualizer feature
  - Check browser console for errors

- [ ] **NLP Visualizer Features**
  - Particle effects render correctly
  - Translation dropdown works
  - Text input and visualization work

---

## 🐛 Troubleshooting

### Build Fails

**Error:** `failed to solve: failed to compute cache key`

```powershell
# Clear Docker cache and rebuild
docker-compose build --no-cache
```

**Error:** `npm ci` fails in frontend

```powershell
# Delete node_modules and try again
Remove-Item -Recurse -Force frontend/node_modules
docker-compose build frontend
```

### Containers Won't Start

**Check logs:**

```powershell
docker-compose logs backend
docker-compose logs frontend
```

**Common issues:**

- Port 80 or 8000 already in use → Stop other services or change ports in `docker-compose.yml`
- Database connection fails → Check `DATABASE_URL` in `.env`
- Missing environment variables → Verify `.env` file exists and has all required values

### Frontend Can't Connect to Backend

**Error in browser console:** `Network Error` or `Failed to fetch`

**Fix:**

1. Check `VITE_API_URL` in `.env`
   - Local: Should be `http://backend:8000`
   - Production: Should be your actual backend URL

2. Rebuild frontend:
   ```powershell
   docker-compose build frontend
   docker-compose up
   ```

### Health Checks Failing

**Check container status:**

```powershell
docker-compose ps
```

**If backend health check fails:**

- Verify backend is running: `docker-compose logs backend`
- Check if `/docs` endpoint is accessible

**If frontend health check fails:**

- Verify Nginx is serving files: `docker-compose logs frontend`

---

## 🔄 Updating Your Deployment

### After Code Changes

```powershell
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose up --build
```

### After Dependency Changes

If you modified `requirements.txt` or `package.json`:

```powershell
# Rebuild from scratch
docker-compose build --no-cache
docker-compose up
```

---

## 📊 Monitoring

### Check Container Status

```powershell
docker-compose ps
```

### View Resource Usage

```powershell
docker stats
```

### Inspect Containers

```powershell
# Enter backend container
docker-compose exec backend sh

# Enter frontend container
docker-compose exec frontend sh
```

---

## 🧹 Cleanup

### Remove Stopped Containers

```powershell
docker-compose down
```

### Remove Everything (containers, networks, volumes)

```powershell
docker-compose down -v
docker system prune -a
```

---

## 📝 Notes

- **Docker Network:** Both frontend and backend are on the same `visualwave-network`, allowing them to communicate using service names (e.g., `http://backend:8000`)
- **Health Checks:** Containers have health checks to ensure they're running properly before marking as "healthy"
- **Restart Policy:** Containers will automatically restart unless explicitly stopped
- **Build Time:** First build may take 5-10 minutes. Subsequent builds are faster due to caching.

---

## 🆘 Need Help?

- **Docker Documentation:** https://docs.docker.com/
- **Docker Compose Reference:** https://docs.docker.com/compose/
- **Check logs:** `docker-compose logs -f`
