---
id: REQ-ZBYTMZ1
type: test-case
title: Hub verification 28
status: Draft
priority: Low
owner: K. Tanaka
tags:
  - ux
parent: REQ-B69342G
order: aa
links:
  - type: verifies
    target: REQ-VQDBG4C
    confirmed: 8c08ebec4abb
---
**Objective:** verify that the thermostat behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 23 °C ± 1 °C

**Steps**
1. Configure the thermostat with default settings.
2. Switch schedule entries and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
