---
id: REQ-7FTFE9G
type: test-case
title: "Verify: Cloud backend limits firmware images"
status: Draft
priority: Medium
owner: A. Hassan
tags:
  - ux
  - performance
  - i18n
parent: REQ-VEKDQA9
order: a0
links:
  - type: verifies
    target: REQ-G8QZJW8
    confirmed: e8d8227d66fc
---
**Objective:** verify that the cloud backend behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 23 °C ± 1 °C

**Steps**
1. Configure the cloud backend with default settings.
2. Detect the connection state and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
