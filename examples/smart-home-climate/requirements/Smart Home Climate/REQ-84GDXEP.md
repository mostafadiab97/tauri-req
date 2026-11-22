---
id: REQ-84GDXEP
type: use-case
title: "UC: Limit the operating mode with the mobile app"
status: Draft
priority: Low
tags:
  - ux
parent: REQ-M95KQCN
order: aC
links:
  - type: relates-to
    target: REQ-JN8T51M
    confirmed: 2c56724a5c23
---
**Actor:** home owner

**Main flow**
1. The user opens the mobile app.
2. The user changes the room temperature.
3. The system confirms the change within 2 s.

**Alternative flow:** if the device is offline, the change is queued and applied on reconnection.
