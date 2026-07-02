<div align="center">
  <img src="extension/mascots/default_maid/maid_ok.jpeg" width="112" alt="Chromium Maiden mascot">
  <h1>Chromium Maiden</h1>
  <p><strong>A calmer feed and a second thought before send.</strong></p>
  <p>A Chrome extension that filters harmful incoming and outgoing speech, assisted by a protective companion with just enough dry humor.</p>
</div>

> [!NOTE]
> Chromium Maiden is an active prototype, not an infallible moderation system. It can miss harmful language or flag harmless context. Reveal and override controls remain available for that reason.

## Why this exists

Online moderation usually happens after harm has already landed. Chromium Maiden moves that checkpoint into the browser:

- Incoming posts, comments, and messages are checked as they enter the viewport.
- Harmful content can be blurred, hidden, or marked with a warning.
- Outgoing messages are checked before the site receives the send action.
- Flagged drafts can be rewritten without losing the point the user intended to make.

The maiden is present, but quiet. She protects the workflow instead of turning it into a game.

## What changed in v1.1

- Replaced repeated full-page scans with visibility-driven discovery.
- Added an immediate pending shield so harmful content does not remain readable while classification is running.
- Added a three-worker request queue, in-flight request deduplication, and a 400-entry LRU-style cache with a 30-minute TTL.
- Persisted the extension cache for the browser session so repeated feed items are not reclassified after a service-worker restart.
- Added a backend circuit breaker. If the local model is unavailable, requests use the fast fallback immediately for 30 seconds instead of repeatedly waiting for a timeout.
- Replaced the oversized script and generated interface with smaller modules and a restrained, gradient-free popup.
- Removed the tracked virtual environment, generated model state, duplicate prototype, obsolete shop, test mockups, and redundant generated documentation.

## How it works

### Incoming content

1. Platform-specific selectors discover likely messages and comments.
2. `IntersectionObserver` prioritizes content near the viewport.
3. A subtle pending blur prevents unchecked text from flashing in full clarity.
4. The background worker checks the session cache and joins any identical in-flight request.
5. Up to three uncached requests run concurrently.
6. A confirmed match receives the configured treatment and a separate reveal control.
7. Before applying a result, the content script verifies that the DOM element still contains the same text. Stale results are discarded.

### Outgoing content

Drafts are classified after a short typing pause, which means most send actions already have a cached answer. Harmful drafts open a compact panel beside the composer with the category, score, reason, rewrite choices, and an explicit override.

If a keyboard send happens before classification finishes, Chromium Maiden pauses it. A safe result asks for one more send action because browsers do not allow extensions to recreate a trusted keyboard event.

### Moderation layers

```text
Social page
    │
    ▼
Content script: discovery, pending shield, stale-result guard
    │
    ▼
Background worker: queue, deduplication, session cache
    │
    ├── Local rule fallback for clear threats and harassment
    │
    └── FastAPI backend on 127.0.0.1:8000
            ├── SQLite result cache
            ├── Ollama moderation and rewrite model
            └── FAISS memory of user-reported examples
```

The local fallback is intentionally conservative and primarily English-language. The Ollama backend provides deeper, contextual classification and rewrite suggestions.

## Supported sites

- Facebook and Messenger
- Instagram
- X and legacy Twitter URLs

These sites change their DOM frequently. Selector maintenance is expected, and coverage can differ across feeds, comments, and direct messages.

## Quick start

### 1. Load the extension

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select the [`extension`](extension) directory.
5. Open a supported site and use the toolbar popup to choose your protection settings.

The extension works immediately with its conservative local fallback. Run the backend for contextual classification and generated rewrites.

### 2. Run the local backend

Requirements:

- Python 3.10 or newer
- [Ollama](https://ollama.com/) running locally
- Node.js 18 or newer only if you want to run the JavaScript checks

Create the environment and install Python dependencies:

```bash
python -m venv .venv
```

Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
pip install -r backendv2\requirements.txt
```

macOS or Linux:

```bash
source .venv/bin/activate
pip install -r backendv2/requirements.txt
```

Download the local models:

```bash
ollama pull qwen2.5:3b
ollama pull nomic-embed-text
```

Start the API on the port expected by the extension:

```bash
uvicorn backendv2.main:app --host 127.0.0.1 --port 8000 --reload
```

Verify it:

```bash
curl http://127.0.0.1:8000/health
```

The popup reports **Local model connected** when the health check succeeds.

## Settings

| Setting | Effect |
| --- | --- |
| Before you send | Checks drafts and pauses harmful send actions. |
| Incoming posts | Checks visible incoming content. |
| Sensitivity | Relaxed uses a higher intervention threshold; Strict uses a lower one. |
| Incoming treatment | Blur, hide, or warn without obscuring the content. |
| Active sites | Enables protection independently for Facebook, Instagram, and X. |

Settings sync through `chrome.storage.sync`. Moderation results stay in `chrome.storage.session` and expire after 30 minutes.

## API

The extension calls these local endpoints:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Backend availability. |
| `POST` | `/monitor/incoming` | Classify incoming content. |
| `POST` | `/monitor/outgoing` | Classify a draft and return rewrite options. |
| `POST` | `/report/content` | Add a reported example to SQLite and FAISS memory. |

Moderation request:

```json
{
  "text": "Message to classify",
  "conversation_context": ["Optional earlier message"]
}
```

Moderation response:

```json
{
  "hate_score": 0.82,
  "confidence": 0.9,
  "category": "harassment",
  "reason": "Short analytical explanation",
  "suggested_alternative": "A calmer version",
  "suggested_alternatives": ["Option one", "Option two", "Option three"]
}
```

Incoming responses omit rewrite generation to reduce latency. Outgoing responses generate up to three alternatives when the score warrants intervention.

## Development

Run the JavaScript queue and fallback tests:

```bash
npm test
```

Check every extension script for syntax errors:

```bash
npm run check:js
```

Run the backend cache tests:

```bash
npm run test:python
```

Run all available checks:

```bash
npm run check
```

### Project structure

```text
chromium-maiden/
├── backendv2/                 FastAPI, Ollama, SQLite, and FAISS backend
│   ├── memory/                Persistent moderation cache and hashing
│   ├── models/                API request and response schemas
│   ├── rag/                   Embeddings and adaptive vector memory
│   └── routes/                Incoming, outgoing, and reporting endpoints
├── extension/
│   ├── mascots/default_maid/  Maiden states used by the interface
│   ├── utils/                 DOM discovery, API bridge, queue, and cache
│   ├── background.js          Moderation service worker
│   ├── contentScript.js       Incoming and outgoing page behavior
│   ├── content.css            Isolated page interventions
│   └── popup.*                Toolbar controls and session status
├── tests/                     JavaScript and Python regression tests
├── DESIGN.md                  Visual system and component rules
└── PRODUCT.md                 Product purpose and experience principles
```

## Privacy

- Social content is analyzed inside the extension or sent to the local API at `127.0.0.1`.
- The default backend uses local Ollama models. It does not call a hosted moderation provider.
- Classification results are cached locally to avoid repeated work.
- Reported examples are stored locally in SQLite and FAISS only when the reporting endpoint is explicitly used.
- The project contains no analytics or telemetry integration.

Review any future model-provider integration carefully. Sending message content to a hosted API would change this privacy boundary and should be disclosed in both the UI and documentation.

## Known limitations

- Detection is probabilistic and context-sensitive. False positives and false negatives are unavoidable.
- Incoming content briefly uses a soft pending blur, so a slow first model request can make safe text wait before becoming clear.
- The first Ollama request may be slower while a model loads into memory.
- The fast fallback covers only a conservative set of explicit English phrases.
- Social-site markup changes can break individual selectors.
- A keyboard send that outruns draft classification requires the user to send once more after a safe result.
- Session metrics reset when the extension service worker restarts.

## Roadmap

- Add fixture-based DOM tests for each supported site.
- Add language-aware fallback models and multilingual evaluation sets.
- Batch nearby incoming messages in one backend request.
- Add a false-positive reporting control to the incoming shield.
- Measure time-to-shield, cache hit rate, and selector coverage without collecting message content.
- Package repeatable Chrome Web Store release checks and a privacy policy.

## Contributing

Keep changes focused and testable. If you update a site selector, include the page context it targets and a sanitized DOM fixture when possible. If you change moderation thresholds or prompts, document the evaluation examples used to justify the change.

The design rules live in [`DESIGN.md`](DESIGN.md), and the product principles live in [`PRODUCT.md`](PRODUCT.md).
