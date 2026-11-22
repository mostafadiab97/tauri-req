---
id: REQ-WNB34AE
type: test-case
title: "Regression: User account service limits schedule entries"
status: Review
priority: Medium
owner: J. Müller
tags:
  - EMC
  - i18n
parent: REQ-B69342G
order: as
links:
  - type: verifies
    target: REQ-YJR0PV7
    confirmed: 32afdf3f5d82
---
**Objective:** verify that the device behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 19 °C ± 1 °C

**Steps**
1. Configure the device with default settings.
2. Validate access tokens and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
