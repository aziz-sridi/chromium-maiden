# 🚀 Quick Start Guide

## Installation (5 minutes)

### Step 1: Prepare Files
Ensure you have all files in `/extension` folder:
```
extension/
├── manifest.json
├── contentScript.js
├── background.js
├── popup.html
├── popup.js
├── styles.css
├── README.md
├── IMPLEMENTATION.md
└── utils/
    ├── domDetection.js
    └── apiClient.js
```

### Step 2: Load in Chrome

1. **Open Chrome Extensions Page**
   - Type `chrome://extensions/` in address bar
   - Or go to Menu (⋮) → More tools → Extensions

2. **Enable Developer Mode**
   - Toggle **Developer mode** (top-right corner)

3. **Load Unpacked Extension**
   - Click **Load unpacked**
   - Navigate to `/extension` folder
   - Click **Select Folder**

4. **Verify Installation**
   - Extension icon appears in Chrome toolbar
   - No errors in extension details page

### Step 3: Configure Settings

1. **Click Extension Icon**
   - Icon appears in toolbar (next to address bar)

2. **Configure Preferences**
   - Enable/disable features as needed
   - Set sensitivity level (start with "Medium")
   - Choose filter action (start with "Blur")
   - Verify platforms are enabled

3. **Test Settings**
   - Settings save immediately
   - Refresh page to apply changes

---

## First Run Test (2 minutes)

### Test Pre-Send Detection

1. **Go to Facebook/Instagram/Twitter**
   - Log in if needed
   - Navigate to a public post

2. **Open Comment Box**
   - Click comment field
   - Extension should be monitoring

3. **Type Safe Message**
   - Type: "Great post!"
   - Press Enter → Should send normally ✓

4. **Type Hateful Message**
   - Type: "I hate all people"
   - Press Enter → Modal should appear ✓
   - Click "Rewrite" → Suggestion appears ✓
   - Click "Accept & Send" → Rewritten message sent ✓

### Test Incoming Filtering

1. **Set Sensitivity to High**
   - Open extension popup
   - Change sensitivity to "High"

2. **Set Filter to Blur**
   - Change "Filter Action" to "Blur"

3. **Refresh Page**
   - Comments with harsh language appear blurred
   - Click to reveal (if any present)

4. **Try Other Filter Actions**
   - Change to "Hide" → Hateful content hides with reveal button
   - Change to "Warn" → Warning banner appears above content

---

## Usage Examples

### Example 1: Blocking Hateful Reply

```
User types: "You are stupid and should die"
         ↓
Extension detects hate (99% confidence)
         ↓
Modal appears:
  ⚠️ "This message may be interpreted as threat"
  Original: "You are stupid and should die"
         ↓
User clicks "Rewrite Respectfully"
         ↓
Suggestion: "I respectfully disagree with your approach"
         ↓
User clicks "Accept & Send"
         ↓
Rewritten message sends
```

### Example 2: Protecting from Hate Comments

```
Sensitive user views Facebook feed
         ↓
Comment with slur appears
         ↓
Extension detects hate (95% confidence)
         ↓
Content is blurred (sensitivity: medium)
         ↓
User sees:
  "⚠️ [blurred content] Click to reveal"
         ↓
User can choose to:
  • Leave it blurred
  • Click to read
  • Report (manual action)
```

---

## Common Issues & Solutions

### Issue: Extension Not Detecting Inputs

**Solution:**
1. Open DevTools (F12)
2. Go to Console tab
3. Paste: `getEditableElements().length`
4. If returns 0, the platform selectors need updating
5. Contact support with platform name

### Issue: Modal Not Appearing

**Solution:**
1. Check extension is enabled in `chrome://extensions/`
2. Verify Feature 1 is toggled ON in popup
3. Try writing obvious hate speech: "I hate all people"
4. If still not working, clear extension cache:
   - Open popup → Debug section → "Clear Cache"
   - Refresh page

### Issue: Settings Not Saving

**Solution:**
1. Verify you're clicking on the setting element
2. Check browser allows chrome.storage.sync:
   - Settings → Privacy → Clear browsing data → Cookies/cache
   - Restart Chrome
3. Try resetting to defaults:
   - Open popup → Debug → "Reset Settings"
   - Reconfigure

### Issue: High CPU Usage / Slow Page

**Solution:**
1. Lower sensitivity level (reduces scanning)
2. Disable Feature 2 if not needed
3. Reduce number of enabled platforms
4. Check that you have latest Chrome version

---

## Advanced Configuration

### Connecting Custom API

To use real hate detection API:

1. **Edit `utils/apiClient.js`:**
   - Replace `_localHateDetection()` method
   - Add your API endpoint
   - Add authentication (API key)

2. **Example with OpenAI:**
   ```javascript
   async _detectHateSpeechAPI(text) {
     const response = await fetch('https://api.openai.com/v1/moderations', {
       method: 'POST',
       headers: {
         'Authorization': `Bearer YOUR_API_KEY`,
         'Content-Type': 'application/json'
       },
       body: JSON.stringify({ input: text })
     });
     const data = await response.json();
     return {
       is_hate: data.results[0].flagged,
       confidence: data.results[0].category_scores.hate,
       category: 'harassment'
     };
   }
   ```

3. **Reload Extension:**
   - Go to `chrome://extensions/`
   - Click reload (circular arrow)

### Customizing Hate Patterns

To add custom keywords:

1. **Edit `utils/apiClient.js`:**
   - Modify `hatePatterns` object
   - Add new regex patterns
   - Test with sample text

2. **Example:**
   ```javascript
   const hatePatterns = {
     slur: [
       /your-custom-pattern/gi,
       /another-pattern/gi
     ]
   };
   ```

---

## Testing Checklist

- [ ] Extension icon visible in toolbar
- [ ] Popup opens and shows settings
- [ ] Both features toggle on/off
- [ ] Settings persist after refresh
- [ ] Feature 1 blocks obvious hate speech
- [ ] Feature 1 allows normal messages
- [ ] Feature 1 rewrite works
- [ ] Feature 2 filters incoming hate
- [ ] Sensitivity levels work correctly
- [ ] Filter actions (blur/hide/warn) work
- [ ] No console errors (F12)
- [ ] Cache clear button works
- [ ] Reset settings button works
- [ ] Works on at least one platform

---

## Getting Help

### Debug Information to Collect

If experiencing issues:

1. **Screenshot of Problem**
   - Copy as image

2. **Console Errors (F12 → Console)**
   - Right-click → Save as → errors.txt

3. **Extension Details**
   - Extension version: See popup
   - Chrome version: Menu → About Chrome
   - Platform: Facebook/Instagram/Twitter

4. **Steps to Reproduce**
   - Exact message that triggered issue
   - Settings configuration
   - Platform and URL

### Support Resources

- 📖 **README.md** - Full feature documentation
- 🔧 **IMPLEMENTATION.md** - Technical deep dive
- 💬 **Comment section** - Share feedback
- 🐛 **Issues tab** - Report bugs (if on GitHub)

---

## Pro Tips

✨ **Tip 1: Keyboard Shortcut**
- Pin extension icon for quick access
- Click icon to quickly change settings

✨ **Tip 2: Sensitivity Tuning**
- Start with "Medium" for balanced filtering
- Switch to "High" if you see too many false negatives
- Switch to "Low" if too many false positives

✨ **Tip 3: Filter Action Strategy**
- **Blur** - Good for casual browsing (content still readable by clicking)
- **Hide** - Best for sensitive users (must click to see)
- **Warn** - Good for awareness without hiding

✨ **Tip 4: Multiple Accounts**
- Extension settings sync across all Chrome profiles
- Use different profiles for different sensitivity levels

✨ **Tip 5: Performance**
- Disable Feature 2 if only using Feature 1
- Disable platforms you don't use
- Clear cache weekly

---

## Next Steps

1. ✅ **Install Extension** - Follow steps above
2. ✅ **Test Basic Features** - Try examples in this guide
3. ⬜ **Configure API** - Connect real hate detection service
4. ⬜ **Customize Patterns** - Add your specific keywords
5. ⬜ **Deploy Widely** - Share with colleagues/friends
6. ⬜ **Gather Feedback** - Improve based on real usage

---

**Version:** 1.0.0  
**Last Updated:** February 2026  
**Support:** See README.md for contact info
