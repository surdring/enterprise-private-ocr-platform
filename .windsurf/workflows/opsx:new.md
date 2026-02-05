---
description: Start a new change (OpenSpec OPSX)
---

Start a new change using OpenSpec's experimental artifact workflow.

1. If you didn't provide a change name, ask for a short description and derive a kebab-case name.
2. Run:
   openspec new change "<name>"
3. Then run:
   openspec status --change "<name>"
4. Find the first artifact in status that is "ready" and run:
   openspec instructions <first-artifact-id> --change "<name>"
5. Stop and wait for the next instruction (typically run `/opsx:continue`).
