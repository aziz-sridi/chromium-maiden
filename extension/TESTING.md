# 🧪 Testing Scenarios & QA Guide

## Pre-Installation Checklist

- [ ] Chrome browser installed (latest version)
- [ ] Developer mode enabled in `chrome://extensions/`
- [ ] All files present in `/extension` folder
- [ ] No syntax errors in JavaScript files
- [ ] manifest.json is valid JSON

---

## Test Scenario 1: Installation & Setup

### Objective
Verify extension loads correctly without errors

### Steps

1. **Load Extension**
   - Navigate to `chrome://extensions/`
   - Click "Load unpacked"
   - Select `/extension` folder
   - ✓ Extension appears in list

2. **Verify Icon**
   - Extension icon visible in Chrome toolbar
   - ✓ Click icon → Popup opens
   - ✓ Popup shows "Hate Prevention" header

3. **Check Console**
   - Open DevTools (F12)
   - Go to Extensions tab
   - Select this extension
   - ✓ No red error messages

4. **Expected Result**
   - ✓ Extension loads without errors
   - ✓ Popup opens and displays settings
   - ✓ Settings show default values:
     - Feature 1: ON
     - Feature 2: ON
     - Sensitivity: Medium
     - Filter: Blur

---

## Test Scenario 2: Feature 1 - Allow Normal Messages

### Objective
Verify safe messages are sent normally

### Test Platform: Facebook

1. **Navigate to Facebook**
   - Open https://www.facebook.com/
   - Log in if needed

2. **Create Comment**
   - Click on any post's comment box
   - Type: "Great post, thanks for sharing!"
   - Press Enter

3. **Expected Result**
   - ✓ No modal appears
   - ✓ Comment sends immediately
   - ✓ Comment visible on feed
   - ✓ Extension did not interfere

### Test Platform: Instagram

1. **Navigate to Instagram**
   - Open https://www.instagram.com/
   - Find any post

2. **Create Comment**
   - Click comment field
   - Type: "Love this! 😍"
   - Press Enter

3. **Expected Result**
   - ✓ No modal appears
   - ✓ Comment sends
   - ✓ Works same as Facebook

### Test Platform: X/Twitter

1. **Navigate to X (Twitter)**
   - Open https://www.x.com/ or https://www.twitter.com/
   - Find any tweet

2. **Reply to Tweet**
   - Click reply field
   - Type: "Interesting perspective!"
   - Press Ctrl+Enter (or use Send button)

3. **Expected Result**
   - ✓ No modal appears
   - ✓ Reply sends
   - ✓ Works same as other platforms

---

## Test Scenario 3: Feature 1 - Block Hateful Messages

### Objective
Verify hate detection blocks messages and shows modal

### Setup
- All platforms enabled
- Sensitivity: Medium
- Filter: (not relevant for pre-send)

### Test 1: Category - Harassment

1. **Navigate to Facebook**

2. **Open Comment Box**
   - Click comment field

3. **Type Hateful Message**
   - Type: "You are stupid and dumb"

4. **Attempt Send**
   - Press Enter

5. **Expected Result**
   - ✓ Modal appears (does NOT send)
   - ✓ Modal shows:
     - Warning icon ⚠️
     - Message: "This message may be interpreted as harassment"
     - Confidence bar showing ~75%
     - Preview of original message
   - ✓ Three buttons visible:
     - Cancel
     - Rewrite Respectfully
     - Send Anyway

### Test 2: Category - Threat

1. **Navigate to Instagram**

2. **Open DM Composer**
   - Click on DM input field

3. **Type Threat**
   - Type: "I will hurt you"

4. **Attempt Send**
   - Press Enter or click Send

5. **Expected Result**
   - ✓ Modal appears immediately
   - ✓ Shows "threat" category
   - ✓ Confidence ~95%
   - ✓ Blocks sending

### Test 3: Category - Slur

1. **Navigate to X/Twitter**

2. **Open Tweet Composer**
   - Click "What's happening?!"

3. **Type Slur**
   - Type: "I hate all [group]"

4. **Attempt Send**
   - Press Ctrl+Enter

5. **Expected Result**
   - ✓ Modal appears
   - ✓ Shows "slur" category
   - ✓ Confidence ~85%

---

## Test Scenario 4: Feature 1 - Rewriting

### Objective
Verify suggested rewrites work correctly

### Setup
- Same as Scenario 3

### Steps

1. **Trigger Detection Modal**
   - Type: "You should all die"
   - Press Enter
   - ✓ Modal appears

2. **Click "Rewrite Respectfully"**
   - Click "Rewrite Respectfully" button
   - ✓ Modal changes to loading state
   - ✓ "Rewriting your message respectfully..." shown
   - ✓ Spinner animates

3. **View Suggestion**
   - ✓ Modal shows:
     - Original: "You should all die"
     - Arrow (→)
     - Rewritten: "You should reconsider"
   - ✓ Rewritten text in editable textarea
   - ✓ User can modify if desired

4. **Accept Rewrite**
   - Click "Accept & Send"
   - ✓ Modal closes
   - ✓ Message appears in editor with rewritten text
   - ✓ User can verify/send
   - ✓ When sent, rewritten version sent

5. **Alternative: Edit More**
   - Go back to step 2
   - After seeing suggestion, click "Edit More"
   - ✓ Textarea focuses and text selected
   - ✓ User can modify suggestion
   - ✓ Edit text manually
   - Click "Accept & Send"
   - ✓ Custom version sends

6. **Alternative: Cancel**
   - Go back to step 2
   - Click "Cancel" button
   - ✓ Modal closes
   - ✓ Message stays in editor (unchanged)
   - ✓ Original message still there

---

## Test Scenario 5: Feature 1 - Send Anyway

### Objective
Verify users can override detection if needed

### Setup
- Feature 1: Enabled
- Sensitivity: Medium

### Steps

1. **Trigger Detection Modal**
   - Type hateful message
   - Press Enter
   - ✓ Modal appears

2. **Click "Send Anyway"**
   - ✓ Modal closes immediately
   - ✓ Message sends as-is
   - ✓ No additional warnings

3. **Expected Result**
   - ✓ User retains control
   - ✓ Extension is protective but not restrictive
   - ✓ Freedom of expression preserved

---

## Test Scenario 6: Feature 1 - Keyboard Input

### Objective
Verify different keyboard combinations work

### Setup
- Facebook or Instagram
- Normal message in editor

### Test 1: Enter Key (Platform Dependent)

1. **Type normal message**
   - "Hello world"

2. **Press Enter**
   - Behavior varies by platform:
     - Facebook: Might create new line
     - Twitter: Sends tweet
     - Instagram: Might create new line

3. **Expected Result**
   - ✓ Extension intercepts if it's a send action
   - ✓ If just newline, doesn't block

### Test 2: Ctrl+Enter

1. **Type normal message**
   - "Hello world"

2. **Press Ctrl+Enter**
   - ✓ Intercepted by extension
   - ✓ Should go through normal flow

### Test 3: Cmd+Enter (Mac)

1. **Repeat Test 2 on Mac**
   - ✓ Works same as Ctrl+Enter

---

## Test Scenario 7: Feature 2 - Incoming Filtering

### Objective
Verify hateful comments are filtered

### Setup
- Feature 2: Enabled
- Sensitivity: Medium
- Filter Action: Blur

### Preparation

Find or create hateful comments (or use test accounts)

### Test 1: Blur Filter

1. **Navigate to Facebook Feed**
   - Scroll through posts
   - Find comment with hate speech
   - OR manually write hateful test comment

2. **Observe Filtering**
   - ✓ If hateful: content appears blurred
   - ✓ Opacity reduced
   - ✓ Text unreadable

3. **Click to Reveal**
   - Click on blurred comment
   - ✓ Blur removed
   - ✓ Content becomes visible
   - ✓ Text now readable

4. **Click Again**
   - Click on revealed comment
   - ✓ Blur reapplies
   - ✓ Content hidden again

### Test 2: Hide Filter

1. **Change Filter Action**
   - Open extension popup
   - Change "Filter Action" to "Hide"
   - Refresh Facebook page

2. **Observe Filtering**
   - ✓ Hateful comments disappear
   - ✓ Replaced with warning box:
     ```
     ⚠️ This content was hidden due to harmful language
     [Show anyway]
     ```

3. **Click Show Anyway**
   - ✓ Warning disappears
   - ✓ Comment becomes visible
   - ✓ Stays visible until refresh

### Test 3: Warn Filter

1. **Change Filter Action**
   - Change to "Warn"
   - Refresh page

2. **Observe Filtering**
   - ✓ Comments remain visible
   - ✓ Warning banner appears above:
     ```
     ⚠️ This message contains harassment language
     ```

3. **Expected Result**
   - ✓ User informed but not blocked
   - ✓ Content still readable

---

## Test Scenario 8: Sensitivity Levels

### Objective
Verify sensitivity affects filtering

### Setup
- Feature 2: Enabled
- Filter: Blur

### Test 1: Low Sensitivity (80% threshold)

1. **Set to Low**
   - Open popup
   - Change Sensitivity to "Low"
   - Refresh page

2. **Behavior**
   - ✓ Only very obvious hate filtered
   - ✓ Few false positives
   - ✓ Some hateful content passes through

3. **Test Message**
   - Type: "You are not very smart" (borderline)
   - ✓ Should NOT be filtered (< 80%)

### Test 2: Medium Sensitivity (60% threshold)

1. **Set to Medium**
   - Change Sensitivity to "Medium"
   - Refresh page

2. **Behavior**
   - ✓ Balanced filtering
   - ✓ Most obvious hate caught
   - ✓ Some ambiguous content filtered

3. **Test Message**
   - Type: "You are stupid" (moderate)
   - ✓ Should be filtered (~70%)

### Test 3: High Sensitivity (40% threshold)

1. **Set to High**
   - Change Sensitivity to "High"
   - Refresh page

2. **Behavior**
   - ✓ Aggressive filtering
   - ✓ Catches borderline content
   - ✓ Possible false positives

3. **Test Message**
   - Type: "You should reconsider" (mild/neutral)
   - ✓ Might be filtered (if confidence > 40%)

---

## Test Scenario 9: Settings Persistence

### Objective
Verify settings save and persist across sessions

### Steps

1. **Change Settings**
   - Open extension popup
   - Toggle Feature 1 OFF
   - Set Sensitivity to High
   - Change Filter to Hide
   - Uncheck Instagram

2. **Close Popup**
   - Click X or anywhere outside

3. **Reopen Popup**
   - Click extension icon again
   - ✓ All settings preserved:
     - Feature 1: OFF
     - Sensitivity: High
     - Filter: Hide
     - Instagram: Unchecked

4. **Refresh Page**
   - Press F5 on current page
   - ✓ Settings still applied

5. **Close & Reopen Chrome**
   - Close entire Chrome window
   - Reopen Chrome
   - ✓ Settings still persist
   - ✓ Synced to account if signed in

---

## Test Scenario 10: Cache & Performance

### Objective
Verify caching works and improves performance

### Setup
- Extension running
- Open DevTools (F12)

### Steps

1. **First Analysis (Cache Miss)**
   - Type: "I hate all people"
   - Press Enter
   - ✓ Modal appears
   - ✓ Latency: ~100-150ms (API call)

2. **Second Analysis (Cache Hit)**
   - Close modal (don't send)
   - Type same message again
   - Press Enter
   - ✓ Modal appears faster
   - ✓ Latency: ~20-50ms (from cache)

3. **Check Cache Stats**
   - Open extension popup
   - Debug section shows:
     ```
     Cache size: 1/100
     ```
   - ✓ Same message reused

4. **Clear Cache**
   - Click "Clear Cache" button
   - ✓ Notification appears
   - Cache resets to 0/100

---

## Test Scenario 11: Multi-Platform Testing

### Objective
Verify extension works on all supported platforms

### Test Platforms in Parallel

| Platform | Feature 1 | Feature 2 | Notes |
|----------|-----------|-----------|-------|
| Facebook | ✓ Test | ✓ Test | Comments, DMs |
| Instagram | ✓ Test | ✓ Test | Comments, DMs |
| X/Twitter | ✓ Test | ✓ Test | Tweets, Replies |

### Each Platform

- [ ] Feature 1 blocks hate speech in comments
- [ ] Feature 1 allows normal messages
- [ ] Feature 1 rewriting works
- [ ] Feature 2 filters incoming hate
- [ ] All filter actions work
- [ ] Settings apply correctly

---

## Test Scenario 12: Error Handling

### Objective
Verify graceful handling of errors

### Test 1: Very Long Message

1. **Create Long Message**
   - Paste 15KB+ of text
   - Press Enter
   - ✓ Should skip analysis (> 10KB limit)
   - ✓ Message sends normally

### Test 2: Empty Message

1. **Press Send on Empty**
   - Empty comment field
   - Press Enter
   - ✓ Nothing happens (no analysis)

### Test 3: Special Characters

1. **Type with Emoji/Unicode**
   - Type: "You are 🔥🔥🔥 bad 😂"
   - Press Enter
   - ✓ Analyzes correctly
   - ✓ Handles emoji gracefully

### Test 4: Very Fast Typing

1. **Rapid Fire Messages**
   - Type many messages quickly
   - Press Enter multiple times
   - ✓ No crashes
   - ✓ Each analyzed independently
   - ✓ No race conditions

---

## Test Scenario 13: Accessibility

### Objective
Verify extension works for accessibility standards

### Steps

1. **Keyboard Navigation**
   - Don't use mouse
   - Tab through modal elements
   - ✓ All buttons reachable via Tab
   - ✓ Can press Enter/Space to activate

2. **Screen Reader (NVDA/JAWS)**
   - Enable screen reader
   - Extension should read:
     - ✓ Modal title
     - ✓ Message content
     - ✓ Button labels
     - ✓ Settings labels

3. **High Contrast Mode**
   - Enable high contrast in Windows
   - Extension should remain readable
   - ✓ Colors still distinguishable
   - ✓ Text still visible

---

## Test Scenario 14: Uninstall & Reinstall

### Objective
Verify clean installation and removal

### Steps

1. **Uninstall**
   - Go to `chrome://extensions/`
   - Click Remove button
   - ✓ Extension removed
   - ✓ Icon disappears from toolbar
   - ✓ No remnant files

2. **Reinstall**
   - Load unpacked again
   - Select `/extension` folder
   - ✓ Extension loads
   - ✓ Default settings apply
   - ✓ Works same as first time

---

## Regression Testing Checklist

### Before Each Release

- [ ] Feature 1 detects hate speech
- [ ] Feature 1 allows normal messages
- [ ] Feature 1 rewriting works
- [ ] Feature 2 filters incoming hate
- [ ] All filter actions work (blur/hide/warn)
- [ ] All sensitivity levels work
- [ ] Settings persist after refresh
- [ ] Settings persist after restart
- [ ] No console errors
- [ ] No performance degradation
- [ ] Works on all 3 platforms
- [ ] Accessibility standards met
- [ ] Cache working
- [ ] Error handling graceful

---

## Known Issues & Workarounds

| Issue | Cause | Workaround |
|-------|-------|-----------|
| Modal doesn't appear | Platform selector changed | Update selector in domDetection.js |
| Filtering too aggressive | High sensitivity | Lower sensitivity level |
| Settings reset | Storage error | Clear Chrome cache, retry |
| Slow detection | Cache full, API slow | Clear cache, check API |

---

## Performance Benchmarks

### Target Metrics

| Metric | Target | Status |
|--------|--------|--------|
| Detection latency | < 200ms | ✓ |
| Rewrite latency | < 300ms | ✓ |
| Memory usage | < 20MB | ✓ |
| CPU usage | < 5% | ✓ |
| Page load impact | < 100ms | ✓ |

---

**Last Updated:** February 2026  
**Test Date:** [Fill in date]  
**Tester:** [Your name]  
**Status:** ✓ Pass / ⚠ Partial / ✗ Fail
