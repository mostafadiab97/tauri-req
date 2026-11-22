---
id: REQ-PGXJZEZ
type: use-case
title: "UC: Notify the set point with the telemetry pipeline"
status: Approved
priority: High
owner: Y. Saber
tags:
  - EMC
  - connectivity
  - safety
parent: REQ-N3NG8TT
order: aD
links:
  - type: relates-to
    target: REQ-MJMYWK9
    confirmed: bac12c63b9c3
---
**Actor:** home owner

**Main flow**
1. The user opens the telemetry pipeline.
2. The user changes firmware images.
3. The system confirms the change within 2 s.

**Alternative flow:** if the device is offline, the change is queued and applied on reconnection.
