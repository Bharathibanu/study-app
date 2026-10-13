# SSC CGL preparation tools

## What is available

The new features live under More on a phone and in the desktop sidebar. Old records and the existing timetable remain available. The main preparation exam is SSC CGL; sourced question imports can also identify CHSL, MTS, CPO, GD and Other SSC.

| Feature | How to use |
|---|---|
| Topic Practice | Choose subject/topic, then start a question set or log practice from a book/test. |
| Mistake Notebook | Wrong practice answers enter automatically. Edit the cause, correct method and optional lesson link. |
| Revision Queue | Completed lessons and open mistakes return at Days 1, 3, 7, 15 and 30. |
| CGL Mock Analysis | Enter section question counts, correct/wrong answers, timing and marking scheme. |
| Home: What should I study today? | Shows a short list of due reviews, overdue/current lessons and one weak topic. |
| 2024–2025 PYQ Bank | Imports sourced question JSON outside your personal Firebase document. |
| Safer syncing | Confirms server saves, merges independent record changes and pauses conflicting edits. |

## Questions, hours and mastery are different

Your timetable continues to measure lesson progress in minutes. Topic Practice measures questions answered, accuracy and time. Revision Queue measures review stages. Doing 20 minutes is not proof of mastery; a quiz result is not automatically a timetable completion.

Accuracy = correct answers / attempted questions × 100. Skipped questions are recorded separately. Average seconds uses timed attempted questions only. A topic is highlighted below 70% accuracy after at least 10 attempts; this is an app heuristic, not an official SSC cutoff. Numbered lessons such as Percentage 1 and Percentage 2 aggregate under Percentage.

Manual practice can be recorded even if no question bank exists. Enter the actual attempted/correct/skipped counts and time from your own book or test. Zero seconds means untimed, not instant performance. Delete an erroneous attempt to remove it from statistics; deleting an attempt does not automatically delete an associated mistake.

## Mistake notebook

For wrong in-app answers, the notebook saves question text, your answer, correct answer, explanation, date, subject, topic and source. It initially uses Unclassified; choose Concept, Calculation, Reading or Time pressure after reviewing the cause. Repeated wrong attempts can update the existing open mistake instead of duplicating it.

Manual mistakes can include a book/source reference and a timetable lesson link. The link is descriptive: it does not change the lesson’s minutes. Archive a mistake to remove it from the active revision queue; reopen it to include it again. Delete only when you no longer need the record.

## Revision queue

Sources are completed study tasks and open mistake entries. Reviews are scheduled relative to completion/entry date at 1, 3, 7, 15 and 30 days. Recalled advances the stage. Needs review keeps that stage and schedules tomorrow. A late review does not require completing multiple stages at once: the next overdue stage is moved to at least tomorrow.

Upcoming reviews are visible but cannot be marked recalled early. Undo removes a review entry and recalculates the queue. The older Revision Log remains available for manually recording revision minutes and question counts; these are separate records.

## Mock analysis

Each subject section records total questions, correct, wrong, minutes, marks per correct answer, penalty per wrong answer and weak-topic notes. Total questions minus correct/wrong gives skipped questions.

```text
Net score = correct × marks per correct answer − wrong × penalty
Negative marks = wrong × penalty
Accuracy = correct / (correct + wrong) × 100
```

The initial 25-question, 2-mark, 0.5-penalty values are editable starting values. Verify the current official notice. Tier II/custom analysis supports entered section values; it is not a complete automatic representation of every Tier II module, qualifying requirement, typing test or computer test. No percentile or selection prediction is invented.

This new section analysis does not modify older overall Mock Test log records. Keep both only when useful; they serve different reports.

## Question-bank status and source honesty

**The app does not yet contain the requested complete 2024–2025 SSC PYQ collection.** Official SSC sites and general web search were blocked by the development network proxy. Public GitHub repository searches did not yield a usable verified source. Papers could not be independently retrieved and verified. There are 16 original starter practice questions. They are always labelled “Original practice — not a PYQ.”

The PYQ bank validates source metadata but does not certify the truth of user-supplied provenance. Imported entries are labelled as imported and not independently verified. A collection cannot be called “all SSC questions” until completeness by exam/year/tier/date/shift and answer-key version is checked.

## Import format

Use a JSON file containing `questions`. Import replaces this device’s imported bank; the bundled original questions remain. Limits are 5 MB per file and 5,000 questions. The bank is stored in browser IndexedDB, outside account JSON. Import it separately on another device. Your attempts and mistake notes sync through Firebase, but the whole bank does not.

Each question needs a unique text ID, one of Quant/Reasoning/English/General Studies, topic, question text, four text options, answer index 0–3 and explanation. `kind` is `original` or `pyq`.

PYQ entries additionally require exam, year 2024 or 2025, tier, paper date, shift, question number, an HTTPS source link, source title and reuse basis. Include exact paper/answer-key references, not merely a generic website homepage. Download import template is a schema example with placeholders, not a real exam paper or validated question. Its `template: true` flag blocks accidental import; replace the placeholders with real permitted content, then remove that flag.

Use content you own or are permitted to reproduce. Do not copy a subscription question bank without permission. Official response-sheet availability can be temporary and may require candidate access; the app does not request or scrape candidate credentials.

## Daily recommendation list

Home shows up to two due reviews, three unfinished overdue/current lessons and one weak topic. It does not alter your timetable or invent study hours. Practice opens matching topic filters; an empty result explains that a matching bank or manual practice is needed. The full schedule remains below.

## Firebase saving and conflict handling

Local edits are saved to browser localStorage. Cloud writes use a Firestore transaction to read the current server document before saving. A saved baseline is used for three-way merging: baseline, current device state, current server state.

Independent additions and edits to different fields can merge. Conflicting edits to the same field, or delete-versus-edit conflicts, pause automatic writes. Browser backup copies are retained where storage is available, and a visible banner offers exports and deliberate recovery choices.

- **Export device copy / Export server copy:** preserve both states before deciding.
- **Use server copy:** reads a fresh server copy and replaces this device’s active account state.
- **Keep device copy:** deliberately replaces the entire cloud account state with this device’s copy, after confirmation.

Transactions require internet access. Offline changes stay locally and retry on reconnection; they are not falsely described as a completed server save. Cached snapshots display “awaiting server.” “Synced · server confirmed” is shown after a successful server read of matching data or a completed write transaction.

A legacy device without a saved baseline is treated conservatively if its copy differs from the server. If a conflict appears after upgrading, export both copies and choose carefully rather than erasing app storage. Update the app on all devices: an older version may still use the old overwrite logic.

The account still uses one Firestore document. A conservative 950,000-byte guard prevents a write near its size limit and asks for backup/reduction. This is not a full multi-document migration, unlimited storage or conflict-free collaborative editing. Browser storage failures, network availability and Firebase permissions still matter. Continue exporting backups.

`serverUpdated` now records a Firestore server timestamp. `updated` and `_u` remain compatibility/client-time fields, but client clocks no longer decide whether to overwrite competing records.

## Validation performed

- Unit/adapter tests for merges, deletions, collisions, legacy baseline handling, accuracy, revision timing, scoring, provenance, cached snapshots, oversized and malformed records.
- Phone and desktop browser flows for practice, mistakes, statistics, revisions, mocks and bank imports.
- Offline reload and retained local personal records/imported bank.
- Simulated two-device cloud integration: cached status, offline additions, server merge, conflicting settings and recovery.

Real Firebase credentials were not used in these tests. The simulated adapter verifies application behaviour, not an independent audit of the production Firebase service. Check one cross-device test after deployment.

## Files and tests

- `ssc.js`: SSC page rendering, forms, bank storage and question flow.
- `ssc-core.js`: pure statistics, scheduling, validation and merge rules.
- `questions/starter.json`: original practice content.
- `app.js`: integration, account state and sync coordinator.
- `cloud.js`: Firebase transaction and snapshot adapter.
- `tests/*.test.mjs`: Node pure/adapter tests.
- `tests/ssc-browser.cjs`: phone/desktop/offline browser checks.
- `tests/sync-browser.cjs`: simulated multi-device integration.

```bash
node --test tests/*.test.mjs
node tests/ssc-browser.cjs
node tests/sync-browser.cjs
```

Browser checks require Playwright and Chromium. They serve temporary test-only endpoints and never create actual Firebase accounts.
