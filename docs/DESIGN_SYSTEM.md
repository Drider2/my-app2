# GreenDream Minimalist Design System (v3.0)

A clear, modern, content-first design system engineered for personal life management, discipline, fitness, and wealth tracking. Built on React 18, Tailwind CSS, and Capacitor with 100% offline self-hosted fonts.

---

## 1. Design Philosophy
- **Clarity over decoration**: No visual noise, 0 borders, 0 heavy drop shadows. Content lives on quiet surfaces with generous padding.
- **Strict 4-Tier Type Scale**: Title, Heading, Body, Caption. Nothing below 12px. No uppercase tracking-wide labels.
- **Single Soft Green Accent**: Warm, restorative green palette (`#5E8C61` Light / `#8FBF93` Dark). Semantic red and amber strictly reserved for errors and budget warnings.
- **Mobile First & Offline**: Safe-area aware, minimum 44px tap targets, local Inter & Noto Sans Arabic typography.

---

## 2. Color Palette & Token Matrix

### Neutrals & Surfaces
| Token | Light Theme | Dark Theme | Purpose & Role |
| :--- | :--- | :--- | :--- |
| `--color-bg` | `#F8F9FA` | `#111412` | Canvas background |
| `--color-surface` | `#FFFFFF` | `#181D1A` | Cards, modals, sheets |
| `--color-surface-subtle` | `#F1F3F2` | `#222724` | Secondary chips, input controls |
| `--color-divider` | `#E5E7EB` | `#2B322D` | Thin list dividers & subtle separators |
| `--color-text-primary` | `#1A1D1A` | `#EDEDED` | Key metrics, headings, body text (Contrast > 15:1) |
| `--color-text-secondary` | `#5C635D` | `#9EA8A0` | Subtitles, labels, secondary values (Contrast > 5:1) |
| `--color-text-muted` | `#8A948C` | `#727D74` | Quiet units, placeholders |

### Primary Accent
| Token | Light Theme | Dark Theme | Purpose |
| :--- | :--- | :--- | :--- |
| `--color-accent` | `#5E8C61` | `#8FBF93` | Selected states, primary progress, active tab |
| `--color-accent-subtle` | `rgba(94, 140, 97, 0.12)` | `rgba(143, 191, 147, 0.14)` | Active tab pills, soft chips |
| `--color-accent-contrast`| `#FFFFFF` | `#111412` | High contrast text on accent fill |

### Semantic Guards
| Token | Hex | Dark Hex | Purpose |
| :--- | :--- | :--- | :--- |
| `--color-warning` | `#D97706` | `#F59E0B` | Approaching limit, pending review |
| `--color-danger` | `#DC2626` | `#EF4444` | Exceeded limits, destructive actions |

---

## 3. Strict Typography Scale

Self-hosted in `public/fonts/` (Inter Latin, Noto Sans Arabic). No CDN requests.

| Level | Font Size / Line Height | Tailwind Class | Semantic Usage |
| :--- | :--- | :--- | :--- |
| **Title** | 24px / 32px | `text-title font-semibold` | Page titles, primary hero numbers |
| **Heading** | 18px / 26px | `text-heading font-semibold` | Section titles, card headers |
| **Body** | 15px / 22px | `text-body font-normal` | List items, descriptions, form inputs |
| **Caption** | 12px / 16px | `text-caption font-normal` | Timestamps, units, metadata (minimum size) |
| **Metric Display** | 32px / 38px | `text-metric font-semibold` | Safe to spend, net cash balance |

---

## 4. Radii & Spacing Matrix

- **Card Radius**: `16px` (`rounded-card`)
- **Control Radius**: `12px` (`rounded-control`)
- **Tap Targets**: $\ge 44\text{px}$ minimum hit target on all interactive elements.
- **Grid Unit**: 8px baseline (`gap-2` = 8px, `gap-4` = 16px, `p-4` = 16px).

---

## 5. Navigation Shell

- **Docked Bottom Navigation**: 5 standard tabs: `Today` | `Money` | `Prayer` | `Body` | `More`.
- **Active State**: Filled icon + label in accent color (`--color-accent`), labels always visible.
- **Quick Add**: Exactly ONE floating '+' button positioned cleanly above the nav bar on the trailing side.
- **Clearance**: Main canvas padding = `calc(56px + max(12px, env(safe-area-inset-bottom)) + 70px)` ensuring floating controls never cover content.

---

## 6. Micro-Interactions (150–200ms)

- Active scale feedback: `active:scale-95` / `active:scale-[0.98]` (`150ms`).
- Sheet slide-up: `cubic-bezier(0.16, 1, 0.3, 1)` (`200ms`).
- Toggle switches & checkmarks: `150ms ease-out`.
- `prefers-reduced-motion`: Immediately disables transforms for accessibility.
