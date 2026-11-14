# GREENDREAM (v1.3) — Architectural Analysis, Logic Blueprint & Audit

This document contains a complete architectural audit, logic breakdown, and question catalogue for **GREENDREAM v1.3** based on the product concept document dated November 4, 2026.

---

## 1. System Overview & Core Philosophy

GREENDREAM is a local-first, privacy-focused Personal Life Management System built for Android (with future responsive desktop support). It integrates:
- **7 User-Facing Modules**: Dashboard, Habits, Gym, Calendar & Tasks, Finance, Journal, Settings.
- **2 AI-Assisted Subsystems**:
  - **Greendream Assistant**: Voice/text companion with strict proposal approval and deterministic rule notices.
  - **Mind Companion**: Isolated, encrypted therapist chat for emotional reflection, CBT exercises, pattern analysis, and crisis safety.

### 5 Foundational Principles
1. **One Connected System**: Modules own their records. Shared services provide read projections. No double data entry.
2. **Honest Numbers**: Every metric, streak, PR, and percentage is derived from saved source records using explicit mathematical formulas.
3. **Source Records are Truth**: Derived/cached values (streaks, volume, PRs, recovery) are always 100% rebuildable from raw records.
4. **Stable History**: Modifying a habit schedule, workout template, or budget category never mutates past records.
5. **Calm by Design**: No toxic guilt loops, no punitive red badges, no broken streaks on legitimate skips.

---

## 2. Five-Layer Architecture

```
Layer 1: User Interface (Screens, navigation, forms, charts, dialogs, Assistant voice/chat, Mind)
   ↓
Layer 2: Assistant Layer (Voice STT/TTS, AI NLU, Proposal Engine, Notice Engine, Mind Safety)
   ↓
Layer 3: Module Logic (Habits, Workouts, Calendar/Tasks, Finance, Journal, Action Registry)
   ↓
Layer 4: Shared Services (Dates/Time, Occurrence Generator, Reminders, Progress, Linking, Search, Backup)
   ↓
Layer 5: Data Layer (SQLite, UUIDs, Local Dates, Soft Deletes, Encrypted Mind/Journal, Backup File)
```

- **Strict Downward Invocation**: Each layer calls only the layer beneath it.
- **Action Registry**: Assistant cannot write directly to SQLite; it dispatches typed actions through the Action Registry only after user approval.
- **Mind Isolation**: Mind data is encrypted and completely isolated from the General Assistant and Dashboard.

---

## 3. Mathematical Rules & Boundary Cases

| Metric | Exact Formula | Edge Cases & Constraints |
| :--- | :--- | :--- |
| **Habit Rate (Daily)** | $\frac{\text{Completed}}{\text{Scheduled} - \text{Skipped}}$ | If denominator is 0, display `N/A`, never 0% or divide-by-zero error. |
| **Habit Rate (Period)** | $\frac{\sum \text{Daily Completed}}{\sum (\text{Daily Scheduled} - \text{Daily Skipped})}$ | Dates prior to habit creation date are excluded. Evaluated using schedule effective on each past date. |
| **Current Streak** | Consecutive scheduled days ending today or yesterday that are completed. | Today still open does not break streak. Skipped and not-scheduled days are neutral. |
| **Weekly Streak** | Consecutive weeks meeting weekly target (e.g. 3x/week). | Current incomplete week is `Pending`, not failed. |
| **Daily Progress** | Habits + Tasks due that day only. Headline combines only those two. | Workouts and journal entries never alter the denominator. |
| **Remaining Budget** | $\text{Budget} (+ \text{Rollover if enabled}) - \sum \text{Expenses in category and cycle}$. | Transfers excluded. Negative value indicates overspent. |
| **Month Spending** | $\sum \text{Expenses in current cycle}$. | Income and transfers excluded. Respects custom cycle start day. |
| **Savings Balance** | $\text{Opening Balance} + \sum \text{Contributions} - \sum \text{Withdrawals}$. | Opening balance is an explicit field. |
| **Required Monthly Saving** | $\frac{\text{Target} - \text{Balance}}{\text{Months Remaining}}$. | If target date has passed, show shortfall instead. |
| **Estimated 1RM** | Epley: $\text{Weight} \times (1 + \frac{\text{Reps}}{30})$. | Restricted to sets of 1 to 12 reps. Warm-up sets (`is_warmup = true`) ignored. Reps > 12 excluded from 1RM. |
| **Volume** | $\sum (\text{Sets} \times \text{Reps} \times \text{Weight in kg})$. | Tracked separately from PRs; never called a PR. |
| **Muscle Recovery State** | Sum of weighted recent sets per muscle mapped to discrete states (`Recently trained`, `Recovering`, `Likely recovered`). | Zero past data displays `No history`, never `Recovered`. |
| **Bodyweight Trend** | 7-day rolling moving average of recorded weights. | Fewer entries than window displays raw points. |

---

## 4. Cross-Module Linking & State Cascading

- **Workout Saved** $\rightarrow$ Automatically completes linked habit (e.g. "Train"), updates PRs, recalibrates recovery state, updates Dashboard.
- **Transaction Recorded** $\rightarrow$ Automatically completes linked habit (e.g. "Log expenses"), recalculates category budget, updates Month spending on Dashboard.
- **Journal Saved** $\rightarrow$ Automatically completes linked habit (e.g. "Write").
- **Savings Goal Created** $\rightarrow$ Appears on Calendar with target date and monthly contribution needed.
- **Event Moved / Deleted** $\rightarrow$ Automatically cancels old alarms and reschedules new exact alarms.
- **Cascade Deletion Integrity**: Deleting a workout removes its automated habit completion (`auto: true`), but leaves any manually logged habit completions untouched.

---

## 5. Greendream Assistant & Mind Guardrails

### Assistant Core Mechanics
- **Zero Silent Mutations**: Every action generates an `AssistantProposal` card with `[Approve]`, `[Edit]`, and `[Reject]`.
- **Deterministic Notices**: Schedule conflicts (e.g. dinner event overlapping planned gym workout), recovery mismatches (training a muscle currently recovering), budget warnings ($\ge 80\%$), overdue tasks, and streaks at risk are detected by a deterministic rules engine (offline), not an LLM.
- **Calm Notification Policy**: Quiet hours, maximum 3 notices per day by default, snoozing, and per-type switches.

### Mind: Therapist Companion
- **Clear Clinical Boundaries**: AI companion, not a licensed professional. Never diagnoses, prescribes, or makes life decisions.
- **CBT-Style Interaction**: Thought-checking, validation without agreement, permission-first suggestions, guided in-app exercises (5-4-3-2-1 grounding, box breathing, gratitude, wind-down).
- **Structured Reflection**: 4 parts: *What I heard*, *What may be contributing*, *What might help*, *A question to think about*.
- **Crisis Safety Protocol**: Every message is screened by an offline regex/rule check + safety classifier before generating a response.
  - Suicide/self-harm, harm to others, domestic abuse, eating disorder, substance crisis, psychosis.
  - Triggers Safety Mode: disables gamification, pattern analysis, and cheerful tone. Displays offline emergency numbers and offers 1-tap message to Trusted Contact.

---

## 6. Audit & Gap Analysis: What the Specification Leaves Open

The following areas are unspecified, ambiguous, or explicitly flagged as decisions to confirm:

### A. Technical Stack & Implementation
1. **Frontend / Mobile Framework**: Android phone first, responsive for desktop. Which framework is intended? (Flutter vs. React Native vs. Native Kotlin Jetpack Compose).
2. **Encryption Architecture**: Journal and Mind require encryption at rest. Should we use database-level encryption (SQLCipher) or column-level AES-256-GCM backed by Android KeyStore?
3. **LLM Integration & Offline Strategy**: The doc recommends cloud LLM with minimal context. Will users supply their own API key (e.g. Google Gemini API), or is there a dedicated backend proxy? What runs when the user is offline?

### B. Habit Logic Nuances
4. **Multi-frequency Habits**: Can a habit have multiple target completions per day (e.g. "Drink 2.5L water in 5 glasses" or "Take pills twice daily"), or is v1.3 strictly binary (done / not done)?
5. **Weekly Target Habit Skips**: In a 3x/week habit, if a user marks 2 days as "Skipped", does the weekly requirement stay 3, or reduce to 2?
6. **Day Cut-off Time**: Does "today" switch at 00:00 (midnight), or is there a configurable offset (e.g. 04:00 AM) to accommodate night owls?

### C. Gym & Recovery Math
7. **Recovery Decay Formula**: What exact time intervals govern `Recently trained` $\rightarrow$ `Recovering` $\rightarrow$ `Likely recovered`? Does recovery scale by volume (e.g. 5 sets vs 20 sets)?
8. **Exercise Library**: Will standard exercises and their primary/secondary muscle involvement ratios be pre-seeded in the database, or created by the user?
9. **Calisthenics / Bodyweight Exercises**: How are exercises without external weights tracked (e.g. pull-ups, push-ups)?

### D. Calendar & Tasks
10. **Dragging Occurrences on Calendar**: Since habit and workout occurrences are generated virtually on the fly and not stored as calendar records, what happens when a user drags one on the calendar?
11. **Task Hierarchy**: Are tasks strictly flat checklists, or do they support priorities (P1-P4), tags, or subtasks?

### E. Finance Module
12. **Multi-Account & Currency**: The doc says "Currency is a label. Amounts are never converted." Does the app support multiple accounts (e.g. Cash, CCP, Paysera) or one global balance?
13. **Transfer Source**: When contributing to a Savings Goal via Transfer, which source account does it deduct from?

### F. Algerian Context & Localization
14. **Algerian Dialect (Darija)**: Speech and text in Algeria mix Arabic, French, and Darija (e.g. Franco-Arabe phonetics). Should the NLU prompt pipeline have explicit Darija support?
15. **Crisis Hotline Numbers for Algeria**: Verified offline numbers (Civil Protection 14, Police 1548/17, SAMU 16). How should non-medical mental health support be represented?
