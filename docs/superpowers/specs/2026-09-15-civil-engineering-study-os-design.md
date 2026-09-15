# Civil Engineering Study OS — Architecture Design

Date: 2026-09-15
Status: Approved for implementation

## 1. Vision

Build a free-first, local-first AI-powered Civil Engineering Study OS for a B.Tech Civil Engineering student, covering Semesters 1–8. The system combines college-material retrieval, AI tutoring, numerical solving, exam preparation, labs/viva, projects, career learning, and engineering tools in one modular workspace.

The system must prefer supplied college material as the primary academic source. AI-generated explanations and external references must remain visibly separated, and uncertain or college-specific facts must be marked for verification.

## 2. Product principles

- Free-first: no paid API is required for the core workflow.
- Local-first: support Ollama/local models and local data storage where practical.
- Source-grounded: answers should identify the source/material used.
- Deterministic where possible: calculations, unit conversion, grading rules, and validation should use deterministic code rather than LLM guesses.
- Human approval for sensitive actions: authentication, privacy, file handling, destructive operations, and autonomous external actions require explicit user control.
- Modular: agents/features communicate through stable interfaces and can be added independently.
- Honest UX: unfinished functionality is clearly marked rather than simulated.
- Offline-capable: core notes, retrieval, calculations, and study tools should continue to work without internet when local dependencies are available.

## 3. Architecture

```text
Civil Engineering Study OS
│
├── Web UI / PWA
│   ├── Dashboard
│   ├── Semester 1–8
│   ├── Ask My College
│   ├── Study / Revision
│   ├── Exams / Mock Tests
│   ├── Numericals / Calculators
│   ├── Labs / Viva
│   ├── Projects / Career
│   └── Settings / Source Control
│
├── Application API
│   ├── Courses & curriculum
│   ├── Documents & ingestion
│   ├── Retrieval
│   ├── Study progress
│   ├── Quiz/exam engine
│   ├── Calculation services
│   └── Export services
│
├── AI Orchestrator
│   ├── Teacher Agent
│   ├── Numerical Agent
│   ├── Exam Agent
│   ├── Viva Agent
│   ├── Lab Agent
│   ├── Research Agent
│   ├── Drawing Agent
│   ├── Project Agent
│   ├── Coding/Data Agent
│   ├── Revision Agent
│   └── Career Agent
│
├── Knowledge Layer
│   ├── College material
│   ├── Curriculum graph
│   ├── Topic graph
│   ├── Source metadata
│   ├── Embeddings/index
│   └── Study history
│
└── Local Services
    ├── SQLite initially
    ├── Filesystem document store
    ├── Ollama adapter
    ├── Python calculation engine
    └── Optional self-hosted PostgreSQL/vector DB later
```

## 4. Technology direction

Initial implementation should use a simple maintainable stack:

- Frontend: React + TypeScript + Vite/PWA.
- Backend: Python + FastAPI.
- Database: SQLite first; keep repository interfaces ready for PostgreSQL later.
- AI: provider interface with Ollama as the primary local adapter; optional external adapters must never be mandatory.
- Retrieval: local document extraction plus a replaceable vector/search interface.
- Calculations: Python deterministic services with explicit formulas, units, assumptions, and warnings.
- Testing: pytest for backend/domain logic; frontend unit/component tests and browser-level smoke tests as the UI grows.
- Packaging: local development first; deployment adapters can be added later.

The system should avoid premature microservices. Start as a modular monolith with clear domain boundaries, then extract services only when justified.

## 5. Knowledge and source model

Every imported academic item receives metadata:

- institution
- program
- semester
- subject
- unit
- topic
- material type
- source label
- source filename/title
- version/date when known
- verification status

Source labels:

1. College Material — highest priority for college-specific questions.
2. AI Explanation — generated teaching content.
3. External Reference — outside material, clearly labeled.
4. Needs Verification — uncertain or conflicting information.

Retrieval should prioritize College Material, then verified supporting material. The answer layer should expose citations/references to the source chunks used.

## 6. Core data domains

Initial domain entities:

- Semester
- Course
- Unit
- Topic
- Document
- DocumentChunk
- Source
- StudySession
- Progress
- Question
- Quiz
- Attempt
- Flashcard
- Formula
- Calculation
- LabExperiment
- VivaQuestion
- Project
- Skill
- CareerTrack

Keep domain models independent from UI components and AI providers.

## 7. AI orchestration

The orchestrator receives a user task, classifies intent, selects the smallest useful agent/tool set, retrieves relevant context, and returns a structured result.

Example:

```text
User question
   ↓
Intent classification
   ↓
College-material retrieval
   ↓
Agent selection
   ↓
Deterministic tools where needed
   ↓
LLM explanation
   ↓
Source + confidence + verification state
```

Numerical tasks should call deterministic calculation tools before explanation. The LLM must not be treated as the source of mathematical truth.

## 8. Study engine

The study engine supports:

- What should I study now?
- Topic mastery tracking
- Adaptive practice
- Spaced repetition
- Weak-topic detection
- 15-minute quick study
- Exam emergency mode
- Notes and formula sheets
- MCQ/theory/numerical practice
- Mock examinations
- Answer-writing feedback
- Progress dashboards

Exam prediction is probabilistic guidance only and must never claim exact future questions.

## 9. Civil engineering modules

Planned modules include:

- Engineering mathematics and fundamentals
- Engineering mechanics / strength of materials
- Surveying
- Fluid mechanics / hydraulics
- Geotechnical engineering
- Structural analysis
- RCC / steel
- Transportation
- Environmental engineering
- Hydrology / water resources
- Construction management
- Estimation and costing
- Concrete/materials
- CAD/BIM/software learning
- Python/data analysis for civil engineering
- Labs and viva
- Final-year project support
- Internship/career preparation

College-specific curriculum must be populated from supplied official material rather than invented.

## 10. Safety and integrity

- Never fabricate college rules, syllabus details, marks, deadlines, or faculty instructions.
- Flag unsupported assumptions.
- For engineering design/calculation, clearly distinguish educational estimation from professional engineering approval.
- Do not present generated drawings/designs as construction-ready without qualified engineering review.
- Respect copyright/licensing for uploaded books and standards.
- Do not redistribute restricted standards or copyrighted material merely because it was indexed.

## 11. Error handling

Every subsystem should return structured errors with:

- stable error code
- user-readable message
- developer/debug detail when appropriate
- retryability
- source/context information where relevant

The UI must have loading, empty, success, partial-success, and error states.

## 12. Testing strategy

Minimum quality gates:

- Unit tests for domain rules and deterministic calculations.
- Retrieval tests using small fixture documents.
- API integration tests.
- AI adapter contract tests using mocked/local models.
- Frontend component tests.
- End-to-end smoke test for upload → index → ask → cited answer.
- Numerical golden tests with known inputs/outputs.
- Security checks for file paths, uploads, prompt injection boundaries, and secrets.

No feature is considered complete solely because it renders in the UI.

## 13. Delivery phases

### Phase 0 — Foundation
Repository structure, documentation, configuration, test harness, local run commands, basic UI shell, API shell.

### Phase 1 — Academic Core
Sem 1–8 data model, course/unit/topic navigation, document ingestion, source metadata, local search/retrieval, Ask My College.

### Phase 2 — Study Engine
Teacher, notes, quizzes, flashcards, progress, revision, adaptive study, exam mode.

### Phase 3 — Civil Tools
Numerical engine, unit checker, formulas, calculators, lab/viva, diagram/drawing learning.

### Phase 4 — Advanced Learning
Projects, research, coding/data, software-learning tracks, career mode, portfolio/export.

### Phase 5 — Offline/PWA hardening
Offline cache, local model integration, robust local data management, import/export/backup.

### Phase 6 — QA and release
Full test suite, security review, accessibility, mobile responsiveness, documentation, reproducible setup, release checklist.

## 14. Definition of done

A feature is done only when:

1. Its domain behavior is implemented.
2. Its UI/API behavior is implemented where applicable.
3. Tests exist for important logic.
4. Error/empty/loading states are handled.
5. Source/verification behavior is correct for academic features.
6. No required paid service blocks the core path.
7. Documentation is updated.
8. Verification evidence exists before claiming completion.

## 15. Initial repository layout

```text
civil-engineering-study-OS/
├── frontend/
├── backend/
├── ai/
├── knowledge-base/
│   ├── semester-1/
│   ├── semester-2/
│   ├── semester-3/
│   ├── semester-4/
│   ├── semester-5/
│   ├── semester-6/
│   ├── semester-7/
│   └── semester-8/
├── python/
├── tests/
├── docs/
└── README.md
```

This layout is intentionally a starting boundary, not a promise that every folder must be populated immediately.
