---
id: REQ-PCY0Z6N
type: test-case
title: "Verify: Notification service validates humidity values"
status: Obsolete
priority: Medium
owner: A. Hassan
tags:
  - power
parent: REQ-GAW4P95
order: a0
links:
  - type: verifies
    target: REQ-32EN75V
    confirmed: 3f36222bb4ce
---
**Objective:** verify that the notification service behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 19 °C ± 1 °C

**Steps**
1. Configure the notification service with default settings.
2. Report sensor readings and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
