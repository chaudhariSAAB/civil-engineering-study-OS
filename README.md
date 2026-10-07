# Civil Engineering Study OS

A free-first, local-first AI-powered study system for Civil Engineering, designed around Semesters 1–8 and traceable college material.

## Vision

- Semester 1–8 curriculum workspace
- College WhatsApp PDFs, notes, question banks, lab manuals and PPTs as primary sources
- AI Teacher, Numerical Solver, Exam Preparation, Lab Assistant, Viva Practice and Project Guide
- Source labels: College Material, AI Explanation, External Reference, Needs Verification
- Local/open-source AI first, with cloud services optional rather than required for core learning
- Offline-ready architecture and privacy-aware personal study workflows

## Current implementation

The deployed implementation includes Semester 1–8 navigation, college-material ingestion and source traceability, Knowledge Base 3.0, Knowledge Graph 2.0, AI Teacher, Numerical Solver 2.0, Exam System 3.0, Question Bank intelligence, Lab Assistant 3.0, Viva Practice 2.0, Adaptive Learning 2.0, Revision Scheduler, Drawing & Diagram AI, deterministic civil calculators, Surveying/GIS tools, Estimation & Costing, AutoCAD/Revit/BIM learning tracks, Project & Final Year Manager 2.0 with an evidence ledger, Career & Internship OS, Local AI/Ollama support, privacy/offline controls, responsive UI, and AppDeploy QA validation.

Core engineering calculations are deterministic where implemented; AI-generated content is explicitly marked as AI-assisted and college-specific claims must be checked against stored college material.

## Architecture

```text
College Material
      ↓
Document Processing
      ↓
Civil Knowledge Base
      ↓
AI Study Orchestrator
      ↓
Teacher / Numerical / Exam / Lab / Viva / Research / Career / Project agents
      ↓
Student Dashboard
      ↓
Semester 1 → Semester 8
```

## Free-first stack direction

- React + Vite frontend
- Python services for engineering computation and data workflows
- Local AI through Ollama/open-source models where practical
- SQLite for simple local persistence, with PostgreSQL as an optional scalable layer
- Jupyter for engineering notebooks
- Git/GitHub for version control

## Source-of-truth rule

When college material is supplied, it is the primary source. The system must not silently invent college-specific syllabus, faculty, exam rules, marks, deadlines or question-bank content.

## Status

Foundation implementation is active. Advanced ingestion, retrieval/RAG, AI agents, numerical verification, labs, viva, adaptive learning, offline packaging, engineering tools, career features, automated testing and production hardening are planned as subsequent milestones.
