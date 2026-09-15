# Civil Engineering Study OS Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the verified Phase 0 foundation of the Civil Engineering Study OS so later academic, AI, calculation, and study modules can be added without restructuring the core.

**Architecture:** Use a modular monolith with a React/TypeScript frontend, Python/FastAPI backend, SQLite persistence, explicit domain/service boundaries, and provider interfaces for local AI and retrieval. Keep deterministic engineering logic separate from LLM orchestration and make every boundary testable.

**Tech Stack:** React, TypeScript, Vite, Python, FastAPI, Pydantic, SQLite, pytest, frontend unit/component testing, Ollama adapter interface.

**Spec:** `docs/superpowers/specs/2026-09-15-civil-engineering-study-os-design.md`

## Global Constraints

- Free-first: no paid API is required for the core workflow.
- Local-first: support Ollama/local models and local data storage where practical.
- Source-grounded: answers should identify the source/material used.
- Deterministic where possible: calculations, unit conversion, grading rules, and validation should use deterministic code rather than LLM guesses.
- Human approval for sensitive actions: authentication, privacy, file handling, destructive operations, and autonomous external actions require explicit user control.
- Modular: agents/features communicate through stable interfaces and can be added independently.
- Honest UX: unfinished functionality is clearly marked rather than simulated.
- Offline-capable: core notes, retrieval, calculations, and study tools should continue to work without internet when local dependencies are available.

---

### Task 1: Repository and development foundation

**Files:**
- Create: `README.md`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `docs/architecture.md`
- Create: `frontend/README.md`
- Create: `backend/README.md`
- Create: `tests/README.md`

**Interfaces:**
- Produces documented local setup commands and repository boundaries used by all later tasks.

- [ ] **Step 1: Write the repository smoke test**

Create `tests/test_repository_layout.py` with a test that asserts the required top-level directories and the design/spec files exist.

```python
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_foundation_layout_exists():
    required = [
        "frontend",
        "backend",
        "ai",
        "knowledge-base",
        "python",
        "tests",
        "docs",
        "docs/superpowers/specs/2026-09-15-civil-engineering-study-os-design.md",
        "docs/superpowers/plans/2026-09-15-civil-engineering-study-os-foundation.md",
    ]
    for path in required:
        assert (ROOT / path).exists(), path
```

- [ ] **Step 2: Run the test and verify the initial failure**

Run:

```bash
python -m pytest tests/test_repository_layout.py -v
```

Expected: FAIL because the implementation directories have not yet been created.

- [ ] **Step 3: Create the documented repository skeleton**

Create the directories from the approved architecture and add concise README files describing each boundary. Add `.gitignore` rules for Python virtual environments, Node dependencies, build output, local databases, model caches, secrets, and OS/editor files. `.env.example` must contain only placeholder variable names and no credentials.

- [ ] **Step 4: Re-run the repository test**

Run:

```bash
python -m pytest tests/test_repository_layout.py -v
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add README.md .gitignore .env.example docs/architecture.md frontend backend ai knowledge-base python tests
 git commit -m "chore: establish study OS repository foundation"
```

### Task 2: Backend application shell and health contract

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/app/__init__.py`
- Create: `backend/app/main.py`
- Create: `backend/app/api/__init__.py`
- Create: `backend/app/api/health.py`
- Create: `backend/tests/test_health.py`

**Interfaces:**
- Produces `GET /api/health` returning a typed JSON object with `status`, `service`, and `version`.

- [ ] **Step 1: Write the failing health test**

```python
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_contract():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["service"] == "civil-engineering-study-os"
    assert "version" in response.json()
```

- [ ] **Step 2: Run the focused test**

Run from `backend/`:

```bash
python -m pytest tests/test_health.py -v
```

Expected: FAIL because the application and route do not exist yet.

- [ ] **Step 3: Implement the minimal FastAPI application**

Define the app in `backend/app/main.py`, include the health router under `/api`, and use a small Pydantic response model. Keep configuration separate from route logic.

- [ ] **Step 4: Run the focused test**

Run:

```bash
python -m pytest tests/test_health.py -v
```

Expected: PASS.

- [ ] **Step 5: Run backend tests and commit**

```bash
python -m pytest -q
 git add backend
 git commit -m "feat: add backend health API"
```

### Task 3: Domain model and SQLite persistence boundary

**Files:**
- Create: `backend/app/core/config.py`
- Create: `backend/app/db.py`
- Create: `backend/app/domain/__init__.py`
- Create: `backend/app/domain/models.py`
- Create: `backend/app/repositories/__init__.py`
- Create: `backend/app/repositories/course_repository.py`
- Create: `backend/tests/test_course_repository.py`

**Interfaces:**
- `Course` fields: `id: str`, `semester: int`, `code: str | None`, `name: str`, `description: str | None`.
- `CourseRepository.create(course: Course) -> Course`.
- `CourseRepository.get(course_id: str) -> Course | None`.
- `CourseRepository.list_by_semester(semester: int) -> list[Course]`.

- [ ] **Step 1: Write repository behavior tests**

Test creating a course, retrieving it by ID, and listing it by semester. Also test that a course in another semester is excluded.

- [ ] **Step 2: Run the repository tests**

Run:

```bash
python -m pytest tests/test_course_repository.py -v
```

Expected: FAIL because the model and repository do not exist.

- [ ] **Step 3: Implement SQLite-backed persistence**

Use SQLite with a small schema initialization function. Keep SQL/storage details inside the repository boundary so later PostgreSQL migration does not leak into API or domain code.

- [ ] **Step 4: Run tests and inspect the generated database behavior**

Run:

```bash
python -m pytest tests/test_course_repository.py -v
```

Expected: PASS with isolated temporary databases in tests.

- [ ] **Step 5: Commit**

```bash
git add backend/app/core backend/app/db.py backend/app/domain backend/app/repositories backend/tests/test_course_repository.py
 git commit -m "feat: add course domain and sqlite repository"
```

### Task 4: Frontend application shell

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/styles.css`
- Create: `frontend/src/app/AppShell.tsx`
- Create: `frontend/src/app/navigation.ts`
- Create: `frontend/src/components/StatusCard.tsx`
- Create: `frontend/src/__tests__/AppShell.test.tsx`

**Interfaces:**
- `AppShell` renders navigation entries for Dashboard, Semesters, Ask My College, Study, Exams, Numericals, Labs/Viva, Projects, Career, and Settings.
- `StatusCard` accepts `title: string`, `value: string`, and optional `description: string`.

- [ ] **Step 1: Write the failing UI test**

Create a component test that renders `AppShell` and asserts the core navigation labels are present.

- [ ] **Step 2: Run the focused frontend test**

Run:

```bash
npm test -- --run src/__tests__/AppShell.test.tsx
```

Expected: FAIL because the frontend shell does not exist.

- [ ] **Step 3: Implement the minimal responsive shell**

Use semantic HTML and keyboard-accessible navigation. Do not build fake feature screens; unavailable modules should appear as clearly labeled placeholders or navigation destinations without pretending functionality exists.

- [ ] **Step 4: Run the focused test and production build**

Run:

```bash
npm test -- --run src/__tests__/AppShell.test.tsx
npm run build
```

Expected: PASS and a successful production build.

- [ ] **Step 5: Commit**

```bash
git add frontend
 git commit -m "feat: add study OS frontend shell"
```

### Task 5: AI provider and orchestrator contracts

**Files:**
- Create: `ai/README.md`
- Create: `backend/app/ai/__init__.py`
- Create: `backend/app/ai/contracts.py`
- Create: `backend/app/ai/ollama_provider.py`
- Create: `backend/app/ai/orchestrator.py`
- Create: `backend/tests/test_ai_contracts.py`

**Interfaces:**
- `ChatMessage(role: str, content: str)`.
- `AIRequest(messages: list[ChatMessage], temperature: float = 0.2)`.
- `AIResponse(content: str, provider: str, model: str | None)`.
- `AIProvider.generate(request: AIRequest) -> AIResponse`.
- `StudyOrchestrator.answer(request: AIRequest) -> AIResponse`.

- [ ] **Step 1: Write contract tests using a fake provider**

Verify that the orchestrator delegates to the configured provider and returns provider metadata without requiring a network call.

- [ ] **Step 2: Run the focused tests**

```bash
python -m pytest tests/test_ai_contracts.py -v
```

Expected: FAIL because contracts/orchestrator do not exist.

- [ ] **Step 3: Implement provider abstractions and local adapter boundary**

The Ollama adapter must be isolated behind `AIProvider`. The foundation must not require Ollama to be running for tests or for the backend health endpoint.

- [ ] **Step 4: Run tests**

```bash
python -m pytest -q
```

Expected: PASS. Network-dependent integration tests must be skipped unless an explicit local integration environment is available.

- [ ] **Step 5: Commit**

```bash
git add ai backend/app/ai backend/tests/test_ai_contracts.py
 git commit -m "feat: add local AI provider contracts"
```

### Task 6: Verification, documentation, and CI baseline

**Files:**
- Create: `.github/workflows/test.yml`
- Modify: `README.md`
- Modify: `docs/architecture.md`
- Create: `docs/development.md`
- Create: `tests/test_configuration.py`

**Interfaces:**
- CI must run backend tests and frontend build/test commands without requiring secrets or paid services.

- [ ] **Step 1: Write configuration safety tests**

Verify that the repository does not require real API keys and that `.env.example` contains no non-placeholder secret values.

- [ ] **Step 2: Run the full local verification suite**

```bash
python -m pytest -q
cd frontend
npm ci
npm test -- --run
npm run build
```

Expected: all backend tests pass, frontend tests pass, and the production build succeeds.

- [ ] **Step 3: Add GitHub Actions**

Configure a matrix-free baseline workflow using supported stable Python and Node versions, caching dependencies where practical, with no paid service or secret requirement.

- [ ] **Step 4: Update documentation**

Document local setup, test commands, architecture boundaries, how to add a new domain module, and the free/local AI principle.

- [ ] **Step 5: Run final verification**

Repeat the complete local verification commands and inspect git status for unintended generated files or secrets.

- [ ] **Step 6: Commit**

```bash
git add .github README.md docs tests
 git commit -m "ci: add foundation verification and development docs"
```

## Plan self-review

- Spec coverage: foundation, modular architecture, local-first AI boundary, source-ready domain model, deterministic-service separation, testing, error-ready API structure, documentation, and honest UX are covered. Full study modules intentionally belong to later sub-project plans.
- Placeholder scan: no TODO/TBD implementation placeholders are required by this plan.
- Type consistency: `Course`, repository signatures, AI request/response contracts, and frontend component interfaces are explicitly defined before downstream tasks consume them.
