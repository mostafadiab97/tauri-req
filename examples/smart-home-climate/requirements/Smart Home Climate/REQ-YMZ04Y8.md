---
id: REQ-YMZ04Y8
type: test-case
title: Hub verification 36
status: Approved
priority: Medium
owner: N. Kamal
tags:
  - power
parent: REQ-B69342G
order: ai
links:
  - type: verifies
    target: REQ-VQDBG4C
    confirmed: 8c08ebec4abb
---
**Objective:** verify that the thermostat behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 22 °C ± 1 °C

**Steps**
1. Configure the thermostat with default settings.
2. Calibrate the set point and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
