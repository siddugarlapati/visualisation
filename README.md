# VisualWave — Interactive CS Learning Platform

An interactive 3D concept visualisation platform for computer science education, built at Anurag University. Every topic is explained through a step-by-step 3D animation with a real-time narration panel.

![Platform Preview](visualwave2/frontend/public/anurag-logo.svg)

---

## ✨ Features

| Feature | Description |
|---|---|
| 🧩 **Concept Learner** | 20 languages & tech stacks, ~136 animated 3D topics |
| ✨ **AI Visualizer** | Type any concept → Gemini 2.0 Flash generates a live 3D animation |
| 🏗️ **Architecture Sandbox** | Drag-and-drop 3D topology builder (DB, API, K8s, ML, etc.) |
| 📊 **DSA Visualizer** | Sorting, trees, graphs, DP — animated step-by-step |
| 🤖 **ML Visualizer** | KNN, SVM, neural networks, clustering visualized in 3D |
| 💬 **NLP Visualizer** | Tokenization, embeddings, attention mechanisms |
| 💻 **LeetCode Visualizer** | Step-through common problem patterns |

---

## 🗂️ Tech Stack Coverage (Concept Learner)

| Language / Tech | Topics |
|---|---|
| 🐍 Python | 24 topics — variables to async/await, OOP, decorators |
| ⚡ JavaScript | Event loop, closures, promises, prototypes |
| 🔷 TypeScript | Types, generics, utility types, decorators |
| ⚛️ React | Hooks, Virtual DOM, Context, Redux |
| 🟢 Node.js | Event loop, streams, Express, cluster |
| 🔷 C Language | Pointers, memory, structs, bit manipulation |
| ⚙️ C++ | OOP, STL, smart pointers, RAII, move semantics |
| ☕ Java | JVM, generics, streams, Spring Boot, GC |
| 🐹 Go | Goroutines, channels, interfaces, error handling |
| 🦀 Rust | Ownership, borrowing, lifetimes, traits |
| 🗃️ SQL | JOINs, indexes, ACID, normalisation, CTEs |
| 🍃 NoSQL | MongoDB, Redis, Cassandra, CAP theorem |
| 🔌 REST APIs | JWT/OAuth2, GraphQL, OpenAPI/Swagger, CORS |
| 🎨 Bootstrap & CSS | Flexbox, Grid, animations, CSS variables |
| 🌿 Git | Commits, branching, rebase, GitHub Flow |
| 🐳 Docker & K8s | Containers, Compose, Pods, Services, HPA |
| ☁️ Cloud / AWS | EC2, S3, Lambda, VPC, RDS, CI/CD |
| 🧩 DSA | Sorting, trees, graphs, dynamic programming |

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 18
- Python ≥ 3.10
- A [Google Gemini API key](https://aistudio.google.com/app/apikey) (for AI visualization)

### 1. Clone the repo
```bash
git clone https://github.com/siddugarlapati/visualisation.git
cd visualisation/visualwave2
```

### 2. Frontend
```bash
cd frontend
npm install
```

Create a `.env` file in `frontend/`:
```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

Start the dev server:
```bash
npm run dev
# → http://localhost:5173
```

### 3. Backend (optional — for auth features)
```bash
cd ../backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

---

## 🧠 AI Visualization

The **Concept Learner** page has an AI search bar powered by **Gemini 2.0 Flash**. Type any CS concept and it generates a live 3D animated explanation instantly.

**Examples to try:**
- `Binary Search Tree insertion`
- `TCP/IP Three-way handshake`
- `React Fiber reconciliation`
- `Dijkstra's algorithm`
- `JWT authentication flow`

> The API key is read from `VITE_GEMINI_API_KEY` in your `.env` file and is **never committed to git**.

---

## 📁 Project Structure

```
visualisation/
├── visualwave2/
│   ├── frontend/
│   │   ├── src/
│   │   │   ├── pages/          # ConceptVisualiser, ArchitectureBuilder, DSAVisualiser…
│   │   │   ├── engine/         # GSAPEngine — 3D animation core
│   │   │   ├── data/
│   │   │   │   ├── topics/     # Per-language topic files (topics_c.js, topics_rust.js…)
│   │   │   │   └── conceptTopics.js  # Barrel index + LANGUAGES array
│   │   │   ├── services/
│   │   │   │   └── geminiService.js  # Gemini API integration
│   │   │   └── components/     # Navbar, Layout, shared UI
│   │   ├── public/
│   │   └── vite.config.js
│   └── backend/                # FastAPI / Flask auth backend
└── README.md
```

---

## 🔑 Environment Variables

| Variable | Where | Description |
|---|---|---|
| `VITE_GEMINI_API_KEY` | `frontend/.env` | Google Gemini 2.0 Flash API key |

---

## 🛠️ Built With

- **React + Vite** — Frontend framework
- **Three.js** — 3D rendering engine
- **GSAP** — Animation library
- **Tailwind CSS** — Styling
- **Google Gemini 2.0 Flash** — AI visualization generation
- **FastAPI / Flask** — Backend API

---

## 📄 License

MIT © Anurag University — Garlapati Siddu
