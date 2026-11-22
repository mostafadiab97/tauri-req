---
id: REQ-AH92D0S
type: test-case
title: Hub verification 6
status: Approved
owner: R. Nabil
tags:
  - customer-request
  - release-2.0
parent: REQ-B69342G
order: aE
links:
  - type: verifies
    target: REQ-VQDBG4C
    confirmed: 4639507190ed
---
**Objective:** verify that the thermostat behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 19 °C ± 1 °C

**Steps**
1. Configure the thermostat with default settings.
2. Authenticate energy consumption and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
