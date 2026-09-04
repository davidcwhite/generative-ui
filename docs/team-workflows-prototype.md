# Team workflows — review prototype

Open `http://127.0.0.1:5173/?view=team` after signing in. This branch starts from `lab/deal-based-view` and introduces an interactive product prototype in the existing Team navigation.

## Product direction

Primary Flow should help a team finish a familiar piece of work, then make the next edition easier. The main objects are a saved workflow and its individual runs. Team settings remain available as a secondary destination.

The two examples are a one-slide deal flash and a three-slide weekly EUR credit newsletter. Both use the same sequence:

1. Name the workflow, choose its team, and optionally record the existing preparation time.
2. Select an example file pack or shared folder. Each workflow asks only for the inputs it needs.
3. Review suggested mappings. Resolve the currency column and explicitly confirm the data.
4. Save the setup and start an edition. Future runs reuse the mappings and require a refresh of the example commentary.
5. Review the preview, edit commentary, inspect source references, and mark the run reviewed.
6. Download a sample HTML preview and return for another edition.

## What is functional

- Configuration, in-progress setup and run history persist in this browser under `pf-workflow-prototype-v1`.
- Missing fields, incompatible types, duplicate mappings, inconsistent units and invalid time entries block the relevant action.
- Sample issuance totals and allocation percentages are calculated from fictional fixtures.
- Run snapshots keep their own configuration and data when the workflow is subsequently edited.
- Editing commentary clears its reviewed status. Newsletter preview navigation covers all three slides; the first slide shows an explicitly labelled excerpt of the full commentary on slide three.
- The next-run demonstration flags outdated commentary and requires selecting the current sample notes.
- HTML export escapes user-entered content. No messages or documents are sent to other people.
- Existing chat, data views and team settings remain accessible.

## Prototype boundaries

All financial data is fictional. Example filenames are descriptive labels, not files that were actually parsed. Shared folders are not connected. Commentary is seeded text, not an AI response. Changing an edition label does not refresh financial data. Configuration is local to the browser, not shared across a real team. The downloaded sample is HTML, not PowerPoint.

Actual file ingestion, source permissions, templates supplied by the team, AI commentary, PowerPoint generation, server-side history and shared membership remain implementation work after the interaction design is reviewed. Real rollout should also replace the app's existing shared-password model with appropriate authentication and authorization.

## Review the flow

- Set up a deal flash, then try a second run. Does confirming the initial mapping make the second run meaningfully easier?
- Set up a newsletter using the example folder. Does the missing/stale input guidance match how a team would supply its weekly data?
- Edit commentary and inspect the source trail. Is there enough context to trust and approve the output?
- Visit Sources and Run history. Can a returning team member understand what is configured and which edition they are opening?

Pilot measurements are deliberately user-entered, not claimed savings. Assess the complete preparation effort, repeated use, support required and whether a second team can adopt the same workflow with configuration.

## Validation

From `client`:

```sh
npm run build
node --test tests/workflow-model.test.mjs
```

The model tests use native TypeScript loading in Node 22.18+ (validated with Node 25). They cover setup gates, mapping types and units, reconciliation, snapshot isolation, storage recovery and input validation.

Browser checks cover both setup paths, a disabled generation action with stale inputs, confirmation and review gates, editable commentary, slide navigation, source evidence, history, setup recovery after reload and responsive panel widths. No live API or model request is required for these checks.
