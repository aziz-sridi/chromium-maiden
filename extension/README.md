# 🛡️ Hate Speech Prevention & Protection Chrome Extension

A powerful Chrome Extension (Manifest v3) that detects and filters hate speech on social media platforms, providing users with a safer online experience while preserving freedom of expression through respectful reformulation.

## 🎯 Features

### Feature 1: Pre-Send Hate Detection
- **Real-time monitoring** of message composition across social platforms
- **Detects hate speech** before messages are sent
- **Blocks sending** of hateful content and displays explanation
- **Smart rewriting** suggests respectful alternatives with preserved meaning
- **One-click actions** to accept rewrites or send anyway

### Feature 2: Incoming Hate Filtering
- **Protects sensitive users** by filtering harmful content
- **Multiple filter actions**: Blur, Hide, or Warn
- **Live content scanning** with MutationObserver
- **Customizable sensitivity** levels (Low/Medium/High)
- **Click-to-reveal** for blurred content

## 📁 Project Structure

```
/extension
├── manifest.json              # Chrome Extension configuration (v3)
├── contentScript.js           # DOM interaction & detection logic
├── background.js              # Service worker for API calls
├── popup.html                 # Settings UI
├── popup.js                   # Settings controller
├── styles.css                 # All styling (popup + content)
└── utils/
    ├── domDetection.js        # Platform-specific DOM selectors
    └── apiClient.js           # Hate detection & rewrite API client
```

## 🚀 Installation & Setup

### 1. Load Extension in Chrome

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `/extension` directory

### 2. Verify Installation

- Extension icon appears in Chrome toolbar
- Click icon to open settings popup
- Both features should be "Active" by default

## ⚙️ Configuration

### Settings Available via Popup:

| Setting | Options | Default |
|---------|---------|---------|
| **Feature 1 (Pre-Send)** | On/Off | On |
| **Feature 2 (Incoming Filter)** | On/Off | On |
| **Sensitivity Level** | Low / Medium / High | Medium |
| **Filter Action** | Blur / Hide / Warn | Blur |
| **Enabled Platforms** | Facebook / Instagram / X/Twitter | All enabled |

## 🧠 How It Works

### Pre-Send Detection Flow

```
User composing message
       ↓
Extension intercepts on:
  • textarea input
  • contenteditable div
  • input[type="text"]
       ↓
User attempts send (Enter/Ctrl+Enter/button click)
       ↓
Text analyzed via local AI detection
       ↓
If hateful (confidence > 50%):
  • Modal displays with explanation
  • User choices:
    - Cancel (dismiss)
    - Rewrite (get suggestion)
    - Send Anyway (bypass)
       ↓
If rewrite selected:
  • Local AI generates respectful version
  • User can accept, edit, or cancel
       ↓
Message sent or discarded
```

### Incoming Filter Flow

```
New content appears on page
       ↓
MutationObserver detects changes
       ↓
Extract message text
       ↓
Analyze for hate speech
       ↓
If hateful (confidence > sensitivity threshold):
  • Apply selected action:
    - Blur: Content blurred, clickable to reveal
    - Hide: Content hidden with warning button
    - Warn: Warning banner added above
```

## 🔌 API Integration

### Hate Detection API

**Current Implementation:** Local mock detection with regex patterns

**Production Integration:**
```javascript
POST /api/detect-hate
Content-Type: application/json

{
  "text": "string",
  "apiKey": "your-api-key"
}

Response:
{
  "is_hate": boolean,
  "confidence": 0-1,
  "category": "harassment|threat|insult|slur",
  "timestamp": unix_timestamp
}
```

### Rewrite API

**Current Implementation:** Local mock rewriting with substitution rules

**Production Integration:**
```javascript
POST /api/rewrite
Content-Type: application/json

{
  "text": "original message",
  "apiKey": "your-api-key"
}

Response:
{
  "rewritten": "respectful version",
  "confidence": 0-1
}
```

## 🎨 Supported Platforms

| Platform | Detection | Filtering | Status |
|----------|-----------|-----------|--------|
| **Facebook** | ✓ | ✓ | ✓ Tested |
| **Instagram** | ✓ | ✓ | ✓ Tested |
| **X/Twitter** | ✓ | ✓ | ✓ Tested |

## 🔒 Privacy & Security

- ✅ **No data persistence**: Messages analyzed per-session only
- ✅ **No logging**: No personal data stored or transmitted
- ✅ **Local processing**: Detection runs in content script
- ✅ **Cache only**: Results cached in-memory for performance
- ✅ **HTTPS only**: All API calls use HTTPS (when implemented)

## 📝 Hate Speech Categories

The extension detects and categorizes:

- **Slurs**: Dehumanizing language targeting groups
- **Harassment**: Personal attacks and degradation
- **Threats**: Violence or harm directed at individuals
- **Insults**: Derogatory terms and name-calling

## 🎛️ Modal Dialogs

### Detection Modal
- Warning icon & message
- Confidence indicator with progress bar
- Preview of original message
- Three action buttons

### Rewrite Modal
- Original message preview
- Rewritten suggestion in textarea
- Side-by-side comparison
- Accept, Edit, or Cancel options

### Filter Warning
- Blurred content (5px blur, 70% opacity)
- Click anywhere to toggle reveal
- Hidden content shows clickable warning banner
- Warning-only shows alert banner above content

## 🧪 Testing

### Manual Testing Checklist

#### Feature 1: Pre-Send Detection
- [ ] Navigate to Facebook/Instagram/Twitter
- [ ] Write a normal message → Should send normally
- [ ] Write hateful message → Modal appears
- [ ] Click "Rewrite" → Suggestion appears
- [ ] Click "Accept & Send" → Rewritten message sent
- [ ] Click "Send Anyway" → Original sent
- [ ] Click "Cancel" → Message stays, modal closes

#### Feature 2: Incoming Filtering
- [ ] Set Filter Action to "Blur"
- [ ] View hateful comment → Content blurred
- [ ] Click blurred content → Becomes readable
- [ ] Change to "Hide" → Content hidden with button
- [ ] Click "Show anyway" → Content revealed
- [ ] Change to "Warn" → Warning banner added

#### Settings
- [ ] Toggle features on/off → Takes effect immediately
- [ ] Change sensitivity → Filter behavior updates
- [ ] Change platforms → Extension behavior changes
- [ ] Reset settings → Returns to defaults

### Test Hate Speech Phrases

```
Feature 1 (Pre-Send):
- "I hate all [group]"
- "You should all die"
- "[Group] should be exterminated"
- "[Group] are all stupid"

Feature 2 (Incoming):
- Same patterns in comments/messages
- Extension should filter when sensitivity matches
```

## 🐛 Debugging

### Enable Logging

Open browser console (F12) and check:
- `contentScript.js` logs for DOM detection
- `background.js` logs for API processing
- Extension popup shows status

### Clear Cache

1. Open extension popup
2. Click "Clear Cache" button
3. Cache statistics update in debug section

### Reset Settings

1. Open extension popup
2. Click "Reset Settings" button
3. Confirm in dialog
4. All settings return to defaults

## 📊 Performance Considerations

- **Debounced API calls**: Prevents excessive requests during typing
- **In-memory caching**: Stores 100 recent analyses
- **Efficient DOM queries**: Uses specific selectors for social platforms
- **MutationObserver throttling**: Prevents performance degradation
- **Text length limits**: Skips analysis for messages > 10KB

## 🔄 Message Flow

### Architecture Overview

```
┌─────────────────────────────────────────────┐
│ Content Page (Facebook/Instagram/Twitter)   │
│  • HTML/DOM                                 │
│  • User interaction                         │
└──────────────────┬──────────────────────────┘
                   │
         ┌─────────▼─────────┐
         │ Content Script    │
         │ ─────────────────  │
         │ • DOM detection   │
         │ • Event listeners │
         │ • UI injection    │
         └─────────┬─────────┘
                   │
         ┌─────────▼────────────┐
         │ Background Worker    │
         │ ──────────────────── │
         │ • API calls         │
         │ • Storage access    │
         │ • Service logic     │
         └─────────┬────────────┘
                   │
         ┌─────────▼─────────────┐
         │ External APIs         │
         │ (when implemented)    │
         │ • Hate detection      │
         │ • Text rewriting      │
         └───────────────────────┘
```

## 🎯 Future Enhancements

- [ ] Real API integration (OpenAI, Azure Content Moderation)
- [ ] On-device ML model fallback
- [ ] Highlight hateful words with tooltips
- [ ] User reporting for false positives
- [ ] Statistics dashboard (blocked/filtered count)
- [ ] Multi-language support
- [ ] Dark mode for popup
- [ ] Keyboard shortcuts for quick actions
- [ ] History of filtered content (opt-in)
- [ ] Custom keyword lists

## 📄 License

MIT License - Feel free to modify and distribute

## 🤝 Contributing

Contributions welcome! Areas needing help:
- Real API integration
- Additional platform support
- ML model integration
- UI/UX improvements
- Performance optimization
- Localization

## 📞 Support

For issues or questions:
1. Check extension logs in DevTools
2. Review error messages in popup debug section
3. Verify platform-specific selectors are correct
4. Test with sample hate speech phrases

## 🏁 Quick Start

```bash
# 1. Navigate to chrome://extensions/
# 2. Enable Developer mode
# 3. Click "Load unpacked"
# 4. Select /extension folder
# 5. Click extension icon in toolbar
# 6. Configure settings as needed
# 7. Visit Facebook/Instagram/Twitter
# 8. Start protecting content!
```

---

**Made with ❤️ for safer online spaces**

Version: 1.0.0
Last Updated: February 2026
