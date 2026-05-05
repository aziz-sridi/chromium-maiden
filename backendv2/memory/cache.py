import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional


def _connect(db_path: Path) -> sqlite3.Connection:
    return sqlite3.connect(str(db_path), check_same_thread=False)


def _ensure_column(connection: sqlite3.Connection, table_name: str, column_name: str, column_type: str) -> None:
    cursor = connection.cursor()
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = {row[1] for row in cursor.fetchall()}
    if column_name not in columns:
        cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}")


def initialize_database(db_path: Path) -> None:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    connection = _connect(db_path)
    try:
        cursor = connection.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS moderation_cache (
                hash TEXT NOT NULL,
                mode TEXT NOT NULL,
                model_version TEXT NOT NULL,
                hate_score REAL NOT NULL,
                confidence REAL NOT NULL,
                category TEXT NOT NULL,
                reason TEXT NOT NULL,
                suggested_alternative TEXT,
                suggested_alternatives TEXT,
                updated_at TEXT NOT NULL,
                PRIMARY KEY (hash, mode, model_version)
            )
            """
        )
        _ensure_column(connection, "moderation_cache", "suggested_alternative", "TEXT")
        _ensure_column(connection, "moderation_cache", "suggested_alternatives", "TEXT")
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS reported_examples (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                text TEXT NOT NULL,
                label TEXT NOT NULL,
                embedding_json TEXT,
                created_at TEXT NOT NULL
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS faiss_mapping (
                faiss_id INTEGER PRIMARY KEY,
                report_id INTEGER NOT NULL,
                FOREIGN KEY(report_id) REFERENCES reported_examples(id)
            )
            """
        )
        connection.commit()
    finally:
        connection.close()


def get_cached_result(db_path: Path, hash_value: str, mode: str, model_version: str) -> Optional[Dict[str, Any]]:
    connection = _connect(db_path)
    try:
        cursor = connection.cursor()
        cursor.execute(
            """
            SELECT hate_score, confidence, category, reason, suggested_alternative, suggested_alternatives
            FROM moderation_cache
            WHERE hash = ? AND mode = ? AND model_version = ?
            """,
            (hash_value, mode, model_version),
        )
        row = cursor.fetchone()
        if row is None:
            return None

        alternatives = None
        raw_alternatives = row[5]
        if raw_alternatives:
            try:
                parsed = json.loads(raw_alternatives)
                if isinstance(parsed, list):
                    alternatives = [str(item).strip() for item in parsed if str(item).strip()]
            except json.JSONDecodeError:
                alternatives = None

        return {
            "hate_score": float(row[0]),
            "confidence": float(row[1]),
            "category": row[2],
            "reason": row[3],
            "suggested_alternative": row[4],
            "suggested_alternatives": alternatives,
        }
    finally:
        connection.close()


def set_cached_result(
    db_path: Path,
    hash_value: str,
    mode: str,
    model_version: str,
    result: Dict[str, Any],
) -> None:
    connection = _connect(db_path)
    try:
        cursor = connection.cursor()
        cursor.execute(
            """
            INSERT INTO moderation_cache (
                hash, mode, model_version, hate_score, confidence, category, reason,
                suggested_alternative, suggested_alternatives, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(hash, mode, model_version) DO UPDATE SET
                hate_score = excluded.hate_score,
                confidence = excluded.confidence,
                category = excluded.category,
                reason = excluded.reason,
                suggested_alternative = excluded.suggested_alternative,
                suggested_alternatives = excluded.suggested_alternatives,
                updated_at = excluded.updated_at
            """,
            (
                hash_value,
                mode,
                model_version,
                float(result["hate_score"]),
                float(result["confidence"]),
                result["category"],
                result["reason"],
                result.get("suggested_alternative"),
                json.dumps(result.get("suggested_alternatives")) if result.get("suggested_alternatives") else None,
                datetime.now(timezone.utc).isoformat(),
            ),
        )
        connection.commit()
    finally:
        connection.close()


def insert_reported_example(db_path: Path, text: str, label: str, embedding: List[float]) -> int:
    connection = _connect(db_path)
    try:
        cursor = connection.cursor()
        cursor.execute(
            """
            INSERT INTO reported_examples (text, label, embedding_json, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (
                text,
                label,
                json.dumps(embedding),
                datetime.now(timezone.utc).isoformat(),
            ),
        )
        connection.commit()
        return int(cursor.lastrowid)
    finally:
        connection.close()


def link_faiss_entry(db_path: Path, faiss_id: int, report_id: int) -> None:
    connection = _connect(db_path)
    try:
        cursor = connection.cursor()
        cursor.execute(
            """
            INSERT INTO faiss_mapping (faiss_id, report_id)
            VALUES (?, ?)
            ON CONFLICT(faiss_id) DO UPDATE SET report_id = excluded.report_id
            """,
            (faiss_id, report_id),
        )
        connection.commit()
    finally:
        connection.close()


def get_reported_examples_by_faiss_ids(db_path: Path, faiss_ids: List[int]) -> List[Dict[str, Any]]:
    if not faiss_ids:
        return []

    placeholders = ",".join("?" for _ in faiss_ids)
    connection = _connect(db_path)
    try:
        cursor = connection.cursor()
        cursor.execute(
            f"""
            SELECT m.faiss_id, r.id, r.text, r.label
            FROM faiss_mapping m
            JOIN reported_examples r ON r.id = m.report_id
            WHERE m.faiss_id IN ({placeholders})
            """,
            tuple(faiss_ids),
        )
        rows = cursor.fetchall()
        return [
            {
                "faiss_id": int(row[0]),
                "report_id": int(row[1]),
                "text": row[2],
                "label": row[3],
            }
            for row in rows
        ]
    finally:
        connection.close()
