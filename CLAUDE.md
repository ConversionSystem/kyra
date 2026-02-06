# CLAUDE.md — Development Rules for Kyra

## The Golden Rule

**SIMPLICITY ABOVE ALL.** Every change should be as small and focused as possible. If you can solve it with 5 lines instead of 50, do it. Less code = fewer bugs.

---

## Project Context

**Kyra** is a hosted AI assistant platform built on OpenClaw technology.

**Architecture:** Option C — Session-Based Isolation
- Single OpenClaw Gateway for all users
- User isolation via OpenClaw sessions
- Memory in Supabase + Pinecone (not file-based)
- Web app handles auth, UI, billing

**Key Docs:**
- `TECHNICAL-SPEC.md` — Full technical specification
- `README.md` — Project overview
- `tasks/todo.md` — Current development tasks

---

## Development Workflow

### 1. Plan First
- Read relevant files in the codebase
- Understand the problem completely
- Write a plan to `tasks/todo.md`

### 2. Get Approval
- The plan must have checkable todo items
- **Wait for approval before writing any code**
- Don't start work until the plan is verified

### 3. Execute Simply
- Work through todo items one at a time
- Mark items complete as you go
- Give high-level explanations of changes

### 4. Review & Document
- Add a review section to `tasks/todo.md`
- Summarize what changed and why
- Note any relevant information for future work

---

## Code Change Rules

### Simplicity
- **Minimal impact** — only touch code relevant to the task
- **Small changes** — avoid massive refactors
- **One thing at a time** — don't bundle unrelated changes
- **Less is more** — if in doubt, do less

### Quality
- **NO LAZY FIXES** — find the root cause, fix it properly
- **NO TEMPORARY HACKS** — every fix should be permanent
- **NO BAND-AIDS** — if something is broken, understand why
- **You are a senior developer** — act like it

### Safety
- Don't introduce new bugs
- Test your changes mentally before committing
- If a change feels risky, it probably is — find a simpler way

---

## Key Architecture Decisions

1. **OpenClaw Integration:** Use HTTP API, not direct library imports
2. **Memory Storage:** Supabase + Pinecone, NOT file-based MEMORY.md
3. **Session Isolation:** Each user gets unique session key: `kyra-user-{user_id}`
4. **Auth:** Supabase Auth with JWT, Row Level Security
5. **Billing:** Stripe Checkout + Customer Portal

---

## File Naming Conventions

```
Components: PascalCase.tsx (e.g., ChatInterface.tsx)
Utilities: camelCase.ts (e.g., formatDate.ts)
API Routes: route.ts in nested folders
Types: index.ts in types/ folder
```

---

## Reminders

- Read before you write
- Plan before you code
- Ask before you assume
- Simple before clever
- **Never. Be. Lazy.**
