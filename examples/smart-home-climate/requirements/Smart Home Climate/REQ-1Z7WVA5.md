---
id: REQ-1Z7WVA5
type: test-case
title: Hub verification 23
status: Review
priority: Low
owner: محمد علي
tags:
  - power
  - release-2.0
  - customer-request
parent: REQ-B69342G
order: aV
links:
  - type: verifies
    target: REQ-VQDBG4C
    confirmed: 8c08ebec4abb
---
**Objective:** verify that the thermostat behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 18 °C ± 1 °C

**Steps**
1. Configure the thermostat with default settings.
2. Calibrate relay events and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
