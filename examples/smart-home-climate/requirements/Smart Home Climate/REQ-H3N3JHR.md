---
id: REQ-H3N3JHR
type: test-case
title: Hub verification 10
status: Review
priority: Medium
owner: A. Hassan
tags:
  - performance
parent: REQ-B69342G
order: aI
links:
  - type: verifies
    target: REQ-VQDBG4C
    confirmed: 4639507190ed
---
**Objective:** verify that the thermostat behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 23 °C ± 1 °C

**Steps**
1. Configure the thermostat with default settings.
2. Authenticate the room temperature and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
