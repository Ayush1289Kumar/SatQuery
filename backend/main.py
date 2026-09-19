"""Top-level ASGI entry point.

Allows running the server with::

    uvicorn main:app --reload

The full application lives in the ``app`` package (``app/main.py``); this module
simply re-exports it so the conventional ``uvicorn main:app`` invocation
resolves correctly from the backend directory.

For tests, import via ``backend.app.main:app`` (run from the project root).
"""
from app.main import app

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)