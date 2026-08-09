# PRD: Collaborative Assumptions on Questions

**Status:** Draft for discussion
**Owner:** TBD
**Last updated:** August 9, 2026
**Target surface:** Question detail page (`/q/:id`)

## Summary

Add an **Assumptions** section to each question where people can make the beliefs behind a forecast explicit, develop a private local view, compare that view with other people’s views, and connect each belief to supporting or contradicting evidence.

The feature should make collaboration on assumptions feel concrete:

- Each person has private local assumptions scoped to the question.
- People can choose to share assumptions for review without overwriting anyone else’s view.
- A shared working view is maintained through contributor proposals and owner approval.
- A person can create, edit, or challenge an assumption.
- An assumption can cite existing evidence or include newly added evidence.
- Differences remain visible and attributable so the team can discuss what drives forecast disagreement.

## Why This Matters

Forecasts can look precise while hiding important differences in what contributors believe. Today, the question page shows reasoning, uncertainties, evidence, and comments, but it does not provide a structured answer to:

- What are we currently assuming?
- Which assumptions are shared, and which belong to a particular person or group?
- What evidence supports or contradicts an assumption?
- Which assumption is responsible for a meaningful difference in forecasts?
- What changed, who changed it, and why?

Without this layer, disagreements tend to appear as competing probability estimates or unstructured comments. The product should help users collaborate on the underlying beliefs instead.

## Product Principles

1. **Assumptions are visible, not implicit.** Important beliefs should be easy to inspect alongside the forecast.
2. **Disagreement is data.** Different perspectives should coexist rather than overwrite one another.
3. **Claims should be inspectable.** Evidence can support, contradict, or provide context for an assumption.
4. **Authorship matters.** Users should know who proposed or changed an assumption and when.
5. **Private by default.** A local assumption belongs to its author until they explicitly share or propose it.
6. **The shared view is deliberate.** A shared working assumption is not automatically “truth”; it is an approved team belief currently adopted for this question.
7. **Start lightweight.** Creating a useful assumption should not require filling in every possible field.

## Terminology

### Assumption

A concise, testable belief used when reasoning about a question.

Example: “The vendor will complete its security remediation before the renewal deadline.”

### Local working assumptions

The private set of assumptions the current user maintains for this question. “Local” means both user-specific and question-scoped.

These are the default assumptions shown when a user opens the section. They are not visible to other users until the author shares or proposes them.

### Shared working view

The approved set of assumptions the team currently uses for the question. Contributors may propose additions or changes, and the question owner approves or rejects those proposals.

### Perspective

A named set of assumptions representing how a person views the question.

Examples:

- Shared working view
- My local assumptions
- Caleb’s view

People-only perspectives are the first-release scope. Team, role, and scenario perspectives may be considered later. A shared perspective should not imply that a person necessarily endorses every item forever; it is an attributable snapshot or working model.

### Evidence link

A relationship between an assumption and a source. The relationship is one of:

- **Supports**
- **Contradicts**
- **Provides context**

## Goals

- Let users privately maintain question-specific local assumptions.
- Let users explicitly share selected assumptions with other people.
- Let users switch between people’s shared perspectives with a dropdown.
- Let contributors propose assumptions or changes to the shared working view.
- Let question owners approve or reject proposed shared-view changes.
- Let users create and edit assumptions with minimal required input.
- Let users link an assumption to evidence already associated with the question.
- Let users add new evidence while creating or editing an assumption.
- Preserve attribution and make differences between perspectives understandable.
- Fit naturally between the existing reasoning and evidence sections.

## Non-Goals for the First Release

- Automatically resolving disagreements or declaring one perspective correct.
- A global assumptions library shared across every question.
- Full document-style simultaneous editing.
- Multi-stage or role-configurable approval workflows.
- Using assumptions as access-control boundaries.
- Automatically changing the forecast probability when an assumption changes.
- Replacing the existing reasoning, evidence, uncertainty, or comments features.

## Primary Users

### Question owner

Reviews contributor proposals and decides which assumptions are adopted into the shared working view.

### Contributor

Maintains private local assumptions, selectively shares them, and proposes assumptions for the shared working view.

### Decision-maker

Reviews the shared assumptions, compares perspectives, and identifies the beliefs driving disagreement.

### Analyst

Traces assumptions to evidence, challenges weak claims, and monitors assumptions that may need revision.

## Core User Stories

- As a contributor, I can maintain private local assumptions behind my forecast.
- As a contributor, I can explicitly share selected assumptions as my perspective.
- As a contributor, I can propose one of my assumptions for the shared working view.
- As a question owner, I can approve or reject proposed shared assumptions.
- As a reviewer, I can switch between perspectives from a dropdown.
- As a reviewer, I can compare a selected perspective with the shared working view.
- As a contributor, I can add an assumption in plain language.
- As a contributor, I can link an assumption to existing question evidence.
- As a contributor, I can add a new piece of evidence without leaving the assumption workflow.
- As a contributor, I can indicate whether evidence supports or contradicts an assumption.
- As a question owner, I can approve an assumption from another person into the shared working view.
- As a reviewer, I can see who authored and last changed an assumption.
- As a team member, I can challenge or discuss an assumption without silently replacing it.

## Proposed Experience

### Placement

Add the Assumptions section on the question detail page:

1. Forecast chart
2. Reasoning
3. **Assumptions**
4. Evidence
5. Interventions
6. Comments

This places assumptions between the forecast’s reasoning and the sources used to inspect it.

### Default section state

The section header shows:

- Title: **Assumptions**
- Count of assumptions in the selected perspective
- View dropdown, defaulting to **My local assumptions**
- Primary action: **Add assumption**

Each assumption row or card shows:

- Assumption statement
- Status
- Author or owner
- Number of linked evidence items
- Evidence signal summary, such as “2 support · 1 contradicts”
- Last updated time
- Actions menu

### Perspective dropdown

The dropdown groups available views:

- **Private**
  - My local assumptions
- **Team**
  - Shared working view
- **People**
  - Named collaborators who have shared assumptions

The exact people shown depend on who has shared assumptions for the question. Private local assumptions are never listed in another user’s dropdown.

Selecting a perspective changes only the assumptions displayed. It does not change the user’s identity, permissions, or forecast.

### Sharing a personal perspective

A user already has a private local view for every question and does not need to create it. To make part of that view visible to others, the user selects one or more assumptions and chooses **Share assumptions**.

Sharing selected assumptions:

- Creates or updates the user’s named, read-only-to-others perspective.
- Does not expose unselected local assumptions.
- Can be reversed by unsharing an assumption.
- Does not add an assumption to the Shared working view.

### Creating an assumption

Required:

- Assumption statement

Optional:

- Rationale or notes
- Status
- Confidence
- Owner
- Evidence links

Default behavior:

- The assumption is added to the currently selected perspective.
- New assumptions are created in **My local assumptions**. Other people’s perspectives and the Shared working view are read-only outside their dedicated proposal and approval actions.
- A newly created assumption defaults to **Active**.

### Proposing and approving shared assumptions

A contributor can propose:

- Adding one of their assumptions to the Shared working view.
- Editing or changing the status of an existing shared assumption.
- Archiving an existing shared assumption.

Each proposal includes the proposed change, proposer, timestamp, optional rationale, and linked evidence. The question owner can approve or reject it and may add an optional decision note.

Approval updates the Shared working view while preserving provenance back to the proposal and source assumption. Rejection leaves the contributor’s local assumption unchanged.

### Assumption statuses

- **Active:** currently used in this perspective
- **Uncertain:** important but not confidently held
- **Challenged:** explicitly disputed or contradicted
- **Invalidated:** no longer believed due to evidence or events
- **Archived:** retained for history but no longer in active use

For the first release, status is set manually. Evidence does not automatically invalidate an assumption.

### Confidence

Confidence is optional and intentionally coarse:

- Low
- Medium
- High

Confidence describes belief in the assumption, not the importance of the assumption or the quality of a single source.

### Linking evidence

From an assumption, a user can:

1. Search and select evidence already connected to the question.
2. Choose the relationship: supports, contradicts, or provides context.
3. Optionally add a short explanation of the relationship.
4. Add a new source using the existing evidence creation pattern.

New evidence added here also appears in the question’s Evidence section. The product should not create a second, assumptions-only evidence silo.

Deleting an evidence link removes the relationship, not the underlying evidence item.

### Comparing people’s perspectives

For the first release, comparison means switching among the Shared working view and people’s shared perspectives in the dropdown. The product does not attempt to match or summarize differences automatically.

Users can copy an assumption into their own local view, discuss it, or propose it for the Shared working view.

Side-by-side comparison is deferred. A future comparison view may open two columns:

- Left: Shared working view
- Right: Selected person

It may group assumptions as shared or equivalent, present in only one view, or related but meaningfully different. Automatic semantic matching remains a later opportunity.

Potential future actions include:

- Copy an assumption to another perspective.
- Mark two assumptions as related.
- Open a discussion about a difference.
- Propose an assumption for the shared working view.

Approving a proposal creates or updates an assumption in the shared view; it does not remove or expose unrelated local assumptions.

### Discussion and challenge

Each assumption supports a lightweight discussion thread or a link into the existing question comments experience.

A challenge should capture:

- Who challenged the assumption
- Optional explanation
- Optional contradicting evidence
- Timestamp

A challenge sets or proposes **Challenged** status but does not delete the assumption.

## Empty States

### No assumptions on the question

> Make the beliefs behind your forecast explicit. Your local assumptions are private until you choose to share or propose them.

Actions:

- Add local assumption
- Review shared working view

### No assumptions in a selected perspective

> This perspective does not have any assumptions yet.

Actions:

- Add assumption
- Copy to my local assumptions

### No linked evidence

> No evidence is linked to this assumption yet.

Actions:

- Link existing evidence
- Add new evidence

## Permissions

Initial proposal:

- A user can view and edit only their own local assumptions.
- Explicitly shared personal assumptions are visible to anyone who can view the question.
- Other users cannot edit a person’s shared perspective.
- Contributors can submit proposals but cannot directly edit the Shared working view.
- Question owners and admins can approve or reject proposals.
- Approval is the only path for contributor changes to enter the Shared working view.
- An author can unshare or archive their own assumption without deleting an already approved shared copy.
- Evidence follows the question’s existing access rules.

The first release has two visibility states: **private local** and **shared on the question**. It does not support sharing with only a subset of question viewers.

## Conceptual Data Model

The PRD intentionally describes a backend-ready model even though the current prototype uses local state and `localStorage`.

### `AssumptionPerspective`

- `id`
- `questionId`
- `name`
- `type`: `local | shared | person`
- `description?`
- `subjectUserId?`
- `visibility`: `private | question`
- `createdBy`
- `createdAt`
- `updatedAt`
- `archivedAt?`

Exactly one active `local` perspective exists per user per question, and exactly one active `shared` perspective exists per question. A `person` perspective contains only assumptions its owner explicitly shares.

### `QuestionAssumption`

- `id`
- `questionId`
- `perspectiveId`
- `statement`
- `rationale?`
- `status`: `active | uncertain | challenged | invalidated | archived`
- `confidence?`: `low | medium | high`
- `ownerId?`
- `createdBy`
- `createdAt`
- `updatedBy`
- `updatedAt`
- `originAssumptionId?`

`originAssumptionId` preserves provenance when an assumption is copied or adopted from another perspective.

### `AssumptionEvidenceLink`

- `id`
- `assumptionId`
- `evidenceId`
- `relationship`: `supports | contradicts | context`
- `note?`
- `createdBy`
- `createdAt`

### `AssumptionRelation`

- `id`
- `leftAssumptionId`
- `rightAssumptionId`
- `relationship`: `equivalent | related | conflicts`
- `createdBy`
- `createdAt`

This relation is deferred until a side-by-side comparison experience is implemented.

### `AssumptionProposal`

- `id`
- `questionId`
- `sourceAssumptionId`
- `targetAssumptionId?`
- `changeType`: `add | edit | status | archive`
- `proposedValue`
- `rationale?`
- `status`: `pending | approved | rejected`
- `proposedBy`
- `proposedAt`
- `decidedBy?`
- `decidedAt?`
- `decisionNote?`

## Collaboration Model

The feature should preserve these distinctions:

- **Editing:** changing the wording or metadata of an assumption within a perspective.
- **Copying:** creating a separate assumption with provenance.
- **Sharing:** making a selected local assumption visible in the author’s personal perspective.
- **Proposing:** requesting a specific addition or change to the shared working view.
- **Approving:** applying a proposal to the shared working view while preserving provenance.
- **Challenging:** recording disagreement without replacing or deleting the assumption.
- **Invalidating:** recording that the perspective no longer relies on the assumption.

This makes the history of collaboration legible and avoids treating the most recent edit as consensus.

## Relationship to Existing Product Concepts

### Reasoning and key uncertainties

Reasoning explains how the forecast was produced. Assumptions identify beliefs the reasoning relies on. Key uncertainties may inspire assumptions but should remain a separate concept in the first release.

### Evidence

The existing Evidence section remains the canonical source list. Assumptions reference those evidence items through typed links.

### Context

Existing manual context may provide input for an assumption, but a free-form context note is not itself a structured assumption. Future work could allow users to promote a context item into an assumption.

### Comments

Comments remain the broad question-level discussion area. Assumption discussions should either reuse the comment model with an assumption reference or provide a focused thread that is also visible from question comments.

## MVP Scope

### In scope

- Assumptions section on question detail.
- Private local assumptions as the default view.
- Shared working view.
- Explicitly shared personal perspectives.
- Perspective dropdown.
- Create, edit, archive, and change status of assumptions.
- Optional confidence.
- Link existing evidence.
- Add evidence from the assumption workflow.
- Evidence relationship type.
- Authorship and updated timestamp.
- Propose, approve, and reject changes to the shared working view.
- Local persistence consistent with the current prototype.

### Defer

- Side-by-side comparison and automatic matching.
- Team membership and team-specific permissions.
- Notifications and subscriptions.
- Multi-stage approval workflow.
- Team, role, and scenario perspectives.
- Version diff UI.
- Automatic assumption extraction from reasoning or evidence.
- Automatic forecast recalculation.
- Sensitivity analysis.

## Acceptance Criteria for MVP

1. A user can open a question and find an Assumptions section between Reasoning and Evidence.
2. Every user has a private local view for each question, and every question has a Shared working view.
3. A user can switch among available perspectives without leaving the question.
4. A user can share selected local assumptions as their personal perspective without exposing unselected assumptions.
5. An authorized user can add, edit, archive, and change the status of an assumption.
6. Every assumption displays its perspective, author, status, and last-updated time.
7. A user can link one or more existing evidence items to an assumption.
8. Each evidence link records whether it supports, contradicts, or contextualizes the assumption.
9. A user can add new evidence from the assumption workflow, and it appears in the main Evidence section.
10. Removing a link does not delete the underlying evidence.
11. A contributor can propose an addition or change to the Shared working view without altering their source assumption.
12. A question owner or admin can approve or reject a proposal.
13. Approval updates the Shared working view and preserves provenance; rejection leaves the source assumption unchanged.
14. Assumptions, sharing state, and proposals persist across browser refreshes in the prototype.
15. Restricted questions do not expose shared assumptions or their linked evidence to unauthorized users.

## Success Measures

Early product signals:

- Percentage of active questions with at least one shared working assumption.
- Percentage of users who create local assumptions and choose to share at least one.
- Average number of visible personal perspectives per question.
- Percentage of assumptions linked to evidence.
- Number and approval rate of shared-view proposals.
- Number of challenged assumptions that are later edited, invalidated, or supported with evidence.
- Qualitative feedback that users can explain why forecasts differ.

The feature should not optimize for the raw number of assumptions. A smaller set of consequential, inspectable assumptions is preferable to a long checklist.

## Risks and Mitigations

### Assumptions become unstructured notes

Keep the statement concise and make rationale a separate optional field. Provide examples and status/evidence structure.

### Too many perspectives create clutter

Default to the current user’s local view, show only people who have explicitly shared assumptions, and allow unsharing and archiving.

### “Shared” is mistaken for objective truth

Use the label **Shared working view** and display ownership and update history.

### Users overwrite disagreement

Encourage copy, propose, and challenge actions. Restrict direct edits of perspectives a user does not own and require approval for shared-view changes.

### Evidence links imply proof

Require a relationship type and allow contradicting/context evidence. Avoid language that says an assumption is “verified.”

### Duplicate evidence appears in multiple places

Use one canonical evidence item with links from assumptions.

### The model becomes too complex for an MVP

Start with private local assumptions, explicitly shared personal perspectives, and a simple proposal queue. Defer automatic comparison, team/scenario perspectives, and detailed version history.

## Open Product Decisions

These questions should be resolved collaboratively before implementation:

1. Can a user unshare an assumption after it has been copied into the Shared working view?
2. Should an assumption have a separate importance/impact field in addition to confidence?
3. Should assumption discussions reuse question comments with an assumption reference?
4. Should changing a shared assumption prompt the team to reconsider or rerun the forecast?
5. Should new questions include generated starter assumptions based on their resolution criteria and context?
6. Do we need effective dates or “valid until” dates for time-sensitive assumptions?
7. Does the question owner need an approval inbox outside the question page?

## Recommended First Decisions

Decisions made in the first product discussion:

- Define local assumptions as private to the current user and scoped to the question.
- Launch with people-only perspectives; defer teams and scenarios.
- Require contributors to propose shared-view changes for owner approval.
- Share assumptions individually; unselected local assumptions remain private.
- Use dropdown switching for MVP and defer side-by-side comparison.
- Keep rejection decision notes optional.

Current recommendations for the remaining decisions:

- Show shared personal assumptions to everyone who can view the question.
- Reuse the canonical evidence collection and add typed links.
- Reuse the existing comments model with an optional assumption reference.
- Do not automatically change forecasts when assumptions change.

## Future Opportunities

- AI-assisted extraction of candidate assumptions from reasoning and evidence.
- Semantic comparison of related or conflicting assumptions.
- Sensitivity analysis showing how a forecast changes when an assumption changes.
- Notifications when linked evidence contradicts an active assumption.
- Assumption templates by question category.
- Organization-wide assumption library and reuse across questions.
- Time-bound assumptions with review reminders.
- Assumption change history and forecast impact timeline.
- Agent workflows that seek evidence for the weakest assumptions.

## Implementation Notes

Likely code touchpoints after the PRD is approved:

- `src/pages/QuestionDetail.tsx` — section placement.
- `src/domain/types.ts` — assumption, perspective, and evidence-link types.
- `src/store.tsx` — state and local persistence.
- `src/components/EvidenceTable.tsx` and `src/components/AddSourceModal.tsx` — patterns to reuse.
- New assumptions components under `src/components/`.

The current manual context APIs may help with migration or prototyping, but structured assumptions should have their own domain types rather than being stored only as free-form context.
