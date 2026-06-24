# Chromium Maiden Design System

## Direction

A compact protective tool for a quick browser-toolbar glance. The visual scene is a user checking their feed in normal ambient light, so the interface uses warm paper surfaces, dark plum-tinted ink, and a restrained muted-plum accent. Personality comes from concise copy and a small maiden portrait, not decoration.

## Color

- Ink: `oklch(24% 0.018 305)`
- Muted text: `oklch(50% 0.024 305)`
- Paper: `oklch(97% 0.009 88)`
- Raised surface: `oklch(99% 0.006 88)`
- Border: `oklch(86% 0.016 305)`
- Accent: `oklch(48% 0.095 322)`
- Accent soft: `oklch(93% 0.028 322)`
- Positive: `oklch(57% 0.105 152)`
- Caution: `oklch(68% 0.115 72)`
- Danger: `oklch(57% 0.135 25)`

Use the accent for enabled controls, focus, links, and Chromium Maiden identity only. Use semantic colors for actual status. Do not use gradients, pure black, pure white, glass effects, or decorative glow.

## Typography

Use the native system stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`.

- Popup title: 17px, 680 weight, 1.22 line height
- Section heading: 12px, 720 weight
- Control title: 12px, 660 weight
- Body and descriptions: 11px to 13px
- Eyebrow and field label: 10px, uppercase, 0.07em to 0.09em tracking

Keep copy short. Chromium Maiden may use restrained dry wit, but never jokes about people being harmed.

## Layout

- Popup width: 372px
- Outer padding: 18px
- Primary vertical rhythm: 13px, 17px, and 18px
- Control rows: 58px to 62px minimum height
- Corners: 7px for small controls, 9px for status, 12px for identity and floating panels
- Dividers organize related controls. Avoid wrapping every section in a card.

## Components

### Status strip

One bordered, tinted row with a semantic dot, direct status text, and a quiet companion note. Partial and disabled states change both copy and color.

### Setting row

Left-aligned title and explanation with a familiar toggle on the right. The full row is clickable. Toggles use a 36 by 21 pixel track.

### Select

Native select behavior in a 112 by 32 pixel control with a subtle border and 8px radius.

### Platform choice

Compact checkboxes presented as labeled pills. Selected state uses the soft accent surface and accent text.

### Incoming shield

The content receives an immediate low blur while classification is pending. Confirmed harmful content uses the configured blur, hide, or warn treatment. A fixed portal control provides reveal and re-shield actions without restructuring the host site's DOM.

### Outgoing intervention

Use an anchored panel near the composer, never a page-blocking modal. Show the category, score, reason, rewrite options, a keep-editing action, and a quiet override.

## Motion

Use 160ms to 180ms ease-out transitions only for state changes. Do not animate layout. Honor `prefers-reduced-motion` by removing transitions.

## Mascot

Use the maiden portrait once per surface at a small size. Reduce saturation slightly so it belongs to the restrained interface. Do not add coins, shops, bouncing rewards, or mascot interruptions unrelated to moderation.
