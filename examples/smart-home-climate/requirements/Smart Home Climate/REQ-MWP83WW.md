---
id: REQ-MWP83WW
type: test-case
title: "Regression: Cloud backend limits firmware images"
status: Review
priority: Medium
owner: H. Fathy
tags:
  - connectivity
  - security
parent: REQ-B69342G
order: b01
links:
  - type: verifies
    target: REQ-G8QZJW8
    confirmed: e8d8227d66fc
---
**Objective:** verify that the device behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 25 °C ± 1 °C

**Steps**
1. Configure the device with default settings.
2. Log the operating mode and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
