---
id: REQ-XSWP8TZ
type: design-element
title: Design element with a code block
status: Approved
priority: High
owner: J. Müller
parent: REQ-B69342G
order: a7
---
```c
int regulate(float setpoint, float measured) {
  return setpoint - measured > 0.5f ? HEAT_ON : HEAT_OFF;
}
```
