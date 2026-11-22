---
id: REQ-RKJVGEQ
type: test-case
title: "Regression: Pairing process restores user preferences"
status: Obsolete
owner: J. Müller
tags:
  - security
  - safety
parent: REQ-B69342G
order: b0T
links:
  - type: verifies
    target: REQ-46J44ZX
    confirmed: df64af2f3473
---
**Objective:** verify that the device behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 20 °C ± 1 °C

**Steps**
1. Configure the device with default settings.
2. Measure the operating mode and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
