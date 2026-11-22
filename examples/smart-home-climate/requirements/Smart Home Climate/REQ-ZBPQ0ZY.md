---
id: REQ-ZBPQ0ZY
type: test-case
title: "Regression: Heating controller validates safety limits"
status: Draft
priority: Low
owner: H. Fathy
parent: REQ-B69342G
order: b0j
links:
  - type: verifies
    target: REQ-XQTWYWP
    confirmed: 65adf430bd97
---
**Objective:** verify that the device behaves as specified.

**Preconditions**
- Device powered and paired with the test account
- Ambient temperature 22 °C ± 1 °C

**Steps**
1. Configure the device with default settings.
2. Display the set point and record the result.
3. Repeat 10 times.

**Expected result:** all 10 runs pass the acceptance criteria of the verified requirement.
