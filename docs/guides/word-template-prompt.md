# Word documents → reqochet project and company template, with an AI model

Most teams already have their specifications in Word, spread over several folders, with many versions of each
document. This guide gives one prompt that lets an AI model that can work with your files produce:

1. **A consolidated requirements master** — every requirement, conflict and gap of all documents captured once, in
   a strict format, with a parser that exports it to JSON/CSV.
2. **A ready reqochet project** — the specification rewritten with the IREB requirement template, one reqochet
   document per specification, and the source versions as **Git history with a baseline per version**, so
   reqochet's Versions, Compare and History screens show how each document changed.
3. **An import report** (conflicts, gaps, questions) and **a company Word template** for reqochet's Word export.

The prompt was written from a real conversion of a large project (several input folders, Word, `.doc`/MHT, PDF,
DBC). It matches reqochet 1.0.

## Before you start

- **Confidential documents:** specifications usually belong to a customer or to the company. Use only an AI service
  your company allows for such documents.
- **An AI that can work with files and run code on your PC is required** — for example Claude Code (in VS Code or a
  terminal) or the Claude desktop app with your folders connected. It writes hundreds of files and a Git history;
  a chat-only AI cannot. It uses Python (`python-docx`, `PyYAML`), `git` and, when present, `pdftotext` and
  `antiword`. Sub-agents (parallel helpers) make big projects faster but are not required.
- **Folders:** one or more **input folders** (only read, never changed) and an **empty output folder**.
- **The schema:** make an empty project in reqochet once (it writes `requirements/.reqochet/schema.yaml`) and give
  that file's path in the prompt, so the AI starts from the current default types, fields and rules.
- **Time and cost:** a big project (thousands of requirements) takes several hours of AI work. Start with one
  folder to see the result before running everything.

## The prompt

Copy everything inside the box, **fill in the values in `<…>`** in section 0, and send it.

````text
## 0. Your task

You are a senior requirements engineer and automation engineer. You will turn a set of project documents (mostly Word files, spread over several folders, with many versions of each document) into:

1. **A consolidated requirements master** (`<OUTPUT>/<PROJECT>_Requirements_Master.md`) in which every requirement, conflict and gap found in the documents is captured once, in a strict, parseable format, plus a parser that exports it to JSON/CSV.
2. **An IREB-conformant requirements specification** written as a **reqochet project** (one Markdown file per item, schema, Git history with baselines), plus `import-report.md` and a Word format profile and template, in `<OUTPUT>/<REQOCHET_SUBFOLDER>/`.

Inputs (the user fills these in):
- `INPUT FOLDERS` (read-only, never modify, never write into them): `<INPUT_FOLDER_1>`, `<INPUT_FOLDER_2>`, …
- `OUTPUT FOLDER`: `<OUTPUT>` (empty at start). If it is not empty, stop and ask before writing anything — except on a **re-run**: you may overwrite your own earlier output when the folder holds only files you generated (your scripts, corpus, master, reqochet folder) and the user has asked for a rebuild or an update pass. Never delete files you did not write; on a rebuild, recreate the reqochet folder's Git history from scratch rather than editing the old one.
- `PROJECT`: `<short project / product name>`.
- `PREFIX`: `<letters for the consolidation IDs, e.g. the project's short name: "SMU">`.
- `REQOCHET_SUBFOLDER`: `<name of the reqochet project folder inside OUTPUT, e.g. "reqochet">`.
- `REQOCHET SCHEMA`: `<path to a schema.yaml from a project made with a recent reqochet (requirements/.reqochet/schema.yaml), or "none">`.

Terms: a **document** in reqochet is one folder under `requirements/` (one specification, e.g. "System" or "Braking SRS"); it has its own tree and outline numbers. A **group** below is one such document with all its source versions.

Work in phases A–H below, in order. Do not skip the checks. Report honestly what you could not do.

**The reqochet source code is optional:** every rule you need is in this prompt, and an installed reqochet is enough (it writes the current default schema into every new project). Do not stop to ask for the source. **When a format rule is still unclear** and the source is available (a local clone, or the public repository on GitHub), check it there rather than guessing: `src/modules/items/fingerprint.ts` (link fingerprints), `src/modules/items/itemFile.ts` (file layout, key order, order values), `src/modules/repository-store/fileStore.ts` (document names), `src/modules/workspace/exporting.ts` and `src/modules/import-export/document.ts` (templates, placeholders, styles).

---

## 1. Ground rules (apply to every phase)

**Safety of the inputs**
- Input folders are read-only. Open files only for reading. Copy a file before transforming it (e.g. into a template). Keep all scripts, intermediate files and extracted text in a private scratch folder, not in the input or output folder.
- Run Python with `-I` (isolated mode) when it reads extracted or downloaded content. Pass paths as arguments; never run code from inside an input folder.

**Truthfulness**
- Never invent a requirement, a value, a unit, a signal name or a behaviour. If a source is vague, keep it vague and raise a GAP. If two sources disagree, follow the authoritative one and raise a CONF.
- Every requirement cites its source document and section.
- Write content that no source covers (introduction, scope, stakeholders, constraints…) only where the specification needs it, and mark it in the text as drafted, to be confirmed.
- Before you report a finding as fact, spot-check the most surprising claims against the extracted source text yourself, especially claims made by sub-agents. State in the final answer what you verified and what you did not.

**Versions**
- Several files are versions of the same document (same title, different date/revision suffix, copies in archive folders such as `zzz - str`, `old`, `archive`, or in dated snapshot folders). Treat them as a time history: **the latest version is authoritative**. Older versions are used only to understand intent, to detect requirements that silently disappeared, and to explain conflicts.
- Determine "latest" from the date/revision in the file name *and* the date/revision inside the document. Watch for traps:
  - lexical sorting is wrong (`2026-09-8a` sorts after `2026-09-29b`);
  - a file can be mislabelled (the file named "…29b" internally says "…29a" and contains older content). Diff consecutive versions and flag it;
  - files marked "OUT OF DATE" / "superseded" by a pointer file, and identical copies in several folders;
  - "Comments from X" variants carry review comments that are still open issues.
- Identify document families by their title stem; build a **document register** with keys `D01`, `D02`, …: key, title, latest version used, older versions read.

**Authority order when sources disagree** (adapt to the project and state it in the master):
formal specification / annex (latest) > design note of the safety or system authority (latest) > customer / supplier notes > older notes. For signal-level facts (message IDs, layouts, value tables) the newest interface definition (e.g. DBC) wins.

**Identifiers**
- Stable IDs matter more than tidy numbering. Once an ID is published, never renumber or delete it. New items take the next free number.
- Area codes are **letters only** (a digit, as in `P1R`, breaks typical regexes). They must not collide with ID prefixes used in the sources (e.g. do not call an area `FSR` if the sources use `SMU-FSR-01`).

**Personal data**
- Stakeholders are named by role, never by person. Git commit authors: use "Import" unless the user says the real document authors may appear in the history (the history is shared with everyone who gets the repository).

**Cost and robustness**
- When you delegate to sub-agents, give each a written brief file plus a narrow, explicit scope. Ask them to write output incrementally (in batches), so an interruption does not lose everything. Ask for a short reply (counts and the top three findings).
- After every batch of agent work, validate their output with a script before using it.

---

## 2. Skills and knowledge you need

| Skill | What it means here |
|---|---|
| Document extraction | Read `.docx` at XML level; read `.doc` (binary Word, or MHT/"Single File Web Page" exports); `.pdf`, `.pptx`, `.xlsx`, `.drawio`, `.dbc`, `.html`, `.txt` |
| Version analysis | Group files into families, pick the latest, diff versions |
| Requirements engineering (IREB CPRE FL, ISO/IEC/IEEE 29148) | Requirement templates, quality criteria, attributes, document structure |
| Domain reading | Understand the system (e.g. safety-related embedded systems, CAN/DBC, IEC 61508 / ISO 25119 / ISO 26262 terminology) well enough to see contradictions |
| Conflict and gap analysis | Detect contradictions between sources and inside the specification, duplicates, missing values, untestable wording |
| Python scripting | Parsers, validators, deterministic ID generation, YAML writing, Git automation, python-docx |
| Git | Scripted commits with author/committer dates, annotated tags |
| Word (OOXML) | Styles, numbering, headers/footers, fields, title pages, building a template |

### Tools (check what is available first, install only what is missing and allowed)

- Python 3 with `python-docx`, `PyYAML` (and `openpyxl` if available; otherwise parse `.xlsx` XML yourself).
- `pdftotext` (poppler) for PDFs; `antiword` for old binary `.doc`.
- `git`.
- Optional: `pandoc`, LibreOffice (`soffice --headless --convert-to docx`) for awkward formats.

---

## 3. Phase A – Inventory and extraction

1. List every file of every input folder with size and path. Count by extension.
2. Classify each file:
   - **Requirement-bearing:** specifications, annexes, design notes, interface definitions (ICD, DBC), test plans and scenarios, safety analyses (HARA, safety goals), meeting notes with decisions.
   - **Reference:** vendor datasheets, manuals, standards. Catalogue them, but do not extract requirements unless a project document adopts them. Do flag "conditions of use from safety manuals not traced" as a gap if relevant.
   - **Raw data, skipped:** videos, images, CSV logs, CAN traces, archives, PCB/CAD files. If data such as a map file is needed to check a requirement, analyse it with a small read-only script.
   - **Duplicates:** identical content (SHA-1). Extract once and record the copies.
3. Extract text into a scratch corpus, one `NNN_<short name>.md` per file, plus an `_index.tsv` (number, characters, status, original path):
   - **`.docx`: parse `word/document.xml` directly**, not only `paragraph.text`:
     - walk the body in order (paragraphs, tables, `w:sdt` content controls), with headings as `#`, list levels as indented bullets, and tables as Markdown;
     - **tracked changes:** keep insertions (`w:ins` runs) and drop deletions (`w:delText`), but list the deleted text at the end under `=== TRACKED CHANGES ===`;
     - **comments:** extract `word/comments.xml` with author and date, anchor `[[Cn]]` inline, and list them at the end under `=== WORD COMMENTS ===`. Unresolved comments are open issues.
   - **`.doc`:**
     - try `antiword` first;
     - if the file starts with `MIME-Version`, it is an MHT web archive (e.g. a Confluence export). Parse it with Python's `email` package, take the `text/html` part and convert HTML to text with tables;
     - honour the charset, and treat `charset="unicode"` as UTF-16.
   - **`.pdf`:** use `pdftotext -layout`. Huge schematic or manual PDFs: grep them, don't read them in full.
   - **`.pptx` / `.xlsx` / `.drawio`:** read the XML (slide text, shared strings, cell values, `value=` attributes).
   - **Windows path limit:** output file names must be short (number plus a truncated name). For reading inputs with paths over 260 characters, use the `\\?\` prefix in Python. External tools such as `pdftotext` don't accept that prefix, so copy the file to a short temporary path first.
   - **Encoding:** always write UTF-8. Set `PYTHONIOENCODING=utf-8` when printing to a Windows console.
4. Note which content exists **only as images** (tables, equations, state diagrams). That content cannot be extracted as text and becomes a gap. If an image is essential, view it and describe it, saying that you did so. Save essential images as `attachments/<item ID>/<n>.<ext>` in the reqochet folder, **outside** `requirements/` (reqochet does not show images yet), and put `[Image: attachments/<item ID>/<n>.<ext> — <caption>]` in the item text where the image was.

## 4. Phase B – Understand the system and plan the structure

1. Read the top-level documents yourself: safety case or concept, architecture, the main specification. Write down:
   - the system and its parts;
   - the safety goals or stakeholder needs;
   - the safe state;
   - the external parties (other ECUs, operator, installation);
   - the main functions;
   - the requirement ID schemes already used by the sources (e.g. `SRS-012`, `SMU-SoRS-105`, `SMU-WAT-R12`).
2. Build the **document register** (`D01…Dnn`): latest version plus history, per family.
3. Define **area codes** (letters only, 2–4 characters) by function. Order them as a reading flow: system level → modes → safety/main functions in goal order → calibration/configuration → fault handling → interfaces → platform/hardware → verification/tools.
4. Split the work into **topic clusters** of comparable size (roughly 40–250k characters of latest-version text each). Give each cluster a distinct set of area codes so that IDs cannot collide.

## 5. Phase C – Extraction into fragments (parallel)

Write a shared **brief file** (`BRIEF.md`) that every extractor reads. It must contain:

- the project context, the safety goals and the parties;
- the corpus location, how tracked changes and comments appear, and that the latest version is authoritative;
- the document register table with corpus file numbers, latest and history;
- the writing rules (Section 6 below, "Consolidation wording");
- the **strict output format**:

```
## <Area title>
<1–3 sentence intro>

### <Sub-topic>
<optional intro>

#### <PREFIX>-<AREA>-001: <short title>
- **Statement:** The <subject> shall …
- **Type:** Functional | Safety | Interface | Performance | Diagnostic | Configuration | Constraint | AoU | Verification
- **Applies-To:** <one party>
- **Safety-Goal:** SG-01, … | -
- **Status:** Agreed | Proposed | TBC
- **Verification:** Test | Analysis | Inspection | Review
- **Source:** D05 §<section>; D06 §<section>
- **Legacy-IDs:** <IDs used by the sources> | -
- **Parameters:** NAME = value unit (configurable) | -
- **Rationale:** … | -
- **Notes:** … | -
- **Issues:** CONF-<AREA>-01, GAP-<AREA>-02 | -
```

followed, in the same file, by:
- `## Conflicts (<areas>)`: items `#### CONF-<AREA>-NN: title` with Description, Sources (with short quotes), Affected, Severity (High | Medium | Low) and Proposed-Resolution;
- `## Gaps (<areas>)`: items `#### GAP-<AREA>-NN: title` with the same attributes;
- `## Parameters (<areas>)`, `## Signals and interfaces referenced (<areas>)`, `## Glossary candidates` and `## Version history notes`, each as a table.

Severity guide: High = could make the safety or main function wrong, or blocks implementation; Medium = ambiguity that will cause rework; Low = editorial.

Status meanings: **Agreed** = in a latest formal specification or authority design note, with no open comment; **Proposed** = only in notes or proposals; **TBC** = TBD value, open question or unresolved comment.

Brief each extractor with:
- its documents (latest + history) and its area codes;
- what is out of scope, and which other agent owns it. They should still list related signals so that cross-checks are possible;
- the things to look for in their topic: timing values, state transitions, ownership of messages, fault reactions, and differences between versions;
- the instruction to merge duplicates across documents into one block that cites both sources;
- a self-check before finishing: every block has all 12 attributes, no duplicate IDs, and every cited issue ID is defined.

## 6. Writing rules

**Consolidation wording (phase C)**
- One testable "shall" statement per requirement. Never use should, may, will or must in a statement; informative text goes in Notes.
- The subject is explicit ("The SMU shall …"). Obligations on other parties are Assumptions of Use ("The VCU shall …", Type AoU).
- Active voice, measurable, every tunable named (`T_X_MAX = 100 s (configurable)`), signal, state and code names verbatim in backticks.

**IREB rewrite (phase F)** – the requirement template of IREB CPRE Foundation Level:
- `[<condition>,] <subject> shall <process verb> <object> [<qualifiers: value, unit, time>].`
- The condition comes first: event ("When …"), state ("While …"), unwanted behaviour ("If …, the X shall …"), optional feature ("Where …"). Use one condition clause.
- **Liability:** keep *shall* (binding). Do not invent should/will/may.
- **Precise process verbs**: disable, set, transmit, store, reject, compare, enter, report. Avoid handle, support, manage, ensure, process and perform when a precise verb exists. No nominalisations, no passive voice, no pronouns pointing outside the sentence.
- **No weak words**: appropriate, sufficient, fast, as soon as possible, etc., and/or, approximately. If a source contains one and gives no value, keep it and add a reviewer remark.
- **Values**: number + unit and tolerance; parameters as `NAME (value unit)`.
- **Atomicity:** split only genuinely compound statements. The first part keeps the former ID; further parts get `.2`, `.3`.
- **Use glossary terms consistently.**
- **Meaning must not change.** Copy backticked tokens, values, codes and IDs verbatim; validate this with a script.
- A title (IREB "name") per item: a 2–8 word noun phrase, unique within the area.

## 7. Phase D – Integration (master)

1. **Validate every fragment with the parser** (Section 11) before assembling.
2. **Assemble** the master with a script, never by hand:
   - front matter: purpose, scope, conventions, area-code table, attribute table, source-authority rule, stable-ID rule, revision history;
   - system context and goals;
   - chapters by area order;
   - annexes: A conflicts, B gaps, C parameters, D signals and messages, E code registers, F merged and de-duplicated glossary, G document register and version notes.
3. **Cross-area analysis**, done by you rather than delegated: read all conflicts and gaps together.
   - Group recurring themes into `CONF-X-NN` and `GAP-X-NN` items. Typical themes: reaction class (fault vs warning) disagreeing across documents, the same message with different IDs, layouts or senders, thresholds that differ between specification and tests, ownership of a function, undefined safe-state exit, missing timeouts, release scope.
   - Each X item lists the area items it consolidates ("Related"). Compute its Affected list from those items, and back-link the X item into the Issues of the affected requirements.
4. **Spot-check** the 5–10 most serious claims against the corpus text and fix any that do not hold.
5. **Compress** huge registers (e.g. 2,000 placeholder fault-code rows): shorten repeated cells, but keep the rows.
6. Export JSON/CSV with the parser. Expect 0 errors and 0 weak-verb warnings.

**Adding more input folders later (update pass):** back up the fragments, extract the new files into a second corpus with continued numbering, extend the register, and brief update agents with these rules:
- never delete or renumber an item;
- new items take the next free number and go into the logical sub-topic;
- when a newer, more authoritative source changes a requirement, update its statement, keep `Previous wording: "…"` in Notes, set Status to TBC and add a CONF;
- when an existing issue is answered, prefix its resolution with `[Update Dnn: …]`;
- new areas get new letter-only codes.

Then repeat steps 1–6, keeping the IDs of existing X items stable and appending new ones.

## 8. Phase E – Structure of the IREB specification

Create one reqochet document (folder under `requirements/`) per specification group. If the user asks for a single document, use one folder and express the grouping as headings. Suggested outline (IREB / ISO 29148), adapted to the project:

1. **Introduction:** purpose, scope (in/out, source basis), intended audience and stakeholders (roles, not personal names), definitions, references (standards + Appendix B), document conventions (template, liability, IDs, item types, attributes, status mapping), document overview.
2. **Overall description:** product perspective and context, system boundary and interfaces table, product functions overview mapped to goals and chapters, operating environment, operational roles, release scope, design and implementation constraints, assumptions and dependencies, safety concept and goals (goal items), status of the specification.
3. **Requirement chapters by function.** Within each area keep the sub-topics, and move the Assumptions of Use to a final "Assumptions of use – <area>" sub-section, sorted by party.
4. **Appendices:** glossary, source register (references), open issues (conflicts, then gaps; cross-area first), parameter register, signal/message register, code registers, source version history.

Mark every section that no source covers with *"[Drafted during consolidation – to be confirmed by <owners>]"*.

## 9. Phase F – IREB rewrite (parallel)

1. Export the requirements into JSONL chunks, about 90–140 items each, grouped by area: id, title, section, statement, type, applies_to, parameters, notes excerpt, and `previous_wording`. Fill `previous_wording` by comparing statements with the earlier master version. It lets every baseline be rendered in IREB wording.
2. Write `IREB_BRIEF.md` containing the rules of Section 6 (IREB rewrite), two worked examples, and the output schema per line: `id`, `title`, `statement` or `split[{title, statement}]`, `prev_statement` (only when `previous_wording` is set), `is_goal` (for upstream goal items), `verifies` (ids, for verification items), and `remark` (≤ 200 characters, only when needed).
3. Each agent rewrites every item itself (no regex rewriting), writes in batches, and self-checks with a script:
   - every input id appears once;
   - every statement contains " shall ";
   - no lower-case should/may/will/must/can/could outside backticks;
   - every backticked token is kept;
   - `prev_statement` is present exactly where required.
4. Validate all outputs together before continuing.

## 10. Phase G – reqochet project

**Schema** (`requirements/.reqochet/schema.yaml`): always start from the **current** default schema: the given `REQOCHET SCHEMA`, `config/default-schema.yaml` in the reqochet repository, or `requirements/.reqochet/schema.yaml` of a project just created with the installed reqochet (if the value is "none", ask the user for one of these). Note its date (commit or file time), re-read it immediately before you build, and never rely on an older copy found earlier in the session. Copy it unchanged. It contains `short` names, labels, per-type starting texts (`template:`) and the coverage `rules`. Add only:
- item types for kinds the defaults do not cover (lower-case-with-dashes id, name, short), e.g. `safety-goal`, `assumption-of-use`, and `open-issue` (with `requirement: false`);
- one field per attribute used by more than one item:
  - `enum` for small fixed value sets (options listed as text);
  - `list` for multi-value attributes;
  - `text` otherwise;
- field and type ids: lower case, digits and dashes; every enum option and every `default` is written as a quoted string when it could be read as a number, date or yes/no (`"2"`, `"1.0"`, `"Yes"`) — an unquoted number is not a valid option and blocks saving in reqochet;
- if the documents are not in English, add `writing: { requirementWord: "<the language's 'shall'>", vagueWords: [<that language's weak words>] }` so reqochet's writing hints fit; `writing: { hints: false }` switches them off;
- map attributes that mean the same as a default field onto that field (e.g. source Status → `status`), keep the original value in its own field, and write every mapping in the report. Values that don't fit an enum stay as text in a new field and are never dropped. Don't map an issue's severity onto requirement priority;
- add a link type only if the documents use a relation the defaults lack. Usually *refines* (requirement → goal or need), *verifies* (test → requirement) and *relates-to* (issue → requirement) are enough.

**Item mapping**
- **Requirement type:** AoU → assumption-of-use; Verification → test-case; hardware area → hardware-requirement; interface areas or Interface type → interface-requirement; system level, verification environment and tools → system-requirement; otherwise software-requirement. Upstream goals → safety-goal.
- **Headings and fixed sections:** `information` items, with intro text as their body.
- **Conflicts and gaps:** `open-issue` items with issue-kind, severity, sources and proposed resolution. Their *relates-to* links (affected requirements and related issues) are written on the issue item only, never on both sides.
- **Item text:** the IREB statement. Rationale, notes, source, parameters and legacy IDs become fields.
- **`former-id`:** the consolidation ID. Use `former-id.2` for split parts.

**IDs:** `REQ-` + 7 characters from `0123456789ABCDEFGHJKMNPQRSTVWXYZ` (Crockford base32, every item type). Generate them **deterministically** (hash of a stable key: former-id, issue id or heading path), resolve any collision with a salt, and keep them unique project-wide. The same item then keeps its ID in every version **and in every rebuild or update pass**: never change the hash key or salt rule between runs, and check after a rebuild that every earlier ID still exists for the same item.

**Files:** `requirements/<Document name>/<ID>.md`, UTF-8, LF line endings. Only document folders and `.reqochet/` go under `requirements/`; the report, the format files and images go next to it, in the repository root.
- **Document name:** at most 80 characters, none of `\ / : * ? " < > |`, no control or invisible characters, not a Windows device name (`CON`, `PRN`, `AUX`, `NUL`, `COM1`…, `LPT1`…), not starting with a dot, no space at either end, not ending with a dot. reqochet ignores a folder whose name breaks these rules.
- **Header key order:** `id`, `type`, `title`, then the schema fields in schema order (keys without a value are left out), then non-schema keys sorted alphabetically (`former-id`, `shared-from`, …), then `parent` (same document), `order` and `links` (`- type: …` / `target: …`).
- **`order`:** 10, 20, 30… per sibling group, written as unquoted YAML whole numbers. reqochet reads them as positions and turns them into its own order keys the next time it saves an item. Never write fractions, negative numbers or quoted numbers (`"10"` is not a valid position, the item would lose its place).
- **Links:** each link has `type`, `target` and `confirmed`, in that order. `confirmed` is the target's fingerprint: the first 12 hex characters of SHA-256 over `<item type>\0<title>\0<text>` of the **target** item (its item type such as `software-requirement`, not the link type) (UTF-8; text with CRLF turned into LF and leading/trailing white space removed). In every imported version, confirm each link against its target in that same version. A link without `confirmed` never becomes suspect and cannot be confirmed in reqochet, so its change tracking is lost.
- **Layout:** a `---` line, the YAML header, a `---` line, then the Markdown text (no empty line needed, one line break at the end).
- **Write the header with a YAML library**, for safe quoting of values that look like numbers, dates or yes/no. Use block style, and indent lists under their key.

`requirements/.gitattributes` must contain exactly these two lines:
```
# Written by reqochet: identical line endings on every PC keep diffs clean.
* text=auto eol=lf
```

**Requirements shared between documents** (only when there are several documents): a requirement that makes two documents responsible is kept in both.
- The copy gets a new ID and `shared-from: <original ID>`, under the best-fitting heading, or under "Shared requirements" if none fits.
- Write one *relates-to* link, on the item of the document that comes later alphabetically.
- A requirement touching three or more documents gets one item per document, each linked to the original.
- The copy follows the original through the versions.
- When in doubt, list the case under Questions instead.

**Git history** (the output sub-folder becomes the repository): `git init`, `core.autocrlf=false`. Then, for every version of every group in date order, oldest first:
1. make that group's folder exactly like that version, touching no other folder;
2. commit only that change with the message `Import <Document> v<n> (<original file name>)`. Set author and committer date (`GIT_AUTHOR_DATE` / `GIT_COMMITTER_DATE`) to the version date, and the author to "Import" (see Personal data);
3. create an annotated tag `baseline/<Document-with-dashes>-v<n>`, checked with `git check-ref-format`, whose message is the version's revision-history line. reqochet lists annotated `baseline/…` tags as baselines (Versions, Compare, and `{{revision.history}}` in the Word export).

The first commit also adds `.gitattributes` and the schema. If conflicts are found (Phase H), add a final commit "Mark conflicts found by the import" that adds the tag `import-conflict` to the `tags` field of every item involved, in the newest version only; the text stays unchanged. Commit the report and the format files last.

## 11. Phase H – Checks, conflicts, report, Word format

**Parser and validator for the master** (write it early, run it after every change):
- item heading regex `^#### (<PREFIX>-[A-Z]+-\d{3}|CONF-[A-Z]+-\d{2,3}|GAP-[A-Z]+-\d{2,3}):`;
- attribute lines `^- \*\*Key:\*\* value`, with continuation lines;
- required keys, enum values, "shall" present, weak verbs flagged, unique IDs, and every issue reference resolvable;
- export to JSON and CSV.

**Project checks (code):** every file parses as YAML + text; header key order; ID format and uniqueness; file name equals ID; every parent and link target exists, parents in the same folder, no parent loops; enum values allowed; every type, field and link type is in the schema; LF only; `.gitattributes` exact; tags annotated, with valid names, pointing to their import commits. Also:
- every link has `confirmed`, equal to the target's fingerprint in the same version;
- link keys appear in the order `type`, `target`, `confirmed`;
- `order` is an unquoted positive whole number;
- `requirements/` holds only document folders, `.reqochet/` and `.gitattributes`;
- every document name passes the full rule set (length, forbidden characters, control and invisible characters, Windows device names, dots and spaces at the ends);
- each template is in `requirements/.reqochet/templates/` and under 20 MB.

Fix until there are 0 errors.

**Conflicts inside the specification** (newest version):
1. Generate candidates automatically:
   - near-duplicates by TF-IDF cosine similarity of title + text (threshold about 0.55), excluding parts of the same split;
   - open conflicts that link requirements of two or more different areas;
   - parameters with the same name but different values.
2. Have reviewers judge every candidate against the actual text:
   - for duplicates, the verdict is duplicate, overlap, contradiction or different;
   - contradictions must be incompatible *as written* (different value for the same limit, opposite reaction to the same event, different owner of the same message, one requirement making another impossible). Do not count cases where the document consistently follows one source; those are already open issues;
   - quotes must be verbatim, so check them with a script.
3. Never resolve a conflict by changing text; only report it and tag the items.

**`import-report.md`** contains:
- the groups (document, kind, versions with dates and file names) and the recognised requirement pattern;
- per version: items added, changed and deleted compared with the previous version;
- attribute → field and value mappings, and the new types, fields and links with the reason for each;
- matching method between versions (stable keys, or text similarity), unresolved references, images saved;
- shared requirements;
- **Conflicts:** both reqochet IDs and source IDs, documents, both sentences quoted, and why they conflict; then the duplicates and overlaps;
- **Questions:** files left out, unclear versions, assumptions made, drafted sections, status-mapping choice;
- the checks performed and their result;
- the reviewer remarks from the rewrite.

**Word format profile (`format/word-format.json`):** study the newest complete document of each group. If the group has no Word original, use the newest complete document of the same document family or template. Record:
- page size, orientation, margins and columns;
- styles in use for body, headings 1–6, requirement text, tables, captions, lists and TOC: font, size, bold/italic, colour, spacing before/after, line spacing and indents. Include inherited docDefaults and theme fonts;
- heading numbering: the pattern, and whether it comes from a multilevel list or is typed by hand;
- title page fields and their position (name, number, version, date, author, approver, customer, confidentiality, logo);
- header and footer fields (document name, file name, classification, copyright, page "x of y");
- fixed sections before and after the requirements (revision history, purpose, scope, definitions, references, approvals, trademarks) with their standard wording;
- the layout of one requirement (title line with ID and title, attribute table or labelled paragraphs, ID position);
- the traceability table, if any.

Copy the logo and other fixed images to `format/images/`.

**Template (`format/template[-<group>].docx`, and the same file in `requirements/.reqochet/templates/<group>.docx`):** build it with python-docx from a copy of that newest document. reqochet's Word export offers every `.docx` in `requirements/.reqochet/templates/`; keep each under 20 MB.
- Keep its styles, section setup, title page, header/footer and fixed-section labels.
- Replace content with placeholders, typed exactly (lower case, two braces):
  - in any text, also headers, footers and the title page: `{{document.name}}`, `{{document.number}}`, `{{baseline}}`, `{{commit}}`, `{{date}}`, `{{author}}`;
  - each **alone in its own paragraph** (reqochet replaces the whole paragraph): `{{toc}}`, `{{revision.history}}`, `{{items}}`, and `{{trace.table}}` only if the documents have a trace table.
  - Delete the original table of contents field and the original revision-history table: reqochet writes both (the history from the baselines).
- Use styles only, never direct formatting for new content. reqochet finds styles by their **names**, so keep these names exactly: `Heading 1` … `Heading 6`, `Normal`, `TOC Heading`, `RM Requirement Text` (paragraph style), `RM Attribute Table` and `RM Trace Table` (table styles). Missing RM styles fall back to Normal and plain tables.
- Heading numbering: when `Heading 1` carries Word's own multilevel numbering, reqochet leaves its own outline numbers out of the headings; otherwise it types them. So attach a multilevel list to Heading 1–6 when the source numbers were typed by hand.
- Embed the logo and other images in the template; linked (external) pictures are removed by reqochet for safety.
- Replace project-specific text with bracketed instructions such as "[Describe the purpose of this specification]".
- Remove requirement text, customer data and people's names, including:
  - the cached results of fields (e.g. FILENAME), which a run-by-run replacement misses;
  - the copyright line in the footer;
  - core and app properties (author, company, last modified by);
  - custom properties: blank their values, but don't delete the part, because that breaks package relationships;
  - unreferenced images.
- Verify by unzipping the template and grepping every XML part for names and project terms.

---

## 12. Lessons learned (avoid these mistakes)

- `paragraph.text` misses inserted tracked-change text, and comments are invisible unless you read `comments.xml`.
- Confluence `.doc` exports are MHT, not Word. Some declare `charset="unicode"`, which means UTF-16.
- Windows: output paths over 260 characters fail. `\\?\` works for Python but not for external tools. Shell heredocs can mangle backslashes, so write Python helper files with a file-writing tool instead.
- Lexical date sorting lies, and file names can be mislabelled: diff the versions.
- A digit in an area code broke the ID regex and silently dropped a whole chapter. Compare the parser's counts with the assembler's counts after every build.
- An area code equal to a legacy ID prefix creates confusing near-identical IDs.
- Partial files written by a still-running agent can leak into a build. Exclude temporary names (e.g. leading `_`) and wait for completion.
- Sub-agent findings can be overstated. Verify the high-severity ones in the source text (e.g. "file X is a reused template": count the indicative terms).
- Huge generated tables (thousands of placeholder rows) make the document unreadable. Compress repeated cells, but keep the rows.
- Write results incrementally; long jobs can be interrupted.
- Removing a package part from a `.docx` breaks its relationships. Blank the content instead.
- reqochet reads `order: 10` but not `order: "10"`; enum values that look like numbers must be quoted strings. Write the header with a YAML library and check both with the project checks.
- A template placeholder split over several Word runs still works in reqochet, but a block placeholder that shares its paragraph with other text does not: give `{{items}}` & co. their own paragraph.

## 13. Final answer to the user

Reply briefly:
- what was produced, with output paths and counts;
- the validation result;
- what you spot-checked yourself;
- the most important conflicts and gaps (a handful, plain language);
- the decisions the user should confirm (document split, status mapping, drafted sections);
- the documents you would ask the customer for (referenced but missing).

Do not paste the documents into the chat.
````

## After the AI has answered

1. **Read `import-report.md` first,** especially "Questions". Answer the AI and run again if a group or version is
   wrong — it is cheaper than fixing hundreds of files.
2. **Open the reqochet folder in reqochet** (Open repository…). Check:
   - each specification appears as a document, with headings and outline numbers as in Word;
   - the Problems panel (status bar) — it lists anything that is still wrong in the files;
   - **Versions:** one baseline per source version; **Compare** two baselines of the same document; an item's
     **History** tab shows its versions.
3. **Conflicts:** filter the table by the tag `import-conflict`. Decide each one with the authors, fix the text, and
   remove the tag. Open issues are items of type `open-issue` with *relates to* links to the requirements involved.
4. **Suspect links:** a link turns suspect when its target changed after the link was confirmed. Right after the
   import only links whose target changed between source versions without the source being updated are suspect —
   these are worth a look first.
5. **Word export:** Export → Word, and choose the template from `requirements/.reqochet/templates/`. Compare the
   result with an original; `format/word-format.json` lists what the original looked like.
6. **Put it on GitHub** (or your company's Git server): create an empty repository there, then Push in reqochet, or
   `git remote add origin <address>`, `git push -u origin --all` and `git push origin --tags`.
7. **Images:** keep the `attachments/` folder beside `requirements/` until reqochet can show images; the item texts
   say which image belongs where.

## Notes for whoever maintains this guide

- The item format in Phase G follows `src/modules/items/itemFile.ts` (file layout, header key order, `former-id` and
  `shared-from` kept as unknown keys, whole numbers in `order:` read with `keyOfNumber`) and `docs/ARCHITECTURE.md` →
  "Data format". Document folder names follow `isDocumentName` in `src/modules/repository-store/fileStore.ts`.
- Whole numbers in `order:` on purpose: fractional and negative numbers collapse to the same key (review 2026-11-10,
  CRC-09); quoted numbers are not order keys and the item loses its place. Unquoted numeric enum values block saving
  (CRC-07) — hence the quoting rule.
- Links without `confirmed:` are never suspect (`sqliteIndex.ts`: `l.confirmed IS NOT NULL`) and the window offers
  Keep only for suspect links, so the prompt writes `confirmed:` itself. The fingerprint follows
  `src/modules/items/fingerprint.ts`; if it changes, update Phase G.
- Baselines are annotated tags `refs/tags/baseline/<name>` (`git-adapter`); compare pairs a converted item with its
  old file through `former-id` (`compare.ts`).
- Placeholders, style names, the 20 MB template limit and the removal of external pictures follow
  `src/modules/import-export/document.ts` (0.25). If any of these change, update Phase H.
