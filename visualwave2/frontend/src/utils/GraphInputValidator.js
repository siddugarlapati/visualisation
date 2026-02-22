/**
 * GraphInputValidator.js - Graph Input Validation and Parsing Utility
 * 
 * Provides comprehensive validation for graph adjacency list input
 * with detailed error messages and graph metrics calculation.
 */

/**
 * Validate and parse adjacency list input
 * @param {string} input - JSON string representing adjacency list
 * @returns {Object} { valid: boolean, adjacencyList?: Object, error?: string, warnings: string[] }
 */
export function validateAdjacencyList(input) {
    const warnings = [];
    
    // Check for empty input
    if (!input || input.trim() === '') {
        return {
            valid: false,
            error: 'Adjacency list cannot be empty',
            warnings
        };
    }
    
    // Try to parse JSON
    let adjacencyList;
    try {
        adjacencyList = JSON.parse(input);
    } catch (e) {
        // === RELAXED PARSING FALLBACK ===
        // If not valid JSON, try to interpret as simple node list or edge list
        
        // 1. Remove common array/object delimiters to handle "[A, B]" or "(A, B)"
        const cleanInput = input.replace(/[\[\](){}"']/g, '');
        
        // 2. Split by comma or semicolon or newline
        const tokens = cleanInput.split(/[,;\n]+/).map(t => t.trim()).filter(t => t.length > 0);
        
        if (tokens.length > 0) {
            adjacencyList = {};
            let isEdgeList = false;
            
            tokens.forEach(token => {
                // Check if token represents an edge like "A-B" or "A->B"
                const edgeMatch = token.match(/^([a-zA-Z0-9]+)\s*(?:-|->)\s*([a-zA-Z0-9]+)$/);
                
                if (edgeMatch) {
                    isEdgeList = true;
                    const [_, u, v] = edgeMatch;
                    if (!adjacencyList[u]) adjacencyList[u] = [];
                    if (!adjacencyList[v]) adjacencyList[v] = [];
                    
                    // Add edge u -> v
                    if (!adjacencyList[u].includes(v)) adjacencyList[u].push(v);
                    
                    // For undirected graphs (default assumption for simple input), maybe add v -> u?
                    // But standard adjacency list is directed. Let's keep it directed for flexibility.
                    // User can type "A-B, B-A" if they want undirected.
                } else {
                    // Treat as a single node
                    if (!adjacencyList[token]) adjacencyList[token] = [];
                }
            });
            
            // If we parsed successfully, warn the user but proceed
            warnings.push(`Input was not valid JSON. Auto-converted ${tokens.length} items to graph context.`);
            if (isEdgeList) warnings.push('Detected edge notation (A-B). Created edges.');
            else warnings.push('Detected node list. Created disconnected nodes.');
            
        } else {
             return {
                valid: false,
                error: `Invalid JSON format and could not auto-parse: ${e.message}`,
                warnings
            };
        }
    }
    
    // Check if it's an object
    if (typeof adjacencyList !== 'object' || adjacencyList === null || Array.isArray(adjacencyList)) {
        return {
            valid: false,
            error: 'Adjacency list must be a JSON object (e.g., {"A": ["B", "C"]})',
            warnings
        };
    }
    
    // Validate each node and its neighbors
    const nodes = Object.keys(adjacencyList);
    
    // Check node count
    if (nodes.length === 0) {
        return {
            valid: false,
            error: 'Graph must have at least one node',
            warnings
        };
    }
    
    if (nodes.length > 15) {
        return {
            valid: false,
            error: `Graph has ${nodes.length} nodes, maximum allowed is 15 for performance`,
            warnings
        };
    }
    
    // Validate node names
    const nodeNameRegex = /^[a-zA-Z0-9_-]{1,10}$/;
    for (const node of nodes) {
        if (!nodeNameRegex.test(node)) {
            return {
                valid: false,
                error: `Invalid node name "${node}". Use alphanumeric characters, underscore, or hyphen (max 10 chars)`,
                warnings
            };
        }
    }
    
    // Validate neighbors for each node
    const allReferencedNodes = new Set();
    for (const [node, neighbors] of Object.entries(adjacencyList)) {
        // Check if neighbors is an array
        if (!Array.isArray(neighbors)) {
            return {
                valid: false,
                error: `Neighbors of node "${node}" must be an array`,
                warnings
            };
        }
        
        // Validate each neighbor
        for (const neighbor of neighbors) {
            if (typeof neighbor !== 'string') {
                return {
                    valid: false,
                    error: `Neighbor of node "${node}" must be a string, got ${typeof neighbor}`,
                    warnings
                };
            }
            
            if (!nodeNameRegex.test(neighbor)) {
                return {
                    valid: false,
                    error: `Invalid neighbor name "${neighbor}" for node "${node}"`,
                    warnings
                };
            }
            
            // Check for self-loops
            if (neighbor === node) {
                warnings.push(`Self-loop detected at node "${node}" - will be ignored during visualization`);
            }
            
            allReferencedNodes.add(neighbor);
        }
    }
    
    // Check for referenced nodes that don't exist in the adjacency list
    const missingNodes = Array.from(allReferencedNodes).filter(n => !nodes.includes(n));
    for (const missing of missingNodes) {
        warnings.push(`Node "${missing}" is referenced but not defined in adjacency list - will be added automatically`);
        // Auto-add missing nodes with empty neighbor list
        adjacencyList[missing] = [];
    }
    
    return {
        valid: true,
        adjacencyList,
        warnings
    };
}

/**
 * Validate start node
 * @param {string} startNode - Starting node for traversal
 * @param {Object} adjacencyList - Validated adjacency list
 * @returns {Object} { valid: boolean, error?: string }
 */
export function validateStartNode(startNode, adjacencyList) {
    if (!startNode || startNode.trim() === '') {
        return {
            valid: false,
            error: 'Start node cannot be empty'
        };
    }
    
    if (!adjacencyList[startNode]) {
        const availableNodes = Object.keys(adjacencyList).join(', ');
        return {
            valid: false,
            error: `Start node "${startNode}" not found in graph. Available nodes: ${availableNodes}`
        };
    }
    
    return { valid: true };
}

/**
 * Calculate graph metrics for display and layout
 * @param {Object} adjacencyList - Adjacency list
 * @param {string} startNode - Starting node
 * @returns {Object} Metrics including nodeCount, edgeCount, maxDepth, isConnected, components
 */
export function getGraphMetrics(adjacencyList, startNode = null) {
    const nodes = Object.keys(adjacencyList);
    const nodeCount = nodes.length;
    
    // Count edges (undirected: divide by 2 if bidirectional, directed: count all)
    let edgeCount = 0;
    const edgeSet = new Set();
    for (const [node, neighbors] of Object.entries(adjacencyList)) {
        for (const neighbor of neighbors) {
            if (node !== neighbor) { // Skip self-loops
                const edge = [node, neighbor].sort().join('-');
                edgeSet.add(edge);
                edgeCount++;
            }
        }
    }
    
    // Calculate max depth from start node using BFS
    let maxDepth = 0;
    if (startNode && adjacencyList[startNode]) {
        const visited = new Set();
        const queue = [[startNode, 0]];
        visited.add(startNode);
        
        while (queue.length > 0) {
            const [current, depth] = queue.shift();
            maxDepth = Math.max(maxDepth, depth);
            
            for (const neighbor of adjacencyList[current] || []) {
                if (!visited.has(neighbor) && adjacencyList[neighbor]) {
                    visited.add(neighbor);
                    queue.push([neighbor, depth + 1]);
                }
            }
        }
    }
    
    // Check connectivity (find number of connected components)
    const visited = new Set();
    let componentCount = 0;
    
    for (const node of nodes) {
        if (!visited.has(node)) {
            componentCount++;
            // BFS to find all nodes in this component
            const queue = [node];
            visited.add(node);
            
            while (queue.length > 0) {
                const current = queue.shift();
                for (const neighbor of adjacencyList[current] || []) {
                    if (!visited.has(neighbor) && adjacencyList[neighbor]) {
                        visited.add(neighbor);
                        queue.push(neighbor);
                    }
                }
            }
        }
    }
    
    const isConnected = componentCount === 1;
    
    return {
        nodeCount,
        edgeCount,
        maxDepth,
        isConnected,
        componentCount,
        nodes: Array.from(nodes)
    };
}

/**
 * Get preset graph examples
 * @returns {Object} Map of preset names to their configurations
 */
export function getPresetGraphs() {
    return {
        'simple-tree': {
            name: 'Simple Tree',
            description: 'Basic tree structure (6 nodes)',
            adjacencyList: {
                "A": ["B", "C"],
                "B": ["D", "E"],
                "C": ["F"],
                "D": [],
                "E": [],
                "F": []
            },
            startNode: 'A'
        },
        'cyclic': {
            name: 'Cyclic Graph',
            description: 'Graph with cycles (5 nodes)',
            adjacencyList: {
                "A": ["B", "C"],
                "B": ["D"],
                "C": ["D"],
                "D": ["E"],
                "E": ["A"]
            },
            startNode: 'A'
        },
        'disconnected': {
            name: 'Disconnected Graph',
            description: 'Graph with disconnected components (8 nodes)',
            adjacencyList: {
                "A": ["B", "C"],
                "B": ["C"],
                "C": [],
                "D": ["E"],
                "E": ["F"],
                "F": ["D"],
                "G": ["H"],
                "H": []
            },
            startNode: 'A'
        },
        'dense': {
            name: 'Dense Graph',
            description: 'Graph with many edges (7 nodes)',
            adjacencyList: {
                "A": ["B", "C", "D"],
                "B": ["A", "C", "E"],
                "C": ["A", "B", "D", "F"],
                "D": ["A", "C", "G"],
                "E": ["B", "F"],
                "F": ["C", "E", "G"],
                "G": ["D", "F"]
            },
            startNode: 'A'
        }
    };
}

export default {
    validateAdjacencyList,
    validateStartNode,
    getGraphMetrics,
    getPresetGraphs
};
