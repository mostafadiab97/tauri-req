---
id: REQ-95F8NQH
type: test-case
title: "Verify: Touch display authenticates the operating mode"
status: Review
tags:
  - release-2.0
  - connectivity
parent: REQ-38D1AZ1
order: a0
links:
  - type: verifies
    target: REQ-MF1EB6Z
    confirmed: a4a5e02caf12
---
**Objective:** verify that the touch display behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 23 °C ± 1 °C

**Steps**
1. Configure the touch display with default settings.
2. Authenticate firmware images and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
