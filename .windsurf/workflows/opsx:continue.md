---
description: Continue a change (OpenSpec OPSX)
---

Create the next OpenSpec artifact for a change.

1. If the change name is unknown, list changes and pick one:
   openspec list --json
2. Check which artifacts are ready:
   openspec status --change "<name>"
3. Run instructions for the first ready artifact:
   openspec instructions <artifact-id> --change "<name>"
4. Create/update the artifact file as instructed.
5. Re-run status to confirm progress:
   openspec status --change "<name>"
