---
id: REQ-RF7GCN5
type: test-case
title: "Verify: Over-temperature monitor switchs sensor readings"
status: Draft
priority: High
owner: H. Fathy
parent: REQ-F5M0G3H
order: a1
links:
  - type: verifies
    target: REQ-QXGW5FR
    confirmed: 2c12ec05eba7
  - type: verifies
    target: REQ-DYKA036
    confirmed: 28a3caaf532c
---
**Objective:** verify that the over-temperature monitor behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 22 °C ± 1 °C

**Steps**
1. Configure the over-temperature monitor with default settings.
2. Synchronise the set point and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
