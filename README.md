# ✨ Omnix AI — Multi-Agent Intelligence System

> A full-stack, secure, locally-deployable AI Agent system built with a custom **ADK (Agent Development Kit)** multi-agent architecture and a **Model Context Protocol (MCP)** server. Features a stunning modern dashboard UI running on `localhost:3000`.

---

## 🗂 Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Key Concepts Applied](#-key-concepts-applied)
- [Agent System (ADK)](#-agent-system-adk)
- [MCP Server Tools](#-mcp-server-tools)
- [Security Engine](#-security-engine)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
- [API Reference](#-api-reference)
- [Antigravity Demo: End-to-End Workflow](#-antigravity-demo-end-to-end-workflow)
- [GitHub-Ready Checklist](#-github-ready-checklist)

---

## 🌐 Overview

**Omnix AI** is a premium, production-quality showcase of:
- **ADK Multi-Agent Orchestration** — four specialized AI agents collaborating in real-time
- **MCP (Model Context Protocol) Server** — standardized, schema-validated tool exposure
- **Sandboxed CLI Execution** — a robust security engine that whitelists commands and blocks injection attacks
- **Modern React Dashboard** — glassmorphic dark-mode UI with live agent state visualization

The system is fully modular, security-first, and requires zero cloud dependencies to run.

---

## 🏗 Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                        User (Browser UI)                       │
│              http://localhost:3000   (React Vite)              │
└──────────────────────────┬─────────────────────────────────────┘
                           │ HTTP/POST /api/run
┌──────────────────────────▼─────────────────────────────────────┐
│                  Express Server (Port 3000)                     │
│          src/server.ts  ──  CORS, Static, REST APIs            │
│                           │                                     │
│         ┌─────────────────▼─────────────────────┐              │
│         │         MultiAgentRunner               │              │
│         │    (src/adk/runner.ts)                 │              │
│         │                                        │              │
│         │  ┌─────────────────────────────────┐  │              │
│         │  │       PlannerAgent (Orch.)       │  │              │
│         │  │   - Decomposes user prompt       │  │              │
│         │  │   - Delegates to sub-agents      │  │              │
│         │  └──────┬──────────┬──────────┬─────┘  │              │
│         │         │          │          │         │              │
│         │  ┌──────▼──┐ ┌────▼────┐ ┌──▼──────┐  │              │
│         │  │Optimizer│ │  Study  │ │Scheduler│  │              │
│         │  │  Agent  │ │  Agent  │ │  Agent  │  │              │
│         │  └──────┬──┘ └────┬────┘ └──┬──────┘  │              │
│         │         └─────────┴──────────┘         │              │
│         │              MCP Server Calls           │              │
│         └─────────────────┬─────────────────────-┘              │
│                           │                                     │
│         ┌─────────────────▼──────────────────────┐             │
│         │         MCP Server (src/mcp/)           │             │
│         │  ┌──────────────────────────────────┐  │             │
│         │  │  optimize_tasks                  │  │             │
│         │  │  generate_study_deck             │  │             │
│         │  │  schedule_calendar               │  │             │
│         │  │  execute_safe_command            │  │             │
│         │  └──────────────────────────────────┘  │             │
│         │         Security Engine (validation)    │             │
│         └────────────────────────────────────────┘             │
└────────────────────────────────────────────────────────────────┘
```

---

## 🔑 Key Concepts Applied

| Concept | Implementation |
|---|---|
| **ADK Multi-Agent System** | Custom TypeScript ADK with `BaseAgent`, `PlannerAgent`, `OptimizationAgent`, `StudyAgent`, `SchedulerAgent` |
| **MCP Server** | Express-backed MCP with 4 registered tools, schema validation, and execution logs |
| **Security Features** | `SecurityEngine` class with binary whitelisting, injection pattern blocking, argument sanitization, and payload type checking |
| **Agent Skills / CLI Tools** | `execute_safe_command` MCP tool with sandboxed `child_process.exec` for whitelisted git/npm commands |

---

## 🤖 Agent System (ADK)

### BaseAgent (`src/adk/agent.ts`)
- Abstract class that all agents extend
- Handles MCP tool invocation via `callTool()`
- Maintains a per-agent `AgentLog[]` for audit trail

### PlannerAgent (`src/adk/plannerAgent.ts`) — *Orchestrator*
- Receives high-level user prompts
- Runs lightweight NLP to extract: topic, study duration, task list, optional CLI command
- Delegates to all three sub-agents sequentially
- Returns a unified `MultiAgentResult` object

### OptimizationAgent (`src/adk/optimizationAgent.ts`) — *Task Optimizer*
- Calls `optimize_tasks` MCP tool
- Applies rule-based priority and duration estimation
- Returns structured task cards with: `id`, `title`, `priority`, `duration`, `status`

### StudyAgent (`src/adk/studyAgent.ts`) — *Exam/Study Creator*
- Calls `generate_study_deck` MCP tool
- Returns topic summaries and active-recall flashcard decks
- Supports: Machine Learning, React, or any general topic

### SchedulerAgent (`src/adk/schedulerAgent.ts`) — *Life Calendar*
- Calls `schedule_calendar` MCP tool
- Builds multi-day calendar event blocks (study, break, review)
- Returns ISO-8601 formatted event objects with color coding

---

## 🔌 MCP Server Tools

| Tool Name | Description | Input Schema |
|---|---|---|
| `optimize_tasks` | Structures raw tasks with priority and duration | `{ tasks: string }` |
| `generate_study_deck` | Returns a topic summary + flashcard Q&A deck | `{ topic: string }` |
| `schedule_calendar` | Generates multi-day calendar event blocks | `{ planDays: string, studyBlocks: string }` |
| `execute_safe_command` | Sandbox-validated CLI executor | `{ command: string }` |

Every tool call is:
1. **Schema validated** (type-checking on all required fields)
2. **Security audited** (command tools additionally pass through the `SecurityEngine`)
3. **Fully logged** to `mcpServer.logs[]` with timestamps, args, and status

---

## 🛡 Security Engine

Located at `src/mcp/security.ts`, the `SecurityEngine` class implements:

### Allowed Binaries Whitelist
```
git | npm | node | echo | npx
```

### Blocked Patterns (Injection Defense)
| Pattern | Defense |
|---|---|
| `\|`, `&`, `;`, `` ` ``, `<`, `>` | Pipes, chaining, redirection, backticks |
| `$(...)` | Subshell execution |
| `../` or `..\` | Path traversal |
| `rm`, `del`, `format`, `sh`, `bash` | Dangerous binaries |
| `curl`, `wget`, `ssh`, `sftp` | Network utilities |
| `powershell`, `cmd`, `Invoke-Expression` | Windows injection |

### Whitelisted Command Patterns
```
git status
git log -n <N>
git diff
npm run build
npm -v
node -v
echo <safe text>
```

---

## 📁 Project Structure

```
capstone omnix/
├── .env.example              # Environment template
├── .gitignore
├── package.json              # Backend scripts & deps
├── tsconfig.json             # TypeScript config
├── README.md
│
├── src/                      # Backend / Agent System
│   ├── server.ts             # Express server (port 3000)
│   ├── mcp/
│   │   ├── mcpServer.ts      # MCP Server with 4 tools
│   │   └── security.ts       # Security & Sandbox Engine
│   └── adk/
│       ├── agent.ts          # Base Agent class
│       ├── plannerAgent.ts   # Orchestrator Agent
│       ├── optimizationAgent.ts
│       ├── studyAgent.ts
│       ├── schedulerAgent.ts
│       └── runner.ts         # MultiAgentRunner
│
└── frontend/                 # React + Vite UI Dashboard
    ├── index.html
    ├── package.json
    ├── vite.config.ts        # Dev proxy → localhost:3000
    └── src/
        ├── main.tsx
        ├── App.tsx           # Full dashboard UI
        ├── App.css
        └── index.css         # Design system (glassmorphism)
```

---

## ⚡ Quick Start

### Prerequisites
- Node.js v18+
- npm v9+

### 1. Install Dependencies
```bash
# From project root:
npm run init-project
```

### 2. Start the Backend (Terminal 1)
```bash
npm run dev:backend
# → Omnix AI server listening on http://localhost:3000
```

### 3. Start the Frontend (Terminal 2)
```bash
npm run dev:frontend
# → Vite dev server at http://localhost:5173 (proxies /api → :3000)
```

### 4. Open the Dashboard
Navigate to **http://localhost:5173** (dev mode) or **http://localhost:3000** (after `npm run build`)

---

## 📡 API Reference

### `POST /api/run`
Run the full Multi-Agent pipeline.
```json
// Request
{ "prompt": "Create a 3-day ML study plan with calendar slots and run git status" }

// Response
{
  "success": true,
  "result": {
    "decomposition": { "topic": "Machine Learning", "days": "3", ... },
    "optimization": { "tasks": [...] },
    "study": { "summary": "...", "flashcards": [...] },
    "scheduler": { "events": [...] },
    "cliExecution": { "command": "git status", "stdout": "..." }
  },
  "agentLogs": [...],
  "mcpLogs": [...]
}
```

### `GET /api/logs`
Retrieve current execution audit trail.

### `POST /api/clear`
Reset all agent and MCP logs.

### `POST /api/execute-cli`
Test a sandboxed CLI command directly.
```json
// Request
{ "command": "git status" }

// Response (blocked)
{ "success": false, "error": "Security Exception: Binary 'rm' is not in the sandbox whitelist." }
```

---

## 🎬 Antigravity Demo: End-to-End Workflow

This section documents the complete end-to-end experience of the Omnix AI system.

### Step 1: User Opens the Dashboard
- The UI renders at `localhost:5173` (dev) or `localhost:3000` (prod)
- The **four agent status nodes** (PL, OP, EX, LS) appear in Idle state at the top of the console panel
- MCP Server badge displays "Connected: Localhost:3000"

### Step 2: User Triggers a Preset or Types a Prompt
User clicks the preset chip:
> **"🚀 ML Study Plan + System Stats"**

Which sends the prompt:
> *"Create a 3-day study plan for Machine Learning basics including practice cards and calendar slots, then execute a safe command to verify system stats."*

### Step 3: PlannerAgent Decomposes the Prompt
- **PL node** begins pulsing violet (Thinking state)
- PlannerAgent NLP parsing extracts:
  - Topic: `Machine Learning`
  - Days: `3`
  - Task list from template
  - CLI command: `git status`

### Step 4: OptimizationAgent Refines Tasks
- **OP node** transitions to Working (green glow)
- Calls MCP tool `optimize_tasks` with the raw task list
- Returns 5 task cards with priorities: `High`, `Medium`, `Low` and durations: `90 mins`, `45 mins`, `30 mins`

### Step 5: StudyAgent Creates the Study Deck
- **EX node** transitions to Working
- Calls MCP tool `generate_study_deck` with topic `Machine Learning`
- Returns:
  - A concept summary paragraph
  - 3 active-recall flashcard Q&A pairs

### Step 6: SchedulerAgent Maps Calendar Blocks
- **LS node** transitions to Working
- Calls MCP tool `schedule_calendar` with `planDays=3`, `studyBlocks=<comma-separated task titles>`
- Returns 9+ calendar events (study blocks, breaks, reviews) across 3 days

### Step 7: PlannerAgent Executes Safe CLI Command
- Calls MCP tool `execute_safe_command` with `command=git status`
- **SecurityEngine** validates:
  - ✅ Binary `git` is whitelisted
  - ✅ No dangerous operators detected
  - ✅ Pattern matches `git status` whitelist
- `child_process.exec` runs the command in the workspace directory
- Returns stdout output

### Step 8: Dashboard Updates in Real-Time
All panels populate simultaneously:
- **Planner Board**: 5 task cards with priority badges and duration labels. Click ✓ to mark tasks complete.
- **Active Study & Flashcards**: Concept summary displayed. Interactive flip-card deck. Use Prev/Next to navigate cards.
- **Life Calendar Timeline**: Color-coded event rows per day (🔵 Study, 🟢 Break, 🟣 Review)
- **Sandbox CLI & MCP Audits**: Terminal panel shows the full audit trail with timestamps, tool names, and status codes

### Step 9: Testing the Security Sandbox (The Antigravity Moment!)
In the **Sandbox CLI panel**, the user types:
```
rm -rf .
```
Clicks **Execute**.

The SecurityEngine immediately:
- Detects `rm` binary → NOT in whitelist
- Returns `BLOCKED` status
- Logs the violation to the MCP audit terminal:
```
[HH:MM:SS] BLOCKED • Tool: execute_safe_command
Args: {"command":"rm -rf ."}
Reason: Binary 'rm' is not in the sandbox whitelist.
```

The CLI output shows a red `ShieldAlert` icon and **"Sandbox verdict: BLOCKED/FAILED"** — demonstrating the security engine working in real-time.

### Step 10: Exporting / Resetting the Workspace
User clicks **"Clear System DB"** to wipe all agent logs, MCP audit trail, and cached results — starting fresh for a new demo run.

---

## ✅ GitHub-Ready Checklist

- [x] `README.md` — Full documentation with architecture diagram
- [x] `.gitignore` — Excludes `node_modules/`, `dist/`, `.env`
- [x] `.env.example` — Environment variable template
- [x] Modular TypeScript source with no circular dependencies
- [x] Security engine with injection prevention and whitelist validation
- [x] MCP Server with schema validation and complete audit logging
- [x] ADK Multi-Agent system with 4 specialized agents
- [x] React + Vite frontend with Vite dev proxy configured
- [x] `npm run init-project` — One-command setup
- [x] `npm run dev:backend` + `npm run dev:frontend` — Split dev servers
- [x] `npm run build` — Production build pipeline

---

*Built with ❤️ using Node.js, TypeScript, React, Vite, and Express. Powered by the Antigravity IDE.*
#   O m n i x - A i  
 