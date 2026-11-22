---
id: REQ-45FW4S0
type: use-case
title: "UC: Store the room temperature with the cloud backend"
status: Approved
priority: Medium
owner: N. Kamal
tags:
  - accessibility
  - power
parent: REQ-N3NG8TT
order: aG
links:
  - type: relates-to
    target: REQ-MJMYWK9
    confirmed: bac12c63b9c3
---
**Actor:** home owner

**Main flow**
1. The user opens the cloud backend.
2. The user changes energy consumption.
3. The system confirms the change within 2 s.

**Alternative flow:** if the device is offline, the change is queued and applied on reconnection.
