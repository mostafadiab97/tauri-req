---
id: REQ-VH47NKW
type: test-case
title: Hub verification 2
status: Draft
priority: Medium
owner: Y. Saber
tags:
  - EMC
  - performance
parent: REQ-B69342G
order: aA
links:
  - type: verifies
    target: REQ-VQDBG4C
    confirmed: 4639507190ed
---
**Objective:** verify that the thermostat behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 21 °C ± 1 °C

**Steps**
1. Configure the thermostat with default settings.
2. Log energy consumption and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
