---
id: REQ-6BA4Q6K
type: test-case
title: "Verify: Pairing process restores user preferences"
status: Review
priority: High
owner: A. Hassan
parent: REQ-J695CFS
order: a0
links:
  - type: verifies
    target: REQ-46J44ZX
    confirmed: df64af2f3473
---
**Objective:** verify that the pairing process behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 24 °C ± 1 °C

**Steps**
1. Configure the pairing process with default settings.
2. Authenticate the connection state and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
