---
id: REQ-1ZSV79E
type: test-case
title: Hub verification 5
status: Draft
priority: High
owner: Y. Saber
tags:
  - release-2.0
parent: REQ-B69342G
order: aD
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
2. Measure relay events and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
