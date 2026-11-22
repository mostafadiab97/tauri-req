# ReqIF schema (for tests only)

The official ReqIF 1.0/1.2 schema (`reqif.xsd`, namespace `http://www.omg.org/spec/ReqIF/20110401/reqif.xsd`) with
its XHTML driver and the W3C XHTML modularization schemas, as published in the Eclipse RMF project
(`org.eclipse.rmf.reqif10/schema`). `schemaLocation` attributes were changed to the local file names;
`xhtml-charent-1.xsd` and `xhtml-notations-1.xsd` are empty placeholders (the driver does not include them).

Used by `tests/reqif.test.ts` to check that every ReqIF file reqochet writes is valid — what DOORS, Jama and
other tools expect. Not part of the app and not shipped with it. Licences: `reqif.xsd` and the driver as published by
the OMG and the Eclipse RMF project (EPL-1.0 / OMG specification terms); the W3C schemas under the licence in their
own headers.
