# GreenDream Dark Glassmorphism Redesign Plan

**Status**: Step 0 Complete — Plan Formulated, Awaiting User Approval to Proceed to Phase 1  
**Target Platform**: Android APK (Capacitor) & Modern Web (Vite + React 18 + Tailwind CSS)  
**Supported Languages**: English (`en`), Français (`fr`), العربية (`ar` RTL)  
**Visual Paradigm**: Dark Glassmorphism with ONE Glowing Accent (Cyan / Lime / Violet / Rose)  

---

## 1. Executive Summary & Boundaries

This plan outlines the complete rebuilding of GreenDream's visual layer to match the dark glassmorphism interface reference: pure near-black glass surfaces, three static ambient background orbs, luminous neon glows, a floating glass bottom nav, a glowing "+" quick-add action, and a user-selectable accent system featuring 4 presets.

### 🛡️ Absolute Invariants (Hard Rules)
1. **Visual Layer Only**: No changes to business logic, calculation engines, features, data model, or navigation routing (`Today | Money | Prayer | Body | More` + floating `+` quick-add).
2. **Schema Integrity**: Existing data loads unchanged. One optional field added: `settings.accent?: 'cyan' | 'lime' | 'violet' | 'rose'` (default `'cyan'`). Legacy `matte-carbon` maps to dark glass.
3. **Pure CSS Variable Tokens**: Zero hardcoded hex or `rgba` accent values inside components. All colors derive from `--accent`, `--accent-light`, `--accent-rgb`, and `--on-accent`.
4. **Mobile-First & RTL Ergonomics**: Optimized for 360–430px widths, safe-area aware, tap targets $\ge 44\text{px}$, 100% offline self-hosted fonts (Inter & Noto Sans Arabic), and full logical RTL spacing (`ms-`, `me-`, `ps-`, `pe-`, `start`, `end`).
5. **Sentence Case & Typography Constraints**: Sentence case only (no uppercase tracking). Minimum text size $12\text{px}$. Font weights strictly $400$ (Regular) and $500$ (Medium).
6. **Semantic Exception (No Rainbow Errors)**: Normal UI has NO red or amber. "Over budget / limit exceeded" is represented in clean **WHITE** (dashed white ring with "!" and white-tinted chip). Destructive confirmation dialogs use a single `#FF6B6B` strictly for the delete button text.

---

## 2. Token Architecture & 4 Accent Presets

The active accent is controlled via `<html data-accent="cyan|lime|violet|rose">`.

### A. The 4 Presets
| Preset ID | Name | `--accent` | `--accent-light` | `--accent-rgb` | `--on-accent` |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`cyan`** *(default)* | Cyan glow | `#22C7F2` | `#A5EEFF` | `34 199 242` | `#04070A` |
| **`lime`** | Lime pulse | `#A6E34B` | `#DDF9A8` | `166 227 75` | `#04070A` |
| **`violet`** | Violet haze | `#A78BFA` | `#DDD1FF` | `167 139 250` | `#04070A` |
| **`rose`** | Rose ember | `#FF7A9C` | `#FFC2D2` | `255 122 156` | `#04070A` |

### B. Dark Glass Tokens (Default Mode)
- **Background**: `--bg: #04070A`
- **Text 1 (Primary)**: `--text-1: #FFFFFF`
- **Text 2 (Secondary)**: `--text-2: rgba(255, 255, 255, 0.68)`
- **Text 3 (Muted / Captions)**: `--text-3: rgba(255, 255, 255, 0.48)`
- **Track**: `--track: rgba(255, 255, 255, 0.10)` (empty part of rings, bars, gauges)
- **Hairline**: `--hairline: rgba(255, 255, 255, 0.13)`

### C. Light Theme Tokens
- **Background**: `--bg: #EEF4F6`
- **Glass Surfaces**: `rgba(255, 255, 255, 0.65)` with `backdrop-filter: blur(18px)` and 1px border `rgba(0, 0, 0, 0.06)`
- **Text 1 / 2 / 3**: `#0B1A1F` / `rgba(11, 26, 31, 0.66)` / `rgba(11, 26, 31, 0.46)`
- **Text & Stroke Accent**: Darkened version (mixed 25% with black) for contrast $\ge 4.5:1$ against white
- **Background Orbs**: Opacity reduced to `18%`

---

## 3. Glass Primitives Specification

### 1. Three Static Background Ambient Orbs (Every Screen)
Positioned in `src/App.tsx` behind the scrollable content canvas (`position: fixed`, `pointer-events: none`, `border-radius: 50%`, `filter: blur(60px)`):
- **Orb 1**: `200px × 200px`, `top: -50px`, `right: -60px`, `background: rgb(var(--accent-rgb))`, `opacity: 0.50` (or `0.18` in Light)
- **Orb 2**: `180px × 180px`, `top: 40%`, `left: -80px`, `background: rgb(var(--accent-rgb))`, `opacity: 0.32` (or `0.12` in Light)
- **Orb 3**: `220px × 220px`, `bottom: 60px`, `right: -70px`, `background: rgb(var(--accent-rgb))`, `opacity: 0.38` (or `0.14` in Light)
*Orbs are strictly static (no blur animation) for peak 60fps GPU performance.*

### 2. `GlassCard`
- **Background**: `linear-gradient(145deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.03))`
- **Backdrop Blur**: `backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);`
- **Border**: `1px solid rgba(255, 255, 255, 0.13)`
- **Box Shadow**: `inset 0 1px 0 rgba(255, 255, 255, 0.20), 0 10px 32px rgb(var(--accent-rgb) / 0.12)`
- **Radius**: `22px` | **Padding**: `16px` | **Gap**: `12px` between cards

### 3. `GlassChip` & `GlassTile`
- **Background**: `rgba(255, 255, 255, 0.07)`
- **Border**: `1px solid rgba(255, 255, 255, 0.14)`
- **Backdrop Blur**: `blur(10px)`
- **Radius**: `16px` for tiles, `9999px` for chips | **Padding**: `4px 11px` | Text: `12px`

### 4. `AccentChip`
- **Text**: `var(--accent-light)`
- **Background**: `rgb(var(--accent-rgb) / 0.14)`
- **Border**: `1px solid rgb(var(--accent-rgb) / 0.35)`
- **Box Shadow**: `0 0 14px rgb(var(--accent-rgb) / 0.25)`
- **Radius**: `9999px` | **Padding**: `4px 11px` | Text: `12px` font weight `500`

### 5. Form Elements, Controls & Dialogs
- **Primary Button**: `linear-gradient(135deg, var(--accent), var(--accent-light))`, text `var(--on-accent)`, glow `0 0 22px rgb(var(--accent-rgb) / 0.50)`, radius `14px`, height `48px`.
- **Secondary Button**: GlassChip style, radius `14px`, height `48px`.
- **Inputs & Selects**: Glass background (`rgba(255, 255, 255, 0.07)`), 1px border `rgba(255, 255, 255, 0.14)`, radius `14px`, height `48px`. Focus: border `rgb(var(--accent-rgb) / 0.70)` + glow `0 0 0 3px rgb(var(--accent-rgb) / 0.20)`.
- **Checkbox / Prayer Node**: `38px` circle (or `24px` in lists), background `rgb(var(--accent-rgb) / 0.16)`, border `1px solid rgb(var(--accent-rgb) / 0.50)`, glow `0 0 14px rgb(var(--accent-rgb) / 0.35)` + `inset 0 1px 0 rgba(255, 255, 255, 0.25)`.
- **Bottom Sheet / Dialog**: Glass with `blur(24px)`, top radius `28px`, handle `4px × 36px` in `rgba(255, 255, 255, 0.30)`, scrim `rgba(0, 0, 0, 0.55)`.
- **Performance Fallback**: Wrap blur in `@supports (backdrop-filter: blur(1px))`. Unsupported devices fall back to solid `rgba(16, 24, 28, 0.88)`. Maximum 2 overlapping blurred surfaces on screen at any time.

---

## 4. Navigation & Floating Action Button

### A. Floating Glass Nav Bar
- **Position**: `fixed`, `bottom: 10px`, `left: 10px`, `right: 10px`, `max-width: 480px`, `margin: 0 auto`
- **Height**: `62px` | **Radius**: `26px`
- **Surface**: Glass with `backdrop-filter: blur(20px)`, `border: 1px solid rgba(255, 255, 255, 0.15)`, `box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18), 0 10px 30px rgba(0, 0, 0, 0.50)`
- **5 Items**: Icon `18px` over label `12px`.
  - Inactive: `--text-3` (`rgba(255, 255, 255, 0.48)`)
  - Active: Icon enclosed in a `44px × 26px` pill (radius `13px`, background `rgb(var(--accent-rgb) / 0.20)`, border `1px solid rgb(var(--accent-rgb) / 0.45)`, glow `0 0 14px rgb(var(--accent-rgb) / 0.40)`). Icon and text render in `var(--accent-light)`.

### B. Floating Quick-Add (+) Button
- Exactly ONE `50px × 50px` circle.
- **Background**: `linear-gradient(135deg, var(--accent), var(--accent-light))`
- **Icon**: `var(--on-accent)` (`#04070A`), `24px`
- **Box Shadow**: `0 0 26px rgb(var(--accent-rgb) / 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.50)`
- **Placement**: `right: 20px`, `88px` above the screen bottom (sits cleanly above the nav bar).

---

## 5. Infographics Suite & White-Ceiling Rules

All charts use native, RTL-aware SVGs and derive colors strictly from CSS variables:

1. **`RingProgress`**:
   - Track: `var(--track)` (`rgba(255, 255, 255, 0.10)`)
   - Arc: Gradient `var(--accent)` $\rightarrow$ `var(--accent-light)` with round caps and `filter: drop-shadow(0 0 5px rgb(var(--accent-rgb) / 0.90))`
   - Hero Ring: `92px` box, $r = 38$, stroke $7$, centered number `24px` weight $500$
   - Mini Ring: `46px` box, $r = 18$, stroke $4$, label inside `12px`
2. **`PillBars` (Weekly)**:
   - Width: `24px`, radius `12px`, max height `72px`
   - Past/Current: `linear-gradient(var(--accent), rgb(var(--accent-rgb) / 0.55))` + glow `0 0 14px rgb(var(--accent-rgb) / 0.45)`
   - Today Bar: `linear-gradient(var(--accent-light), var(--accent))` + glow `0 0 22px rgb(var(--accent-rgb) / 0.90)`
   - Future Days: Empty glass pill at `24px` height
   - Goal Line: Dotted 1.5px `rgba(255, 255, 255, 0.28)` with small "Goal n" tag
   - Today Label: White circle with `--bg` colored text
3. **`Gauge` (Safe-to-Spend / Budget)**:
   - $180^\circ$ half-circle, stroke $12$, round caps, track `var(--track)`, progress accent gradient + glow
   - End tip: White circle $r = 8$ with accent stroke $3$ and drop-shadow glow
   - **White Ceiling Rule**: When limit exceeded, arc fills to 100%, chip turns white-tinted ("Over by X": background `rgba(255, 255, 255, 0.10)`, border `rgba(255, 255, 255, 0.35)`, text `#FFFFFF`), and mini-ring becomes a white dashed ring with "!".
4. **`PrayerTracker`**:
   - 5 columns. Done = completed glass circle with check.
   - Next Prayer = `38px` ring, $r = 16$, stroke $3$, accent countdown arc with opacity pulse $2.4\text{s}$ ($0.5 \leftrightarrow 1.0$) and glowing center dot. Name in `var(--accent-light)` weight $500$.
5. **`AreaCurve`**: Monotone cubic path, stroke accent gradient $2.5\text{px}$ with drop-shadow glow, area fill `linear-gradient(rgb(var(--accent-rgb) / 0.35) -> transparent)`, scrubber dot + vertical guide line + floating glass value chip.
6. **`TrendCompare`**: Prior period bars in `rgba(255, 255, 255, 0.18)`, recent period bars in accent with glow, + `AccentChip` delta with arrow icon.
7. **`CategoryBreakdown`**: Segmented thin ring or stacked pill bar using ONLY accent tints ($100\%, 70\%, 45\%, 25\%$) + white tints.
8. **`StreakMilestoneBadge`**: Hexagon glass fill, $1.5\text{px}$ accent-gradient outline, glow, simple line icon.

---

## 6. Motion Engine (Hardware-Accelerated 60fps)

- **Timing & Easing**: `cubic-bezier(0.22, 1, 0.36, 1)` for snappy enter; `requestAnimationFrame` for rolling numbers.
- **Card Entrance**: Fade + `translateY(8px -> 0)`, `500ms`, staggered by `80ms` per card.
- **Rings Draw-in**: `stroke-dashoffset` transition `1100ms`, delay `150ms`.
- **PillBars Grow**: `scaleY(0 -> 1)` from bottom, `700ms`, staggered by `60ms` starting at `300ms`.
- **Count-up Numbers**: Rolls over `900ms` with start delay `200ms`.
- **Tab Change**: `200ms` fade + 8px slide.
- **Bottom Sheet**: `300ms` spring slide-up.
- **Press Feedback**: `scale(0.97)`, `150ms`.
- **Continuous Loops Restricted**: Only next prayer countdown arc and perfect 10/10 score ring may gently loop. Everything else animates once on mount.
- **Reduced Motion**: Disables all animation instantly when `prefers-reduced-motion` is active.

---

## 7. Phased Implementation Roadmap

### Phase 1: Theme Engine and 4 Accent Presets
- Create token definition file in `src/index.css` and map in `tailwind.config.js`.
- Define `cyan`, `lime`, `violet`, and `rose` presets for `html[data-accent="..."]`.
- Update `src/services/themeService.ts` to manage `applyAccent(accent)` and `initAccent()`.
- Synchronize `<meta name="theme-color">` to `#04070A`.
- Add `accent?: AccentPreset` to `src/types/index.ts` in `AppSettings`.

### Phase 2: Glass Primitives & Background Orbs
- Implement 3 static ambient orbs in `src/App.tsx`.
- Create reusable components and utilities:
  - `src/components/glass/GlassCard.tsx`
  - `src/components/glass/GlassChip.tsx`
  - `src/components/glass/AccentChip.tsx`
- Build input, button, toggle, and checkbox styles matching exact glass specs.
- Configure `@supports (backdrop-filter: blur(1px))` fallback.

### Phase 3: Bottom Nav and Floating Quick-Add
- Rebuild `src/components/Navigation.tsx`:
  - Glass nav bar: `bottom: 10px`, `left: 10px`, `right: 10px`, height `62px`, radius `26px`.
  - Active tab 44x26 pill with accent glow and `var(--accent-light)`.
  - 50px circular gradient `+` button positioned 88px above bottom edge with `0 0 26px rgb(var(--accent-rgb)/.75)` glow.
- Update `src/components/AddActionSheet.tsx` to use glass modal styles with `blur(24px)` and radius `28px`.

### Phase 4: Infographic Components
- Update `RingProgress.tsx`, `PillBars.tsx`, `SafeToSpendGauge.tsx`, `PrayerTracker.tsx`, `AreaCurve.tsx`, `TrendCompare.tsx`, `CategoryBreakdown.tsx`, and `StreakMilestoneBadge.tsx` to strictly conform to the exact glassmorphism and white-ceiling rules.

### Phase 5: Motion Refinement
- Update `src/services/motion.ts` and `src/index.css` with exact durations (cards 500ms/80ms stagger, rings 1100ms, bars 700ms/60ms stagger, numbers 900ms).

### Phase 6: Apply Glass Primitives to Every Screen
- Rebuild **Today Screen** (`DashboardScreen.tsx`) to match reference layout:
  - Header: Date 12px, greeting 22px, glass avatar.
  - Hero GlassCard: 92px RingProgress, score 34px with glow, AccentChip, and 3 mini-ring tiles (Prayers, Limit, Discipline).
  - Daily Prayers card with 5-column PrayerTracker.
  - Weekly Score card with 7 PillBars and dotted goal line.
  - Spending card with SafeToSpendGauge and quick expense GlassChips.
- Apply glass primitives across all domain screens: **Money**, **Prayer**, **Body**, **More**, **Calendar**, **Journal**, **Maintenance**, **Weekly Review**, and **AI Assistant**.

### Phase 7: Settings > Accent Color Picker
- Update `src/screens/SettingsScreen.tsx`:
  - Add "Accent color" row with 4 round 44px glass swatches (Cyan glow, Lime pulse, Violet haze, Rose ember).
  - Selected swatch gets 2px `var(--accent-light)` outer ring + checkmark.
  - Instant live switching without reload + live preview GlassCard.
  - Add i18n keys to English, Français, and العربية dictionaries.

---

## 8. Risk Assessment & Mitigation

| Risk | Mitigation Strategy |
| :--- | :--- |
| **GPU Lag / Jitter on Mid-Range Android Phones** | Background orbs are strictly static (no animating blur). All glass cards use static CSS gradients with limited blur radii. Max 2 overlapping backdrop-filter layers. |
| **Text Contrast in Light Mode** | For Light mode, the accent color used for text/strokes is dynamically mixed 25% with black to guarantee $\ge 4.5:1$ contrast against white glass. |
| **Arabic RTL Alignment** | All charts, pill bars, and ring progress directions adapt to RTL. Logical properties (`ms-`, `me-`, `start`, `end`) used universally. |
| **Data Migration Safety** | `settings.accent` is an optional additive field defaulting to `'cyan'`. Existing database records remain 100% compatible. |

---

**Step 0 is complete. Awaiting user "go" to proceed with Phase 1.**
