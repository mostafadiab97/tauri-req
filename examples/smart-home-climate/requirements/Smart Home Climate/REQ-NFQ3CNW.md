---
id: REQ-NFQ3CNW
type: test-case
title: "Regression: Over-temperature monitor switchs sensor readings"
status: Obsolete
priority: Medium
owner: S. Adel
parent: REQ-B69342G
order: b2D
links:
  - type: verifies
    target: REQ-QXGW5FR
    confirmed: 2c12ec05eba7
---
**Objective:** verify that the device behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 20 °C ± 1 °C

**Steps**
1. Configure the device with default settings.
2. Store error conditions and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
