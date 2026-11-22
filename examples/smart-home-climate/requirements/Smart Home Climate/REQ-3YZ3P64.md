---
id: REQ-3YZ3P64
type: test-case
title: "Regression: Main PCB validates sensor readings"
status: Draft
priority: High
owner: S. Adel
tags:
  - regulatory
  - release-1.0
  - i18n
parent: REQ-B69342G
order: b1c
links:
  - type: verifies
    target: REQ-S8P86G3
    confirmed: 3b877fc1ed12
---
**Objective:** verify that the device behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 21 °C ± 1 °C

**Steps**
1. Configure the device with default settings.
2. Calibrate the set point and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
