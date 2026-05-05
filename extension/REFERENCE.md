# 📚 Feature Reference & API Documentation

## Table of Contents

1. [Feature 1: Pre-Send Detection](#feature-1-pre-send-detection)
2. [Feature 2: Incoming Filtering](#feature-2-incoming-filtering)
3. [Settings & Configuration](#settings--configuration)
4. [API Responses](#api-responses)
5. [Error Handling](#error-handling)

---

## Feature 1: Pre-Send Detection

### Overview

**Objective:** Prevent hateful messages from being sent

**Trigger Points:**
- ✓ Enter key pressed
- ✓ Ctrl+Enter / Cmd+Enter pressed
- ✓ Send button clicked
- ✓ Reply/Comment button clicked

### Workflow

```mermaid
START
  ↓
USER COMPOSES MESSAGE
  ↓
USER ATTEMPTS SEND (keyboard/button)
  ↓
EXTENSION INTERCEPTS EVENT
  ↓
EXTRACT MESSAGE TEXT
  ↓
DEBOUNCE (50ms) - prevent duplicate analysis
  ↓
SHOW LOADING INDICATOR
  ↓
ANALYZE TEXT FOR HATE SPEECH
  ↓
CHECK CACHE FOR PREVIOUS ANALYSIS
  ↓
IF NOT IN CACHE → CALL API/LOCAL DETECTION
  ↓
IF IN CACHE → USE CACHED RESULT
  ↓
GET RESULT { is_hate, confidence, category }
  ↓
HIDE LOADING INDICATOR
  ↓
IF NOT HATEFUL (confidence < 0.5)
  │ └─→ ALLOW SEND
  │     └─→ MESSAGE SENT NORMALLY
  │
  └─→ IF HATEFUL (confidence >= 0.5)
      └─→ BLOCK SEND
          └─→ SHOW MODAL DIALOG
              ├─→ Option 1: CANCEL
              │   └─→ Message stays in editor
              │
              ├─→ Option 2: REWRITE RESPECTFULLY
              │   ├─→ Call rewrite API
              │   ├─→ Show suggestion
              │   └─→ User can accept/edit/cancel
              │
              └─→ Option 3: SEND ANYWAY
                  └─→ Bypass detection
                      └─→ Message sent as-is
```

### Detection Modal

**When Shown:**
- Confidence score > 50%
- Detected category not null

**Components:**

```
┌─────────────────────────────────────┐
│  ⚠️ Potentially Harmful Message   X │
├─────────────────────────────────────┤
│                                     │
│  This message may be interpreted   │
│  as [category: harassment].        │
│                                     │
│  Confidence: [█████░░░░░] 75%      │
│                                     │
│  Your message:                      │
│  "You are stupid and worthless"    │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  [Cancel]  [Rewrite]  [Send Anyway]│
│                                     │
└─────────────────────────────────────┘
```

**Button Actions:**

| Button | Action | Result |
|--------|--------|--------|
| **Cancel** | Close modal | Message stays in editor |
| **Rewrite Respectfully** | Call rewrite API | Show suggestion modal |
| **Send Anyway** | Bypass check | Send original message |
| **X** (close) | Same as Cancel | Message stays in editor |

### Rewrite Modal

**When Shown:**
- User clicked "Rewrite Respectfully"
- Rewrite API returned suggestion

**Components:**

```
┌─────────────────────────────────────┐
│  ✏️ Rewrite Your Message         │
├─────────────────────────────────────┤
│                                     │
│  Original:                          │
│  "You are stupid and should die"  │
│                                     │
│  →                                  │
│                                     │
│  Suggested Rewrite:                 │
│  [Edit me if you want...          │
│   I respectfully disagree with    │
│   your approach]                  │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  [Cancel]  [Edit More]  [Accept]   │
│                                     │
└─────────────────────────────────────┘
```

**Button Actions:**

| Button | Action | Result |
|--------|--------|--------|
| **Cancel** | Close modal | Message reverts to original |
| **Edit More** | Focus textarea | User can modify suggestion |
| **Accept & Send** | Send modified text | Message sent with rewrite |
| **X** (close) | Same as Cancel | Message reverts to original |

### Supported Message Types

| Platform | Comment | DM | Reply | Story | Live Chat |
|----------|---------|----|----- |-------|-----------|
| **Facebook** | ✓ | ✓ | ✓ | - | - |
| **Instagram** | ✓ | ✓ | ✓ | ✓ | - |
| **X/Twitter** | ✓ | ✓ | ✓ | - | ✓ |

### Hate Categories Detected

| Category | Examples | Confidence |
|----------|----------|------------|
| **Slur** | "I hate all [group]", "Should all die" | 80-90% |
| **Harassment** | "You are stupid", "Go kill yourself" | 70-80% |
| **Threat** | "I will kill you", "You deserve to die" | 90-95% |
| **Insult** | "You are ugly", "You are worthless" | 60-70% |

---

## Feature 2: Incoming Filtering

### Overview

**Objective:** Protect users from hateful incoming messages

**Monitors:**
- ✓ Comments on posts
- ✓ Replies to comments
- ✓ Direct messages
- ✓ Live chat (Twitter/X)
- ✓ All user-generated content

### Detection Flow

```
PAGE LOADED OR NEW CONTENT APPEARS
  ↓
MUTATION OBSERVER DETECTS CHANGE
  ↓
GET ALL MESSAGE ELEMENTS (throttled)
  ↓
FOR EACH MESSAGE:
  ├─→ Skip if already filtered
  ├─→ Skip if > 10KB (too long)
  ├─→ Extract text content
  └─→ ANALYZE FOR HATE SPEECH
      ├─→ Check cache
      ├─→ Call API if not cached
      └─→ Get result { is_hate, confidence, category }
  
  IF HATEFUL (confidence > sensitivity threshold):
    ├─→ Apply filter action:
    │   ├─→ BLUR
    │   ├─→ HIDE
    │   └─→ WARN
    └─→ Mark as filtered
```

### Filter Actions

#### 1. Blur Action

**Appearance:**
- Content visually blurred
- 70% opacity
- Clickable

**User Interaction:**
- Click content → Toggle blur on/off
- Click anywhere on blurred area to reveal
- Click again to blur again

**CSS:**
```css
.hate-blurred {
  filter: blur(5px);
  opacity: 0.7;
  cursor: pointer;
  transition: all 0.2s;
}

.hate-blurred-revealed {
  filter: none;
  opacity: 1;
}
```

#### 2. Hide Action

**Appearance:**
- Content completely hidden
- Warning box replaces content:
  ```
  ⚠️ This content was hidden due to harmful language
  [Show anyway]
  ```

**User Interaction:**
- Click "Show anyway" button → Content becomes visible
- Content stays visible until page refresh

**HTML:**
```html
<div class="hate-content-warning">
  <p>⚠️ This content was hidden due to harmful language</p>
  <button class="hate-reveal-btn">Show anyway</button>
</div>
```

#### 3. Warn Action

**Appearance:**
- Warning banner appears above content
- Content stays visible
- Banner reads: "⚠️ This message contains [category] language"

**User Interaction:**
- Warning informs user
- Content is still readable
- User can decide to read or skip

**HTML:**
```html
<div class="hate-content-alert">
  ⚠️ This message contains harassment language
</div>
```

### Sensitivity Thresholds

| Sensitivity | Threshold | Behavior |
|-------------|-----------|----------|
| **Low** | 80% confidence | Only clearly severe hate filtered |
| **Medium** | 60% confidence | Balanced filtering (recommended) |
| **High** | 40% confidence | Aggressive filtering, may catch borderline content |

### Performance Optimization

**Caching:**
- Results cached in-memory (Map, 100 entries max)
- Cache key: `hate:{text_hash}`
- Prevents re-analysis of duplicate messages

**Throttling:**
- MutationObserver debounced to 100ms
- Prevents excessive DOM queries
- Batch processes multiple changes

**Limits:**
- Messages > 10KB skipped
- Max 50 messages analyzed per batch
- Analysis stops if page becomes slow

---

## Settings & Configuration

### Feature Toggles

```javascript
{
  feature1Enabled: boolean,    // Pre-send detection
  feature2Enabled: boolean     // Incoming filtering
}
```

**Behavior:**
- Disabling Feature 1 → No pre-send checks
- Disabling Feature 2 → No incoming filtering
- Both can be toggled independently
- Changes apply immediately

### Sensitivity Level

```javascript
{
  sensitivityLevel: 'low' | 'medium' | 'high'
}
```

**Mapping to Confidence Threshold:**

```javascript
const mapping = {
  'low': 0.8,      // Only very confident matches (80%+)
  'medium': 0.6,   // Balanced (60%+)
  'high': 0.4      // Aggressive (40%+)
};
```

**Impact:**
- Higher sensitivity catches more potential hate
- May increase false positives
- Adjustable based on user preference

### Filter Action

```javascript
{
  filterAction: 'blur' | 'hide' | 'warn'
}
```

**Use Cases:**
- **blur** - For casual browsing, user in control of visibility
- **hide** - For sensitive users who need protection
- **warn** - For users who want to be informed but still read

### Platform Selection

```javascript
{
  platformsEnabled: {
    facebook: boolean,
    instagram: boolean,
    twitter: boolean
  }
}
```

**Effect:**
- Only enabled platforms are monitored
- Disabling unused platforms improves performance
- Can be changed without restarting

---

## API Responses

### Hate Detection Response

```javascript
{
  is_hate: boolean,           // True if hateful content detected
  confidence: number,         // 0-1 (confidence score)
  category: string | null,    // 'slur' | 'harassment' | 'threat' | 'insult' | null
  timestamp: number,          // Unix timestamp of analysis
  cached: boolean,            // True if result from cache
  error?: string              // Error message if detection failed
}
```

**Example Responses:**

```javascript
// Safe message
{
  is_hate: false,
  confidence: 0,
  category: null,
  cached: false
}

// Detected hate
{
  is_hate: true,
  confidence: 0.85,
  category: "harassment",
  cached: false
}

// Cached result
{
  is_hate: true,
  confidence: 0.75,
  category: "threat",
  cached: true
}
```

### Rewrite Response

```javascript
{
  rewritten: string,          // Rewritten text
  confidence: number,         // 0-1 (quality score)
  originalCategory: string    // Category that was rewritten
}
```

**Example Responses:**

```javascript
// Successful rewrite
{
  rewritten: "I respectfully disagree with your approach",
  confidence: 0.92,
  originalCategory: "harassment"
}

// Rewrite with context added
{
  rewritten: "I respectfully disagree. I appreciate your perspective but have concerns about implementation.",
  confidence: 0.88,
  originalCategory: "insult"
}

// Fallback rewrite (if no patterns matched)
{
  rewritten: "I respectfully disagree. [Original context: You are stupid...]",
  confidence: 0.6,
  originalCategory: "insult"
}
```

---

## Error Handling

### User-Facing Errors

**Modal appears when:**
- API timeout (shows loading, then allows send)
- API error (shows warning, suggests send anyway)
- Invalid text (skips analysis, allows send)

**User Experience:**
- Never blocks user indefinitely
- Always provides override option
- Clear error messages

### Logging

**Console Logs (visible in DevTools):**

```javascript
// Normal operation
"Hate Speech Prevention Extension loaded"
"Setting saved: feature1Enabled = true"
"Message sent successfully"

// Errors
"Hate detection error: Network timeout"
"Rewrite error: API returned 429"
"Invalid selector: [data-nonexistent]"
```

**Debug Output:**

```javascript
// In extension popup debug section
Cache size: 45/100
Cached entries: 45
Last updated: 2:34 PM
```

### Recovery Strategies

| Error | Automatic Recovery |
|-------|-------------------|
| API timeout | Fail open (allow send) |
| Cache miss | Fetch from API |
| Invalid selector | Skip, try next |
| Storage error | Use defaults |
| Permission denied | Disable feature |

---

## Advanced Configuration

### Custom API Integration

**Replace local detection:**

```javascript
// In utils/apiClient.js
async _detectHateSpeechAPI(text) {
  const response = await fetch('YOUR_API_ENDPOINT', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer YOUR_API_KEY`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text })
  });
  
  const data = await response.json();
  return {
    is_hate: data.flagged,
    confidence: data.score,
    category: data.category
  };
}
```

### Custom Patterns

**Add hate detection patterns:**

```javascript
const hatePatterns = {
  custom_category: [
    /your-custom-pattern-1/gi,
    /your-custom-pattern-2/gi
  ]
};
```

### Message Rewriting Rules

**Customize rewrite rules:**

```javascript
const rewrites = {
  'hate all': 'disagree with most',
  'you are dumb': 'I think you are mistaken',
  'should die': 'should reconsider their choices'
  // Add more...
};
```

---

## Performance Metrics

### Typical Operation

| Metric | Value |
|--------|-------|
| Detection latency | 50-150ms |
| Rewrite latency | 100-200ms |
| Memory per message | ~2KB |
| Max cached entries | 100 |
| Cache hit rate | 40-60% |

### Resource Usage

| Resource | Typical | Peak |
|----------|---------|------|
| CPU | <1% | 5-10% (detection) |
| Memory | 5-10MB | 15-20MB (full cache) |
| Network | 0 (local) | ~2KB per API call |

### Optimization Tips

1. **Increase cache size** → Higher memory, fewer API calls
2. **Increase threshold** → Lower sensitivity, fewer analyses
3. **Disable Feature 2** → Less DOM scanning
4. **Update selectors** → Faster element detection

---

**Last Updated:** February 2026  
**Version:** 1.0.0  
**Reference:** For detailed implementation, see IMPLEMENTATION.md
