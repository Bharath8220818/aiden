# AIDEN - Autonomous Intelligence Data Engineering Nexus
# Comprehensive Project Documentation
## Version 3.0 | August 2026

---

# TABLE OF CONTENTS

1. Executive Summary
2. Project Vision and Positioning
3. Current Project Status
4. Gap Analysis
5. System Architecture
6. Architecture Studio
7. AI Multi-Agent System
8. Tool Gateway and Connectors
9. Unified Operations Center
10. Email Alert System
11. CLI Interface for AI Agents
12. Algorithm Design
13. AI Multi-Agent Training Guide
14. Free Deployment Plan
15. Docker DevOps and MLOps
16. Connection Architecture
17. Technology Stack and Requirements
18. Development Roadmap
19. MVP Demo Flow
20. Appendix Block Diagrams

---

# 1. Executive Summary

AIDEN (Autonomous Intelligence Data Engineering Nexus) is an AI-powered Data Engineering Control Plane that connects data engineering tools, cloud services, databases, pipelines, streaming systems, monitoring systems, DevOps infrastructure, and AI agents into one unified platform.

## 1.1 Core Value Proposition

AIDEN does NOT replace Airflow, Kafka, dbt, Spark, or other tools. Instead, AIDEN becomes the single control layer through which a Data Engineer can:

| Capability | Description |
|-----------|-------------|
| Design | Visually create architecture diagrams (Architecture Studio) |
| Build | Generate pipelines from natural language (AI Pipeline Generation) |
| Connect | Unify all data engineering tools (Tool Gateway) |
| Monitor | Real-time infrastructure health (Live Infrastructure Mode) |
| Detect | Automatic failure detection (Monitoring Agent) |
| Diagnose | AI-powered root cause analysis (Debug Agent + RAG) |
| Fix | Automated repair proposals (Self-Healing Agent) |
| Notify | Email and in-app alerts (Alert Engine) |
| CLI | Terminal-based AI agent access (AIDEN CLI) |

## 1.2 Project Maturity Dashboard



## 1.3 Codebase Statistics

| Metric | Value |
|--------|-------|
| TypeScript/TSX files | 161 |
| Python files | 150 |
| Frontend pages | 30 |
| Backend API routers | 21 |
| Git commits | 60+ |
| Contributors | 6+ |
| AI Agents | 11 |
| API Endpoints | 73+ |

---

# 2. Project Vision and Positioning

## 2.1 What AIDEN IS

An AI-native control plane that unifies the Data Engineer tools, workflows, and operational intelligence in one workspace.

## 2.2 What AIDEN IS NOT

- NOT a replacement for Airflow, Kafka, Spark, or dbt
- NOT a generic dashboard template
- NOT a toy feature - it is the central object connecting the whole platform

## 2.3 Target Users

| Role | How They Use AIDEN |
|------|-------------------|
| Data Engineer | Design architecture, build pipelines, monitor infrastructure |
| Data Analyst | Query data, generate reports, explore lineage |
| Platform Engineer | Manage infrastructure, deploy, troubleshoot |
| DevOps Engineer | CI/CD, monitoring, incident response |
| Team Lead | Overview dashboards, approvals, governance |

## 2.4 AIDEN Design Philosophy

The Architecture Studio is NOT a separate feature. It is the central hub:




---

# 3. Current Project Status

## 3.1 What Has Been Built

### Frontend (30 Pages, 161 TypeScript Files)

| Module | Pages | Status |
|--------|-------|--------|
| Dashboard and Analytics | 2 | DONE |
| Pipeline Management | 5 | DONE |
| AI and Agents | 3 | DONE |
| Architecture Studio | 1 | DONE (ReactFlow) |
| Design and Templates | 2 | DONE |
| Operations and Monitoring | 2 | DONE |
| Governance and Team | 2 | DONE |
| Authentication | 3 | DONE |
| Settings and Admin | 1 | DONE |
| Public Pages | 5 | DONE |
| Knowledge Base | 2 | DONE |

### Backend (21 Routers, 150 Python Files)

| Module | Endpoints | Status |
|--------|-----------|--------|
| Auth (JWT + Supabase) | 6 | DONE |
| Pipeline CRUD | 8 | DONE |
| Health Check | 5 | DONE |
| Architecture | 4 | DONE |
| Analytics and Audit | 6 | DONE |
| AI Agents | 4 | DONE |
| Multimodal | 3 | DONE |
| Schemas | 6 | DONE |
| Learning and Coding | 6 | DONE |
| Team and Templates | 4 | DONE |
| Voice and WebSocket | 3 | DONE |

### Architecture Studio (Verified Working)

| Feature | Status |
|---------|--------|
| ReactFlow editable canvas | DONE (commit ccf014e) |
| 3-panel layout | DONE |
| 60+ architecture components | DONE |
| Animated data-flow edges | DONE |
| AI generation panel | DONE (commit a909ada) |
| Live infrastructure monitoring | DONE (commit 8f4ed68) |
| Architecture zones | DONE (commit 92200aa) |
| AI Architecture Copilot | DONE (commit 92200aa) |
| Copilot action buttons | DONE (commit aae5e72) |
| Floating toolbar | DONE |
| Auto-layout | DONE |
| Undo/Redo (50-state history) | DONE |
| Keyboard shortcuts | DONE |

### AI/ML System

| Component | Status |
|-----------|--------|
| Intent Parser (AI + rule-based) | Working |
| Pipeline Builder Agent | Working |
| Extraction Agent | Working |
| Monitoring Agent | Working |
| Self-Healing Agent | Working (schema_drift) |
| RAG Memory (Qdrant + MiniLM) | Connected |
| Multimodal Service | Remote Colab proxy |
| LoRA Fine-tuning Pipeline | Scripts ready |
| Fine-tuning Dataset (600 intent) | Generated |
| Fine-tuning Dataset (590 pipeline) | Generated |

## 3.2 Known Issues

| Issue | Impact | Fix |
|-------|--------|-----|
| Frontend .env placeholder key | OAuth wont work in prod | Add real anon key |
| LLaVA model not downloaded | Multimodal uses mock | Needs GPU or Colab |
| Airflow not connected | No real DAG execution | Deploy + connector |
| No email sending | Alerts not delivered | Configure SMTP |
| Render not verified | Production unreachable | Test deployment |

---

# 4. Gap Analysis (PDF Vision vs Implementation)

## 4.1 Gap Summary

| Feature | PDF Vision | Current | Gap |
|---------|-----------|---------|-----|
| Architecture Studio | Defined | Built (ReactFlow) | Closed |
| AI architecture generation | Defined | Working | Closed |
| Live infrastructure mode | Defined | Working | Closed |
| AI Copilot chat | Defined | Working | Closed |
| Copilot actions modify canvas | Defined | Working | Closed |
| Architecture zones | Defined | Working | Closed |
| Version history | Defined | Not built | OPEN |
| Export (PNG/SVG/JSON) | Defined | Not built | OPEN |
| Template library | Defined | Not built | OPEN |
| Tool Gateway | Defined | Partial (mock) | OPEN |
| Unified Operations Dashboard | Defined | Partial | OPEN |
| Email alert system | Defined | Not built | OPEN |
| Data lineage | Defined | Not built | OPEN |
| CLI interface | Defined | Not built | OPEN |
| Self-healing end-to-end | Defined | Partial | OPEN |
| Image to Architecture | Defined | Not built | OPEN |
| Audio to Architecture | Defined | Not built | OPEN |
| Command palette | Defined | Not built | OPEN |
| Collaboration | Defined | Not built | OPEN |
| MLOps pipeline | Not in PDF | Not built | NEW |

## 4.2 Missing Points from PDF Analysis

1. No concrete deployment plan
2. No AI training data requirements
3. No Docker/DevOps/MLOps pipeline
4. No connection architecture details
5. No CLI specification
6. No email integration details
7. No cost analysis
8. No testing strategy


---

# 5. System Architecture

## 5.1 High-Level Platform Architecture (7 Layers)

1. Presentation: React 19 + TypeScript + Vite + Tailwind + ReactFlow
2. API Gateway: FastAPI + JWT + Rate Limiting (60/min) + CORS
3. Core Services: AI Orchestrator, Architecture Engine, Pipeline Executor
4. AI Agents: 11 agents (Pipeline, SQL, Debug, Monitor, Extract, Self-Healing, Architecture, RAG, Multimodal, Voice, Orchestrator)
5. Tool Gateway: Universal connector (Airflow, Kafka, dbt, Spark, PostgreSQL)
6. Event Bus: Redis Pub/Sub + WebSocket + Async Task Queue
7. Data Layer: PostgreSQL (Supabase), Qdrant (Vector), Redis (Cache)

## 5.2 Data Flow

Sources (PostgreSQL, MySQL, MongoDB, REST API)
  -> Ingestion (Kafka, Airflow, Flink, Kinesis)
  -> Processing (Spark, dbt, Python)
  -> Storage (Snowflake, Data Lake, S3)
  -> Analytics (Power BI, Dashboards)
  -> AIDEN Monitor -> Alert Engine -> Email + In-App

## 5.3 Connection Architecture



Backend Config: statement_cache_size=0, pool_pre_ping=True, native_enum=False

## 5.4 Backend to AI Models

Embeddings: MiniLM-L6-v2 (384-dim, lazy loaded at startup)
LLM: TinyLlama-1.1B-Chat (CPU, lazy loaded on first request)
LoRA: Auto-loaded from models/ if ADAPTER_PATH set in .env
Ollama: localhost:11434, 15s timeout, fallback to keyword-based

---

# 6. Architecture Studio

## 6.1 Components

- TopBar: Title, Version, Status, Buttons (Generate AI, Copilot, Live/Static, History, Save, Export)
- AssetLibraryPanel (Left): Search, 11 categories, 60+ components, drag-and-drop
- ReactFlow Canvas (Center): Custom nodes, animated edges, zones, minimap
- PropertiesPanel (Right): Component details, edit, AI suggestions
- AICopilotPanel (slide-in): Chat, 8 quick actions, action buttons
- Floating Toolbar: Select, Pan, Add, Connect, Text, Group, Undo/Redo, Auto Layout

## 6.2 Default Architecture

Pre-loaded: PostgreSQL -> Airflow -> Kafka -> Spark -> dbt -> Snowflake -> Grafana
Connected by animated edges (CDC, Trigger, Stream, Orchestrate, Load, Transform, Metrics)

## 6.3 AI Copilot Actions

| Quick Action | Backend Response | Canvas Effect |
|-------------|-----------------|---------------|
| Add security | Vault node | New node + edge |
| Add monitoring | Prometheus + Grafana | 2 new nodes |
| Find bottlenecks | Prometheus + Grafana (if missing) | Conditional |
| Make production ready | All missing layers | Multiple nodes |
| Add disaster recovery | S3 backup node | New node + edge |
| Improve architecture | Missing monitoring/security | Nodes added |

---

# 7. AI Multi-Agent System

## 7.1 Agent List

| Agent | Purpose | Status |
|-------|---------|--------|
| Orchestrator | Routes tasks to correct agent | Working |
| Pipeline Agent | NL -> DAG + SQL + dbt | Working |
| SQL Agent | NL -> SQL query | Working |
| Debug Agent | Error -> root cause | Working |
| Monitoring Agent | Metrics -> anomaly | Working |
| Extraction Agent | Source -> schema | Working |
| Self-Healing Agent | Failure -> fix + approval | Working |
| Architecture Agent | NL -> architecture graph | Working |
| RAG Agent | Query -> context (Qdrant) | Working |
| Multimodal Agent | Image/Audio -> parsed | Colab proxy |
| Voice Agent | Audio -> text + intent | Working |

## 7.2 Agent Communication



---

# 8. Tool Gateway and Connectors

## 8.1 Universal Interface

Every tool implements: test(), health(), list(), get(), execute(), logs(), metrics()

## 8.2 Tool Capability Registry

| Tool | Concept | Key Capabilities |
|------|---------|-----------------|
| Airflow | ORCHESTRATOR | list_dags, run_dag, get_logs, get_status |
| Kafka | STREAM_PROCESSOR | list_topics, get_consumer_lag, produce, consume |
| PostgreSQL | DATABASE | list_tables, execute_query, get_connections |
| dbt | TRANSFORMER | list_models, run_model, get_lineage |
| Spark | COMPUTE_ENGINE | list_jobs, submit_job, get_logs |

## 8.3 Adding a New Connector

1. Define tool concept (ORCHESTRATOR, DATABASE, STREAM_PROCESSOR, ...)
2. Implement ToolConnector interface (7 methods)
3. Register in Tool Gateway
4. Add to Asset Library UI
5. Test connection via POST /api/v1/tools/connect

---

# 9. Unified Operations Center



---

# 10. Email Alert System

## 10.1 Alert Flow

Pipeline Failure -> Event Receiver -> Severity Classify -> AI Enrichment (Debug Agent + RAG)
-> Generate Content -> Template Render -> Send Email (SMTP) + In-App Notification + Audit Log

## 10.2 Email Template

Subject: [AIDEN][SEVERITY] Pipeline Failed: {pipeline_name}
Body: Pipeline name, environment, status, error, AI diagnosis (94% confidence), suggested fix, action buttons

## 10.3 Free Email Options

| Service | Free Tier | Setup |
|---------|-----------|-------|
| Brevo | 300/day | Easy |
| Gmail SMTP | 500/day | Easy |
| Resend | 3000/month | Easy |
| AWS SES | 62000/month | Medium |

---

# 11. CLI Interface for AI Agents

## 11.1 Architecture

CLI (Python click/typer) -> HTTP API -> AIDEN Backend (same FastAPI server as web)
Config: ~/.aiden/config.json (API URL, JWT token, project)

## 11.2 Commands

| Category | Commands |
|----------|----------|
| Auth | aiden login, aiden configure |
| Pipelines | aiden pipeline list/create/run/status/logs |
| Architecture | aiden architecture list/generate/export |
| SQL | aiden sql <query> |
| Monitoring | aiden monitor status/alerts/incidents |
| AI Agents | aiden agent run pipeline/debug/sql <prompt> |
| Connections | aiden connection list/add/test |
| Incidents | aiden incident list/analyze/fix |
| System | aiden health/version/doctor |

## 11.3 CLI to Backend Mapping

| CLI | Endpoint |
|-----|----------|
| aiden pipeline list | GET /api/v1/pipelines |
| aiden pipeline create | POST /api/v1/pipelines/from-prompt |
| aiden architecture generate | POST /api/v1/architecture/generate |
| aiden sql | POST /api/v1/agents/sql/execute |
| aiden monitor status | GET /api/v1/health/full |
| aiden health | GET /api/v1/health/healthz |

---

# 12. Algorithm Design

## 12.1 Intent Parsing

INPUT: NL prompt -> OUTPUT: pipeline config JSON
1. Preprocess (lowercase, tokenize, remove stop words)
2. Entity extraction (source, destination, schedule, transformations)
3. Reconciliation (AI result vs rule-based, prefer deterministic keyword matches)
4. Validation (source exists, different from dest, valid cron)
5. Output (JSON with source, dest, schedule, transforms, confidence)

## 12.2 Self-Healing

INPUT: Pipeline failure -> OUTPUT: Diagnosis + fix + approval
1. Detect (classify: schema_drift, connection, resource, code_error)
2. Collect (logs, schema, lineage, RAG search similar incidents)
3. Diagnose (pattern match -> RAG -> LLM, confidence scoring)
4. Generate fix (based on type + rollback plan + test cases)
5. Risk assessment (Low=auto, Medium=approval, High=block)
6. Deploy (apply, verify, update RAG with outcome)

## 12.3 Architecture Generation

INPUT: NL description + cloud provider -> OUTPUT: graph
1. Parse (extract services, relationships, constraints)
2. Resolve (SERVICE_CATALOG lookup, deduplicate)
3. Topology (Sources -> Ingestion -> Processing -> Storage -> Analytics)
4. Edges (determine type, generate label, set animation)
5. Enrich (add metrics, status, zone groupings)
6. Validate (all edges valid, no orphan nodes, no cycles)

## 12.4 RAG Search

INPUT: Query + context -> OUTPUT: knowledge chunks + scores
1. Query (normalize, extract entities, MiniLM embedding 384-dim)
2. Vector search (Qdrant, top-K=10, threshold=0.5)
3. Keyword fallback (if < 3 vector results)
4. Context assembly (top 5, < 2000 tokens)
5. LLM generation (system + context + query -> response with citations)

## 12.5 Email Alert

INPUT: System event -> OUTPUT: email + in-app + audit
1. Event (parse, classify severity, dedup 5min window)
2. Enrich (Debug Agent + RAG search similar incidents)
3. Generate (select template, fill with details)
4. Deliver (SMTP + in-app + WebSocket push + audit log)
5. Track (sent timestamp, email open, link click, status update)

---

# 13. AI Multi-Agent Training Guide

## 13.1 Training Data Requirements

| Agent | Data Type | Min | Current | Gap |
|-------|-----------|-----|---------|-----|
| Intent Parser | NL -> pipeline JSON | 600 | 600 | DONE |
| Pipeline Builder | NL -> DAG + SQL | 500 | 590 | DONE |
| SQL Agent | NL -> SQL | 500 | 590 | DONE |
| Extraction | Source -> schema | 200 | 80 | NEED 120 |
| Monitoring | Metrics -> anomaly | 300 | 100 | NEED 200 |
| Self-Healing | Error -> diagnosis+fix | 300 | 150 | NEED 150 |
| Debug | Error -> root cause | 200 | 0 | NEED 200 |
| Architecture | NL -> graph | 200 | 0 | NEED 200 |

## 13.2 Training Pipeline

1. Data Collection (synthetic, public datasets, production logs, manual)
2. Preprocessing (JSONL, 80/10/10 split, tokenize, conversation template)
3. LoRA Fine-tuning (TinyLlama, r=16 alpha=32, peft+trl)
4. Evaluation (field accuracy, JSON validity, exact match)
5. Deployment (set ADAPTER_PATH in .env, backend auto-loads)

## 13.3 Training Commands

python scripts/generate_synthetic_data.py --agent intent --count 600 --output data/intent_dataset_v3.jsonl
python scripts/train_agent.py --agent intent --data data/intent_dataset_v3.jsonl --epochs 3 --batch 2 --model TinyLlama/TinyLlama-1.1B-Chat-v1.0 --output models/intent-parser
python scripts/evaluate_intent.py --data data/intent_dataset_v3.jsonl --mode llm

## 13.4 Hardware

| Config | Time (600 ex, 3 epochs) | Cost |
|--------|------------------------|------|
| CPU only (i7) | 8-12 hours | Free |
| Colab Free (T4) | 30-45 min | Free |
| Colab Pro (A100) | 5-10 min | $10/month |

---

# 14. Free Deployment Plan ($0/month)

| Service | Provider | Free Tier |
|---------|----------|-----------|
| Frontend | Vercel | 100 GB/month |
| Backend | Render | 750 hours/month |
| Database | Supabase | 500 MB |
| Vector DB | Qdrant Cloud | 1 GB |
| Cache | Upstash Redis | 10K cmds/day |
| Email | Brevo | 300/day |
| CI/CD | GitHub Actions | 2000 min/month |

Steps: Vercel (FE) -> Render (BE) -> Supabase (DB) -> Qdrant Cloud (Vector) -> Brevo (Email)

---

# 15. Docker/DevOps/MLOps

Docker: frontend (nginx), backend (python), postgres, qdrant, redis
CI/CD: GitHub Actions (backend-tests, frontend-build, docker-build)
MLOps: Data -> Training -> Evaluation -> Model Registry -> Deploy -> Monitor

---

# 16. Connection Architecture

Frontend:5173 --HTTP/WS--> Backend:8000 --SQL--> PostgreSQL:6543
Backend:8000 --HTTP--> Qdrant:6333 (Vector DB)
Backend:8000 --HTTP--> Redis:6379 (Cache)
Backend:8000 --HTTP--> Ollama:11434 (LLM, optional)

---

# 17. Technology Stack

React 19 | TypeScript 7 | Vite 6 | Tailwind 3 | ReactFlow 11 | Zustand 5
FastAPI 0.115 | Python 3.11 | SQLAlchemy 2 | asyncpg | PyTorch 2.7 | transformers 4.57
PEFT 0.19 | TRL 1.9 | sentence-transformers 5.6
PostgreSQL 16 | Qdrant 1.18 | Redis 7 | Docker 24 | GitHub Actions

---

# 18. Development Roadmap

Phase 1-2: DONE (Foundation + Architecture Studio)
Phase 3: NEXT (Tool Gateway - PostgreSQL + Airflow connectors)
Phase 4: PENDING (Unified Operations)
Phase 5: IN PROGRESS (AI Training - LoRA)
Phase 6: PENDING (Notifications - Email)
Phase 7: PARTIAL (Intelligence - RAG working)
Phase 8-10: PENDING (Automation, CLI, Advanced)

Sprints: Week 1 Tool Gateway | Week 2 Notifications | Week 3 AI Training | Week 4 CLI

---

# 19. MVP Demo Flow (12 Steps)

1. Open Operations Center -> 2. Connect PostgreSQL -> 3. Connect Airflow -> 4. Create architecture
5. Type NL prompt -> 6. AIDEN generates pipeline -> 7. Pipeline runs -> 8. Live monitor
9. Pipeline fails -> 10. AI diagnoses (94% confidence) -> 11. Email sent -> 12. Fix applied, recovers

---

# 20. Appendix: Block Diagrams

## 20.1 Platform Overview

USER -> AIDEN -> ARCHITECTURE STUDIO -> STRUCTURED ARCHITECTURE
  -> PIPELINE / CODE / INFRASTRUCTURE -> MONITORING -> INCIDENT
  -> AI AGENTS -> DIAGNOSIS/REPAIR -> RAG -> LEARNING

## 20.2 NL to Running Pipeline

User Prompt -> Intent Parser -> Pipeline Agent -> Validation -> Approval -> Executor -> Monitor -> Running

## 20.3 Self-Healing

Failure -> Classify -> Collect -> Diagnose -> Fix -> Risk -> Approval -> Deploy -> Verify -> Update RAG

## 20.4 Deployment

Vercel (FE) -> Render (BE) -> Supabase PG + Qdrant + Brevo SMTP
Total: $0/month (all free tier)

---

| Field | Value |
|-----
|-------|-------|
| Project | AIDEN |
| Version | 3.0 |
| Date | August 24, 2026 |
| Sections | 20 |
| Algorithms | 5 |

Generated with Codebuff
