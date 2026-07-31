# Edu-ERP Prototype — Claude Working Context

## 1. Project Purpose

A **frontend-only, mobile-first prototype** for "NextGen EduERP," a multi-tenant
K-12 school ERP SaaS (India). Three separate static-HTML single-page apps
(ERP Admin, Founder, Staff) share one design system and a set of in-browser
"database" modules backed by `sessionStorage`. No backend, no build step, no
framework — plain HTML/CSS/vanilla JS, designed to be opened directly or served
via GitHub Pages. Per `README.md`, every field/enum/CRUD method was aligned to a
frozen OpenAPI spec (`openapi_july_11_a2.json`) so a real backend can later be
wired in with minimal changes. This repo is pre-production; the eventual target
is a React Native mobile app for each of the three roles.

## 2. Repository Structure

```
edu-erp-prototype/
├── index.html         Portal chooser — links to admin/founder/staff
├── 404.html           Standalone GitHub Pages 404 (not part of the app shell)
├── favicon.svg        Present on disk but NOT referenced by <link rel="icon"> anywhere
├── admin/index.html   ERP Admin SPA (814 lines)
├── founder/index.html Founder SPA (2051 lines)
├── staff/index.html   Staff SPA (2442 lines)
├── shared/
│   ├── tokens.css       Design tokens: color ramps, 6 brand themes × light/dark, spacing, motion
│   ├── styles.css       Component library (buttons, cards, sheets, wizard, tabbar, forms…)
│   ├── auth.js          Login/session/OTP-reset simulation, shared by all 3 apps
│   ├── auth-screens.js  Renders the Login/Forgot/OTP/Reset screens (shared UI, app supplies branding)
│   ├── utils.js         Icon set, toast/modal/sheet helpers, formatters
│   ├── data.js          `DB` — ERP Admin's store (admins, orgs, founders, plans) + `DB.onboardSchool()`
│   ├── founder-data.js  `FounderDB` — school-level data (students, fees, invoices, departments, branches…)
│   └── staff-data.js    `StaffDB` — staff/roles/permissions/leads/attendance/leave + the RBAC engine
├── README.md          Sprint log, API-alignment notes, login credentials, architecture notes
└── DEMO.md            ~8-minute investor walkthrough script
```

Each app is a single large inline `<script>` inside its `index.html` implementing
a tiny hand-rolled SPA: `App.route` + `App.ctx` (nav state) → `App.mountScreen()`
switches on `App.route` to a screen-builder method that returns/sets innerHTML.
There is no router library, no virtual DOM — screens are template strings
re-rendered wholesale on navigation.

Note: git status at the time of this analysis shows a `temp_clear_later/`
directory (an old duplicate copy of this same tree) marked as deleted in the
working tree. It no longer exists on disk. This is pre-existing repo cleanup,
unrelated to this task, and was not touched.

## 3. Application Architecture

### ERP Admin (`admin/index.html`)
Platform-operator console. Loads only `data.js` (its own `DB`) — no access to
Founder/Staff data, reflecting that it's a separate operator layer.
- Screens: Login → Dashboard, Organizations (list + detail), **Onboard wizard
  (4 steps)**, Reports, Settings.
- Nav: top app bar + bottom tab bar (`dashboard`/`organizations`/`reports`/`settings`);
  a FAB on Dashboard/Organizations opens the onboarding wizard. The wizard route
  hides the tab bar (`isWizard` check in `Shell()`).
- The **Onboard wizard is the only multi-step wizard in the entire repository**
  (see §9 — this is almost certainly what "Founder onboarding" refers to).
- `DB.onboardSchool()` atomically creates an org + a Founder login + a branch +
  an academic session — this is literally how a Founder account comes into
  existence in this prototype.

### Founder (`founder/index.html`)
"The buy surface" — school owner app. Loads `data.js`, `founder-data.js`, AND
`staff-data.js` (so it can read cross-app data written by the Staff app).
- Screens (from `mountScreen()`): Login → Dashboard, Students (+ detail w/ 5
  tabs: Profile/Guardians/Attendance/History/Fees), Fees, Invoices (+ detail,
  Generate Invoices, Receipt view), Reports (+ report view), More, Staff
  directory (+ detail, Add/Edit Staff), Roles (+ detail), Setup (Departments,
  Branches), Settings (Org Profile, Org Settings, Notifications).
- **There is no onboarding flow inside this file.** `init()` goes straight to
  `Auth.isLoggedIn() ? render() : renderLogin()` — login lands directly on the
  Dashboard. Confirmed by grepping the file for "onboard"/"wizard"/"step" — no
  matches beyond an unrelated `<input step="100">` on a numeric field.
- Reset demo data: top banner (proto-banner), tap to reset.

### Staff (`staff/index.html`)
"One codebase, every employee." Loads `data.js`, `founder-data.js`, and
`staff-data.js`. Also has no onboarding flow — logs in straight to a
role-adaptive Dashboard.
- Screens: Dashboard (role-adaptive), Attendance/Mark Attendance, Payments,
  Admissions (+ Lead detail, Application detail), Approvals, Students (+
  detail), Reports, More, Settings, Staff list/detail/Add/Edit, Roles (+
  detail), Self check-in, Staff attendance, Academic structure, Leave history,
  User list/detail, Audit log, Notifications, Dispatch log.
- Bottom tab bar is **computed at render time** from the active user's
  permissions (`App.computeTabs()`), capped at 4 primary tabs + "More"; excess
  gated tabs overflow into More. See §4.
- Reset / role switch: proto-banner ("tap to switch role (review)") calls
  `App.roleSwitcher()`, and **More → Settings → Reset demo data** resets state.

## 4. Staff Role & Permission Concept

### CURRENTLY IMPLEMENTED
This is real, working code — not just a future intent:
- `shared/staff-data.js` (`StaffDB`) defines a permission catalog of atoms
  `MODULE.RESOURCE.ACTION` (e.g. `ADMISSION.APPLICATION.APPROVE`,
  `RBAC.ROLE.UPDATE`), grouped into `ModulePermissionGroup[]` mirroring a
  `GET /permissions` shape.
- 4 seeded template roles (`TEMPLATE_ROLES`): Principal, Teacher, Accountant,
  Receptionist, each with a `permission_codes` array and a `hierarchy_level`.
- `StaffDB.can(permCode)` checks the **active session user's role's**
  `permission_codes`. `StaffDB.activeUser()`/`setActiveUser()` drive which
  identity is "logged in" (used both by real login and by the demo
  role-switcher banner).
- The Staff app's navigation (`App.computeTabs()`), dashboard variant
  (`Dashboard()` picks `DashPrincipal/DashAccountant/DashTeacher/DashReceptionist`
  by which permissions are present), and nearly every screen entry point gate
  on `this.S.can(this.S.PERMS.X)` — confirmed via grep: dozens of call sites in
  `staff/index.html` (e.g. lines 177-180, 339, 417, 554, 816, 889, 918,
  978-985, 1974, 2037). A screen with a failed check renders `noPermission(el)`
  (`staff/index.html:2435`), literally: *"Navigation only ever shows what
  you're permitted to use."*
- Roles & Permissions UI exists: create custom roles (`RoleCreate`), edit a
  role's permission set via a grouped catalogue sheet
  (`updateRolePermissions`/`PUT /roles/{id}/permissions` mirror), delete
  custom roles (system roles are guarded against deletion).
- This is **client-side and session-scoped only** — there is no server, no real
  authentication/authorization boundary, and no enforcement beyond hiding UI
  and short-circuiting screen builders. Any user could, in principle, open the
  browser console and call a gated method directly; this is a UI prototype of
  the RBAC *pattern*, not a security boundary.

### PRODUCT REQUIREMENT / FUTURE INTENT
- Real backend-enforced authorization (the prototype's `can()` checks would
  need a server-side equivalent).
- Arbitrary org-defined custom roles persisting beyond a browser session /
  across devices (currently sessionStorage per tab, wiped on new tab or reset).
- Any mapping of this permission model onto real JWT/session claims — not
  evident in this repo; `Auth.login()` is a simulated credential check against
  seeded in-memory records only.

## 5. Navigation Architecture

All three apps share the same pattern:
- `App.route` (string) + `App.ctx` (object, e.g. `{sub:true, title, subtitle}`
  for sub-pages) held as in-memory state on the `App` object (not in the URL —
  there is no client-side router, no deep-linking, no browser back/forward
  support beyond the single `index.html` entry).
- `App.go(route, ctx)` sets state and calls `App.render()`.
- `App.render()` rebuilds `Shell()` (app bar + `#screen` content div +
  conditional tab bar) then `App.mountScreen()` fills `#screen` via a `switch`
  on `route`.
- Sub-pages (`ctx.sub === true`) swap the app bar for a back-button variant and
  hide the bottom tab bar.
- Cross-app navigation is plain `<a href="...">` links between the 3
  `index.html` files (only from the root portal `index.html`); once inside an
  app, there is no in-app link back to the portal or to a sibling app.

## 6. Shared Resources

`shared/` is genuinely shared — all three apps `<script src="../shared/...">`
the same files (relative paths, one level up from each app folder):

| File | Admin | Founder | Staff | Notes |
|---|---|---|---|---|
| `data.js` (`DB`) | ✅ own store | ✅ (loaded, mostly unused) | ✅ (loaded, mostly unused) | ERP Admin's org/founder/plan data + `onboardSchool()` |
| `auth.js` (`Auth`) | ✅ | ✅ | ✅ | shared login/session/OTP-reset logic, scoped per `app` param |
| `utils.js` | ✅ | ✅ | ✅ | icons, toast/modal/sheet, `fmt` formatters — pure, no app-specific state |
| `auth-screens.js` (`AuthScreens`) | ✅ | ✅ | ✅ | shared Login/Forgot/OTP/Reset UI, each app supplies branding + callback |
| `founder-data.js` (`FounderDB`) | ❌ | ✅ own store | ✅ (cross-read) | school-level data |
| `staff-data.js` (`StaffDB`) | ❌ | ✅ (cross-read) | ✅ own store | staff/roles/RBAC data |
| `tokens.css` / `styles.css` | ✅ | ✅ | ✅ | design system, identical `<link>` in all three |

- **Storage isolation:** `DB` prefixes keys `eduerp_`, `FounderDB` uses
  `eduerp_fdr_`, `StaffDB` uses `eduerp_stf_` — distinct namespaces, all in
  `sessionStorage` (scoped per browser tab, shared across same-origin paths).
  This is *why* Founder and Staff can share live data (README's "Cross-app
  data" claims — e.g. staff attendance feeding Founder reports) — both apps
  load both `founder-data.js` and `staff-data.js` into the same tab's
  `sessionStorage`, so reads/writes are genuinely live, not simulated.
  ERP Admin does not load either, so it cannot see Founder/Staff data (by
  design — it's a separate platform layer).
- **No shared JS module boundary/bundler** — "sharing" is achieved purely by
  loading the same `<script>` files in each HTML file; there's no import/export,
  no namespacing beyond each file's own top-level `const` (`DB`, `FounderDB`,
  `StaffDB`, `Auth`, `AuthScreens`, `UI`, `fmt`, `icon`, `ICONS`). All scripts
  share one global scope per page.
- No component duplication was found between apps for shared concerns (login,
  buttons, cards, wizard footer) — they all go through `shared/styles.css`
  classes. Each app's `App` object (screen builders) is independently written
  per app, which is expected (different screens), not duplicated logic.

## 7. UI / CSS Architecture

- Design system in `tokens.css`: 3-layer tokens (primitive neutrals → semantic
  light/dark → per-theme brand), 6 selectable brand themes
  (`data-theme="violet|indigo|emerald|slate|amber|contrast"`) × light/dark
  (`data-mode`). Data-viz colors (`--viz-*`) are explicitly fixed across themes
  ("meaning, never brand").
- `styles.css` is a from-scratch component library: app bar, content region,
  bottom tab bar, buttons, cards, KPI tiles, form fields, chips, list rows,
  section headers, bar/donut charts, skeletons/empty states, sheets/modals,
  in-screen tabs, **wizard** (`.stepper`, `.wiz-flow`, `.wiz-body`,
  `.wiz-footer`), toast, login screen.
- Base layout: `.viewport` is a flex column, `height:100%`, `overflow:hidden`,
  max-width 440px; on desktop (`min-width:460px`) it becomes a centered
  "phone frame" with rounded corners and a shadow, capped at `max-height:920px`.
  On narrower/mobile viewports it's edge-to-edge.
- `.content` (the `#screen` mount point in every app) is the actual scroll
  container: `flex:1; overflow-y:auto; overflow-x:hidden; padding: var(--sp-4)`.
  This is the single inner-scrolling region per screen — the outer `body`/
  `.viewport` never scrolls (`body{overflow:hidden}`).

## 8. Responsive / Mobile Behaviour

- Viewport meta is consistent across all HTML entry points: `width=device-width,
  initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover`.
- Sizing uses `height:100%` cascaded from `html,body{height:100%}` rather than
  raw `100vh` for the main app shell — this is more resilient to mobile
  browser dynamic-toolbar viewport changes than `100vh` would be. (`100vh` only
  appears in the standalone `404.html`, which isn't part of the app shell/scroll
  architecture, so it's lower-risk there.)
- Safe-area insets (`env(safe-area-inset-*)`) are used in: `.appbar` (top),
  `.tabbar` (bottom), `.fab` (bottom offset), `.sheet` (bottom), `.toast-wrap`
  (bottom). **`.wiz-footer` does NOT include a safe-area-inset-bottom
  allowance** — see §9/§10, this is relevant to the known issue.
- Scrolling model: single inner scroll container per screen (`.content`), no
  nested scroll containers observed in the wizard or elsewhere. Sticky
  positioning (`.wiz-footer{position:sticky;bottom:0}`, and the same pattern
  in `.tabs`/toast) is used intentionally to pin action bars to the bottom of
  `.content` while its body scrolls above it.
- No horizontal-scroll clipping issues found in the reviewed CSS; horizontally
  scrolling rows (`.filter-row`, `.att-counts`, `.period-seg`, `.tabs`) all
  explicitly hide their scrollbars and allow overflow-x.

## 9. Founder Onboarding Flow

**Important factual correction to the task framing:** there is no onboarding
flow implemented inside `founder/index.html`. Verified by:
- `founder/index.html`'s `init()` goes straight to login-or-dashboard; no
  `wizard`/`step`/`onboard` tokens exist in the file beyond an unrelated
  `<input step="100">` on a fee-amount field.
- `DEMO.md` and `README.md` both describe the Founder walkthrough starting at
  the Dashboard, with no onboarding step.

**The only 4-step onboarding wizard in the whole repository lives in
`admin/index.html`** (`App.Onboard()` / `App.renderWizard()`, lines ~480-598),
titled "Onboard school," reachable from ERP Admin's Dashboard/Organizations FAB.
Its 4 steps are:
1. **School** — display name, legal name, org code, contact email, city, address.
2. **Founder** — founder's full name, login email, temporary password. *(This
   step is literally what creates the Founder's login — likely why this wizard
   gets referred to as "Founder onboarding.")*
3. **Setup** — first branch (name/code), academic session (label/dates),
   subscription plan (Basic/Pro/Enterprise segmented control).
4. **Review** — read-only summary of all prior steps in three stacked
   `.card`s, plus the primary action button, now labeled "Create school &
   login" instead of "Continue."

Layout for every step is identical markup:
```html
<div class="wiz-flow">
  <div class="wiz-body">{stepper}{step body}</div>
  <div class="wiz-footer">{Back?}{Continue/Create button}</div>
</div>
```
rendered into `#screen` (`.content`, the scrollable region). `.wiz-footer` is
`position:sticky; bottom:0` so short steps show the button pinned to the
visible bottom of the viewport without scrolling, and long steps let the user
scroll to it.

**This wizard is what should be treated as "Founder onboarding, Page 4" until
confirmed otherwise with the user** — no alternative candidate exists in this
codebase. This assumption should be explicitly re-confirmed before starting the
fix task, since the user's task description referred to it as living in the
"Founder app," which does not match what's on disk.

## 10. Known Issues Observed

**Reported:** On the onboarding wizard's Page 4 (Review step), the submit
button / lower action area is not visible as expected.

**Observations that are code-supported (not yet confirmed as root cause):**
1. **Step 4 is by far the tallest step.** Steps 1-3 are single forms; step 4
   stacks three separate `.card.mb-4` blocks (School / Founder login / Setup),
   each with multiple `.dl-row`s. Given `.wiz-body{flex:1}` inside
   `.wiz-flow{min-height:100%}`, on short steps the footer is pulled flush to
   the bottom of the visible viewport (sticky "fills the gap"); on step 4 the
   content very plausibly exceeds one screen height, so the button legitimately
   sits *below the fold* and requires scrolling `.content` to reach — this
   would look identical to "the button isn't visible" if someone loads step 4
   and doesn't scroll down.
2. **`.wiz-footer` has no `env(safe-area-inset-bottom)` allowance**, unlike
   every other bottom-pinned element in the design system (`.tabbar`, `.fab`,
   `.sheet`, `.toast-wrap`). On a real device with a home-indicator/gesture bar,
   this could let the button sit closer to (or partly under) the system inset
   than intended. This is a general wizard-footer gap, not something unique to
   step 4 — it would apply to every step's footer equally, so on its own it
   doesn't explain why only Page 4 is reported as broken.
3. No `max-height`, `overflow:hidden`, or fixed pixel height was found on
   `.wiz-flow`, `.wiz-body`, or `#screen` for the onboard route specifically
   that would outright clip content — the sticky/scroll mechanics appear
   structurally sound from static reading. Root cause is most likely #1
   (content-length-driven, "you have to scroll to see it") possibly compounded
   by #2, but this needs to be verified against an actual rendered/mobile
   viewport before being treated as confirmed — not done in this task per
   scope restrictions.

**Other things noticed while reading (not requested to fix, noting for
completeness):**
- `favicon.svg` exists at the repo root but no HTML file references it via
  `<link rel="icon">` — it currently has no effect.
- `404.html` uses `<a href="/">` (absolute root path) to return to the portal —
  see §11, this is a GitHub Pages project-page risk.

## 11. GitHub Pages Considerations

- All inter-app links (`index.html` → `admin/index.html` etc.) and all shared
  asset references (`../shared/tokens.css` etc.) use **relative paths** — this
  works correctly both locally (`file://` or a static server) and when served
  from a GitHub Pages *project* page (`username.github.io/repo-name/`), since
  relative paths resolve against the current directory regardless of the
  site's base path.
- **`404.html`'s "Back to portal" link is `href="/"` (root-absolute).** On a
  GitHub Pages *user/org* page (served at the domain root) this is correct.
  On a GitHub Pages *project* page (served at `/repo-name/`), an absolute `/`
  link would navigate to the domain root, not the repo root — i.e. it would
  likely 404 again or land on an unrelated site. This only affects the 404
  page's back-link, not app navigation.
- All directory/file names are lowercase and consistent between disk and the
  `href`/`src` references checked — no case-sensitivity mismatches found (this
  matters because GitHub Pages serves from a case-sensitive filesystem, unlike
  some local dev setups on macOS/Windows).
- No `<base>` tag is used anywhere, and no app reads/writes `window.location`
  or uses any client-side router — so there's no risk of a hard refresh on a
  sub-route breaking (since there are no sub-routes at the URL level; each app
  is a single static HTML file with all navigation as in-memory state that
  resets on reload).
- Fonts are loaded from `fonts.googleapis.com` (external network dependency) —
  will silently fail closed (fallback to system-ui/sans-serif per the `font-family`
  stacks) if offline, not a hard break.

## 12. Important Implementation Patterns

- **Screen builder convention:** every screen is a method on `App` taking
  `(el)` and either setting `el.innerHTML` synchronously, or calling
  `this.withLoading(el, skeletonHtml, buildFn)` to simulate a network delay
  (`loadingMs`, 500-600ms across apps) before swapping in the real content —
  used to make loading/skeleton states demoable, not because of any real
  async I/O.
- **Permission-gated screens early-return `this.noPermission(el)`** (Staff app
  only) rather than not rendering the route at all — this is why `Shell()`
  also double-checks `routable.includes(this.route)` and redirects to
  `dashboard` if the current route fell out of the permitted set (e.g. after a
  role switch).
- **Multi-step forms all follow the same wizard skeleton** (`.stepper` +
  `.wiz-flow`/`.wiz-body`/`.wiz-footer`) — currently only instantiated once
  (ERP Admin's Onboard wizard), so there's exactly one place this pattern's
  behavior can be observed/fixed.
- **`_saveStep()`/`_validateStep()` split**: each wizard step's fields are
  pulled from the DOM into `this.wiz.data` before validating and before
  advancing — data survives step navigation without a form library.
- **Demo affordances are real UI, not stubs**: the Staff app's role switcher
  (`App.roleSwitcher()`, called from the proto-banner) and each app's "reset
  demo data" actually mutate `sessionStorage`-backed state and re-render — they
  are not disabled/no-op placeholders.

## 13. Important Constraints

- No package.json, no build tooling, no bundler, no framework (React/Vue/etc.)
  anywhere in this repo — confirmed by the full file listing (§2). Everything
  is hand-written vanilla HTML/CSS/JS.
- No automated tests exist in this repository (the "203 tests" mentioned in
  `README.md` refer to the *separate, frozen backend* which is not part of
  this repo).
- All persistence is `sessionStorage` — there is no real database, no network
  calls, and data does not survive a new browser tab or a hard reset.
- Login is a simulated credential check against seeded in-memory arrays
  (`Auth.login`) — not real authentication.

## 14. Things NOT Yet Implemented

- Any founder-app onboarding flow (see §9 — this doesn't exist; only ERP
  Admin's school-onboarding wizard exists).
- Server-side/backend-enforced permission checks (§4) — only client-side UI
  gating exists.
- Persistent (cross-session/cross-device) role/permission storage.
- Any real authentication, password hashing, token issuance/refresh, or
  multi-tenant data isolation beyond sessionStorage key prefixing.
- Deep-linking / URL-addressable routes within any of the three apps.
- A shared cross-app "back to portal" or app-switcher control from inside
  Admin/Founder/Staff (only the root `index.html` links out to them; there is
  no reverse link).

## 15. Future Production Migration Considerations

(Carried over from the user's stated product context — these are stated goals,
not present in the code, and are recorded here only as forward-looking notes,
not as claims about current functionality.)
- The eventual product is 3 separate React Native mobile apps (ERP Admin,
  Founder, Staff), not this static web prototype.
- The Staff app's permission-atom model (`MODULE.RESOURCE.ACTION`) and its
  "navigation computed from permissions, never role names" pattern (already
  real in this prototype, §4) is presented by the README as intentionally
  designed to map onto a real RBAC backend — worth preserving as the
  interaction pattern when this becomes a real app, since it's already
  decoupled from hardcoded role checks.
- Field/enum/CRUD alignment to `openapi_july_11_a2.json` (a file **not present
  in this repository** — referenced only in prose in `README.md`) is claimed as
  the basis for "minimal adaptation" to a real backend; this repo does not
  contain that OpenAPI spec, so that alignment cannot be independently verified
  from this repo alone.
