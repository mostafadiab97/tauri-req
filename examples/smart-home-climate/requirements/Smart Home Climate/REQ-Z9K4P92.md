---
id: REQ-Z9K4P92
type: use-case
title: "UC: Restore relay events with the Bluetooth LE link"
status: Approved
priority: Medium
owner: N. Kamal
parent: REQ-KJM315Z
order: aD
links:
  - type: relates-to
    target: REQ-G0XAN98
    confirmed: 06ff294e8ede
---
**Actor:** home owner

**Main flow**
1. The user opens the Bluetooth LE link.
2. The user changes sensor readings.
3. The system confirms the change within 2 s.

**Alternative flow:** if the device is offline, the change is queued and applied on reconnection.
