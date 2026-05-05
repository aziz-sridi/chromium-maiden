import json
from pathlib import Path
from typing import Dict, List, Optional
from urllib import request

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .memory.cache import (
    get_cached_result,
    get_reported_examples_by_faiss_ids,
    initialize_database,
    insert_reported_example,
    link_faiss_entry,
    set_cached_result,
)
from .memory.hashing import normalize_text, sha256_hash
from .rag.embeddings import OllamaEmbedder
from .rag.vector_store import FaissVectorStore
from .routes.monitor_incoming import router as incoming_router
from .routes.monitor_outgoing import router as outgoing_router
from .routes.report_content import router as report_router


class ModerationEngine:
    def __init__(
        self,
        db_path: Path,
        vector_store: FaissVectorStore,
        embedder: OllamaEmbedder,
        ollama_base_url: str = "http://127.0.0.1:11434",
        llm_model: str = "qwen2.5:3b",
        model_version: str = "v1",
    ) -> None:
        self.db_path = db_path
        self.vector_store = vector_store
        self.embedder = embedder
        self.ollama_base_url = ollama_base_url.rstrip("/")
        self.llm_model = llm_model
        self.model_version = model_version
        self.keyword_weights: Dict[str, float] = {
            "kill": 0.18,
            "hate": 0.12,
            "hateful": 0.12,
            "hatefull": 0.12,
            "racist": 0.16,
            "rasict": 0.16,
            "racism": 0.16,
            "trash": 0.1,
            "idiot": 0.08,
            "stupid": 0.08,
            "vermin": 0.2,
            "subhuman": 0.2,
        }

    def _post_ollama_generate(self, prompt: str, temperature: float = 0.15, top_p: float = 0.8) -> dict:
        payload = {
            "model": self.llm_model,
            "prompt": prompt,
            "stream": False,
            "format": "json",
            "options": {
                "temperature": temperature,
                "top_p": top_p,
            },
        }
        data = json.dumps(payload).encode("utf-8")
        req = request.Request(
            url=f"{self.ollama_base_url}/api/generate",
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with request.urlopen(req, timeout=40) as response:
            body = json.loads(response.read().decode("utf-8"))

        content = body.get("response", "{}")
        if isinstance(content, dict):
            return content
        content = content.strip()
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            start = content.find("{")
            end = content.rfind("}")
            if start >= 0 and end > start:
                return json.loads(content[start : end + 1])
            raise RuntimeError("Ollama response is not valid JSON")

    @staticmethod
    def _clamp01(value: float) -> float:
        return max(0.0, min(1.0, float(value)))

    def _keyword_boost(self, normalized_text: str) -> float:
        boost = 0.0
        for keyword, weight in self.keyword_weights.items():
            if keyword in normalized_text:
                boost = max(boost, weight)
        return self._clamp01(boost)

    def _normalize_category(self, raw_category: str, text: str, hate_score: float) -> str:
        category = (raw_category or "").strip().lower().replace("-", "_").replace(" ", "_")
        allowed = {"none", "insult", "harassment", "discrimination", "violent_hate"}
        if category in allowed:
            return category

        normalized_text = normalize_text(text)
        if any(token in category for token in ["violent", "threat", "genocid"]):
            return "violent_hate"
        if any(token in category for token in ["discrimin", "rac", "xenophob"]):
            return "discrimination"
        if any(token in category for token in ["harass", "bully"]):
            return "harassment"
        if any(token in category for token in ["insult", "abus", "hate", "hateful", "hatefull", "rasict", "racist"]):
            return "insult"

        if any(token in normalized_text for token in ["racist", "rasict", "race", "ethnic", "immigrant"]) and hate_score >= 0.2:
            return "discrimination"
        if any(token in normalized_text for token in ["kill", "eliminate", "exterminate"]) and hate_score >= 0.2:
            return "violent_hate"
        if hate_score >= 0.2:
            return "insult"
        return "none"

    def _retrieve_examples(self, embedding_vector) -> tuple[List[str], float]:
        results = self.vector_store.search(embedding_vector, top_k=5)
        if not results:
            return [], 0.0

        faiss_ids = [item[0] for item in results]
        similarity_score = max(item[1] for item in results)
        examples = get_reported_examples_by_faiss_ids(self.db_path, faiss_ids)

        ordered_examples: List[str] = []
        by_id = {example["faiss_id"]: example for example in examples}
        for faiss_id, _ in results:
            example = by_id.get(faiss_id)
            if example:
                ordered_examples.append(example["text"])
        return ordered_examples[:3], self._clamp01(similarity_score)

    def _llm_moderate(self, text: str, context: Optional[List[str]], similar_examples: List[str]) -> Dict[str, object]:
        context_block = "\n".join(context or [])
        examples_block = "\n".join(f"- {example}" for example in similar_examples) if similar_examples else "- none"

        prompt = (
            "You are a strict hate-speech moderation engine. "
            "Analyze message toxicity and return JSON only.\n"
            "Allowed categories: none, insult, harassment, discrimination, violent_hate.\n"
            "Respond with exact schema:\n"
            "{\"hate_score\": float_0_to_1, \"confidence\": float_0_to_1, \"category\": \"none|insult|harassment|discrimination|violent_hate\", \"reason\": \"short analytical explanation\"}\n"
            "No markdown. No extra keys. No extra text.\n\n"
            f"Current message:\n{text}\n\n"
            f"Similar reported offensive examples:\n{examples_block}\n\n"
            f"Optional conversation context:\n{context_block if context_block else 'none'}\n"
        )

        try:
            output = self._post_ollama_generate(prompt=prompt, temperature=0.15, top_p=0.8)
        except Exception:
            output = {
                "hate_score": 0.0,
                "confidence": 0.25,
                "category": "none",
                "reason": "fallback response: moderation model unavailable",
            }

        raw_score = self._clamp01(float(output.get("hate_score", 0.0)))
        category = self._normalize_category(str(output.get("category", "none")), text=text, hate_score=raw_score)

        return {
            "hate_score": raw_score,
            "confidence": self._clamp01(float(output.get("confidence", 0.3))),
            "category": category,
            "reason": str(output.get("reason", "insufficient evidence of hate speech"))[:300],
        }

    def _fallback_alternatives(self) -> List[str]:
        return [
            "I strongly disagree with this and want to discuss it respectfully.",
            "I feel frustrated about this, but I want to explain my point calmly.",
            "I disagree with your view and want to focus on the issue without insults.",
        ]

    def _generate_respectful_alternatives(self, text: str, context: Optional[List[str]]) -> List[str]:
        context_block = "\n".join(context or [])
        prompt = (
            "Rewrite the message to preserve meaning while removing hostility.\n"
            "Tone requirements: respectful, concise, neutral, no moralizing.\n"
            "Return exactly 3 alternatives as JSON only with schema: {\"suggested_alternatives\": [\"a\", \"b\", \"c\"]}.\n"
            "No extra keys. No extra text.\n\n"
            f"Original message:\n{text}\n\n"
            f"Optional conversation context:\n{context_block if context_block else 'none'}"
        )
        try:
            output = self._post_ollama_generate(prompt=prompt, temperature=0.1, top_p=0.8)
            raw_candidates = output.get("suggested_alternatives", [])
            if not isinstance(raw_candidates, list):
                raw_candidates = []

            cleaned: List[str] = []
            for item in raw_candidates:
                candidate = str(item).strip()
                if candidate and candidate not in cleaned:
                    cleaned.append(candidate)
                if len(cleaned) == 3:
                    break

            if len(cleaned) < 3:
                for fallback in self._fallback_alternatives():
                    if fallback not in cleaned:
                        cleaned.append(fallback)
                    if len(cleaned) == 3:
                        break
            return cleaned[:3]
        except Exception:
            return self._fallback_alternatives()

    def _moderate(self, text: str, mode: str, include_alternative: bool, conversation_context: Optional[List[str]]) -> Dict[str, object]:
        normalized = normalize_text(text)
        hash_value = sha256_hash(normalized)
        cached = get_cached_result(self.db_path, hash_value, mode, self.model_version)
        if cached is not None:
            if include_alternative and cached["hate_score"] >= 0.3 and not cached.get("suggested_alternatives"):
                alternatives = self._generate_respectful_alternatives(text, conversation_context)
                cached["suggested_alternatives"] = alternatives
                cached["suggested_alternative"] = alternatives[0] if alternatives else None
                set_cached_result(self.db_path, hash_value, mode, self.model_version, cached)
            return cached

        examples: List[str] = []
        similarity_score = 0.0
        try:
            embedding_vector = self.embedder.embed(normalized)
            examples, similarity_score = self._retrieve_examples(embedding_vector)
        except Exception:
            embedding_vector = None

        llm_result = self._llm_moderate(text=text, context=conversation_context, similar_examples=examples)
        heuristic_boost = self._keyword_boost(normalized)

        final_hate_score = self._clamp01(0.7 * llm_result["hate_score"] + 0.3 * similarity_score + heuristic_boost)
        final_confidence = self._clamp01(0.75 * llm_result["confidence"] + 0.25 * similarity_score)

        category = llm_result["category"]
        if final_hate_score < 0.2:
            category = "none"

        result: Dict[str, object] = {
            "hate_score": final_hate_score,
            "confidence": final_confidence,
            "category": category,
            "reason": llm_result["reason"],
            "suggested_alternative": None,
            "suggested_alternatives": None,
        }

        if include_alternative and final_hate_score >= 0.3:
            alternatives = self._generate_respectful_alternatives(text, conversation_context)
            result["suggested_alternatives"] = alternatives
            result["suggested_alternative"] = alternatives[0] if alternatives else None

        should_cache = result.get("reason") != "fallback response: moderation model unavailable"
        if should_cache:
            set_cached_result(self.db_path, hash_value, mode, self.model_version, result)
        return result

    def moderate_incoming(self, text: str, conversation_context: Optional[List[str]]) -> Dict[str, object]:
        return self._moderate(
            text=text,
            mode="incoming",
            include_alternative=False,
            conversation_context=conversation_context,
        )

    def moderate_outgoing(self, text: str, conversation_context: Optional[List[str]]) -> Dict[str, object]:
        return self._moderate(
            text=text,
            mode="outgoing",
            include_alternative=True,
            conversation_context=conversation_context,
        )

    def report_offensive_content(self, text: str, label: str = "offensive") -> Dict[str, object]:
        normalized = normalize_text(text)
        embedding_vector = self.embedder.embed(normalized)
        report_id = insert_reported_example(self.db_path, text=text, label=label, embedding=embedding_vector.tolist())
        faiss_id = self.vector_store.add(embedding_vector)
        link_faiss_entry(self.db_path, faiss_id=faiss_id, report_id=report_id)
        return {
            "status": "stored",
            "report_id": report_id,
            "faiss_id": faiss_id,
        }


BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "database" / "db.sqlite"
INDEX_PATH = BASE_DIR / "rag" / "index.faiss"

initialize_database(DB_PATH)
vector_store = FaissVectorStore(INDEX_PATH)
embedder = OllamaEmbedder()
engine = ModerationEngine(db_path=DB_PATH, vector_store=vector_store, embedder=embedder)

app = FastAPI(title="Backend v2 - Adaptive Hate Speech Moderation", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.state.engine = engine
app.include_router(incoming_router)
app.include_router(outgoing_router)
app.include_router(report_router)


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}
