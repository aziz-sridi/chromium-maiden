import tempfile
import unittest
from pathlib import Path

from backendv2.memory.cache import get_cached_result, initialize_database, set_cached_result
from backendv2.memory.hashing import normalize_text, sha256_hash


class BackendCacheTests(unittest.TestCase):
    def test_normalized_text_produces_the_same_hash(self) -> None:
        self.assertEqual(sha256_hash("  Hello\nWORLD "), sha256_hash("hello world"))
        self.assertEqual(normalize_text("  Hello\nWORLD "), "hello world")

    def test_cache_is_scoped_by_mode_and_model_version(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            database_path = Path(directory) / "cache.sqlite"
            initialize_database(database_path)
            text_hash = sha256_hash("example message")
            result = {
                "hate_score": 0.72,
                "confidence": 0.8,
                "category": "harassment",
                "reason": "test result",
                "suggested_alternative": "A calmer alternative.",
                "suggested_alternatives": ["A calmer alternative.", "Another option."],
            }

            set_cached_result(database_path, text_hash, "outgoing", "v1", result)

            cached = get_cached_result(database_path, text_hash, "outgoing", "v1")
            self.assertIsNotNone(cached)
            self.assertEqual(cached["category"], "harassment")
            self.assertEqual(len(cached["suggested_alternatives"]), 2)
            self.assertIsNone(get_cached_result(database_path, text_hash, "incoming", "v1"))
            self.assertIsNone(get_cached_result(database_path, text_hash, "outgoing", "v2"))


if __name__ == "__main__":
    unittest.main()
