---
description: Apply tasks (OpenSpec OPSX)
---

Implement tasks from an OpenSpec change.

1. Select the change:
   openspec list --json
2. Get status:
   openspec status --change "<name>" --json
3. Get apply instructions:
   openspec instructions apply --change "<name>" --json
4. Read the context files referenced by the apply instructions.
5. Implement pending tasks in code, and update the tasks checklist.
6. Re-run status to confirm progress:
   openspec status --change "<name>" --json
