---
id: REQ-WSF6KFM
type: use-case
title: "UC: Validate error conditions with the user account service"
status: Approved
priority: High
owner: L. Samir
parent: REQ-N3NG8TT
order: aF
links:
  - type: relates-to
    target: REQ-T268XWQ
    confirmed: d39ba6fe16d3
---
**Actor:** home owner

**Main flow**
1. The user opens the user account service.
2. The user changes energy consumption.
3. The system confirms the change within 2 s.

**Alternative flow:** if the device is offline, the change is queued and applied on reconnection.
