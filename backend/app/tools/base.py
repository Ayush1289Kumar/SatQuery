"""Base Tool interface (Blueprint Section 32)."""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class Tool(ABC):
    name: str = ""
    version: str = "1.0.0"
    role: str = ""

    def validate(self, inputs: dict[str, Any]) -> bool:
        """Validate that all required inputs and formats are provided."""
        return True

    @abstractmethod
    def execute(self, inputs: dict[str, Any], parameters: dict[str, Any] | None = None) -> dict[str, Any]:
        """Execute the tool on the given inputs with parameters."""
        raise NotImplementedError

    def health(self) -> bool:
        """Check if tool dependencies and models are functional."""
        return True
