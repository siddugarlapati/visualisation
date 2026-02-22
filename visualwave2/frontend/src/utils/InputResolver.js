/**
 * Input Resolver Utility
 * 
 * Client-side input validation and formatting for LeetCode visualizer.
 * Provides real-time validation feedback before sending to backend.
 */

/**
 * Validate and format input based on type
 * 
 * @param {string} rawInput - Raw user input string
 * @param {string} inputType - Type of input ('array', 'tree', 'graph', etc.)
 * @param {Object} constraints - Validation constraints {min, max, size}
 * @returns {Object} {isValid: boolean, formatted: any, errors: string[]}
 */
export function validateInput(rawInput, inputType, constraints = {}) {
  const errors = [];
  
  if (!rawInput || !rawInput.trim()) {
    return { isValid: false, formatted: null, errors: ['Input cannot be empty'] };
  }
  
  const { min = -1000, max = 1000, size = 50 } = constraints;
  
  try {
    switch (inputType) {
      case 'array':
      case 'linkedlist':
        return validateArrayInput(rawInput, min, max, size);
      
      case 'tree':
        return validateTreeInput(rawInput, min, max, size);
      
      case 'graph':
        return validateGraphInput(rawInput, min, max, size);
      
      case 'matrix':
        return validateMatrixInput(rawInput, min, max, size);
      
      case 'string':
        return validateStringInput(rawInput, size);
      
      case 'number':
        return validateNumberInput(rawInput, min, max);
      
      default:
        return validateArrayInput(rawInput, min, max, size);
    }
  } catch (e) {
    return { isValid: false, formatted: null, errors: [`Validation error: ${e.message}`] };
  }
}

/**
 * Validate array input like "[2,7,11,15]" or "2,7,11,15"
 */
function validateArrayInput(raw, min, max, maxSize) {
  const errors = [];
  let cleaned = raw.trim();
  
  // Remove brackets if present
  if (cleaned.startsWith('[') && cleaned.endsWith(']')) {
    cleaned = cleaned.slice(1, -1);
  }
  
  // Split by comma and handle multiline input
  const parts = cleaned.split(/[,\n]+/).map(s => s.trim()).filter(s => s !== '');
  
  if (parts.length === 0) {
    errors.push('Array cannot be empty');
    return { isValid: false, formatted: null, errors };
  }
  
  // Only warn if array is very large (don't block validation)
  // if (parts.length > maxSize) {
  //   errors.push(`Array size ${parts.length} exceeds maximum ${maxSize}`);
  // }
  
  // Parse each value
  const values = [];
  parts.forEach((part, i) => {
    const num = parseInt(part, 10);
    if (isNaN(num)) {
      errors.push(`Invalid number "${part}" at index ${i}`);
    } else {
      if (num < min) errors.push(`Value ${num} at index ${i} is below minimum ${min}`);
      if (num > max) errors.push(`Value ${num} at index ${i} exceeds maximum ${max}`);
      values.push(num);
    }
  });
  
  return {
    isValid: errors.length === 0,
    formatted: values,
    errors
  };
}

/**
 * Validate tree input in level-order format: "[3,9,20,null,null,15,7]"
 */
function validateTreeInput(raw, min, max, maxSize) {
  const errors = [];
  let cleaned = raw.trim();
  
  // Remove brackets if present
  if (cleaned.startsWith('[') && cleaned.endsWith(']')) {
    cleaned = cleaned.slice(1, -1);
  }
  
  // Split by comma and handle multiline input
  const parts = cleaned.split(/[,\n]+/).map(s => s.trim()).filter(s => s !== '');
  
  if (parts.length === 0) {
    errors.push('Tree cannot be empty');
    return { isValid: false, formatted: null, errors };
  }
  
  if (parts.length > maxSize) {
    errors.push(`Tree size ${parts.length} exceeds maximum ${maxSize}`);
  }
  
  // Parse values (can be int or null)
  const values = [];
  parts.forEach((part, i) => {
    if (part.toLowerCase() === 'null' || part.toLowerCase() === 'none') {
      values.push(null);
    } else {
      const num = parseInt(part, 10);
      if (isNaN(num)) {
        errors.push(`Invalid tree node value "${part}" at index ${i}`);
      } else {
        if (num < min) errors.push(`Value ${num} at index ${i} is below minimum ${min}`);
        if (num > max) errors.push(`Value ${num} at index ${i} exceeds maximum ${max}`);
        values.push(num);
      }
    }
  });
  
  // Root cannot be null
  if (values.length > 0 && values[0] === null) {
    errors.push('Tree root cannot be null');
  }
  
  return {
    isValid: errors.length === 0,
    formatted: values,
    errors
  };
}

/**
 * Validate graph input as edge list: "[[0,1],[1,2],[2,0]]"
 */
function validateGraphInput(raw, min, max, maxSize) {
  const errors = [];
  
  try {
    const edges = JSON.parse(raw);
    
    if (!Array.isArray(edges)) {
      errors.push('Graph input must be an array of edges');
      return { isValid: false, formatted: null, errors };
    }
    
    if (edges.length > maxSize) {
      errors.push(`Graph has ${edges.length} edges, exceeds maximum ${maxSize}`);
    }
    
    const validEdges = [];
    edges.forEach((edge, i) => {
      if (!Array.isArray(edge) || edge.length !== 2) {
        errors.push(`Edge ${i} must be a pair [from, to]`);
      } else {
        const [from, to] = edge;
        if (typeof from !== 'number' || typeof to !== 'number') {
          errors.push(`Edge ${i} has invalid node IDs`);
        } else {
          if (from < min || to < min) errors.push(`Edge ${i} has node ID below minimum ${min}`);
          if (from > max || to > max) errors.push(`Edge ${i} has node ID above maximum ${max}`);
          validEdges.push([from, to]);
        }
      }
    });
    
    return {
      isValid: errors.length === 0,
      formatted: validEdges,
      errors
    };
  } catch (e) {
    errors.push(`Invalid JSON format: ${e.message}`);
    return { isValid: false, formatted: null, errors };
  }
}

/**
 * Validate matrix input: "[[1,2,3],[4,5,6],[7,8,9]]"
 */
function validateMatrixInput(raw, min, max, maxSize) {
  const errors = [];
  
  try {
    const matrix = JSON.parse(raw);
    
    if (!Array.isArray(matrix) || matrix.length === 0) {
      errors.push('Matrix must be a non-empty 2D array');
      return { isValid: false, formatted: null, errors };
    }
    
    const rows = matrix.length;
    const cols = matrix[0]?.length || 0;
    
    if (rows > maxSize) errors.push(`Matrix rows ${rows} exceed maximum ${maxSize}`);
    if (cols > maxSize) errors.push(`Matrix columns ${cols} exceed maximum ${maxSize}`);
    
    matrix.forEach((row, i) => {
      if (!Array.isArray(row)) {
        errors.push(`Row ${i} must be an array`);
      } else if (row.length !== cols) {
        errors.push(`Row ${i} has ${row.length} columns, expected ${cols}`);
      } else {
        row.forEach((val, j) => {
          if (typeof val !== 'number') {
            errors.push(`Invalid value at [${i}][${j}]`);
          } else if (val < min || val > max) {
            errors.push(`Value ${val} at [${i}][${j}] out of range [${min}, ${max}]`);
          }
        });
      }
    });
    
    return {
      isValid: errors.length === 0,
      formatted: matrix,
      errors
    };
  } catch (e) {
    errors.push(`Invalid JSON format: ${e.message}`);
    return { isValid: false, formatted: null, errors };
  }
}

/**
 * Validate string input
 */
function validateStringInput(raw, maxSize) {
  const errors = [];
  let result = raw.trim();
  
  // Remove quotes if present
  if ((result.startsWith('"') && result.endsWith('"')) ||
      (result.startsWith("'") && result.endsWith("'"))) {
    result = result.slice(1, -1);
  }
  
  if (result.length > maxSize) {
    errors.push(`String length ${result.length} exceeds maximum ${maxSize}`);
  }
  
  return {
    isValid: errors.length === 0,
    formatted: result,
    errors
  };
}

/**
 * Validate single number input
 */
function validateNumberInput(raw, min, max) {
  const errors = [];
  const num = parseInt(raw.trim(), 10);
  
  if (isNaN(num)) {
    errors.push(`Invalid number: "${raw}"`);
    return { isValid: false, formatted: null, errors };
  }
  
  if (num < min) errors.push(`Value ${num} is below minimum ${min}`);
  if (num > max) errors.push(`Value ${num} exceeds maximum ${max}`);
  
  return {
    isValid: errors.length === 0,
    formatted: num,
    errors
  };
}

/**
 * Format input for display in UI
 * 
 * @param {any} input - Parsed input value
 * @param {string} inputType - Type of input
 * @returns {string} Formatted string for display
 */
export function formatInputForDisplay(input, inputType) {
  if (input === null || input === undefined) {
    return '';
  }
  
  switch (inputType) {
    case 'array':
    case 'linkedlist':
    case 'tree':
      return JSON.stringify(input);
    
    case 'graph':
    case 'matrix':
      return JSON.stringify(input, null, 2);
    
    case 'string':
      return `"${input}"`;
    
    case 'number':
      return String(input);
    
    default:
      return JSON.stringify(input);
  }
}
