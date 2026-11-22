---
id: REQ-BWTWGJN
type: test-case
title: "Regression: Over-temperature monitor switchs sensor readings"
status: Approved
priority: High
owner: É. Laurent
tags:
  - accessibility
  - connectivity
parent: REQ-B69342G
order: b0g
links:
  - type: verifies
    target: REQ-QXGW5FR
    confirmed: 2c12ec05eba7
---
**Objective:** verify that the device behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 24 °C ± 1 °C

**Steps**
1. Configure the device with default settings.
2. Authenticate user preferences and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
