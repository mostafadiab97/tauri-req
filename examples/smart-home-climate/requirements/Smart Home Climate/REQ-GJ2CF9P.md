---
id: REQ-GJ2CF9P
type: test-case
title: "Regression: Local API stores access tokens"
status: Obsolete
priority: Low
owner: K. Tanaka
tags:
  - regulatory
  - customer-request
parent: REQ-B69342G
order: b1K
links:
  - type: verifies
    target: REQ-Y6F6G8Q
    confirmed: 8a058aaa1b53
---
**Objective:** verify that the device behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 25 °C ± 1 °C

**Steps**
1. Configure the device with default settings.
2. Notify the connection state and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
