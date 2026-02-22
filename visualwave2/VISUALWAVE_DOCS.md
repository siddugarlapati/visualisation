# 🌊 VisualWave - Project Documentation

> **An interactive 3D algorithm visualization platform** that transforms abstract DSA and ML concepts into immersive, cinematic animations.

---

## 📋 Overview

VisualWave helps users learn Data Structures, Algorithms, and Machine Learning through **real-time 3D visualizations**. It combines LLM-powered step generation with Three.js rendering to create educational, engaging experiences.

---

## 🎯 Core Features

| Feature                 | Path                   | Description                                   |
| ----------------------- | ---------------------- | --------------------------------------------- |
| **LeetCode Visualizer** | `/leetcode-visualiser` | 3,000+ problems with LLM-generated animations |
| **DSA Playground**      | `/dsa-visualiser`      | Interactive data structures & algorithm demos |
| **ML Visualizer**       | `/ml-visualiser`       | 10+ ML algorithms with custom dataset support |

---

## 🛠️ Technical Stack

### Frontend

| Technology          | Purpose                 |
| ------------------- | ----------------------- |
| **React 18**        | UI framework            |
| **Vite**            | Build tool & dev server |
| **Three.js**        | 3D rendering engine     |
| **GSAP**            | Animation library       |
| **TailwindCSS**     | Styling                 |
| **React Router v7** | Client-side routing     |
| **Framer Motion**   | UI micro-animations     |

### Backend

| Technology       | Purpose                           |
| ---------------- | --------------------------------- |
| **FastAPI**      | REST API framework                |
| **Groq API**     | LLM for visualization generation  |
| **Pandas/NumPy** | Data processing                   |
| **scikit-learn** | ML utilities (PCA, preprocessing) |
| **Pydantic**     | Request validation                |

---

## 🏗️ Project Structure

```
visualizer2/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.jsx              # Landing page with feature selection
│   │   │   ├── LeetCodeVisualiser.jsx # LeetCode problem visualizations
│   │   │   ├── DSAVisualiser.jsx      # Interactive DSA playground
│   │   │   ├── MLVisualiser.jsx       # ML algorithm visualizations
│   │   │   └── About.jsx              # Project info page
│   │   ├── engine/
│   │   │   ├── gsap_engine.js         # Core animation orchestrator
│   │   │   ├── scenesetup.js          # Three.js scene initialization
│   │   │   ├── geometry.js            # 3D shape generators
│   │   │   ├── materials.js           # Shader materials & effects
│   │   │   ├── particles.js           # Particle system effects
│   │   │   ├── morphing.js            # Shape morphing animations
│   │   │   ├── background.js          # Animated background
│   │   │   └── api/                   # 29 visualization API modules
│   │   ├── components/                # Reusable UI components
│   │   └── utils/                     # Helper utilities
│   └── package.json
│
└── backend/
    ├── main.py                # FastAPI server & endpoints
    ├── animation_engine.py    # LLM prompts & viz API documentation
    ├── input_validator.py     # Input validation logic
    ├── input_resolver.py      # Test case generation & resolution
    ├── input_generator.py     # Auto-generate valid inputs
    ├── input_models.py        # Pydantic models
    ├── leetcode_data.json     # 3,000+ problems (~20MB)
    ├── requirements.txt       # Python dependencies
    └── .env                   # API keys (GROQ_API_KEY)
```

---

## 🔌 API Endpoints

| Method | Endpoint          | Description                                   |
| ------ | ----------------- | --------------------------------------------- |
| `GET`  | `/problems`       | List all LeetCode problems                    |
| `POST` | `/generate`       | Generate visualization for a LeetCode problem |
| `POST` | `/ml-generate`    | Generate ML algorithm visualization           |
| `POST` | `/upload-dataset` | Upload CSV/JSON for custom ML visualization   |

### Request Examples

**Generate LeetCode Visualization:**

```json
POST /generate
{
  "problem_id": 1,
  "custom_input": "[2, 7, 11, 15]"
}
```

**Generate ML Visualization:**

```json
POST /ml-generate
{
  "algorithm": "linear_regression",
  "params": {}
}
```

---

## 🎨 Visualization API Reference

The engine exposes a `viz.*` API that the LLM uses to generate animations:

### Data Structures

| API             | Functions                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------------ |
| **Array**       | `createArrayAPI`, `arrayHighlight`, `arraySwap`, `arrayUpdate`, `arrayInsert`, `arrayDelete`, `arrayCompare` |
| **Linked List** | `createListNode`, `linkNodes`, `unlinkNodes`, `deleteListNode`, `listHighlight`                              |
| **Tree/BST**    | `bstCreateRoot`, `bstCreateChild`, `bstCompare`, `bstHighlightDirection`, `bstMoveProbe`                     |
| **Heap**        | `heapInit`, `heapInsert`, `heapSwap`, `heapCompare`, `heapHighlight`                                         |
| **Graph**       | `createGraphNode`, `createGraphEdge`, `graphHighlight`, `graphBFSVisit`, `graphDFSVisit`                     |
| **HashMap**     | `createHashMap`, `hashInsert`, `hashLookup`, `hashHighlight`                                                 |

### ML Visualizations

| API            | Functions                                     |
| -------------- | --------------------------------------------- |
| **Points**     | `spawnPoint`, `highlightPoint`, `removePoint` |
| **Lines**      | `spawnLine`, `moveLine`                       |
| **Clusters**   | `partitionData`, `recolorCluster`             |
| **Regression** | `fitRegression`, `showResiduals`              |

### Effects & Camera

| API         | Functions                                                                  |
| ----------- | -------------------------------------------------------------------------- |
| **Effects** | `confetti`, `pulse`, `shake`, `dissolveToParticles`, `reformFromParticles` |
| **Camera**  | `focusCamera`, `focusGroup`, `resetCamera`, `warp_bg`                      |

---

## 🚀 Running the Project

### Backend

```bash
cd backend
python -m venv venv
.\venv\Scripts\activate      # Windows
pip install -r requirements.txt

# Create .env with: GROQ_API_KEY=your_key_here

uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Access at: `http://localhost:5173`

---

## 📊 Supported Algorithms

### DSA Playground

- **Data Structures**: Array, Stack, Queue, Linked List, Tree, BST, Heap, HashMap, Graph
- **Algorithms**: Quick Sort, Merge Sort, Tower of Hanoi, Dijkstra's Algorithm

### ML Visualizer

| Category           | Algorithms                                                      |
| ------------------ | --------------------------------------------------------------- |
| **Regression**     | Linear Regression, Logistic Regression                          |
| **Clustering**     | K-Means, GMM, DBSCAN, Hierarchical Clustering                   |
| **Classification** | K-Nearest Neighbors, Naive Bayes, Decision Trees, Random Forest |

---

## 🔑 Key Highlights

- 🤖 **LLM-Powered**: Groq API generates intelligent, problem-specific visualization steps
- 🎬 **Cinematic 3D**: Three.js + GSAP for smooth, professional animations
- 📚 **Educational**: Step-by-step explanations with real code snippets
- 🎮 **Interactive**: Custom test case input support
- 📈 **ML-Ready**: Upload your own datasets (CSV/JSON) with automatic preprocessing
- 🎨 **Premium UI**: Dark theme with glassmorphism effects
