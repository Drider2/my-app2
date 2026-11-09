---
name: hermes-agent
description: "Nous Research Hermes Agent: autonomous self-improving AI agent with closed learning loops, tool calling, subagent delegation, cron automation, multi-platform gateways, and trajectory generation. Located at c:\\Users\\yacine\\OneDrive\\Desktop\\hermes-agent-main."
argument-hint: "[command|query|prompt]"
license: MIT
metadata:
  author: Nous Research
  version: "1.0.0"
---

# Hermes Agent ☤ (Nous Research)

The self-improving autonomous AI agent framework by Nous Research with closed learning loops, tool-calling execution, session search, subagent delegation, and gateway integrations.

**Local Repository Path:** `c:\Users\yacine\OneDrive\Desktop\hermes-agent-main`

---

## Capabilities & Architecture

- **Self-Improving Learning Loop:** Creates skills from experience, nudges memory persistence, and indexes past conversations via FTS5 SQLite.
- **Dynamic Tool Execution:** Integrated system tools (shell, file read/write, web scraping, git, rpc-calling).
- **Subagent Delegation:** Spawns isolated subagents for parallel execution and specialized multi-step tasks.
- **Terminal & Multi-Platform Gateway:** Runs locally via TUI, CLI, or connects to Telegram, Discord, Slack, and WhatsApp.
- **Provider Agnostic:** Supports Nous Portal, OpenRouter, OpenAI, Anthropic, Gemini, and custom local endpoints.

---

## Common Commands & Usage

From `c:\Users\yacine\OneDrive\Desktop\hermes-agent-main`:

### 1. Setup & Environment
```powershell
cd "c:\Users\yacine\OneDrive\Desktop\hermes-agent-main"
.\setup-hermes.ps1
```

### 2. Run Interactive Agent (CLI / TUI)
```powershell
python run_agent.py
# or via hermes CLI
python -m hermes_cli
```

### 3. Run Single Query / Autonomous Task
```powershell
python run_agent.py --prompt "Your prompt or instruction here"
```

### 4. Model Selection & Configuration
Configure API keys and providers in `.env` or pass command line switches:
```powershell
python run_agent.py --model "model-name" --base-url "https://api.provider.com/v1"
```
