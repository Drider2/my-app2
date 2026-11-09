# GreenDream: Hermes Tools Specification (HERMES_TOOLS.md)

**App**: GreenDream (React 18 + Capacitor 8 Android)  
**Agent**: Hermes (Nous Research Persona + Gemini Tool Calling Engine)  
**Date**: November 7, 2026  
**Document Version**: 1.0.0

---

## 1. Tool Execution & Confirmation Invariant

Hermes tools are strictly separated into two classes:
1. **READ Tools (Autonomous Execution)**:
   - Queries local app state and returns structured JSON summaries.
   - Executes silently during the multi-turn agent loop.
   - Returns ONLY sanitized, aggregated summaries to conserve token budget and protect user privacy.
   - Only registered if the corresponding app module is **ENABLED** and user privacy permission is **ON**.
2. **WRITE Tools (Confirmation Gate Required)**:
   - Modifies local state (e.g. adding transactions, workouts, tasks, prayers, habits).
   - **RULE: Hermes is strictly forbidden from executing write tools silently.**
   - When a write tool is invoked by Gemini, Hermes renders an interactive **Glass Action Card** in the chat stream showing:
     - Clear title and icon of the action.
     - Editable input fields (e.g., amount, category, note, date).
     - **Confirm** and **Cancel** buttons.
   - The action is only dispatched to `storage.ts` when the user taps **Confirm**.
   - Upon execution, an **Undo Toast** appears for 10 seconds allowing immediate rollback.

---

## 2. Read Tools Catalog

### 2.1 `get_today_summary`
* **Module Dependency**: Always available (adapts based on enabled modules).
* **Description**: Returns a consolidated snapshot of the current local day: Daily score (out of 10), prayer completion count, today's spending vs daily allowance, and number of pending tasks.
* **Input Parameters**:
  ```json
  { "type": "OBJECT", "properties": {}, "required": [] }
  ```
* **Output Payload Shape**:
  ```json
  {
    "date": "2026-11-07",
    "score": 8,
    "max_score": 10,
    "prayers_completed": 3,
    "prayers_total": 5,
    "spent_today_minor": 120000,
    "spending_allowance_minor": 500000,
    "pending_tasks_count": 2,
    "currency": "DA"
  }
  ```

### 2.2 `get_prayers`
* **Module Dependency**: `prayer` module enabled & privacy permitted.
* **Description**: Returns today's 5 prayer times (Fajr, Dhuhr, Asr, Maghrib, Isha), completion status, and countdown to next upcoming prayer.
* **Input Parameters**:
  ```json
  {
    "type": "OBJECT",
    "properties": {
      "date": { "type": "STRING", "description": "Optional ISO date YYYY-MM-DD. Defaults to today." }
    }
  }
  ```
* **Output Payload Shape**:
  ```json
  {
    "date": "2026-11-07",
    "prayers": [
      { "name": "fajr", "time": "05:32", "completed": true },
      { "name": "dhuhr", "time": "12:35", "completed": true },
      { "name": "asr", "time": "15:42", "completed": true },
      { "name": "maghrib", "time": "17:55", "completed": false },
      { "name": "isha", "time": "19:18", "completed": false }
    ],
    "next_prayer": "maghrib",
    "next_prayer_time": "17:55"
  }
  ```

### 2.3 `get_spending`
* **Module Dependency**: `finance` module enabled & privacy permitted.
* **Description**: Aggregates expenses within a specified time range (today, this week, this month) with optional category filter.
* **Input Parameters**:
  ```json
  {
    "type": "OBJECT",
    "properties": {
      "range": { "type": "STRING", "enum": ["today", "week", "month", "year"], "description": "Time window to calculate" },
      "category": { "type": "STRING", "description": "Optional category filter name (e.g. Food, Transport, Rent)" }
    },
    "required": ["range"]
  }
  ```
* **Output Payload Shape**:
  ```json
  {
    "range": "month",
    "total_spent_minor": 1850000,
    "transaction_count": 14,
    "currency": "DA",
    "top_categories": [
      { "category": "Groceries", "amount_minor": 850000 },
      { "category": "Fuel & Car", "amount_minor": 400000 }
    ]
  }
  ```

### 2.4 `get_budget_status`
* **Module Dependency**: `finance` module enabled & privacy permitted.
* **Description**: Returns overall financial health: available cash balance, monthly salary, savings reserve, and burn rate.
* **Input Parameters**:
  ```json
  { "type": "OBJECT", "properties": {}, "required": [] }
  ```
* **Output Payload Shape**:
  ```json
  {
    "available_cash_minor": 4200000,
    "monthly_budget_minor": 5000000,
    "spent_cycle_minor": 2100000,
    "remaining_cycle_minor": 2900000,
    "savings_reserve_minor": 15000000,
    "currency": "DA"
  }
  ```

### 2.5 `get_goals`
* **Module Dependency**: `finance` module enabled & privacy permitted.
* **Description**: Returns all active savings goals with target amounts, current progress, and deadlines.
* **Input Parameters**:
  ```json
  { "type": "OBJECT", "properties": {}, "required": [] }
  ```
* **Output Payload Shape**:
  ```json
  {
    "goals": [
      { "title": "Emergency Fund", "target_minor": 20000000, "current_minor": 12000000, "progress_pct": 60 },
      { "title": "Vehicle Downpayment", "target_minor": 50000000, "current_minor": 18000000, "progress_pct": 36 }
    ]
  }
  ```

### 2.6 `get_loans`
* **Module Dependency**: `finance` module enabled & privacy permitted.
* **Description**: Returns summary of lent money (receivables from friends/family) and repayment progress.
* **Input Parameters**:
  ```json
  { "type": "OBJECT", "properties": {}, "required": [] }
  ```
* **Output Payload Shape**:
  ```json
  {
    "total_lent_minor": 4500000,
    "total_repaid_minor": 1500000,
    "outstanding_minor": 3000000,
    "active_borrowers": [
      { "name": "Karim", "balance_due_minor": 2000000, "expected_date": "2026-11-20" }
    ]
  }
  ```

### 2.7 `get_workouts`
* **Module Dependency**: `gym` module enabled & privacy permitted.
* **Description**: Returns recent gym training sessions, current active routine split, and next scheduled workout.
* **Input Parameters**:
  ```json
  {
    "type": "OBJECT",
    "properties": {
      "limit": { "type": "INTEGER", "description": "Number of recent sessions to return (default 5)" }
    }
  }
  ```
* **Output Payload Shape**:
  ```json
  {
    "active_program": "Push / Pull / Legs",
    "next_workout": "Push Day (Chest, Shoulders & Triceps)",
    "recent_sessions": [
      { "date": "2026-11-05", "name": "Leg Day", "sets_count": 16, "duration_min": 60 }
    ]
  }
  ```

### 2.8 `get_weight_trend`
* **Module Dependency**: `gym` module enabled & privacy permitted.
* **Description**: Returns recent bodyweight logs and short-term weight change delta.
* **Input Parameters**:
  ```json
  {
    "type": "OBJECT",
    "properties": {
      "days": { "type": "INTEGER", "description": "Number of past days to inspect (default 30)" }
    }
  }
  ```
* **Output Payload Shape**:
  ```json
  {
    "latest_weight_kg": 78.4,
    "unit": "kg",
    "delta_30d_kg": -0.8,
    "entries_count": 12
  }
  ```

### 2.9 `get_tasks`
* **Module Dependency**: `calendar` module enabled & privacy permitted.
* **Description**: Returns pending or completed tasks for a specific date or timeframe.
* **Input Parameters**:
  ```json
  {
    "type": "OBJECT",
    "properties": {
      "range": { "type": "STRING", "enum": ["today", "upcoming", "overdue", "all"], "description": "Task status filter" }
    },
    "required": ["range"]
  }
  ```
* **Output Payload Shape**:
  ```json
  {
    "tasks": [
      { "id": "t-1", "title": "Pay utility bill", "due_date": "2026-11-07", "due_time": "14:00", "done": false }
    ]
  }
  ```

### 2.10 `get_calendar`
* **Module Dependency**: `calendar` module enabled & privacy permitted.
* **Description**: Returns scheduled events on the user's agenda.
* **Input Parameters**:
  ```json
  {
    "type": "OBJECT",
    "properties": {
      "date": { "type": "STRING", "description": "Date YYYY-MM-DD. Defaults to today." }
    }
  }
  ```

### 2.11 `get_journal_entries`
* **Module Dependency**: `journal` module enabled AND user privacy switch explicitly turned **ON** in Settings > Hermes Privacy.
* **Description**: Returns dated thoughts and mood reflections.
* **Input Parameters**:
  ```json
  {
    "type": "OBJECT",
    "properties": {
      "limit": { "type": "INTEGER", "description": "Number of recent entries (max 5)" }
    }
  }
  ```

---

## 3. Write Tools Catalog (Confirmation Gate Required)

Every write tool automatically generates an interactive card in the chat before executing.

### 3.1 `add_expense`
* **Module Dependency**: `finance` enabled & "Read and act" mode active.
* **Description**: Logs a new monetary transaction (expense).
* **Input Parameters**:
  ```json
  {
    "type": "OBJECT",
    "properties": {
      "amount": { "type": "NUMBER", "description": "Amount in major units (e.g. 1500 for 1,500 DA)" },
      "category": { "type": "STRING", "description": "Category name or ID (e.g. Food, Fuel, Personal)" },
      "note": { "type": "STRING", "description": "Description of the expense" },
      "date": { "type": "STRING", "description": "ISO date YYYY-MM-DD. Defaults to today." }
    },
    "required": ["amount", "note"]
  }
  ```
* **Confirmation Card UI**: Shows Amount field, Category dropdown, Note input. Tap **[Confirm Expense]** to commit. Undo toast appears for 10s.

### 3.2 `add_income`
* **Module Dependency**: `finance` enabled.
* **Description**: Records extra incoming funds.
* **Input Parameters**:
  ```json
  {
    "type": "OBJECT",
    "properties": {
      "amount": { "type": "NUMBER", "description": "Amount in major units" },
      "note": { "type": "STRING", "description": "Source of income (e.g. Freelance project, Bonus)" }
    },
    "required": ["amount", "note"]
  }
  ```

### 3.3 `log_weight`
* **Module Dependency**: `gym` enabled.
* **Description**: Records today's weigh-in.
* **Input Parameters**:
  ```json
  {
    "type": "OBJECT",
    "properties": {
      "weight": { "type": "NUMBER", "description": "Weight value in current app units (kg or lb)" },
      "date": { "type": "STRING", "description": "Date YYYY-MM-DD. Defaults to today." }
    },
    "required": ["weight"]
  }
  ```

### 3.4 `add_task`
* **Module Dependency**: `calendar` enabled.
* **Description**: Creates a new task in the agenda checklist.
* **Input Parameters**:
  ```json
  {
    "type": "OBJECT",
    "properties": {
      "title": { "type": "STRING", "description": "Task description" },
      "due_date": { "type": "STRING", "description": "Date YYYY-MM-DD. Defaults to today." },
      "due_time": { "type": "STRING", "description": "Optional time HH:mm" }
    },
    "required": ["title"]
  }
  ```

### 3.5 `add_reminder`
* **Module Dependency**: `maintenance` enabled.
* **Description**: Creates a vehicle service, personal hygiene, or shopping item reminder.
* **Input Parameters**:
  ```json
  {
    "type": "OBJECT",
    "properties": {
      "name": { "type": "STRING", "description": "Reminder item name" },
      "category": { "type": "STRING", "enum": ["car_maintenance", "personal_care", "shopping"] },
      "estimated_cost": { "type": "NUMBER", "description": "Estimated cost in major currency units" }
    },
    "required": ["name", "category"]
  }
  ```

### 3.6 `mark_prayer`
* **Module Dependency**: `prayer` enabled.
* **Description**: Toggles prayer completion state for today.
* **Input Parameters**:
  ```json
  {
    "type": "OBJECT",
    "properties": {
      "prayer": { "type": "STRING", "enum": ["fajr", "dhuhr", "asr", "maghrib", "isha"] },
      "completed": { "type": "BOOLEAN", "description": "True to mark completed, false to unmark" }
    },
    "required": ["prayer", "completed"]
  }
  ```

### 3.7 `create_goal`
* **Module Dependency**: `finance` enabled.
* **Description**: Sets up a new financial savings target.
* **Input Parameters**:
  ```json
  {
    "type": "OBJECT",
    "properties": {
      "title": { "type": "STRING", "description": "Goal name (e.g. Vacation, New Laptop)" },
      "target_amount": { "type": "NUMBER", "description": "Target amount in major currency units" },
      "target_date": { "type": "STRING", "description": "Optional deadline YYYY-MM-DD" }
    },
    "required": ["title", "target_amount"]
  }
  ```

---

## 4. Hermes Memory Tools (`gd_hermes_notes`)

Hermes can persist enduring personal facts (e.g., *"User prefers bullet point summaries"*, *"Calls themselves Yacine"*).
* **`save_memory_note`**:
  - Proposes adding a new declarative fact to local memory.
  - Generates a confirmation card: *"Add to Hermes memory: [note]?"*
  - Only written to `gd_hermes_notes` upon user approval.
* **`get_memory_notes`**:
  - Reads active user facts into system context during startup.
  - Hard cap of 20 notes (oldest consolidated/pruned) to preserve prompt budget.
