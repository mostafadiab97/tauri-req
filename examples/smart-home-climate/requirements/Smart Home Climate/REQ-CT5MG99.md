---
id: REQ-CT5MG99
type: system-requirement
title: Heating controller synchronises safety limits
status: Approved
priority: High
owner: J. Müller
tags:
  - customer-request
parent: REQ-F0EKVY2
order: a1
links:
  - type: refines
    target: REQ-ANZRG6K
    confirmed: 8a56cb48b6c3
---
The heating controller shall encrypt error conditions within 200 ms.

**Rationale:** Relay events must stay consistent for the user using AES-256-GCM.
