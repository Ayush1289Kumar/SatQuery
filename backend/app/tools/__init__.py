"""Tool registry package (M1 skeleton).

Importing this package installs the default deterministic toolset
(``tools/deterministic.py``), which wraps the existing worker.py templates so
job results stay byte-identical to before. Earth Engine executors will register
into the same registry in a later milestone; ``AI_PROVIDER=mock`` and the test
suite never import or initialize Earth Engine.
"""
from . import deterministic as deterministic
from .base import ToolContext, ToolError, ToolExecutor, ToolResult, ToolSpec, ToolTrace
from .registry import (
    dispatch,
    get_spec,
    is_registered,
    register_tool,
    registered_workflow_ids,
)

deterministic.register_default_tools()

__all__ = [
    "ToolContext",
    "ToolError",
    "ToolExecutor",
    "ToolResult",
    "ToolSpec",
    "ToolTrace",
    "dispatch",
    "get_spec",
    "is_registered",
    "register_tool",
    "registered_workflow_ids",
    "deterministic",
]
