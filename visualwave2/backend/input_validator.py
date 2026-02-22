"""
Input Validation Module

Parses and validates user input based on problem type and constraints.
Returns parsed value + list of validation errors.
"""

import json
import re
from typing import Any, Tuple, List, Optional
from input_models import InputConstraints


def parse_array_input(raw: str, constraints: InputConstraints) -> Tuple[List[int], List[str], Optional[int]]:
    """
    Parse array input like "[2,7,11,15]" or "2,7,11,15" or "1,2,3, target=9"
    
    Handles:
    - With or without brackets
    - With optional target specification
    - Multiline input
    - Extra whitespace
    
    Returns:
        (parsed_array, errors, target_value)
    """
    errors = []
    target_value = None
    
    if not raw or not raw.strip():
        errors.append("Array input cannot be empty")
        return [], errors, None
    
    # Remove whitespace and newlines
    raw = raw.strip().replace('\n', ' ').replace('\r', '')
    
    # Extract target specification if present (e.g., "target=9" or "target = 12")
    target_match = re.search(r'target\s*=\s*(-?\d+)', raw, flags=re.IGNORECASE)
    if target_match:
        target_value = int(target_match.group(1))
        # Remove target from string
        raw = re.sub(r',?\s*target\s*=\s*-?\d+', '', raw, flags=re.IGNORECASE)
    
    # Handle with or without brackets
    raw = raw.strip()
    if raw.startswith('['):
        # Find matching close bracket
        bracket_end = raw.find(']')
        if bracket_end != -1:
            raw = raw[1:bracket_end]
        else:
            raw = raw[1:]  # No closing bracket, just remove opening
    elif raw.endswith(']'):
        raw = raw[:-1]
    
    # Split by comma
    try:
        parts = [p.strip() for p in raw.split(',') if p.strip()]
        
        if not parts:
            errors.append("No elements found in array")
            return [], errors, target_value
        
        # Parse integers
        values = []
        for i, part in enumerate(parts):
            try:
                val = int(part)
                values.append(val)
            except ValueError:
                # Skip non-integer parts silently (might be leftover from target removal)
                if part and not part.isspace():
                    errors.append(f"Invalid integer '{part}'")
        
        if not values:
            errors.append("No valid integers found in array")
            return [], errors, target_value
        
        return values, errors, target_value
    
    except Exception as e:
        errors.append(f"Failed to parse array: {str(e)}")
        return [], errors, target_value


def parse_tree_input(raw: str, constraints: InputConstraints) -> Tuple[Any, List[str]]:
    """
    Parse tree input in level-order format: "[3,9,20,null,null,15,7]"
    
    Returns:
        (parsed_tree_array, errors)
    """
    errors = []
    
    if not raw or not raw.strip():
        errors.append("Tree input cannot be empty")
        return [], errors
    
    raw = raw.strip()
    
    # Handle with or without brackets
    if raw.startswith('[') and raw.endswith(']'):
        raw = raw[1:-1]
    
    try:
        parts = [p.strip() for p in raw.split(',') if p.strip()]
        
        if not parts:
            errors.append("No elements found in tree")
            return [], errors
        
        # Parse values (can be int or null)
        values = []
        for i, part in enumerate(parts):
            if part.lower() in ['null', 'none', '']:
                values.append(None)
            else:
                try:
                    val = int(part)
                    
                    # Check value constraints
                    if constraints.min_value is not None and val < constraints.min_value:
                        errors.append(f"Value {val} at index {i} is below minimum {constraints.min_value}")
                    if constraints.max_value is not None and val > constraints.max_value:
                        errors.append(f"Value {val} at index {i} exceeds maximum {constraints.max_value}")
                    
                    values.append(val)
                except ValueError:
                    errors.append(f"Invalid tree node value '{part}' at index {i}")
        
        # Check size
        if constraints.max_size is not None and len(values) > constraints.max_size:
            errors.append(f"Tree size {len(values)} exceeds maximum {constraints.max_size}")
        
        # At least root should exist
        if not values or values[0] is None:
            errors.append("Tree root cannot be null")
        
        return values, errors
    
    except Exception as e:
        errors.append(f"Failed to parse tree: {str(e)}")
        return [], errors


def parse_graph_input(raw: str, constraints: InputConstraints) -> Tuple[List[List[int]], List[str]]:
    """
    Parse graph input as edge list: "[[0,1],[1,2],[2,0]]"
    
    Returns:
        (parsed_edges, errors)
    """
    errors = []
    
    if not raw or not raw.strip():
        errors.append("Graph input cannot be empty")
        return [], errors
    
    try:
        # Try to parse as JSON
        edges = json.loads(raw)
        
        if not isinstance(edges, list):
            errors.append("Graph input must be a list of edges")
            return [], errors
        
        # Validate each edge
        validated_edges = []
        for i, edge in enumerate(edges):
            if not isinstance(edge, list) or len(edge) != 2:
                errors.append(f"Edge {i} must be a pair [from, to]")
                continue
            
            try:
                from_node = int(edge[0])
                to_node = int(edge[1])
                
                # Check value constraints
                if constraints.min_value is not None:
                    if from_node < constraints.min_value or to_node < constraints.min_value:
                        errors.append(f"Edge {i} has node ID below minimum {constraints.min_value}")
                if constraints.max_value is not None:
                    if from_node > constraints.max_value or to_node > constraints.max_value:
                        errors.append(f"Edge {i} has node ID above maximum {constraints.max_value}")
                
                validated_edges.append([from_node, to_node])
            except (ValueError, TypeError):
                errors.append(f"Edge {i} has invalid node IDs")
        
        # Check size
        if constraints.max_size is not None and len(validated_edges) > constraints.max_size:
            errors.append(f"Graph has {len(validated_edges)} edges, exceeds maximum {constraints.max_size}")
        
        return validated_edges, errors
    
    except json.JSONDecodeError as e:
        errors.append(f"Invalid JSON format: {str(e)}")
        return [], errors
    except Exception as e:
        errors.append(f"Failed to parse graph: {str(e)}")
        return [], errors


def parse_matrix_input(raw: str, constraints: InputConstraints) -> Tuple[List[List[int]], List[str]]:
    """
    Parse matrix input: "[[1,2,3],[4,5,6],[7,8,9]]"
    
    Returns:
        (parsed_matrix, errors)
    """
    errors = []
    
    if not raw or not raw.strip():
        errors.append("Matrix input cannot be empty")
        return [], errors
    
    try:
        # Try to parse as JSON
        matrix = json.loads(raw)
        
        if not isinstance(matrix, list):
            errors.append("Matrix must be a 2D array")
            return [], errors
        
        if not matrix:
            errors.append("Matrix cannot be empty")
            return [], errors
        
        # Validate dimensions
        rows = len(matrix)
        cols = len(matrix[0]) if matrix else 0
        
        if constraints.max_size is not None:
            if rows > constraints.max_size:
                errors.append(f"Matrix rows {rows} exceed maximum {constraints.max_size}")
            if cols > constraints.max_size:
                errors.append(f"Matrix columns {cols} exceed maximum {constraints.max_size}")
        
        # Validate each row
        validated_matrix = []
        for i, row in enumerate(matrix):
            if not isinstance(row, list):
                errors.append(f"Row {i} must be an array")
                continue
            
            if len(row) != cols:
                errors.append(f"Row {i} has {len(row)} columns, expected {cols}")
            
            validated_row = []
            for j, val in enumerate(row):
                try:
                    num = int(val)
                    
                    # Check value constraints
                    if constraints.min_value is not None and num < constraints.min_value:
                        errors.append(f"Value at [{i}][{j}] is below minimum {constraints.min_value}")
                    if constraints.max_value is not None and num > constraints.max_value:
                        errors.append(f"Value at [{i}][{j}] exceeds maximum {constraints.max_value}")
                    
                    validated_row.append(num)
                except (ValueError, TypeError):
                    errors.append(f"Invalid integer at [{i}][{j}]")
            
            validated_matrix.append(validated_row)
        
        return validated_matrix, errors
    
    except json.JSONDecodeError as e:
        errors.append(f"Invalid JSON format: {str(e)}")
        return [], errors
    except Exception as e:
        errors.append(f"Failed to parse matrix: {str(e)}")
        return [], errors


def parse_string_input(raw: str, constraints: InputConstraints) -> Tuple[str, List[str]]:
    """
    Parse string input - remove quotes if present
    
    Returns:
        (parsed_string, errors)
    """
    errors = []
    
    if raw is None:
        errors.append("String input cannot be None")
        return "", errors
    
    # Remove leading/trailing quotes if present
    result = raw.strip()
    if (result.startswith('"') and result.endswith('"')) or \
       (result.startswith("'") and result.endswith("'")):
        result = result[1:-1]
    
    # Check size constraints
    if constraints.min_size is not None and len(result) < constraints.min_size:
        errors.append(f"String length {len(result)} is below minimum {constraints.min_size}")
    if constraints.max_size is not None and len(result) > constraints.max_size:
        errors.append(f"String length {len(result)} exceeds maximum {constraints.max_size}")
    
    return result, errors


def parse_number_input(raw: str, constraints: InputConstraints) -> Tuple[int, List[str]]:
    """
    Parse single number input
    
    Returns:
        (parsed_number, errors)
    """
    errors = []
    
    if not raw or not raw.strip():
        errors.append("Number input cannot be empty")
        return 0, errors
    
    try:
        num = int(raw.strip())
        
        # Check value constraints
        if constraints.min_value is not None and num < constraints.min_value:
            errors.append(f"Value {num} is below minimum {constraints.min_value}")
        if constraints.max_value is not None and num > constraints.max_value:
            errors.append(f"Value {num} exceeds maximum {constraints.max_value}")
        
        return num, errors
    
    except ValueError:
        errors.append(f"Invalid integer: '{raw}'")
        return 0, errors


def validate_input(raw: str, constraints: InputConstraints) -> Tuple[Any, List[str], Optional[int]]:
    """
    Main validation function - delegates to appropriate parser based on data type
    
    Returns:
        (parsed_value, errors, target_value)  - target_value is only for array types
    """
    # FIRST: Check for JSON object input (Dynamic Multi-Input)
    raw = raw.strip()
    if raw.startswith('{') and raw.endswith('}'):
        try:
            parsed_dict = json.loads(raw)
            if isinstance(parsed_dict, dict):
                # We have a valid JSON object input (e.g. {"nums": [1,2], "target": 9})
                # We will perform a "shallow" validation - assume values are generally correct
                # or add specific sub-validations if needed.
                return parsed_dict, [], None
        except json.JSONDecodeError:
            pass # Not valid JSON, fall back to standard validation
            
    data_type = constraints.data_type.lower()
    
    if data_type == "array":
        return parse_array_input(raw, constraints)
    elif data_type == "tree":
        result = parse_tree_input(raw, constraints)
        return result[0], result[1], None
    elif data_type == "graph":
        result = parse_graph_input(raw, constraints)
        return result[0], result[1], None
    elif data_type == "linkedlist":
        # Linked lists use same format as arrays
        return parse_array_input(raw, constraints)
    elif data_type == "matrix":
        result = parse_matrix_input(raw, constraints)
        return result[0], result[1], None
    elif data_type == "string":
        result = parse_string_input(raw, constraints)
        return result[0], result[1], None
    elif data_type == "number":
        result = parse_number_input(raw, constraints)
        return result[0], result[1], None
    else:
        # Default to array
        return parse_array_input(raw, constraints)

