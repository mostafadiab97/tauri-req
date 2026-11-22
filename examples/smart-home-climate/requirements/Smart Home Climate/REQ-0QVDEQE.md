---
id: REQ-0QVDEQE
type: test-case
title: Hub verification 35
status: Approved
priority: Medium
owner: É. Laurent
tags:
  - regulatory
  - release-1.0
parent: REQ-B69342G
order: ah
links:
  - type: verifies
    target: REQ-VQDBG4C
    confirmed: 8c08ebec4abb
---
**Objective:** verify that the thermostat behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 19 °C ± 1 °C

**Steps**
1. Configure the thermostat with default settings.
2. Log the connection state and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
