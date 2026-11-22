---
id: REQ-5C15KM4
type: test-case
title: "Regression: Pairing process restores user preferences"
status: Approved
priority: High
owner: A. Hassan
tags:
  - power
parent: REQ-B69342G
order: b2I
links:
  - type: verifies
    target: REQ-46J44ZX
    confirmed: df64af2f3473
---
**Objective:** verify that the device behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 25 °C ± 1 °C

**Steps**
1. Configure the device with default settings.
2. Restore the room temperature and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
