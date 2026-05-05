import json
from typing import List
from urllib import request
from urllib.error import HTTPError, URLError

import numpy as np


class OllamaEmbedder:
    def __init__(
        self,
        base_url: str = "http://127.0.0.1:11434",
        model_name: str = "nomic-embed-text",
        timeout_seconds: int = 20,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.model_name = model_name
        self.timeout_seconds = timeout_seconds

    def _post_json(self, url: str, payload: dict) -> dict:
        data = json.dumps(payload).encode("utf-8")
        req = request.Request(url=url, data=data, headers={"Content-Type": "application/json"}, method="POST")
        with request.urlopen(req, timeout=self.timeout_seconds) as response:
            body = response.read().decode("utf-8")
            return json.loads(body)

    def embed(self, text: str) -> np.ndarray:
        payload = {"model": self.model_name, "prompt": text}
        first_error: Exception | None = None
        try:
            result = self._post_json(f"{self.base_url}/api/embeddings", payload)
            vector: List[float] = result.get("embedding", [])
            if vector:
                return np.asarray(vector, dtype="float32")
        except Exception as exc:
            first_error = exc

        fallback_payload = {"model": self.model_name, "input": [text]}
        try:
            result = self._post_json(f"{self.base_url}/api/embed", fallback_payload)
            vectors: List[List[float]] = result.get("embeddings", [])
            if vectors:
                return np.asarray(vectors[0], dtype="float32")
        except Exception as exc:
            if first_error is None:
                first_error = exc

        error_detail = "unknown embedding error"
        if isinstance(first_error, HTTPError):
            error_detail = f"HTTP {first_error.code} from Ollama"
        elif isinstance(first_error, URLError):
            error_detail = f"cannot reach Ollama: {first_error.reason}"
        elif first_error is not None:
            error_detail = str(first_error)

        raise RuntimeError(
            "Failed to get embeddings from Ollama. "
            f"Tried /api/embeddings and /api/embed with model '{self.model_name}'. "
            f"Details: {error_detail}"
        )
