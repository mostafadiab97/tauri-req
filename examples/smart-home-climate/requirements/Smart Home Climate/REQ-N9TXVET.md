---
id: REQ-N9TXVET
type: use-case
title: "UC: Detect firmware images with the schedule editor"
status: Draft
priority: Medium
tags:
  - performance
parent: REQ-M95KQCN
order: aD
links:
  - type: relates-to
    target: REQ-JRM0V6C
    confirmed: 88cc4f9aa33b
---
**Actor:** home owner

**Main flow**
1. The user opens the schedule editor.
2. The user changes audit records.
3. The system confirms the change within 2 s.

**Alternative flow:** if the device is offline, the change is queued and applied on reconnection.
