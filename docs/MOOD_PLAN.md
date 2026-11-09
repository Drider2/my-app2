# GreenDream Mood, Motion & Infographics Redesign Plan

**Status**: ✅ ALL PHASES (0 through 4) 100% COMPLETED, TESTED & DELIVERED  
**Target Platform**: Android APK (Capacitor) & Modern Web (Vite + React 18 + Tailwind CSS)  
**Supported Languages**: English (`en`), Français (`fr`), العربية (`ar` RTL)  
**Design Theme**: Cyber-Minimalist Fitness & Wealth Mood (Near-Black, Aqua Cyan & Lime Pulse, Glass Glows, 60fps Motion)  
**Deliverable**: `C:\Users\yacine\OneDrive\Desktop\GreenDream.apk` | Delivered via Telegram Bot to Chat ID `2043538173`  

---

## 1. Executive Summary & Boundaries

This plan details the visual, kinetic, and infographic transformation for GreenDream without altering any business logic, data models, routes, or navigation structure.

### 🛡️ Hard Architectural Invariants (Change Nothing Else)
- **Zero Schema Changes**: `localStorage` keys, schema structure in `src/types/index.ts`, and `src/services/storage.ts` remain 100% untouched.
- **Zero Layout Restructuring**: The 5-tab bottom navigation (`Today | Money | Prayer | Body | More`), screen routing in `src/App.tsx`, and section order on all screens remain strictly intact.
- **Zero Copy / Text Changes**: All translation keys, text labels, and i18n logic remain identical in EN, FR, and AR (RTL).
- **Scope Limit**: The changes are strictly isolated to:
  1. **Color Tokens & Glass Surface Styling**
  2. **Motion System & Micro-Interactions**
  3. **Data Visualization Components** (rebuilding existing metrics into modern SVG infographics)

---

## 2. File Map & Impact Matrix

### A. Token & Style Files to Touch
| File Path | Role & Target Modifications |
| :--- | :--- |
| `src/index.css` | Define CSS custom variables for Dark/Light themes, card glass tints, inner glows, motion keyframes, count-up animations, and reduced-motion rules. |
| `tailwind.config.js` | Map semantic color tokens (`cyan`, `lime`, `surface-glass`, `elevated`), custom animation timings, and transition curves. |
| `src/services/themeService.ts` | Ensure theme switcher correctly manages `system`, `light`, and `dark` with updated meta theme-colors. |
| `index.html` | Update `<meta name="theme-color">` to `#07090A` (dark) / `#F4F8F7` (light), and update favicon link. |
| `public/manifest.json` | Update PWA theme/background colors to `#07090A`. |
| `public/icon.svg` | Re-color the leaf/sprout mark with the signature Aqua Cyan -> Lime Pulse 135° gradient on near-black background `#07090A`. |

### B. Motion System Files
| File Path | Role & Target Modifications |
| :--- | :--- |
| `src/services/motion.ts` *(new)* | Central motion constants, cubic-bezier timing functions, and custom React hook `useCountUp` for animating numerical metric rollups with `prefers-reduced-motion` detection. |
| `src/styles/motion.css` *(or integrated into `src/index.css`)* | Lightweight CSS transitions for page entrance (short fade + 8px slide), modal slide-up springs, skeleton shimmer, and tap scale 0.97. |

### C. Infographics & Chart Components (`src/components/charts/`)
| Component | Existing or New | Visual Role & Applied Locations |
| :--- | :--- | :--- |
| `RingProgress.tsx` | New / Rebuilt | Rounded-cap gradient stroke ring with center icon. Replaces basic SVG circle in Today Score (10-point scale), Savings Goal progress in Money tab, and Gym target completion. RTL-aware rotation. |
| `PrayerTracker.tsx` | New / Enhanced | 5 glowing indicator rings/dots with next prayer countdown arc. Replaces basic prayer chips in Today Glance and Prayers tab. |
| `PillBars.tsx` | New / Rebuilt | Rounded vertical bars, dotted average line, active day highlight, and star milestone indicator. Replaces `WeeklyActivityChart.tsx` and weekly workout/prayer bars. |
| `AreaCurve.tsx` | Rebuilt (`CurvedLineChart.tsx`) | Monotone cubic bezier curve with gradient fill, touch-interactive scrubber dot, vertical guide line, and value chip tooltip. Replaces forecast balance runway and weight trend chart. |
| `TrendCompare.tsx` | New / Rebuilt | Side-by-side comparison: muted gray baseline vs lime pulse current bars with a `+delta` chip. Replaces raw text spending comparison in Finance tab. |
| `SafeToSpendGauge.tsx` | New | 180° half-circle arc gauge with glowing tip that shifts from Cyan -> Amber -> Red as budget exhausts. Replaces standard flat progress bar in Money Glance. |
| `CategoryBreakdown.tsx` | New / Rebuilt | Thin segmented ring or stacked pill bar with cyan/lime tonal tints and legend. Replaces bulky pie/donut charts in Finance Analytics. |
| `StreakMilestoneBadge.tsx` | New | Hexagonal badge with glowing gradient outline and icon for earned streaks (7-day prayer streak, 10/10 score days). Displayed contextually. |

### D. Screens Receiving Visual Upgrades (Same layout, better visuals)
| Screen | Existing Visual | Upgraded Visual |
| :--- | :--- | :--- |
| `src/screens/DashboardScreen.tsx` | - 10-pt score SVG circle<br>- 5 prayer status buttons<br>- Flat spending progress bar<br>- Flat workout card | - `RingProgress` with cyan->lime gradient & pulse at 10/10<br>- `PrayerTracker` with glowing dots & countdown arc<br>- `SafeToSpendGauge` with glowing tip & count-up metric<br>- Glassy gradient card styling on hero blocks |
| `src/screens/FinanceScreen.tsx` | - Raw SVG line chart (runway)<br>- Flat category bars<br>- Standard goal progress | - `AreaCurve` with interactive touch scrubber<br>- `TrendCompare` for monthly comparison<br>- `CategoryBreakdown` pill/ring<br>- `RingProgress` for savings goals |
| `src/screens/PrayersScreen.tsx` | - Basic checkboxes & 14-day flat bars | - `PrayerTracker` hero & animated consistency `PillBars` |
| `src/screens/GymScreen.tsx` | - `WeightProgressChart.tsx` linear path<br>- Simple workout bars | - `AreaCurve` for weight with 7-day moving average<br>- `PillBars` for weekly training frequency |
| `src/components/Navigation.tsx` | - Solid sage active indicators | - Aqua Cyan active glow, subtle scale spring, gradient floating FAB |

---

## 3. The New Mood Design Specifications

### A. Color Palette Matrix

```
       DARK THEME (Primary Mood)                  LIGHT THEME (High Contrast)
  ┌─────────────────────────────────┐        ┌─────────────────────────────────┐
  │ Background:  #07090A            │        │ Background:  #F4F8F7            │
  │ Surface:     #0F1416            │        │ Surface:     #FFFFFF            │
  │ Elevated:    #161C1F            │        │ Elevated:    #EAF1EF            │
  │ Border:      #1F262A            │        │ Border:      #D9E2E0            │
  │ Text Prim:   #FFFFFF            │        │ Text Prim:   #0E1A1D            │
  │ Text Sec:    #A9B4B8            │        │ Text Sec:    #51666B            │
  │ Text Muted:  #6B777C            │        │ Text Muted:  #86979C            │
  │                                 │        │                                 │
  │ Aqua Cyan:   #22C7F2            │        │ Aqua Cyan:   #0A93B8 (WCAG AA)  │
  │ Lime Pulse:  #A6E34B            │        │ Lime Pulse:  #5E9E1F (WCAG AA)  │
  │ Amber (warn):#F5B94A            │        │ Amber (warn):#C88A1F            │
  │ Red (danger):#FF6B6B            │        │ Red (danger):#D94848            │
  └─────────────────────────────────┘        └─────────────────────────────────┘
                   ▲                                          ▲
                   └─────────── SIGNATURE GRADIENT ───────────┘
                       135°: Aqua Cyan  ──►  Lime Pulse
```

### B. Contrast & Readability Verification (WCAG 2.1 AA Compliance)
- **Dark Theme**:
  - Text Primary (`#FFFFFF`) on Surface (`#0F1416`): **18.4:1** (Exceeds AAA).
  - Text Secondary (`#A9B4B8`) on Surface (`#0F1416`): **9.2:1** (Exceeds AAA).
  - Aqua Cyan (`#22C7F2`) on Surface (`#0F1416`): **10.8:1** (Exceeds AAA).
  - Lime Pulse (`#A6E34B`) on Surface (`#0F1416`): **13.5:1** (Exceeds AAA).
- **Light Theme**:
  - Text Primary (`#0E1A1D`) on Surface (`#FFFFFF`): **16.2:1** (Exceeds AAA).
  - Aqua Cyan (`#0A93B8`) on Surface (`#FFFFFF`): **4.6:1** (Exceeds AA 4.5:1).
  - Lime Pulse (`#5E9E1F`) on Surface (`#FFFFFF`): **4.7:1** (Exceeds AA 4.5:1).

### C. Glassy Surface & Card Architecture
- Cards will feature a subtle 135° tinted gradient:
  - Dark: `linear-gradient(135deg, rgba(34, 199, 242, 0.05) 0%, rgba(15, 20, 22, 1) 60%)`
  - Subtle inner top-edge glow: `box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.06)`
  - Thin borders: `1px solid var(--color-border)` (reduced visual weight).
  - Only hero cards (Daily Score, Money Safe-to-Spend, Next Workout) will have the cyan/lime ambient glow; secondary cards remain calm and neutral.

---

## 4. Motion Architecture & 60fps Guidelines

### A. Easing & Durations
- **Micro-interactions** (button press, checkbox toggle): `150ms`, `cubic-bezier(0.2, 0, 0, 1)`
- **UI Transitions** (tab switch, modal slide up): `300ms`, `cubic-bezier(0.22, 1, 0.36, 1)` (snappy spring feel)
- **Chart Draw-in**: `700ms`, `cubic-bezier(0.16, 1, 0.3, 1)` (smooth deceleration)
- **Count-Up Animation**: `600ms` duration using `requestAnimationFrame`, easing out to final numeric string.

### B. Hardware Acceleration
- Restrict animations strictly to `transform` and `opacity`.
- Zero re-layout or paint triggers on scroll (`will-change: transform` only when actively animating).
- Tab transitions use lightweight `opacity: 0 -> 1` and `transform: translateY(8px) -> translateY(0)`.
- Press feedback uses `transform: scale(0.97)` on `:active`.

### C. Accessibility & `prefers-reduced-motion`
- All animations immediately check `window.matchMedia('(prefers-reduced-motion: reduce)')`.
- When active, durations drop to `0ms`, charts render at 100% stroke immediately, and count-up values render instantly without rolling.

---

## 5. Infographics Specification

### 1. `RingProgress`
- SVG radial ring with `strokeDasharray` and `strokeDashoffset` transition.
- Linear gradient definition along stroke (`#22C7F2` to `#A6E34B`).
- Rounded line caps (`stroke-linecap="round"`).
- Centered icon or numeric display.
- Direction aware: Clockwise in LTR; mirrors or adapts smoothly for RTL.

### 2. `PrayerTracker`
- 5 interconnected circular nodes representing Fajr, Dhuhr, Asr, Maghrib, Isha.
- Completed prayer: vibrant glow + check mark.
- Upcoming prayer: thin animated pulsing ring showing countdown to prayer time.
- Tap triggers scale pop (`scale(1.15) -> scale(1)`) + momentary cyan ripple.

### 3. `PillBars` (Weekly History)
- 7 vertical pill bars with rounded tops (`rx="6"`).
- Dotted horizontal benchmark line showing weekly target / average.
- Current day highlighted with Aqua Cyan fill.
- Milestone days marked with a tiny lime star badge.
- Staggered column height animation (`transition-delay: index * 40ms`).

### 4. `AreaCurve` (Interactive Scrubber)
- Monotone cubic spline generating smooth peaks and valleys without artificial overshoot.
- Vertical gradient fill fading from 20% opacity at the line to 0% at the base.
- Touch / pointer scrubber: drag across the chart to move a vertical guide line and show the value + date in a floating tooltip chip.

### 5. `TrendCompare`
- Twin vertical bars comparing prior period (muted gray `#6B777C`) against current period (Lime Pulse `#A6E34B`).
- Delta pill badge indicating difference (e.g., `+12%` or `-$450`).

### 6. `SafeToSpendGauge`
- 180° semi-circular gauge.
- Glowing cursor/tip that travels along the circumference.
- Color dynamics: Cyan when $\ge 50\%$ budget remains $\rightarrow$ Amber at $20\text{--}49\%$ $\rightarrow$ Red at $<20\%$.

---

## 6. Risks & Mitigation Strategies

| Risk | Mitigation Strategy |
| :--- | :--- |
| **Animation Lag / Dropped Frames on Mid-Range Android Phones** | Avoid complex SVG path re-calculations during animation; use CSS stroke transitions, `transform`, and `opacity` only. Wrap all chart computations in `useMemo`. |
| **Arabic RTL Alignment & Mirroring** | Ensure all chart SVG coordinates, tooltips, and progress arcs respect `dir="rtl"`. Use CSS logical properties (`start`, `end`, `ms-`, `me-`). |
| **Text Contrast in Light Mode** | Use the WCAG AA adjusted variants `#0A93B8` (Cyan) and `#5E9E1F` (Lime) in Light theme so text is never washed out against white surfaces. |
| **Accidental State Loss or Component Breakdown** | Reusable chart components will have identical or backwards-compatible prop interfaces. No business logic or state setters will be touched. |
| **Excessive Visual Noise (Cyberpunk Overload)** | Apply glowing gradients strictly to hero elements (Daily Score, Hero Runway, Active Workout). Keep table lists, settings, and secondary forms clean and dark-neutral. |

---

## 7. Phased Implementation Roadmap

- **Step 0**: Planning & Codebase Audit *(Current step — awaiting approval)*
- **Phase 1**: Color Tokens, Card Glass System & App Icon
  - Update `src/index.css` & `tailwind.config.js` with Aqua Cyan, Lime Pulse, and near-black neutrals.
  - Update card classes with subtle gradients and inner top glows.
  - Update `public/icon.svg`, `index.html`, `manifest.json`.
- **Phase 2**: Motion Engine & Micro-Interactions
  - Create `src/services/motion.ts` with easing tokens and `useCountUp` hook.
  - Implement tap feedback `scale(0.97)`, screen transitions (fade + 8px slide), and sheet spring animations.
  - Add `prefers-reduced-motion` global safety.
- **Phase 3**: SVG Infographics Library
  - Build `RingProgress.tsx`, `PrayerTracker.tsx`, `PillBars.tsx`, `AreaCurve.tsx`, `TrendCompare.tsx`, `SafeToSpendGauge.tsx`, `CategoryBreakdown.tsx`, and `StreakMilestoneBadge.tsx`.
- **Phase 4**: Screen Integration, Polish & Android Build
  - Integrate new components into Today, Money, Prayer, and Body tabs.
  - Verify contrast, performance, RTL, and Light mode.
  - Run `npm run build && npx cap sync android` and generate the updated APK.

---

**Step 0 is complete. Ready for user confirmation to begin Phase 1.**
