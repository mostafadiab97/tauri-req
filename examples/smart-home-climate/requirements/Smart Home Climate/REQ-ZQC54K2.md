---
id: REQ-ZQC54K2
type: test-case
title: Hub verification 11
status: Approved
priority: High
tags:
  - connectivity
  - power
  - accessibility
parent: REQ-B69342G
order: aJ
links:
  - type: verifies
    target: REQ-VQDBG4C
    confirmed: 4639507190ed
---
**Objective:** verify that the thermostat behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 24 °C ± 1 °C

**Steps**
1. Configure the thermostat with default settings.
2. Report user preferences and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
