---
id: REQ-TBEVQV1
type: test-case
title: "Regression: Notification service synchronises humidity values"
status: Obsolete
owner: K. Tanaka
parent: REQ-B69342G
order: b1C
links:
  - type: verifies
    target: REQ-JAMSS27
    confirmed: df6cf4d22dad
---
**Objective:** verify that the device behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 23 °C ± 1 °C

**Steps**
1. Configure the device with default settings.
2. Report firmware images and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
