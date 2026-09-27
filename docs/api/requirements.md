# Requirements (multimodal intake)

The Requirement Studio posts full multimodal state; two engines (AI /
heuristic) return identical shapes — `analysis.source` says which ran.

## Endpoints

| Method | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/requirements` | `project.read` | list (project-scoped) |
| POST | `/requirements` | `project.create` | persist a requirement |
| GET | `/requirements/{id}` | `project.read` | detail incl. contract |
| PUT | `/requirements/{id}` | `project.update` | full update |
| DELETE | `/requirements/{id}` | `project.update` | delete |
| POST | `/requirements/analyze` | `project.read` | **analyze multimodal input → `{analysis, contract, source}`** |
| POST | `/requirements/{id}/contract` | `project.update` | attach/replace ODCS data contract |

## `POST /requirements/analyze` payload

```json
{
  "activeMode": "text",
  "text":     { "rawText": "Daily sales pipeline from PG to Snowflake, mask emails", "tags": [] },
  "audio":    { "transcript": "", "durationSeconds": 0 },
  "sql":      { "sqlQuery": "", "inferredSources": [] },
  "diagram":  {},
  "document": { "fileContent": "" }
}
```

Response: `{ "analysis": {intentTitle, pipelinePattern, patternLabel,
confidenceScore, executiveSummary, topic, streaming, source: "ai"|"heuristic"},
"contract": {ODCS data contract: schema columns, quality rules, PII handling} }`.

The AI engine routes through the model layer
(`requirement_analysis` agent, Base A) with the heuristic synthesizer as
guaranteed fallback (`docs/agents/prompts.md`).
