---
id: REQ-2RRD2CM
type: use-case
title: "UC: Store the operating mode with the device registry"
status: Approved
priority: Medium
owner: A. Hassan
tags:
  - safety
parent: REQ-N3NG8TT
order: aC
links:
  - type: relates-to
    target: REQ-QKKWHK8
    confirmed: 3812a5f8d6a3
---
**Actor:** home owner

**Main flow**
1. The user opens the device registry.
2. The user changes relay events.
3. The system confirms the change within 2 s.

**Alternative flow:** if the device is offline, the change is queued and applied on reconnection.
