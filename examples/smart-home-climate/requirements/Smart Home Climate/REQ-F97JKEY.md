---
id: REQ-F97JKEY
type: use-case
title: "UC: Log safety limits with the rotary knob"
status: Review
priority: Medium
owner: محمد علي
tags:
  - security
parent: REQ-XQBD2VV
order: aC
links:
  - type: relates-to
    target: REQ-JMR8D5X
    confirmed: c5a5b86f1b56
---
**Actor:** home owner

**Main flow**
1. The user opens the rotary knob.
2. The user changes access tokens.
3. The system confirms the change within 2 s.

**Alternative flow:** if the device is offline, the change is queued and applied on reconnection.
