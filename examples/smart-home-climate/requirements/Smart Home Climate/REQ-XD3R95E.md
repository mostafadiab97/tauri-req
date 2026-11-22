---
id: REQ-XD3R95E
type: use-case
title: "UC: Switch sensor readings with the touch display"
status: Approved
priority: High
owner: H. Fathy
parent: REQ-XQBD2VV
order: aE
links:
  - type: relates-to
    target: REQ-4CN57MP
    confirmed: d06a2ce8318a
---
**Actor:** home owner

**Main flow**
1. The user opens the touch display.
2. The user changes schedule entries.
3. The system confirms the change within 2 s.

**Alternative flow:** if the device is offline, the change is queued and applied on reconnection.
