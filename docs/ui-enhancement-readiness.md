# UI Enhancement Readiness

Date: 2026-03-31
Scope: UI architecture audit + Stitch MCP connectivity verification

## 1) Current UI Foundation (Good News)

The project is in a strong starting state for a UI enhancement sprint:

- Next.js App Router with clear route groups for app, auth, and onboarding.
- Tailwind v4 + shadcn setup is already in place.
- Theme tokens are defined in one central location in [src/app/globals.css](../src/app/globals.css).
- Reusable UI primitives exist under [src/components/ui](../src/components/ui).
- There are existing Stitch-generated design references in repo root (stitch-*.html).

## 2) Readiness Gaps To Address First

### A. Token Drift (highest impact)
A large part of feature UI still uses hardcoded hex values and one-off shadows/radii instead of semantic tokens.

Primary hotspots:

- [src/components/appointments/appointments-page-toolbar.tsx](../src/components/appointments/appointments-page-toolbar.tsx)
- [src/components/appointments/appointments-list.tsx](../src/components/appointments/appointments-list.tsx)
- [src/components/patients/patients-page-toolbar.tsx](../src/components/patients/patients-page-toolbar.tsx)
- [src/components/patients/patients-list.tsx](../src/components/patients/patients-list.tsx)
- [src/components/dashboard/dashboard-secondary-panels.tsx](../src/components/dashboard/dashboard-secondary-panels.tsx)
- [src/components/dashboard/dashboard-action-hub.tsx](../src/components/dashboard/dashboard-action-hub.tsx)
- [src/components/layout/app-sidebar.tsx](../src/components/layout/app-sidebar.tsx)
- [src/components/layout/app-top-bar.tsx](../src/components/layout/app-top-bar.tsx)

### B. Shell Inconsistency
App shell in [src/app/(app)/layout.tsx](../src/app/%28app%29/layout.tsx) still sets direct background colors, while global theming already supports tokenized surfaces.

### C. Duplicate Visual Patterns
Patients and appointments pages each maintain separate handcrafted versions of:

- header sections
- segmented filters/tabs
- table/card list presentation
- export/date filter controls

This increases effort and risk for each new visual change.

## 3) Recommended UI Enhancement Plan

### Phase 0 (1 day) - Baseline

- Lock a visual baseline for desktop + mobile in app shell, patients, appointments, and dashboard.
- Define a short token mapping doc (semantic role -> Tailwind utility).

### Phase 1 (2-3 days) - Token Migration Core

- Replace hardcoded colors in app shell + top nav + sidebar first.
- Refactor patients/appointments toolbars to semantic classes.
- Keep behavior unchanged; style-only PR to reduce regression risk.

### Phase 2 (2-4 days) - Shared Building Blocks

Create or standardize reusable components for:

- page header section
- segmented filter tabs
- data list shell (desktop table + mobile cards)
- utility action row (date, export, mode filters)

### Phase 3 (1-2 days) - Visual Polish

- Introduce consistent motion timings and hover/focus treatments.
- Align typography and spacing scale across dashboard/patients/appointments.
- Validate reduced-motion behavior and mobile touch target sizes.

## 4) Stitch MCP Connectivity (Verified)

Connection status: VERIFIED

Successful MCP calls:

- list_projects
- list_design_systems

Accessible Stitch projects:

- projects/7994917245417520771 (Strive Dashboard, MOBILE)
- projects/16075867173238031235 (Strive Dashboard Command Center, DESKTOP)

Available project design system:

- assets/a17a8a62b33a4dcd907e9a45c3f5eccf (display name: Strive Clinical)

This confirms the workspace is connected and ready for Stitch-assisted UI iteration.

## 5) Suggested First PR Scope (Safe + High ROI)

1. Normalize shell theming in:
   - [src/app/(app)/layout.tsx](../src/app/%28app%29/layout.tsx)
   - [src/components/layout/app-sidebar.tsx](../src/components/layout/app-sidebar.tsx)
   - [src/components/layout/app-top-bar.tsx](../src/components/layout/app-top-bar.tsx)
2. Tokenize toolbar styling in:
   - [src/components/patients/patients-page-toolbar.tsx](../src/components/patients/patients-page-toolbar.tsx)
   - [src/components/appointments/appointments-page-toolbar.tsx](../src/components/appointments/appointments-page-toolbar.tsx)
3. Keep [src/components/ui](../src/components/ui) as the style source of truth for controls.

## 6) Risk Notes

- Keep refactors visual-only for first pass; avoid data/logic changes.
- Run through both desktop and mobile route groups after each UI batch.
- Preserve auth/onboarding visual distinctions while unifying tokens.
