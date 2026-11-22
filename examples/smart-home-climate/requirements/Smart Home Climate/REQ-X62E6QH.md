---
id: REQ-X62E6QH
type: use-case
title: "UC: Detect safety limits with the main PCB"
status: Draft
priority: High
owner: J. Müller
tags:
  - power
  - accessibility
  - EMC
parent: REQ-1G75ENR
order: aG
links:
  - type: relates-to
    target: REQ-YSTGGRD
    confirmed: a934a4a3ffc9
---
**Actor:** home owner

**Main flow**
1. The user opens the main PCB.
2. The user changes the operating mode.
3. The system confirms the change within 2 s.

**Alternative flow:** if the device is offline, the change is queued and applied on reconnection.
