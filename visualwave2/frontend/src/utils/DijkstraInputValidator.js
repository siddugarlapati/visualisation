// Dijkstra Preset Graph Configurations
export const getDijkstraPresets = () => ({
    'simple-path': {
        name: 'Simple Path',
        nodes: ['A', 'B', 'C', 'D', 'E'],
        edges: [['A', 'B', 4], ['B', 'C', 3], ['C', 'D', 2], ['D', 'E', 1]],
        description: 'Linear path with decreasing weights'
    },
    'diamond': {
        name: 'Diamond Graph',
        nodes: ['A', 'B', 'C', 'D', 'E'],
        edges: [['A', 'B', 4], ['A', 'C', 2], ['B', 'D', 3], ['C', 'B', 1], ['C', 'D', 5], ['D', 'E', 3]],
        description: 'Multiple paths demonstrating shortest path selection'
    },
    'complex': {
        name: 'Complex Network',
        nodes: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
        edges: [
            ['A', 'B', 7], ['A', 'C', 9], ['A', 'F', 14],
            ['B', 'C', 10], ['B', 'D', 15],
            ['C', 'D', 11], ['C', 'F', 2],
            ['D', 'E', 6],
            ['E', 'F', 9],
            ['F', 'G', 4]
        ],
        description: 'Dense graph with multiple shortest paths'
    }
});

// Parse Dijkstra Input (nodes and weighted edges)
export const parseDijkstraInput = (nodesStr, edgesStr) => {
    const errors = [];
    const warnings = [];
    
    // Parse nodes
    let nodes = [];
    try {
        nodes = nodesStr.split(',').map(n => n.trim()).filter(n => n.length > 0);
        if (nodes.length === 0) {
            errors.push('Nodes list cannot be empty');
        }
        // Check for duplicates
        const uniqueNodes = new Set(nodes);
        if (uniqueNodes.size !== nodes.length) {
            errors.push('Duplicate node labels found');
        }
    } catch (e) {
        errors.push('Failed to parse nodes: ' + e.message);
    }
    
    // Parse edges
    let edges = [];
    try {
        const parsed = JSON.parse(edgesStr);
        if (!Array.isArray(parsed)) {
            errors.push('Edges must be an array');
        } else {
            edges = parsed;
            // Validate each edge
            for (let i = 0; i < edges.length; i++) {
                const edge = edges[i];
                if (!Array.isArray(edge) || edge.length !== 3) {
                    errors.push(`Edge ${i}: Must be [from, to, weight]`);
                    continue;
                }
                const [from, to, weight] = edge;
                // Check if nodes exist
                if (!nodes.includes(from)) {
                    errors.push(`Edge ${i}: Node "${from}" not found in nodes list`);
                }
                if (!nodes.includes(to)) {
                    errors.push(`Edge ${i}: Node "${to}" not found in nodes list`);
                }
                // Check weight
                if (typeof weight !== 'number' || weight <= 0) {
                    errors.push(`Edge ${i}: Weight must be a positive number`);
                }
            }
        }
    } catch (e) {
        errors.push('Failed to parse edges: ' + e.message);
    }
    
    // Check connectivity (warning only)
    if (errors.length === 0 && nodes.length > 0) {
        const nodeSet = new Set();
        edges.forEach(([from, to]) => {
            nodeSet.add(from);
            nodeSet.add(to);
        });
        if (nodeSet.size < nodes.length) {
            warnings.push('Some nodes are isolated (no edges)');
        }
    }
    
    return {
        valid: errors.length === 0,
        nodes,
        edges,
        errors,
        warnings
    };
};
