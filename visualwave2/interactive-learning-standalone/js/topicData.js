/**
 * topicData.js — Topic definitions for the Learning app
 * Maps quick-select topics to their labels, default inputs, and ML params.
 */

export const TOPICS = {
    dsa: [
        { label: 'Binary Search', defaultInput: '1, 3, 5, 7, 9, 11, 13' },
        { label: 'Bubble Sort', defaultInput: '64, 34, 25, 12, 22, 11, 90' },
        { label: 'Insertion Sort', defaultInput: '12, 11, 13, 5, 6' },
        { label: 'Selection Sort', defaultInput: '64, 25, 12, 22, 11' },
        { label: 'Merge Sort', defaultInput: '38, 27, 43, 3, 9, 82, 10' },
        { label: 'Quick Sort', defaultInput: '10, 80, 30, 90, 40, 50, 70' },
        { label: 'Linked List Insertion', defaultInput: '1, 2, 3, 4, 5' },
        { label: 'Stack Operations', defaultInput: '10, 20, 30, 40' },
        { label: 'Queue Operations', defaultInput: '10, 20, 30, 40' },
        { label: 'BST Insertion', defaultInput: '50, 30, 70, 20, 40, 60, 80' },
        { label: 'BFS Graph Traversal', defaultInput: '' },
        { label: 'DFS Graph Traversal', defaultInput: '' },
        { label: 'Two Sum', defaultInput: '2, 7, 11, 15' },
        { label: 'Two Pointers', defaultInput: '1, 2, 3, 4, 5, 6, 7' },
        { label: 'Sliding Window', defaultInput: '1, 3, -1, -3, 5, 3, 6, 7' },
        { label: 'Heap Sort', defaultInput: '4, 10, 3, 5, 1' },
        { label: 'Hash Map', defaultInput: '' },
        { label: 'Dynamic Programming (Fibonacci)', defaultInput: '' },
        { label: "Dijkstra's Algorithm", defaultInput: '' },
    ],
    ml: [
        {
            label: 'Linear Regression',
            params: {
                data: [[1, 2.1], [2, 3.8], [3, 6.2], [4, 7.9], [5, 10.1],
                       [6, 12.3], [7, 13.8], [8, 16.1], [9, 18.2], [10, 20.0]]
            }
        },
        {
            label: 'K-Means Clustering',
            params: {
                data: [[-6, 4], [-5, 5], [-7, 3], [-4, 4], [4, -3],
                       [5, -4], [3, -5], [6, -3], [0, 7], [1, 8], [-1, 6], [0, 9]],
                k: 3
            }
        },
        {
            label: 'Logistic Regression',
            params: {
                data: [[-6, 2, 0], [-5, -1, 0], [-4, 3, 0], [-3, -2, 0],
                       [3, 1, 1], [4, -1, 1], [5, 3, 1], [6, -2, 1],
                       [-2, 0, 0], [2, 0, 1]]
            }
        },
        {
            label: 'PCA',
            params: {
                data: [[1, 1.5], [2, 2.8], [3, 3.2], [4, 5.1], [5, 4.9],
                       [6, 7.2], [7, 6.8], [8, 8.5], [1.5, 2], [3.5, 4]]
            }
        },
        {
            label: 'SVM',
            params: {
                data: [[-5, 3, 0], [-4, -2, 0], [-6, 1, 0], [-3, 4, 0],
                       [4, -1, 1], [5, 2, 1], [6, -3, 1], [3, 1, 1]]
            }
        },
        {
            label: 'Neural Network',
            params: {
                layers: [4, 6, 6, 3],
                input: [0.5, -0.2, 0.1, 0.9],
                target: [0, 1, 0]
            }
        },
        {
            label: 'Decision Tree',
            params: {
                data: [[-3, 5, 0], [-2, -3, 0], [1, 4, 1], [3, -1, 1],
                       [-4, 2, 0], [5, 3, 1], [-1, -4, 0], [4, 1, 1]],
                max_depth: 3
            }
        },
        {
            label: 'KNN',
            params: {
                data: [[-5, 3, 0], [-4, -2, 0], [-6, 1, 0], [4, -1, 1], [5, 2, 1], [3, 1, 1]],
                test_point: { x: 0, y: 0 },
                k: 3
            }
        },
        {
            label: 'DBSCAN',
            params: {
                data: [[-6, 4], [-5, 5], [-7, 3], [4, -3], [5, -4], [3, -5], [0, 0]],
                eps: 2.0,
                min_samples: 3
            }
        },
        {
            label: 'Naive Bayes',
            params: {
                data: [[-5, 3, 0], [-4, -2, 0], [-6, 1, 0], [-3, 4, 0],
                       [4, -1, 1], [5, 2, 1], [6, -3, 1], [3, 1, 1]],
                test_point: { x: 0, y: 1 }
            }
        },
        {
            label: 'Gradient Boosting',
            params: {
                data: [[1, 2], [2, 4], [3, 5], [4, 4], [5, 8], [6, 7], [7, 9], [8, 10]],
                n_estimators: 5
            }
        },
        {
            label: 'Multiple Regression',
            params: {
                data: [[1, 2, 3.5], [2, 1, 4.2], [3, 3, 7.1], [4, 2, 8.0],
                       [5, 4, 11.5], [6, 3, 12.8], [7, 5, 15.2], [8, 4, 16.5],
                       [9, 6, 19.0], [10, 5, 20.3]],
                features: ['x1', 'x2']
            }
        },
    ]
};
