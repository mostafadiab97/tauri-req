---
id: REQ-YSQNDB7
type: test-case
title: Hub verification 40
status: Approved
priority: High
owner: K. Tanaka
tags:
  - performance
  - release-2.0
  - connectivity
parent: REQ-B69342G
order: am
links:
  - type: verifies
    target: REQ-VQDBG4C
    confirmed: 8c08ebec4abb
---
**Objective:** verify that the thermostat behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 21 °C ± 1 °C

**Steps**
1. Configure the thermostat with default settings.
2. Validate the operating mode and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
