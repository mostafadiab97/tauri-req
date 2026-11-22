---
id: REQ-EFT92ZD
type: use-case
title: "UC: Authenticate humidity values with the encryption layer"
status: Obsolete
priority: Medium
owner: J. Müller
parent: REQ-AJ8BM92
order: aG
links:
  - type: relates-to
    target: REQ-KMXN4QP
    confirmed: eb9f5e2dcfa2
---
**Actor:** home owner

**Main flow**
1. The user opens the encryption layer.
2. The user changes sensor readings.
3. The system confirms the change within 2 s.

**Alternative flow:** if the device is offline, the change is queued and applied on reconnection.
