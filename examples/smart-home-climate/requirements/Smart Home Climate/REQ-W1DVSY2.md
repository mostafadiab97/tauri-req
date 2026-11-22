---
id: REQ-W1DVSY2
type: test-case
title: "Verify: Status LED reports firmware images"
status: Draft
priority: Medium
owner: R. Nabil
tags:
  - security
parent: REQ-38D1AZ1
order: a1
links:
  - type: verifies
    target: REQ-RWVZ2AE
    confirmed: e1289f82812f
---
**Objective:** verify that the status LED behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 19 °C ± 1 °C

**Steps**
1. Configure the status LED with default settings.
2. Display relay events and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
