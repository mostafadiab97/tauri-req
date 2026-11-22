---
id: REQ-HCR276X
type: test-case
title: Hub verification 3
status: Approved
priority: Medium
owner: S. Adel
tags:
  - release-1.0
  - customer-request
  - EMC
parent: REQ-B69342G
order: aB
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
2. Detect firmware images and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
