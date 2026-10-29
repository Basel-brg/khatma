# Khatma Design System & Visual Direction
<!-- impeccable:visual-system seed: f0b78796 -->

## 1. Visual Metaphor: Illuminated Mushaf Folio (مصحف مذهب)

Khatma balances reverence for the Sacred Text with the fluid immediacy of modern mobile group coordination. Its aesthetic is rooted in classical Islamic manuscript craftsmanship (Andalusian and Ottoman illuminated folios), translated into high-precision, tactile digital interactions.

- **Parchment Surface:** A warm, unbleached manuscript paper ground (`#FBF8F3`) prevents glare during night or daylight reading, evoking hand-milled rag paper.
- **Folio Card Architecture:** Crisp white surfaces (`#FFFFFF`) bound by refined parchment borders (`#E6DEC8`) provide structure without sterile corporate minimalism.
- **Deep Emerald Ink:** Andalusian deep cypress/emerald ink (`#0F2922`) replaces harsh pitch black, offering gentle contrast and deep dignity.
- **Illuminated Gold:** Muted warm gold (`#B48327`) provides illumination on active cards, badges, and ornamental dividers without becoming garish.

---

## 2. Color Palette & Semantic Tokens

| Token | Hex Value | Semantic Purpose |
| :--- | :--- | :--- |
| `--color-parchment` | `#FBF8F3` | App viewport background, warm archival ground |
| `--color-parchment-deep` | `#F4EFE6` | Secondary panel backgrounds, subtle surface recesses |
| `--color-card-bg` | `#FFFFFF` | Primary folio cards and sheet content |
| `--color-card-border` | `#E6DEC8` | Manuscript framing borders, delicate dividers |
| `--color-ink` | `#0F2922` | Primary typography, titles, high-contrast headings |
| `--color-ink-muted` | `#4A5D54` | Secondary text, subtitles, ayah meta info |
| `--color-ink-faint` | `#7D9087` | Tertiary timestamps, hints, decorative motifs |
| `--color-gold` | `#B48327` | Illuminated accents, primary action highlights |
| `--color-gold-light` | `#FDF6E7` | Active chip backgrounds, illuminated badges |
| `--color-gold-border` | `#E8D39E` | Gold accent borders and active rings |
| `--color-seal-emerald` | `#15803D` | Completed Juz' seal, verified progress badges |
| `--color-seal-emerald-light` | `#ECFDF5` | Completed card background tint |
| `--color-seal-emerald-border` | `#A7F3D0` | Completed card subtle frame |
| `--color-reserved-amber` | `#B45309` | Reserved / in-progress reading status |
| `--color-reserved-amber-light` | `#FFFBEB` | Reserved card background tint |
| `--color-reserved-amber-border` | `#FDE68A` | Reserved card frame |

---

## 3. Typography Hierarchy

### Fonts
1. **UI & Control Typography:** `IBM Plex Sans Arabic` (`var(--font-sans)`)
   - Weights: `400` (Regular), `500` (Medium), `600` (SemiBold), `700` (Bold)
   - Characteristics: Clean geometric legibility on small phone screens, clear distinctions between Arabic letter variations, balanced x-height.
   - Numerals: Always render with `tabular-nums` for Juz' counts, dates, and ayah indexes.

2. **Sacred Script & Classical Headings:** `Amiri` (`var(--font-quran)`)
   - Weights: `400` (Regular), `700` (Bold)
   - Characteristics: Naskh typographic lineage optimized for Uthmani Quranic text, traditional Surah banner titles, and dignified hero calligraphy.

### Scale & Spacing
- **Hero Title:** `clamp(1.75rem, 5vw, 2.5rem)` / line-height: `1.3` (`Amiri`)
- **Card Heading:** `1.125rem (18px)` / line-height: `1.4` (`IBM Plex Sans Arabic`, `600`)
- **Body & Controls:** `0.9375rem (15px)` / line-height: `1.5` (`IBM Plex Sans Arabic`, `400` & `500`)
- **Subtext / Badges:** `0.8125rem (13px)` / line-height: `1.3` (`IBM Plex Sans Arabic`, `500`)

---

## 4. Tactile Motion & Interaction (`emil-design-eng`)

Every interaction is physically grounded and tuned for Arabic RTL touch patterns.

### Easing Physics
```css
:root {
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
}
```

### Motion Rules
1. **Never use `transition: all` or `ease-in`:** Every animated property is explicitly declared (`transform`, `opacity`, `background-color`, `border-color`, `box-shadow`).
2. **Tactile Tap Feedback:** Every interactive button, chip, and card depresses physically:
   ```css
   :active {
     transform: scale(0.97);
     transition: transform 140ms var(--ease-out);
   }
   ```
3. **Hardware Acceleration:** All transform/opacity animations run on the compositor thread (`transform: translateZ(0)`).
4. **Pointer Gating:** Desktop `:hover` elevations and scale effects are gated strictly behind `@media (hover: hover) and (pointer: fine)` to avoid sticky hover states on mobile touchscreens.
5. **Reduced Motion:** When `prefers-reduced-motion: reduce` is detected, animations and transform transitions are replaced with instant 0.01ms visual transitions.

---

## 5. Mobile-First Layout Architecture

- **Root Direction:** `dir="rtl"` and `lang="ar"`.
- **Viewport Boundaries:** Max container width `480px` on mobile, scaling to `640px` on tablets/desktops with auto centering, preserving the intimate feel of holding a personal folio.
- **Form Sheets & Drawers:** High-velocity spring entrance from the bottom viewport edge with swipe-down dismiss handle and tactile backdrop blur (`backdrop-blur-sm`).
- **Touch Target Minimums:** All interactive chips, inputs, and CTA buttons maintain at least `44px × 44px` physical touch bounds with ample finger breathing room.
