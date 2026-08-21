# PROJECT RULES

> **Notice to AI Assistant**: Read `PROJECT_RULES.md` at the beginning of every chat session before generating code.

## Tech Stack & Configuration

- **Backend Framework**: Django + Django REST Framework (DRF) + SimpleJWT
- **Frontend Framework**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Package Managers**: 
  - Backend: `pip` / `py -m venv myworld`
  - Frontend: `npm`
- **Database**: SQLite (`IndiaLaw.db`, `db.sqlite3`) / PostgreSQL / MongoDB

---

## AI Development Rules

1. **One Task per Prompt**: Execute tasks incrementally. Focus strictly on the single prompt topic without unsolicited broad refactoring.
2. **Never change existing APIs** unless explicitly instructed to do so.
3. **Never rename files or functions** without prior request or authorization.
4. **Never delete existing code** unless replacing or explicitly asked to remove deprecated code.
5. **Keep Components Modular**: Aim to keep frontend components and individual service files focused and under 300 lines where practical.
6. **Plan & Explain First**: Provide a detailed plan and code explanation before writing implementation code.
7. **Scoped Touches**: Only modify the specific files required for the assigned task. Leave unrelated modules completely untouched.
8. **Freeze Working Code**: When a feature works, commit to Git. If something breaks, reset or restore safely.
9. **Maintain Documentation**: Keep `ARCHITECTURE.md` and `CHANGELOG.md` updated as features are implemented.
10. **Ask When Unsure**: If requirements or implementation options are ambiguous, ask for clarification before proceeding.
