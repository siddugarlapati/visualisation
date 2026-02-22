"""
Input Data Models for VisualWave LeetCode Visualizer

Defines immutable data contracts for the input resolution system.
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, Any, Literal
from enum import Enum
from datetime import datetime


class InputMode(str, Enum):
    """Execution mode for visualization"""
    CUSTOM = "custom"  # User-provided input
    AUTO = "auto"      # Auto-generated input


class InputConstraints(BaseModel):
    """Constraints for input validation and generation"""
    min_value: Optional[int] = -100
    max_value: Optional[int] = 100
    min_size: Optional[int] = 1
    max_size: Optional[int] = 15
    data_type: str = "array"  # 'array', 'tree', 'graph', 'linkedlist', 'matrix', 'string', 'number'
    element_type: str = "int"  # 'int', 'string', 'float'
    
    class Config:
        use_enum_values = True


class VisualWaveExecutionInput(BaseModel):
    """
    Immutable data contract for visualization execution.
    
    This object is created once during input resolution and passed to all
    downstream systems (prompt generation, visualization, explanation logic).
    
    Design principles:
    - Immutable after creation (frozen=True)
    - Single source of truth for visualization input
    - Contains both raw user input and parsed/validated form
    - Tracks validation errors for UI feedback
    - Mode explicitly indicates custom vs auto-generated
    """
    problem_id: int
    problem_title: str
    input_mode: InputMode
    raw_user_input: Optional[str] = None  # Original user input (if provided)
    parsed_input: Any  # The actual resolved input value (list, dict, str, int, etc.)
    target_value: Optional[int] = None  # Target value for Sum problems
    constraints: InputConstraints
    validation_errors: list[str] = Field(default_factory=list)
    generated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    
    class Config:
        frozen = True  # Immutable after creation
        use_enum_values = True
    
    def is_valid(self) -> bool:
        """Check if input has no validation errors"""
        return len(self.validation_errors) == 0
    
    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization"""
        return {
            "problem_id": self.problem_id,
            "problem_title": self.problem_title,
            "input_mode": self.input_mode,
            "raw_user_input": self.raw_user_input,
            "parsed_input": self.parsed_input,
            "target_value": self.target_value,
            "constraints": self.constraints.dict(),
            "validation_errors": self.validation_errors,
            "generated_at": self.generated_at
        }

