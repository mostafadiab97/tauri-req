---
id: REQ-MMJE5VF
type: use-case
title: "UC: Notify firmware images with the secure boot"
status: Approved
priority: High
owner: S. Adel
parent: REQ-AJ8BM92
order: aD
links:
  - type: relates-to
    target: REQ-WHS5W63
    confirmed: d93bb1627b93
---
**Actor:** home owner

**Main flow**
1. The user opens the secure boot.
2. The user changes the set point.
3. The system confirms the change within 2 s.

**Alternative flow:** if the device is offline, the change is queued and applied on reconnection.
