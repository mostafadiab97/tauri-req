---
id: REQ-2VR28PR
type: use-case
title: "UC: Log the operating mode with the backlight"
status: Approved
tags:
  - release-1.0
  - cost
  - release-2.0
parent: REQ-XQBD2VV
order: aD
links:
  - type: relates-to
    target: REQ-624JND3
    confirmed: a643e454f771
---
**Actor:** home owner

**Main flow**
1. The user opens the backlight.
2. The user changes the connection state.
3. The system confirms the change within 2 s.

**Alternative flow:** if the device is offline, the change is queued and applied on reconnection.
