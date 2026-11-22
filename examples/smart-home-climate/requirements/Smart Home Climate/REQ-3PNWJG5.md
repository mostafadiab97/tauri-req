---
id: REQ-3PNWJG5
type: use-case
title: "UC: Detect the connection state with the rotary knob"
status: Review
priority: Medium
owner: محمد علي
tags:
  - customer-request
  - cost
parent: REQ-XQBD2VV
order: aG
links:
  - type: relates-to
    target: REQ-JMR8D5X
    confirmed: c5a5b86f1b56
---
**Actor:** home owner

**Main flow**
1. The user opens the rotary knob.
2. The user changes schedule entries.
3. The system confirms the change within 2 s.

**Alternative flow:** if the device is offline, the change is queued and applied on reconnection.
