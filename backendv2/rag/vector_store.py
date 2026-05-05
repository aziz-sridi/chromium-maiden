from pathlib import Path
from threading import Lock
from typing import List, Tuple

import faiss
import numpy as np


class FaissVectorStore:
    def __init__(self, index_path: Path, dimension: int = 768) -> None:
        self.index_path = index_path
        self.dimension = dimension
        self._lock = Lock()
        self.index_path.parent.mkdir(parents=True, exist_ok=True)
        self.index = self._load_or_create_index()

    def _load_or_create_index(self) -> faiss.Index:
        if self.index_path.exists() and self.index_path.stat().st_size > 0:
            index = faiss.read_index(str(self.index_path))
            self.dimension = int(index.d)
            return index
        index = faiss.IndexFlatIP(self.dimension)
        faiss.write_index(index, str(self.index_path))
        return index

    @staticmethod
    def _normalize(vector: np.ndarray) -> np.ndarray:
        vector = vector.astype("float32")
        norm = np.linalg.norm(vector)
        if norm == 0.0:
            return vector
        return vector / norm

    def add(self, vector: np.ndarray) -> int:
        with self._lock:
            if vector.shape[0] != self.dimension:
                if self.index.ntotal == 0:
                    self.dimension = int(vector.shape[0])
                    self.index = faiss.IndexFlatIP(self.dimension)
                else:
                    raise ValueError(f"Embedding dimension mismatch: expected {self.dimension}, got {vector.shape[0]}")

            normalized = self._normalize(vector).reshape(1, -1)
            self.index.add(normalized)
            faiss_id = int(self.index.ntotal - 1)
            faiss.write_index(self.index, str(self.index_path))
            return faiss_id

    def search(self, vector: np.ndarray, top_k: int = 5) -> List[Tuple[int, float]]:
        with self._lock:
            if self.index.ntotal == 0:
                return []
            if vector.shape[0] != self.dimension:
                return []
            normalized = self._normalize(vector).reshape(1, -1)
            k = min(top_k, int(self.index.ntotal))
            scores, ids = self.index.search(normalized, k)

        results: List[Tuple[int, float]] = []
        for faiss_id, score in zip(ids[0], scores[0]):
            if int(faiss_id) < 0:
                continue
            clipped_score = max(0.0, min(1.0, float(score)))
            results.append((int(faiss_id), clipped_score))
        return results
