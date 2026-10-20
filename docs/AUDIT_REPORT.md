# Study Tracker audit — 20 October 2026

The audit found and fixed eight issues. Existing tests passed before the audit; additional edge-case checks exposed failures outside their coverage. Passing these checks does not establish that the app has no remaining bugs.

## Fixes

| Issue | Before | After |
| --- | --- | --- |
| Suspended focus timer overcounts | Resuming a 25-minute timer after two hours could propose 120 minutes of study. | Elapsed study credit is capped at the session's remaining duration. |
| Skip today breaks plan/task links | Plan dates changed while task keys and original dates stayed behind, leaving incorrect carry age and risking duplicate tasks or lost association with existing progress. | Linked task keys and dates move together; task IDs, spent minutes and linked logs remain intact. |
| Invalid timer/goal settings | Zero or negative values could be saved despite the input's minimum, producing invalid timers and targets. | Invalid edits are rejected. Previously stored invalid numeric settings fall back to valid defaults when loaded. |
| Imported text interpreted as HTML | An imported task identifier containing markup could execute an event handler when rendered. To-do priority text and several numeric display boundaries also lacked escaping. | These values are escaped at rendering boundaries. Regression checks verify markup remains inert and task controls still work. |
| Malformed backup replaces working data | A JSON object with `logs: []` could pass the old check even with invalid task/plan collections and then break rendering. | Backup shape, key collections, dates, task/log values, nested records and unsafe object keys are checked before replacing active state. Older minimal valid backups remain supported. |
| Device save failures hidden | A full or blocked browser storage area could reject a write silently. | A visible warning tells the user to keep the app open and export a backup. In-memory changes can be exported and are saved on the next successful edit once storage works again. |
| Invalid timetable imports | Impossible dates, negative study hours and duplicate lesson keys could enter the plan and produce misleading totals. | Invalid CSV rows and duplicate keys are rejected with an error before replacing the plan. |
| Service worker clears other app caches | Activating an update removed every other cache on the origin, including caches from unrelated GitHub Pages apps. | Cache cleanup is restricted to old Study Tracker cache versions. |

The HTML regression test used harmless markers in an isolated test browser. It did not read or transmit anyone's credentials or account data. These findings are not evidence that an actual user account was compromised.

## Verification

- **36 automated calculation, validation, merge and cache tests passed.**
- **Nine browser test scripts passed**, comprising eight phone/desktop scenarios (390 and 1440 pixels) and one simulated two-device sync scenario.
- Checks covered plan achievement, carry filters, daily pins, catch-up allocation, weekly accuracy/speed, recovery windows, revision stages and retries, navigation and Back behavior, maths models and tables, original/PYQ labelling, mock scoring, local persistence and offline reopening.
- New checks covered delayed timer callbacks, preserving progress when skipping a plan day, invalid and previously stored timer settings, imported HTML, malformed and valid backup restoration, invalid CSV rows, storage-write failure, exporting unsaved memory state, and recovery after storage becomes writable.
- Sync checks covered cached versus server-confirmed status, offline edits, merging independent device records, same-field conflicts, and selecting the fresh server copy. Firebase transaction wrapper tests also covered corrupt/oversized cloud records.

## Limits

- Browser checks used Chromium and test-only authentication/server adapters. They did not access or modify production Firebase accounts, records or rules.
- The audit therefore **does not verify the currently deployed Firebase security rules, project permissions or real phone-to-PC sync against the live project**.
- Android installation, launcher behavior, notifications while the app is closed, and browser/OS-specific background behavior still require checks on actual devices. This PWA does not provide a background notification service.
- The account remains stored in one Firestore document, with a size guard before the document limit. Long-term growth may eventually require archiving records or changing the data layout.
- Backups contain personal account data and should be kept private. The app cannot restore changes lost after clearing device storage unless they reached Firebase or an exported backup.
- Imported question sources are not independently verified. Original practice remains labelled separately from PYQs.

## Update

These fixes use service-worker cache version 20. After GitHub Pages deploys the commit, reopen the app online; a second reopen may be needed for the cached app to pick up the update. Uninstalling is unnecessary.
