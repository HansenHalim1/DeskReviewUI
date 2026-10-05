# deskreview

A browser-local workspace for manuscript reviewers. Available at `/deskreview`; `/` opens the same interface.

## Run

```sh
npm install
npm run dev
```

Open http://localhost:3000/deskreview.

## Website access

The website requires a shared 64-character access key. The generated key is stored in `.env.local` as `DESKREVIEW_ACCESS_KEY`; copy its value into the login form. `DESKREVIEW_SESSION_SECRET` is a separate signing secret and must never be shared with reviewers. Both variables remain server-side and `.env.local` is gitignored. No `NEXT_PUBLIC_` credential is used.

Login creates an eight-hour signed HttpOnly session cookie (Secure on HTTPS, SameSite Strict). Pages and API routes require that session. Lock workspace clears the cookie without deleting browser-local drafts. Changing either environment variable invalidates existing sessions after the server restarts or redeploys. Missing configuration blocks access. This is shared-key access, with no individual reviewer accounts.

To generate fresh values, run this command twice and assign one value to each variable in `.env.local`:

```sh
node -e "console.log(require('node:crypto').createHash('sha256').update(require('node:crypto').randomBytes(32)).digest('hex'))"
```

## Reviewer workflow

The Dashboard navigation tab shows the Journal The Winners submission pipeline, submission trends, decision times, and rates from the supplied reference screenshots. These are explicitly labeled reference figures, not live or browser-local review statistics. Filter the metrics and export the visible tables as CSV. Each of the four summary cards opens paper details: title, authors, and submission timestamp (WIB, UTC+7), with title/author search. These lists are labeled illustrative placeholders because the screenshots contain no underlying paper records; their counts do not represent the aggregate totals. Accepted and desk-rejected lists filter by decision; first editorial decision includes papers with a recorded first decision. The period is fixed to the supplied snapshot; journal API integration can replace `components/deskreview/dashboard-data.ts` later.

1. Open a manuscript and inspect suggested findings beside the original text.
2. Accept a finding, edit and accept its wording, or reject it. Undecided findings stay Pending.
3. Use Next pending, status/priority filters, and previous/next navigation to work through the review.
4. Record an internal recommendation and private notes. Write an optional message to the author and explicitly select whether to include it.
5. Preview the exact author-facing files, then download the ZIP.

Accepting/editing findings approves feedback; it does not modify the manuscript. Undo last decision restores the previous finding state. Reset to pending removes a finding from the author package. The edit form shows original wording, supports restoration, and saves unfinished editor drafts locally. Unfinished edits are not exported: only the last accepted wording is used until Save & accept.

## Author package boundary

The ZIP contains only `author_review.md` and `findings.json`:

- Accepted findings and the final saved wording of edited findings.
- Manuscript passage references for the approved findings.
- An overall assessment only when explicitly included by the reviewer.

Pending/rejected findings, rejection reasons, internal notes, internal recommendations, editor drafts, and decision histories are excluded. There is no decision log. Author export uses an explicit field allowlist rather than serializing reviewer state. Pending findings trigger a warning with options to continue reviewing or export approved content. Empty author packages cannot be downloaded.

## Reading and storage

- Light, Dark, and System themes; System is the default. The document and workspace are both themed.
- Resizable desktop panels (drag the divider, use its arrow keys, or Home to reset); expand the manuscript for focused reading.
- Mobile manuscript/review pane switching with preserved position and selection.
- Passage highlights, document search, and text zoom.
- Autosaved reviewer decisions, editor drafts, notes, assessment, active document/finding/tab, reading positions, panel widths, and theme preference.
- Browser-local document history, with up to 12 uploaded text previews. Existing history from the earlier interface is migrated.

The header reports Saving, Saved on this browser, or a storage failure. Failed/full browser storage does not block reviewing or downloads, but unsaved changes can be lost on refresh. Clearing browser data removes drafts. The two reviewers do not share state, and documents/notes are not synced between browsers, devices, or origins.

## Presentation scope

This remains an interactive interface preview. The included manuscript has illustrative findings and similarity data. No Qwen backend or similarity service is connected. Uploaded DOCX documents show their actual text without simulated review results. Reviewers can still record their own assessment.

DOCX upload is limited to 4 MB and extracts text and headings. It does not reproduce Word pagination, images, tables, or tracked changes. The original binary is not stored. Shared-key website authentication does not sync or store reviewer documents on the server.

## Edit

- `components/deskreview/desk-review.tsx`: workspace, navigation, and author preview.
- `components/deskreview/reviewer-card.tsx`: finding actions and wording editor.
- `components/deskreview/reviewer-model.ts`: review states, progress, and author-only export allowlist.
- `components/deskreview/use-workspace.ts`: validated browser persistence and history migration.
- `components/deskreview/desk-review.css`: theme tokens, reading styles, and responsive layouts.
- `components/deskreview/review-data.ts`: typed sample manuscript and findings.
- `components/deskreview/document-utils.ts`: DOCX parsing and ZIP downloads.

Next.js, React, Tailwind, Geist, JSZip, and Lucide are reused. No new dependencies are required for this revision.

## Verify

```sh
npm run lint
npm run build
npm run test:e2e
```

The tests start the production build on port 3100 and use installed Google Chrome. If Chrome is unavailable, install Playwright Chromium with `npx playwright install chromium` and remove `channel: "chrome"` from `playwright.config.ts`.

Coverage includes author-package privacy, decision editing/undo, pending export checks, explicit assessment sharing, draft recovery, real DOCX preview, per-document notes/history, reading-position recovery, theme behavior, desktop resize, mobile layout, and storage failure handling. Screenshots are written to `test-results/` (gitignored).

## Vercel

Set `DESKREVIEW_ACCESS_KEY` and `DESKREVIEW_SESSION_SECRET` in the Vercel project's environment variables using the values from `.env.local`. Configure Production and any Preview deployments that need access, then redeploy. Never upload the env file to GitHub. No project is linked in this folder. From the repository directory:

```sh
npx vercel login
npx vercel link
npx vercel --prod
```

Select the intended account/team and existing project during linking. Use the Next.js framework, `npm run build`, and the default output directory. Verify the deployment URL at `/deskreview`.

Reference: [Project linking](https://vercel.com/docs/cli/link) and [production deployment](https://vercel.com/docs/cli/deploy).

For live reviews later, provide the backend URL, authentication, upload/job/result/download API contracts, and passage metadata schema. Keep inference on the backend and credentials in a server-only API adapter. Shared reviewer persistence requires authenticated server-side storage.
"# DeskReviewUI" 
"# DeskReviewUI" 
"# DeskReviewUI" 
