---
id: REQ-E12XY01
type: test-case
title: "Regression: Notification service validates humidity values"
status: Approved
owner: K. Tanaka
tags:
  - security
  - connectivity
  - safety
parent: REQ-B69342G
order: ar
links:
  - type: verifies
    target: REQ-32EN75V
    confirmed: 3f36222bb4ce
---
**Objective:** verify that the device behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 25 °C ± 1 °C

**Steps**
1. Configure the device with default settings.
2. Synchronise the operating mode and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
