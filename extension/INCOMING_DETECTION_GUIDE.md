# Incoming Content Detection & Flagging Guide

## 🎯 Overview

The extension now detects and filters incoming DMs, comments, and posts on Facebook and Instagram with intelligent blur overlays and user flagging capabilities.

---

## 🔍 Detection Features

### **Facebook Detection**
- **DMs**: Detects messages using `chat-outgoing-message-bubble` and `chat-incoming-message-bubble` classes
- **Comments**: Detects comments with `aria-label="Comment by"`
- **Posts**: Detects posts in feed using `[data-pagelet="FeedUnit"]` and `[role="article"]`

### **Instagram Detection**
- **DMs**: Detects conversations with `aria-label="Conversation with"`
- **Messages**: Detects individual messages in chat threads
- **Comments**: Detects comment elements throughout the platform

### **Twitter/X Detection**
- **Tweets**: Detects tweets and text content using `data-testid="tweet"` and `data-testid="tweetText"`

---

## 🚨 Blur Overlay System

When potentially harmful content is detected:

1. **Content is blurred** - Makes text unreadable
2. **Warning overlay appears** with:
   - ⚠️ Icon and warning message
   - Content category (if detected)
   - Two action buttons

### **Overlay Actions**

#### 👁️ Show Content
- Removes blur effect
- Reveals the content
- Adds a small "⚠️ Flagged Content" badge
- Content remains visible but marked

#### 🗑️ Remove
- Completely removes the content from view
- Replaces with placeholder: "🗑️ Content removed by you"
- Cannot be undone

---

## 🚩 Manual Flagging System

### **Activating Flag Mode**

**Keyboard Shortcut**: `Ctrl + Shift + F`

When activated:
- Notification appears: "🚩 Flag Mode Active - Click any content to flag it"
- Cursor changes to crosshair
- Any content becomes clickable for flagging

### **Flagging Content**

1. Press `Ctrl + Shift + F` to activate flag mode
2. Click on any comment, post, or message
3. Select from flag options:
   - 😡 **Hate Speech**
   - 🤬 **Offensive Language**
   - 👿 **Harassment**
   - 😰 **Makes Me Uncomfortable**
   - ❌ Cancel

4. Content is marked with:
   - Red border around the element
   - "🚩 Flagged: [Type]" banner at the top
   - Light red background

### **Flagging Detection**

The system intelligently finds flaggable elements:
- Comments with `aria-label*="Comment by"`
- Conversations with `aria-label*="Conversation with"`
- Message elements
- Articles and posts
- Tweet elements

---

## ⚙️ Configuration

### **Current Settings**
- `feature2Enabled`: Controls incoming content filtering
- Detection runs every 3 seconds for new content
- Mutations are monitored in real-time

### **To Enable/Disable**
Toggle "Feature 2" in the extension popup settings

---

## 🔧 For Developers

### **API Integration Placeholder**

The detection currently uses a placeholder function:

```javascript
function simulateHateDetection(text) {
  // TODO: Replace with actual API call
  // Currently returns false to prevent blurring everything
  return false;
}
```

### **To Integrate Your API**

Replace `simulateHateDetection` in `filterHateContent()`:

```javascript
async function filterHateContent() {
  const messageElements = getMessageElements();
  
  for (const element of messageElements) {
    if (element.__hateFiltered) continue;
    
    const text = element.textContent;
    if (!text || text.trim().length === 0) continue;
    if (text.length > 10000) continue;

    try {
      // YOUR API CALL HERE
      const result = await yourApiClient.detectHate(text);
      
      if (result.isHate && result.confidence > threshold) {
        applyBlurOverlay(element, {
          category: result.category,
          confidence: result.confidence
        });
        element.__hateFiltered = true;
      }
    } catch (error) {
      console.error('Detection error:', error);
    }
  }
}
```

### **Flagged Content Storage**

Flagged elements are stored in:
- `flaggedElements` Set
- Each element has properties:
  - `__flagType`: Type of flag
  - `__flagLabel`: Display label
  - `__flagTimestamp`: When flagged

To sync with backend, add API call in `flagElement()` function.

---

## 📊 Logging

All detection activity is logged with prefixes:
- `🔍 [HATE-DETECT]` - Detection scanning
- `⚠️ [HATE-DETECT]` - Harmful content found
- `🚨 [HATE-DETECT]` - Blur overlay applied
- `🚩 [HATE-DETECT]` - Flagging actions
- `👁️ [HATE-DETECT]` - Content revealed
- `🗑️ [HATE-DETECT]` - Content removed

Check browser console (F12) for detailed logs.

---

## 🎨 Styling

All styles are injected via `injectIndicatorStyles()` including:
- `.hate-content-blurred` - Blur effect
- `.hate-content-overlay` - Warning overlay
- `.hate-flag-mode` - Flagging highlight
- `.hate-user-flagged` - Flagged content border
- `.hate-flagged-banner` - Flag label badge

Styles use `!important` to ensure they work across different platforms.

---

## 🧪 Testing

1. **Test Detection**:
   - Navigate to Facebook or Instagram
   - Open console and check for scanning logs
   - Look for: "📨 [HATE-DETECT] Scanning X potential content items..."

2. **Test Flagging**:
   - Press `Ctrl + Shift + F`
   - Click on any comment
   - Verify menu appears
   - Select flag type
   - Confirm visual feedback

3. **Test Blur (when API integrated)**:
   - Change `simulateHateDetection` to return `true`
   - Reload page
   - Content should be blurred
   - Test Show/Remove buttons

---

## 🐛 Troubleshooting

### No content detected?
- Check console for "Found 0" messages
- Platform might use different selectors
- Try refreshing the page

### Flag mode not working?
- Ensure Feature 2 is enabled
- Check if `Ctrl + Shift + F` conflicts with browser shortcuts
- Look for console errors

### Blur not applying?
- Check if `simulateHateDetection` returns true
- Verify element has proper parent structure
- Check if CSS styles are injected

---

## 📝 Next Steps

1. **Integrate your hate detection API** in `filterHateContent()`
2. **Add backend storage** for flagged content
3. **Customize detection thresholds** per user preferences
4. **Add reporting functionality** for flagged content
5. **Create admin dashboard** to review flags

---

## 💡 Tips

- Use flag mode to manually test before API integration
- Monitor console logs to see what content is being detected
- Adjust selectors if platform UI changes
- Test on different types of content (DMs, posts, comments)

---

**Need help?** Check the console logs or run `hateDetectDebug()` in the browser console for detailed diagnostics.
