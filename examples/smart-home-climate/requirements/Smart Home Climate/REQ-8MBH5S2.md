---
id: REQ-8MBH5S2
type: test-case
title: "Regression: Local API stores access tokens"
status: Draft
owner: R. Nabil
tags:
  - performance
  - ux
  - power
parent: REQ-B69342G
order: b2Z
links:
  - type: verifies
    target: REQ-Y6F6G8Q
    confirmed: 8a058aaa1b53
---
**Objective:** verify that the device behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 22 °C ± 1 °C

**Steps**
1. Configure the device with default settings.
2. Notify audit records and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
