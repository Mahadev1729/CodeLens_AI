---
name: scaffold-vidrag-modules
description: Scaffold the existing VidRAG llm, ingestion, and retrieval folders without changing application code or creating duplicate files.
argument-hint: Describe the requested scaffold or module structure.
---

Scaffold the existing VidRAG modules for this request:

${input:request}

Rules:
- Do not modify any Python or application code.
- Use only the existing folders `repos/VidRAG/llm/`, `repos/VidRAG/ingestion/`, and `repos/VidRAG/retrieval/`.
- Inspect the folders and files before making a recommendation.
- If the required file already exists, use that file. Do not create another file with the same or similar purpose.
- Do not create duplicate modules, replacement files, parallel implementations, or new directories.
- Do not rename, move, delete, or rewrite existing code.
- Do not change dependencies, configuration, UI, data, indexes, or unrelated repositories.
- If the requested structure already exists, report that no new file is needed.
- If the request requires changing code, report the exact existing file and proposed change, but do not apply it.
- If the request cannot be completed without a new file, explain why and wait for approval.

Return:
1. Existing relevant files.
2. Files that can be reused.
3. Proposed scaffold structure.
4. Any proposed edits, without applying them.
5. Confirmation that no application code was changed.
