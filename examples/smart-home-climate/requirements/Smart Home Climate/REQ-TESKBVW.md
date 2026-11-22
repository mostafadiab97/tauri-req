---
id: REQ-TESKBVW
type: use-case
title: "UC: Encrypt the operating mode with the tamper detection"
status: Draft
priority: Medium
owner: محمد علي
parent: REQ-AJ8BM92
order: aC
links:
  - type: relates-to
    target: REQ-E0QCQ5K
    confirmed: bff116ee4557
---
**Actor:** home owner

**Main flow**
1. The user opens the tamper detection.
2. The user changes energy consumption.
3. The system confirms the change within 2 s.

**Alternative flow:** if the device is offline, the change is queued and applied on reconnection.
