---
id: REQ-5TFVGE0
type: test-case
title: Hub verification 37
status: Obsolete
priority: High
owner: K. Tanaka
tags:
  - safety
  - connectivity
parent: REQ-B69342G
order: aj
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
2. Limit the set point and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
