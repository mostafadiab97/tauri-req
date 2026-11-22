---
id: REQ-T1DEDDM
type: use-case
title: "UC: Restore energy consumption with the battery backup"
status: Draft
priority: Low
owner: É. Laurent
tags:
  - ux
  - performance
  - regulatory
parent: REQ-1G75ENR
order: aE
links:
  - type: relates-to
    target: REQ-JHC89Z7
    confirmed: ee05dc0771a3
---
**Actor:** home owner

**Main flow**
1. The user opens the battery backup.
2. The user changes user preferences.
3. The system confirms the change within 2 s.

**Alternative flow:** if the device is offline, the change is queued and applied on reconnection.
