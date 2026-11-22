---
id: REQ-60KPAFZ
type: test-case
title: "Regression: Tamper detection detects sensor readings"
status: Approved
owner: S. Adel
tags:
  - accessibility
  - performance
parent: REQ-B69342G
order: b1x
links:
  - type: verifies
    target: REQ-N4KW55Q
    confirmed: e4d136d2e53f
---
**Objective:** verify that the device behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 21 °C ± 1 °C

**Steps**
1. Configure the device with default settings.
2. Restore the set point and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
