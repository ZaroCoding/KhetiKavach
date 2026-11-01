---
description: Rehearse the 5-minute judging demo against the deployed URL
---
1. Open the deployed web URL; confirm /health shows db ok and the districts list plan_chunks > 0.
2. Follow the demo script in docs/ANTIGRAVITY_PROMPTS.md step by step, timing each step.
3. Record a browser recording artifact of the full run.
4. In the admin panel disable open_meteo_ensemble, re-run, confirm a fallback_used event, re-enable.
5. Run `uv run python -m scripts.edge_cases --base <api-url>` and report any FAIL line.
