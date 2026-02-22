SYSTEM_PROMPT = """
You are VISUALWAVE — Algorithm Visualization Expert.
Mission: Convert algorithm logic into step-by-step 3D visualizations using the viz.* API.

═══════════════════════════════════════════════
1) CORE PRINCIPLES
═══════════════════════════════════════════════
1. ACCURACY FIRST — Visual correctness > aesthetics.
2. SPATIAL CLARITY — Avoid overlap; use proper spacing.
3. COMPLETE DEMONSTRATION — Show full algorithm execution (8-20 steps minimum).
4. VISUALIZE ALL DATA STRUCTURES — Not just input! Include stacks, hashmaps, variables.

═══════════════════════════════════════════════
2) CONSTRAINTS
═══════════════════════════════════════════════
• Use ONLY viz.* API calls listed below. Do not invent functions.
• All parameters must be LITERAL values (numbers, strings, arrays). NO variables!
• 1–3 API calls per step. End each call with semicolon.
• Output must be strict JSON only.
• IDs must be QUOTED STRINGS: 'arr', 'node1', 'stack' — never unquoted!

═══════════════════════════════════════════════
3) SPATIAL LAYOUT 🚨 CRITICAL
═══════════════════════════════════════════════
ZONES (prevent overlapping):
• Main array: x=-6, y=0 (centered)
• Variables/Result: x=10, y=8 (TOP-RIGHT, well above array)
• Stack/Hashmap: x=-10, y=-6 (BOTTOM-LEFT, below array)
• Pointers: y=-3 (just below array)

SPACING RULES:
• Min 3 units between array elements (x-axis)
• Min 4 units between different data structures (y-axis)
• Safe bounds: x=[-12,+12], y=[-8,+8]
• NEVER place auxiliary structures at same Y as main array!

═══════════════════════════════════════════════
4) ALLOWED API
═══════════════════════════════════════════════

ARRAY:
viz.createArrayAPI(id, values, x, y, material?);
viz.arrayHighlight(id, index, colorHex);
viz.arrayCompare(id, i, j);
viz.arrayUpdate(id, index, value);
viz.arrayInsert(id, index, value);
viz.arrayDelete(id, index);
viz.arraySwap(id, i, j);
viz.arrayMovePointer(id, index, pointerId);

AUXILIARY STRUCTURES (use arrays):
• Stack: viz.createArrayAPI('stack', [], -10, -6, 'water');
• Variable: viz.createArrayAPI('max_sum', [0], 10, 8);
• Hashmap: Use two arrays at y=-6 for keys/values

LIST:
viz.createListNode(id, value, x, y);
viz.listNext(id1, id2);
viz.listHighlight(id, colorHex);
viz.listInsertAfter(prevId, newId);
viz.listDelete(id);
viz.createListPointer(ptrId, label, x, y);
viz.listMovePointer(ptrId, targetId);

TREE:
viz.createTreeNodeAPI(id, value, parentId, isLeft, material?);
viz.treeHighlight(id, colorHex);
viz.treeShake(id);

BST:
viz.bstCreateRoot(id, value, x, y);
viz.bstCreateChild(id, value, parentId, side);
viz.bstCompare(nodeId, probeId);
viz.bstHighlightDirection(nodeId, colorHex);
viz.bstMoveProbe(probeId, targetId);
viz.bstInserted(id);
viz.bstFound(id);

GRAPH:
viz.graphCreateNode(id, value, x, y, material?);
viz.graphConnect(id1, id2, directed);
viz.graphConnectWeighted(id1, id2, weight);
viz.graphHighlight(id, colorHex);
viz.graphHighlightEdge(id1, id2, colorHex);
viz.graphPath(idsArray, colorHex);

DP:
viz.dpInit(rows, cols, x, y);
viz.dpSet(r, c, value);
viz.dpHighlight(r, c, colorHex);
viz.dpTransition(fromCells, r, c);
viz.dpAnswer(r, c);

GENERAL + CAMERA:
viz.move(id, {x, y, z}, duration);
viz.swap(id1, id2);
viz.pulse(id);
viz.highlight(id, colorHex);
viz.confetti(id);
viz.focusCamera(id, padding);  // Use cell ID like 'arr_0', not 'arr'!
viz.focusGroup([id1, id2], padding);
viz.resetCamera();

COLORS:
• 0x22c55e (green) - success, sorted, found
• 0xef4444 (red) - error, not found
• 0x3b82f6 (blue) - current, processing
• 0xfbbf24 (yellow) - comparing

MATERIALS: 'default', 'glass', 'metal', 'fire', 'water', 'earth'

═══════════════════════════════════════════════
5) OUTPUT FORMAT (STRICT JSON)
═══════════════════════════════════════════════
{
  "solutions": {
    "python": "def solve(nums):\\n    ...",
    "java": "class Solution {\\n    public int solve(int[] nums) {\\n        ...",
    "cpp": "class Solution {\\n    public:\\n    int solve(vector<int>& nums) {\\n        ..."
  },
  "steps": [
    {
      "step": 1,
      "explanation": "Brief explanation (2-3 sentences): WHAT, WHY, CURRENT STATE",
      "line_numbers": {
        "python": [2, 3],
        "java": [5, 6],
        "cpp": [8, 9]
      },
      "code": "viz.createArrayAPI('arr', [5,3,8], -6, 0); viz.focusCamera('arr_0', 0.5);",
      "python_code": "# Equivalent Python code (Legacy field, keep for compatibility)"
    }
  ]
}

RULES:
• "solutions" object MUST contain full, compilable code for all 3 languages.
• "line_numbers" object in each step MUST map to relevant lines in the "solutions" code (1-indexed).
• 1–3 viz.* calls per step, semicolon-separated
• Use single quotes in code strings
• Minimum 8 steps, maximum 25 steps
• NO variables, NO markdown, NO extra text
• If error, return: {"steps": []}

═══════════════════════════════════════════════
6) STEP QUANTITIES
═══════════════════════════════════════════════
• Simple (binary search): 8-12 steps
• Medium (two pointers, DP): 12-18 steps
• Complex (graphs): 18-25 steps
• For long loops: show first 2-3, summarize, show final 1-2

═══════════════════════════════════════════════
7) FORBIDDEN
═══════════════════════════════════════════════
• Functions not in API list
• Variable references (nums[i], len, target)
• Coordinates outside safe bounds
• Overlapping elements at same position
• Missing camera focus calls

End of prompt.
"""

def get_groq_messages(problem_title, description, resolved_input):
    """
    Build the exact messages to send to the LLM (Groq/Claude/other).
    
    NEW: Uses resolved input object with explicit prompt injection.
    
    Args:
        problem_title: The LeetCode problem title
        description: Problem description
        resolved_input: VisualWaveExecutionInput object with resolved input
    
    Returns:
        List of messages formatted for LLM chat API
    """
    
    # Format the resolved input for the prompt
    data_type = resolved_input.constraints.data_type
    parsed = resolved_input.parsed_input
    
    # Create formatted input string based on type
    if data_type == "array" or data_type == "linkedlist":
        formatted_input = f"Array: {parsed}"
        example_viz = f"viz.createArrayAPI('arr', {parsed}, -4.5, 2, 'fire');"
    elif data_type == "tree":
        formatted_input = f"Tree (level-order): {parsed}"
        example_viz = f"// Use exact node values from: {parsed}"
    elif data_type == "graph":
        formatted_input = f"Graph (edge list): {parsed}"
        example_viz = f"// Create edges exactly as: {parsed}"
    elif data_type == "matrix":
        formatted_input = f"Matrix: {parsed}"
        example_viz = f"// Matrix rows: {parsed}"
    elif data_type == "string":
        formatted_input = f'String: "{parsed}"'
        example_viz = f"// Animate string: '{parsed}'"
    elif data_type == "number":
        formatted_input = f"Number: {parsed}"
        example_viz = f"// Use value: {parsed}"
    else:
        formatted_input = f"Input: {parsed}"
        example_viz = ""
    
    user_prompt = (
        "Follow the SYSTEM_PROMPT rules exactly to generate a step-by-step visualization screenplay.\n\n"
        "Problem:\n"
        f"- Topic: {problem_title}\n"
        f"- Description: {description}\n\n"
        "═══════════════════════════════════════════════\n"
        "RESOLVED INPUT (THIS IS THE ONLY INPUT YOU SHOULD VISUALIZE)\n"
        "═══════════════════════════════════════════════\n"
        f"- Input Mode: {resolved_input.input_mode}\n"
        f"- Data Type: {data_type}\n"
        f"- {formatted_input}\n\n"
        "CRITICAL INSTRUCTIONS — READ CAREFULLY:\n"
        "• You MUST visualize using the RESOLVED INPUT above.\n"
        "• Do NOT generate new example inputs.\n"
        "• Do NOT use generic placeholder values like [1,2,3,4,5].\n"
        "• Visualize EXACTLY the parsed input provided above.\n"
        "• Every value in your visualization code must match the resolved input.\n\n"
    )
    
    # Add type-specific examples
    if data_type == "array":
        user_prompt += (
            f"ARRAY VISUALIZATION REQUIREMENTS:\n"
            f"- The input array is: {parsed}\n"
            f"- You MUST use: {example_viz}\n"
            f"- Create array cells with these EXACT values in this EXACT order.\n"
            f"- Do not add, remove, or change any values.\n"
            f"- When comparing elements, use indices that exist in this specific array.\n\n"
        )
    elif data_type == "tree":
        user_prompt += (
            f"TREE VISUALIZATION REQUIREMENTS:\n"
            f"- The tree nodes are: {parsed}\n"
            f"- Use exact node values from this level-order array.\n"
            f"- Null values indicate empty nodes in the tree structure.\n"
            f"- Root value is {parsed[0] if parsed else 'None'}.\n\n"
        )
    elif data_type == "graph":
        user_prompt += (
            f"GRAPH VISUALIZATION REQUIREMENTS:\n"
            f"- The graph edges are: {parsed}\n"
            f"- Create graph nodes for each unique node ID.\n"
            f"- Draw edges EXACTLY as specified in the edge list.\n\n"
        )
    
    user_prompt += (
        "═══════════════════════════════════════════════\n\n"
        "Additional Requirements:\n"
        "- IMPORTANT: Generate at least 8-12 steps minimum. Show the full algorithm execution.\n"
        "- Use ONLY the viz.* API functions listed in the system prompt.\n"
        "- Follow spatial layout rules (vertical arrays, pointer spacing, safe bounds).\n"
        "- Ensure camera focus calls in every relevant step.\n"
        "- Provide educational explanations (2-3 sentences each).\n"
        "- Provide complete execution (follow 'STEP QUANTITIES' rules - minimum 8 steps).\n"
        "- Output strict JSON exactly as specified in the SYSTEM_PROMPT.\n"
        "- All code arguments must be literal values (numbers/strings/arrays).\n\n"
        "Begin generating the 'steps' array now. Use the RESOLVED INPUT above. Remember: MINIMUM 8 STEPS."
    )

    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt}
    ]


def get_ml_groq_messages(algorithm, params):
    """
    Build messages for ML algorithm visualization.
    Args:
        algorithm: 'linear_regression', 'logistic_regression', etc.
        params: dict with algorithm-specific parameters like data points, learning rate, etc.
    """
    
    # ML-specific system additions
    ml_system_addition = """

-------------------------
ML VISUALIZATION GUIDELINES
-------------------------
For ML visualizations, follow these additional rules:

IMPORTANT: EVERY STEP MUST HAVE A VISUALIZATION!
Do NOT have any step without a viz.* call. Each step should show something visual.

AXIS SELECTION:
• 2D data: Use viz.spawnAxes(-10, 10, -8, 8)
• 3D data: Use viz.spawn3DAxes(6)

LINEAR REGRESSION (2D - single feature):
• Use viz.spawnAxes(-10, 10, -8, 8) for 2D coordinate system
• Spawn data points using viz.spawnPoint(id, x, y, 0)
• Draw regression line using viz.spawnLine('reg_line', p1, p2)
• Show residuals using viz.drawErrorLine('err_p_0', p_data, p_line)
• Update model: viz.updateRegressionModel(m, b)

MULTIPLE REGRESSION (3D - two features x1, x2):
• Use viz.spawn3DAxes(6) for 3D coordinate system (red=X1, green=Y, blue=X2)
• Spawn 3D points using viz.spawn3DPoint(id, x1, x2, y) - note: x1, x2, y order!
• Draw regression PLANE using viz.spawnRegressionPlane3D('reg_plane', m1, m2, c)
• Update plane: viz.spawnRegressionPlane3D('reg_plane', new_m1, new_m2, new_c)
• Show feature weights: viz.showCoefficientBars([m1, m2], ['x1', 'x2'])
• Final equation: viz.showMultipleEquation(m1, m2, c)

IMPORTANT FOR MULTIPLE REGRESSION:
• Equation is: y = m1*x1 + m2*x2 + c
• The plane tilts in 3D space based on coefficients m1 and m2
• Camera should be positioned to show the 3D perspective

STEP STRUCTURE (ALL STEPS MUST HAVE VISUALS):
1. Setup axes
2. Load and display all data points
3. Data validation visual (highlight outliers, missing data)
4. Train/test split visualization (color points)
5. Initial model (line or plane)
6. Training iterations with gradient descent
7. Final model with equation display
8. Celebration

PYTHON CODE REQUIREMENT:
Every step MUST include a "python_code" field showing the equivalent NumPy/Pandas/sklearn code.
- Use \\n for newlines in the python_code string.
- Include imports (numpy, pandas, sklearn) only in step 1.
- Keep code concise (5-15 lines per step).
- Use real library syntax matching the ML algorithm being visualized.
"""

    # Algorithm-specific prompt generation
    if algorithm == 'multiple_regression':
        user_prompt = f"""
You are generating a 3D visualization for Multiple Regression: y = m1*x1 + m2*x2 + c

Data (x1, x2, y): {params.get('data', [])}
Features: {params.get('features', ['x1', 'x2'])}

AVAILABLE 3D API FUNCTIONS:
viz.spawn3DAxes(6);                      // 3D axes: X1(red), Y(green), X2(blue)
viz.spawn3DPoint(id, x1, x2, y);         // 3D point - note param order!
viz.spawnRegressionPlane3D(id, m1, m2, c); // Regression plane
viz.highlightPoint(id, color);           // Highlight a point
viz.colorPoint(id, color, duration);     // Change color
viz.showCoefficientBars([m1, m2], ['x1', 'x2']); // Bar chart of weights
viz.showMultipleEquation(m1, m2, c);     // y = m1*x1 + m2*x2 + c label
viz.celebrateCompletion();               // Celebration effect

GENERATE 20-25 STEPS FOLLOWING THIS "ML STUDENT WORKFLOW":

PHASE 1 - PROBLEM DEFINITION (Steps 1-2):
viz.spawn3DAxes(6);
"Problem: Predict Y based on X1 and X2 features."

PHASE 2 - DATA EXPLORATION (Steps 3-4):
viz.spawn3DPoint('p_0', x1, x2, y); // Load all points
"Loading dataset. We have multiple samples."

PHASE 3 - TRAIN/TEST SPLIT (Steps 5-6):
viz.colorPoint('p_0', 0x4488ff, 1.0); // Color 80% of points BLUE (Train)
viz.colorPoint('p_8', 0x22c55e, 1.0); // Color 20% of points GREEN (Test)
"Step 1: Split data into Training (Blue) and Testing (Green) sets."

PHASE 4 - MODEL INITIALIZATION (Steps 7-8):
viz.spawnRegressionPlane3D('reg_plane', 0, 0, 0);
viz.showCalculation("Init Weights", "w1=0, w2=0", 0, 8);
"Step 2: Initialize model weights to zero (Flat plane)."

PHASE 5 - TRAINING LOOP (Steps 9-16):
// Iterate multiple times
viz.spawnRegressionPlane3D('reg_plane', 0.5, 0.3, 0.5);
viz.showCalculation("Loss Calc", "Loss = High", 0, 8);
"Step 3: Training... Gradient Descent updates weights to minimize error on Blue points."
...
viz.spawnRegressionPlane3D('reg_plane', 1.0, 0.88, 1.5);
"Training complete. Model converged."

PHASE 6 - TESTING/EVALUATION (Steps 17-20):
viz.highlightPoint('p_8', 0xff0000); // Highlight a Green test point
"Step 4: Testing. Evaluating model accuracy on hidden Test data (Green)."
viz.showMultipleEquation(1.0, 0.88, 1.5);
viz.celebrateCompletion();
"Final Result: The model generalizes well!"

OUTPUT FORMAT (strict JSON with python_code):
{{"steps": [
  {{"step": 1, "explanation": "Setting up axes", "code": "viz.spawn3DAxes(6);", "python_code": "import numpy as np\\nfrom sklearn.linear_model import LinearRegression\\n\\n# Load data\\nX = np.array([[1, 2], [2, 1], [3, 3]])\\ny = np.array([3.5, 4.2, 7.1])"}},
  {{"step": 2, "explanation": "Training model", "code": "viz.spawnRegressionPlane3D('reg_plane', 1.0, 0.88, 1.5);", "python_code": "# Fit linear regression model\\nmodel = LinearRegression()\\nmodel.fit(X_train, y_train)\\nprint(f'Coefficients: {{model.coef_}}')"}}
]}}

IMPORTANT: 
1. MUST visualizing the Train/Test split using colors (Blue=Train, Green=Test).
2. training steps should mention optimizing on "Training Data".
3. The final phase must be "Testing" on the "Test Data".
4. Each step MUST include a "python_code" field with equivalent sklearn/numpy code.

IMPORTANT: Use actual x1, x2, y values from the data provided.
Use single quotes in code strings.
"""
    elif algorithm == 'k_means':
        user_prompt = f"""
You are generating a visualization for K-Means Clustering.

Data (x, y points): {params.get('data', [])}
Number of clusters (K): {params.get('k', 3)}

AVAILABLE API FUNCTIONS:
viz.spawnAxes(xMin, xMax, yMin, yMax);     // 2D coordinate system
viz.spawnClusterPoint(id, x, y, z);         // Spawn gray data point
viz.spawnCentroid(id, x, y, z, clusterIdx); // Spawn centroid with bounce (idx 0,1,2...)
viz.moveCentroid(id, newX, newY, newZ);     // Move centroid with trail
viz.assignPointToCluster(pointId, clusterIdx); // Draw ray + color change
viz.celebrateClusterConvergence();          // Ripple effect + label
viz.showClusterStats([size1, size2, size3]); // Show cluster sizes
viz.showCalculation(formula, result, x, y); // Animate formula -> result (e.g. "Mean=(...)", "Mean=5")

GENERATE 20-25 STEPS FOLLOWING THIS "ML STUDENT WORKFLOW":

PHASE 1 - PROBLEM DEFINITION (Steps 1-2):
viz.spawnAxes(-10, 10, -10, 10);
"Problem: Unsupervised Learning. Group unlabeled data into K={params.get('k', 3)} clusters."

PHASE 2 - DATA EXPLORATION (Steps 3-4):
viz.spawnClusterPoint('cp_0', x, y, 0); // Load all points
"Loading dataset. Visualizing data distribution in 2D space."

PHASE 3 - MODEL INITIALIZATION (Steps 5-6):
viz.spawnCentroid('centroid_0', x1, y1, 0, 0);
viz.showCalculation("Init Centroids", "Random Locations", 0, 8);
"Step 1: Initialization. Placing K random centroids to start the algorithm."

PHASE 4 - TRAINING LOOP (Steps 7-18):
// Iteration 1
"Step 2: Training (Iteration 1). Assigning points to nearest centroid."
viz.assignPointToCluster('cp_0', 0);
...
viz.moveCentroid('centroid_0', newX, newY, 0);
"Updating centroids to the mean position of assigned points."
// Iteration 2...
"Step 3: Refining clusters. Centroids shift to center of mass."

PHASE 5 - CONVERGENCE/RESULT (Steps 19-22):
viz.celebrateClusterConvergence();
viz.showClusterStats([5, 3, 4]); 
"Final Result: Algorithm Converged. Distinct clusters identified."

OUTPUT FORMAT (strict JSON with python_code):
{{"steps": [
  {{"step": 1, "explanation": "Setting up axes", "code": "viz.spawnAxes(-10, 10, -10, 10);", "python_code": "import numpy as np\nfrom sklearn.cluster import KMeans\n\n# Load data\nX = np.array([[2, 3], [5, 4], ...])"}},
  {{"step": 2, "explanation": "Initialize centroids", "code": "viz.spawnCentroid('centroid_0', 2, 3, 0, 0);", "python_code": "# Initialize K-Means with k=3\nkmeans = KMeans(n_clusters=3, random_state=42)\n# Initial centroids are random"}}
]}}

IMPORTANT:
1. Clearly explain the "Expectation-Maximization" steps (Assign -> Update).
2. Use "Phase" headings in logic.
3. Each step MUST include a "python_code" field with equivalent sklearn/numpy code.
"""
    elif algorithm == 'logistic_regression':
        user_prompt = f"""
You are generating a visualization for Logistic Regression (Binary Classification).

Data (x, y, label): {params.get('data', [])}
Class 0 = Red, Class 1 = Blue

AVAILABLE API FUNCTIONS:
viz.spawnAxes(xMin, xMax, yMin, yMax);     // 2D coordinate system
viz.spawnClassPoint(id, x, y, classLabel); // Red (0) or Blue (1) point
viz.spawnDecisionBoundary(id, angle, offset); // Spawn purple boundary line
viz.updateDecisionBoundary(id, angle, offset); // Rotate and shift
viz.createRegionShading();                  // Red/blue background regions
viz.updateRegionShading(intensity);         // Increase shading opacity
viz.createProbabilityBar(pointId, prob);    // Create bar behind point
viz.updateProbabilityBar(pointId, prob);    // Update bar height/color
viz.pulseMisclassified([pointIds]);         // Pulse red ring on errors
viz.showClassificationAccuracy(accuracy);   // Display accuracy %
viz.showCalculation(formula, result, x, y); // Animate formula -> result

GENERATE 20-25 STEPS FOLLOWING THIS "ML STUDENT WORKFLOW":

PHASE 1 - PROBLEM DEFINITION (Steps 1-2):
viz.spawnAxes(-10, 10, -10, 10);
"Problem: Binary Classification. Separate Red (Class 0) from Blue (Class 1)."

PHASE 2 - DATA EXPLORATION (Steps 3-4):
viz.spawnClassPoint('cls_0', x, y, 0); // Load all points
"Loading dataset. Visualizing distinct classes."

PHASE 3 - TRAIN/TEST SPLIT (Steps 5-6):
viz.pulseMisclassified(['cls_8', 'cls_9']); // functionality to highlight specific points
"Step 1: Splitting data. We hold out 20% of data (Selected points) for Testing later."

PHASE 4 - MODEL INITIALIZATION (Steps 7-8):
viz.spawnDecisionBoundary('boundary', 0, 0);
viz.createRegionShading();
viz.showCalculation("Init Weights", "Random", -5, 8);
"Step 2: Initialize Decision Boundary with random weights."

PHASE 5 - TRAINING LOOP (Steps 9-16):
// Iterate multiple times
viz.updateDecisionBoundary('boundary', 0.3, 1.0);
viz.showAmountOfError("High Error"); // hypothetical or reuse calculation
"Step 3: Training... Gradient Descent rotates boundary to separate Red/Blue."
...
viz.updateDecisionBoundary('boundary', 0.5, 2.0);
"Training complete. Boundary maximized separation."

PHASE 6 - TESTING/EVALUATION (Steps 17-20):
viz.pulseMisclassified(['cls_8', 'cls_9']); // Highlight the hidden test points
"Step 4: Testing. Verifying model on the held-out Test Set."
viz.showClassificationAccuracy(0.92);
"Final Result: 92% Accuracy on Test Set."

OUTPUT FORMAT (strict JSON with python_code):
{{"steps": [
  {{"step": 1, "explanation": "Setting up axes", "code": "viz.spawnAxes(-10, 10, -10, 10);", "python_code": "import numpy as np\nfrom sklearn.linear_model import LogisticRegression\n\n# Binary classification data\nX = np.array([[-6, 2], [-5, -1], ...])\ny = np.array([0, 0, 0, 1, 1, 1])"}}
]}}

IMPORTANT:
1. Clearly narrate the "Train/Test Split" phase.
2. Emphasize "Training" iterations.
3. Conclude with "Testing" on specific points.
4. Each step MUST include a "python_code" field with equivalent sklearn/numpy code.
"""
    elif algorithm == 'pca':
        user_prompt = f"""
You are generating a visualization for PCA (Principal Component Analysis).

Data (x, y points): {params.get('data', [])}

AVAILABLE API FUNCTIONS:
viz.spawnAxes(xMin, xMax, yMin, yMax);    // 2D axes
viz.spawnPCAPoint(id, x, y, z);           // Data point
viz.showDataMean(meanX, meanY);           // Yellow ring at mean
viz.centerData(meanX, meanY);             // Shift points to center
viz.spawnEigenvector(id, dirX, dirY, variance, isPrimary); // Arrow
viz.rotateToEigenbasis(angle);            // Rotate coordinate system
viz.projectOntoPC(pcIndex);               // Project points to PC axis
viz.showVarianceBars(pc1Var, pc2Var);     // Variance explained chart
viz.showCalculation(formula, result, x, y); // Animate formula -> result (e.g. "Var=(...)", "Var=0.8")

GENERATE 20-22 STEPS FOLLOWING THIS "ML STUDENT WORKFLOW":

PHASE 1 - PROBLEM DEFINITION (Steps 1-2):
viz.spawnAxes(-10, 10, -10, 10);
"Problem: Dimensionality Reduction. Simplify complex 3D data into 2D components."

PHASE 2 - DATA EXPLORATION (Steps 3-4):
viz.spawnPCAPoint(id, x, y, z);
"Loading dataset. Observe the spread of data in X and Y."

PHASE 3 - PREPROCESSING (Steps 5-7):
viz.showDataMean(meanX, meanY);
viz.centerData(meanX, meanY); 
"Step 1: Preprocessing. Calculate Mean and center data at origin (Zero-centering)."

PHASE 4 - EXECUTION (Steps 8-10):
viz.spawnEigenvector(id, dirX, dirY, var, true);
viz.showCalculation("Eigenvectors", "Max Variance", 0, 8);
"Step 2: Finding Principal Components (Eigenvectors) represents directions of maximum variance."

PHASE 5 - TRANSFORMATION (Steps 11-13):
viz.rotateToEigenbasis(angle);
"Step 3: Rotation. Aligning axes with Principal Components."

PHASE 6 - PROJECTION/RESULT (Steps 14-16):
viz.projectOntoPC(0); // Project to PC1
viz.showVarianceBars(pc1Var, pc2Var);
"Final Result: Data projected onto PC1. Variance preserved."

OUTPUT FORMAT (strict JSON with python_code):
{{"steps": [{{"step": 1, "explanation": "...", "code": "viz.spawnAxes(-8, 8, -8, 8);", "python_code": "import numpy as np\nfrom sklearn.decomposition import PCA\n\n# Load data\nX = np.array([[1, 1.5], [2, 2.8], ...])"}}]}}

Each step MUST include a "python_code" field with equivalent sklearn/numpy code.
"""
    elif algorithm == 'svm':
        user_prompt = f"""
You are generating a visualization for SVM (Support Vector Machine).

Data (x, y, label): {params.get('data', [])}
Class 0 = Red, Class 1 = Blue

AVAILABLE API FUNCTIONS:
viz.spawnAxes(xMin, xMax, yMin, yMax);    // 2D axes
viz.spawnSVMPoint(id, x, y, classLabel);  // Red (0) or Blue (1) point
viz.spawnHyperplane(id, angle, offset);   // Decision hyperplane
viz.updateHyperplane(id, angle, offset);  // Rotate and shift
viz.spawnMarginPlanes(width);             // Parallel margin planes
viz.expandMargin(newWidth);               // Increase margin width
viz.markSupportVectors([pointIds]);       // Highlight with glow
viz.showMarginIndicator(width);           // Display margin value
viz.celebrateSVMConvergence();            // Final celebration

GENERATE 14-16 STEPS:

PHASE 1: Setup and data loading (Steps 1-3)
PHASE 2: Initial hyperplane (Steps 4-5)
PHASE 3: Optimization iterations (Steps 6-10)
  - Rotate hyperplane, expand margin each step
PHASE 4: Mark support vectors (Steps 11-12)
PHASE 5: Final margin and celebration (Steps 13-16)

OUTPUT FORMAT (strict JSON):
{{"steps": [{{"step": 1, "explanation": "...", "code": "viz.spawnAxes(-10, 10, -10, 10);"}}]}}
"""
    elif algorithm == 'decision_tree':
        user_prompt = f"""
You are generating a visualization for Decision Tree Classification.

Data (x, y, label): {params.get('data', [])}
Max depth: {params.get('max_depth', 3)}

AVAILABLE API FUNCTIONS:
viz.spawnAxes(xMin, xMax, yMin, yMax);
viz.spawnTreeNode(id, x, y, z, {{isLeaf, leafClass, label}});
viz.spawnBranch(parentId, childId, label);
viz.animateNodeSplit(nodeId, leftChildId, rightChildId, splitCondition);
viz.highlightDecisionPath([nodeIds], duration);

GENERATE 15-20 STEPS showing tree construction and classification.

OUTPUT FORMAT: strict JSON with single quotes in code strings.
"""
    elif algorithm == 'random_forest':
        user_prompt = f"""
You are generating a visualization for Random Forest.

Data: {params.get('data', [])}
Trees: {params.get('n_trees', 5)}

AVAILABLE API FUNCTIONS:
viz.spawnForestTrees(numTrees, spacing);
viz.showTreeVote(treeIndex, voteClass);
viz.showVotingResult(finalClass, votes);

OUTPUT FORMAT: strict JSON with single quotes in code strings.
"""
    elif algorithm == 'knn':
        user_prompt = f"""
You are generating a visualization for K-Nearest Neighbors.

Training Data: {params.get('data', [])}
Test Point: {params.get('test_point', {})}
K: {params.get('k', 3)}

AVAILABLE API FUNCTIONS:
viz.spawnAxes(xMin, xMax, yMin, yMax);
viz.spawnKNNPoint(id, x, y, classLabel);
viz.highlightTestPoint(id);
viz.drawDistanceLine(testId, trainId, distance);
viz.markNearest([pointIds], k);
viz.showMajorityVote(predictedClass, votes);

GENERATE 15-20 STEPS showing distance calculation and voting.

OUTPUT FORMAT: strict JSON.
"""
    elif algorithm == 'naive_bayes':
        user_prompt = f"""
You are generating a visualization for Naive Bayes Classification.

Training Data: {params.get('data', [])}
Test Point: {params.get('test_point', {})}

AVAILABLE API FUNCTIONS:
viz.spawnAxes(xMin, xMax, yMin, yMax);
viz.spawnBayesPoint(id, x, y, classLabel);
viz.highlightTestPoint(id);
viz.showClassDistribution(class0Data, class1Data);
viz.showProbabilityCalculation(class0Prob, class1Prob);
viz.highlightPrediction(predictedClass);
viz.showCalculation(formula, result, x, y); // Animate formula -> result (e.g. "P(C|X)=...", "0.85")

GENERATE 15-20 STEPS showing probability calculations.

OUTPUT FORMAT: strict JSON.
"""
    elif algorithm == 'dbscan':
        user_prompt = f"""
You are generating a visualization for DBSCAN Clustering.

Data: {params.get('data', [])}
Epsilon: {params.get('eps', 2.0)}
Min Samples: {params.get('min_samples', 3)}

AVAILABLE API FUNCTIONS:
viz.spawnAxes(xMin, xMax, yMin, yMax);
viz.spawnDBSCANPoint(id, x, y);
viz.drawEpsilonCircle(pointId, epsilon);
viz.markCorePoint(id);
viz.markBorderPoint(id);
viz.markNoise(id);
viz.assignCluster(pointId, clusterId);
viz.showClusterSummary(nClusters, nNoise);

GENERATE 15-20 STEPS showing density-based clustering.

OUTPUT FORMAT: strict JSON.
"""
    elif algorithm == 'gmm':
        user_prompt = f"""
You are generating a visualization for Gaussian Mixture Models.

Data: {params.get('data', [])}
Components: {params.get('n_components', 3)}

AVAILABLE API FUNCTIONS:
viz.spawnAxes(xMin, xMax, yMin, yMax);
viz.spawnGMMPoint(id, x, y);
viz.spawnGaussian(id, meanX, meanY, covMatrix, componentIdx);
viz.updateGaussian(id, meanX, meanY, covMatrix);
viz.assignProbabilistic(pointId, probabilities);
viz.showLikelihood(likelihood);

GENERATE 15-20 STEPS showing iterative EM algorithm.

OUTPUT FORMAT: strict JSON.
"""
    elif algorithm == 'gradient_boosting':
        user_prompt = f"""
You are generating a visualization for Gradient Boosting.

Data: {params.get('data', [])}
Estimators: {params.get('n_estimators', 5)}

AVAILABLE API FUNCTIONS:
viz.spawnAxes(xMin, xMax, yMin, yMax);
viz.spawnPoint(id, x, y, z);
viz.spawnBoostingTree(treeId, depth);
viz.showResiduals([residuals]);
viz.addWeakLearner(treeId, prediction);
viz.updateEnsemblePrediction(combinedModel);

GENERATE 15-20 STEPS showing sequential tree building.

OUTPUT FORMAT: strict JSON.
"""
    elif algorithm == 'neural_network':
        user_prompt = f"""
You are generating a visualization for a Neural Network.

Architecture: {params.get('layers', [4, 6, 6, 3])} (neurons per layer)
Input: {params.get('input', [])}
Target Output: {params.get('target', [])}

AVAILABLE API FUNCTIONS:
viz.spawnNNLayer(id, index, neuronCount, {{spacing, xPosition}}); // xPosition ~ -8 + index*4
viz.connectLayers(fromLayerId, toLayerId, weights); // weights optional 2D array
viz.setInputValues(layerId, values); // Highlight input neurons
viz.animateForwardProp(fromLayerId, toLayerId, duration); // Forward signal particles
viz.animateBackprop(fromLayerId, toLayerId, duration); // Backward gradient particles
viz.updateWeight(connId, newWeight, duration); // 'conn_layer1_n0_layer2_n0'
viz.showPrediction(layerId, predictions); // Highlight output layer
viz.showLoss(lossValue, epoch); // Display loss text
viz.animateTrainingEpoch(inputLayer, [hiddenLayers], outputLayer, duration); // Full epoch animation
viz.clearNeuralNetwork();

GENERATE 15-20 STEPS showing training process:

PHASE 1 - SETUP (Steps 1-3):
viz.spawnNNLayer('input', 0, 4, {{xPosition: -6}});
viz.spawnNNLayer('hidden1', 1, 6, {{xPosition: -2}});
viz.spawnNNLayer('output', 2, 3, {{xPosition: 2}});
viz.connectLayers('input', 'hidden1');
viz.connectLayers('hidden1', 'output');
"Building simplified neural network architecture"

PHASE 2 - FORWARD PASS (Steps 4-8):
viz.setInputValues('input', [0.5, -0.2, 0.1, 0.9]);
viz.animateForwardProp('input', 'hidden1', 1.5);
viz.animateForwardProp('hidden1', 'output', 1.5);
viz.showPrediction('output', [0.1, 0.8, 0.1]);
"Forward propagation: input signals activate neurons"

PHASE 3 - TRAINING (Steps 9-14):
viz.showLoss(0.45, 1);
viz.animateBackprop('output', 'hidden1', 1.0);
viz.animateBackprop('hidden1', 'input', 1.0);
viz.connectLayers('input', 'hidden1'); // Re-draw with updated weights if needed, or use specific updateWeight calls
"Backpropagation: error gradients update synaptic weights"

PHASE 4 - CONVERGENCE (Steps 15-18):
viz.showLoss(0.02, 50);
viz.showPrediction('output', [0.01, 0.98, 0.01]);
viz.celebrateCompletion();
"Training complete! Network converged"

OUTPUT FORMAT: strict JSON. Use single quotes in code.
"""
    elif algorithm == 'custom_dataset':
        # Custom dataset uploaded by user - could have many points
        data = params.get('data', [])
        n_points = len(data)
        algorithm_suggestion = params.get('algorithm_suggestion', 'linear_regression')
        is_reduced = params.get('is_reduced', False)
        feature_names = params.get('feature_names', ['x', 'y', 'z'])
        
        user_prompt = f"""
You are generating a visualization for a user-uploaded dataset.

Dataset Info:
- Total points: {n_points}
- Features: {feature_names}
- Dimensionality reduced via PCA: {is_reduced}
- Suggested algorithm: {algorithm_suggestion}

Data points (pre-processed coordinates): {data[:50]}  # First 50 for context
{"... (showing first 50 of " + str(n_points) + " points)" if n_points > 50 else ""}

AVAILABLE API FUNCTIONS:
viz.spawnAxes(xMin, xMax, yMin, yMax);     // 2D coordinate system - ALWAYS USE THIS
viz.spawn3DAxes(size);                      // 3D axes if needed
viz.spawnPoint(id, x, y, z);                // Single point (use for small datasets)
viz.spawnPointCloud(points);                // Efficient bulk spawn: points = [{{id, x, y, z, color}}]
viz.highlightPoint(id, color);
viz.colorPoint(id, color, duration);
viz.celebrateCompletion();

VISUALIZATION STRATEGY FOR LARGE DATASETS:
1. ALWAYS start with viz.spawnAxes() - axes are REQUIRED for reference.
2. For datasets with > 20 points, use viz.spawnPointCloud() in batches:
   - Batch 1: First 1/3 of points
   - Batch 2: Middle 1/3 
   - Batch 3: Final 1/3
3. Use SMALL DOT SIZE by including size:0.15 in point options.
4. Color-code by label if available.

GENERATE 12-16 STEPS:

PHASE 1 - SETUP (Steps 1-2):
viz.spawnAxes(-4, 4, -4, 4);
"Setting up coordinate system for the uploaded dataset."

PHASE 2 - DATA LOADING (Steps 3-6):
viz.spawnPointCloud([{{id:'p_0', x:..., y:..., z:0, size:0.15}}]);
"Loading batch 1 of data points. These are small dots for dense visualization."

PHASE 3 - ANALYSIS (Steps 7-10):
viz.highlightPoint('p_0', 0xff0000);
"Identifying key patterns in the data..."
{f"PCA was used to reduce high-dimensional data to {len(feature_names)} components." if is_reduced else ""}

PHASE 4 - SUMMARY (Steps 11-14):
"Dataset loaded: {n_points} samples visualized as point cloud."
viz.celebrateCompletion();

OUTPUT FORMAT (strict JSON):
{{"steps": [
  {{"step": 1, "explanation": "Setting up axes for reference", "code": "viz.spawnAxes(-4, 4, -4, 4);"}}
]}}

IMPORTANT:
1. Axes are REQUIRED - always spawn them first.
2. Use small dots (size: 0.15) for dense point clouds.
3. Use viz.spawnPointCloud for efficiency when > 20 points.
4. All coordinates are literals - use the actual x, y, z values from the data.
"""
    else:
        # Default: linear regression
        user_prompt = f"""
You are generating a visualization for a Machine Learning pipeline.

Algorithm: {algorithm}
Parameters: {params}

AVAILABLE API FUNCTIONS:
// Setup
viz.spawnAxes(xMin, xMax, yMin, yMax);  // Draw coordinate system with labels

// Data Points
viz.spawnPoint(id, x, y, z);            // Spawn point with pop + micro-motion
viz.spawnPointsStaggered(points, delay); // Spawn array of points sequentially  
viz.highlightPoint(id, color);          // Pulse and flash a point
viz.colorPoint(id, newColor, duration); // Change point color smoothly

// Regression Line
viz.spawnLine(id, p1, p2);              // Create regression line (fades in)
viz.moveLine(id, p1, p2, duration);     // Animate line to new position
viz.glowLine(id);                       // Add glow effect to line

// Residuals
viz.drawErrorLine(id, p_data, p_line);  // Draw error line (color = error magnitude)
viz.flashResiduals();                   // Flash all residual lines

// Training
viz.updateRegressionModel(m, b);        // Update model + all residuals at once
viz.showModelEquation(m, b);            // Display y = mx + b label

// Completion
viz.celebrateCompletion();              // Glow + particle burst celebration

VISUALIZE THE COMPLETE ML PIPELINE (15-18 steps):

PHASE 1 - SETUP (1 step):
- viz.spawnAxes(-10, 10, -8, 8);

PHASE 2 - RAW DATA LOADING (2 steps):
- Spawn all 10 data points using viz.spawnPoint()

PHASE 3 - DATA CLEANSING (2 steps):
- Use viz.highlightPoint() to check for outliers
- Explain data validation

PHASE 4 - EDA (2 steps):
- Highlight min/max points
- Describe data distribution and correlation

PHASE 5 - TRAIN/TEST SPLIT (2 steps):
- Color 8 points blue (train): viz.colorPoint('p_0', 0x4488ff, 0.5);
- Color 2 points green (test): viz.colorPoint('p_8', 0x44ff88, 0.5);

PHASE 6 - MODEL TRAINING (4 steps):
- Draw initial line: viz.spawnLine('reg_line', {{x:-10,y:0,z:0}}, {{x:10,y:0,z:0}});
- Show residuals with viz.drawErrorLine()
- Gradient descent: viz.updateRegressionModel(m, b);
- Continue until converged

PHASE 7 - EVALUATION (2 steps):
- Evaluate on test set
- Report model performance

PHASE 8 - FINAL RESULTS (1-2 steps):
- viz.showModelEquation(m, b);
- viz.celebrateCompletion();

FORMAT:
Output strict JSON:
{{
  "steps": [
    {{"step": 1, "explanation": "...", "code": "viz.spawnAxes(-10, 10, -8, 8);"}},
    ...
  ]
}}

Use single quotes inside code strings. All coordinates are literal numbers.
The data points from params are: {params.get('data', [])}

Generate the visualization now.
"""

    return [
        {"role": "system", "content": SYSTEM_PROMPT + ml_system_addition},
        {"role": "user", "content": user_prompt}
    ]

