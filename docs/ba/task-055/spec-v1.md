# BA Specification: Task-055 — Share URL Domain-Agnostic Fallback, ActionPanel Decomposition & ClubCard Skeleton Loading

- **Task ID**: task-055
- **Author**: Business Analyst
- **Version**: 1.0.0
- **Status**: APPROVED
- **Date**: 2026-10-28

---

## 1. Executive Summary & Problem Analysis

In recent user reviews and manual QA runs on deployed preview environments, three distinct UX and code quality items were identified:
1. **Hardcoded Share URL Base**: `buildShareGroupUrl()` in `src/lib/savingsClubDirectory.ts` currently falls back to `"https://tontine-phi.vercel.app/"` if `base` is undefined. If the app domain changes or is accessed on custom domains/IPFS/staging, generated invite links could carry stale domains. Changing fallback to `"/"` (relative safe fallback) or dynamic domain origin guarantees universal domain safety.
2. **ActionPanel Code Bloat & State Leakage Risk**: `ActionPanel.tsx` is over 1,600 lines long, maintaining large monolithic blocks for `WaitingView` (Open state registered members) and `NonMemberActiveView` (Active state non-members). Extracting these views into focused, modular components under `src/components/savings/` enforces clean progressive disclosure and simplifies unit testability.
3. **ClubCard Loading Skeleton & Placeholder Quality**: Box 3 of `ClubCard.tsx` currently renders `"—"` when the round is not active, which looks uninformative or broken. In addition, when loading data, a proper animated skeleton pulse should be displayed instead of raw empty values or dashes. In `OPEN` state, Box 3 should display a clear badge/label (e.g. `Pending` / `Chờ bắt đầu`).

---

## 2. Requirements (REQ) & Business Rules (BR)

### REQ-01: Domain-Agnostic Share URL Fallback
- **BR-01.1**: When `baseUrl` is explicitly provided, `buildShareGroupUrl(address, baseUrl)` MUST preserve the protocol and host, stripping `view` and `tab` query parameters and appending `?group=<address>`.
- **BR-01.2**: When `baseUrl` is omitted and `typeof window !== "undefined"` with `window.location`, it MUST dynamically resolve using `window.location.origin + window.location.pathname`.
- **BR-01.3**: When `baseUrl` is omitted and `window` is undefined (SSR / Node test environment), fallback MUST be `"/"` yielding `/?group=<address.toLowerCase()>`, completely eliminating the hardcoded `"https://tontine-phi.vercel.app/"`.

### REQ-02: ActionPanel Decomposition (WaitingView & NonMemberActiveView)
- **BR-02.1**: Extract `WaitingView` into `src/components/savings/WaitingView.tsx`. It handles the UI when `state === GROUP_STATE.OPEN && isMember`:
  - Renders member confirmation badge.
  - Explains why contributions have not started yet (waiting for Round 1).
  - Outlines 3-step roadmap (2+ members, start rounds, contribute & bid).
  - Provides invite copy button with feedback.
  - Provides consensus cancellation voting for joined members (when `joinedCount >= 2`).
- **BR-02.2**: Extract `NonMemberActiveView` into `src/components/savings/NonMemberActiveView.tsx`. It handles the UI when `state === GROUP_STATE.ACTIVE && !isMember`:
  - Displays clear lock banner informing that the club is active and closed to new members.
  - Provides navigation shortcuts to browse other clubs or create a new club if handlers are provided.
- **BR-02.3**: `ActionPanel.tsx` MUST delegate to `<WaitingView ... />` and `<NonMemberActiveView ... />`, while maintaining 100% backward compatibility for all existing tests and string invariants.

### REQ-03: ClubCard Loading Skeleton & Stat Invariants
- **BR-03.1**: `ClubCardProps` MUST accept an optional `isLoading?: boolean` prop.
- **BR-03.2**: When `isLoading` is true, stat metrics, title, and countdown box MUST render smooth pulsating skeleton placeholders (`animate-pulse`).
- **BR-03.3**: In Box 3 of `ClubCard.tsx`, replace the raw `"—"` with `{state === GROUP_STATE.ACTIVE ? countdown : (isEn ? "Pending" : "Chờ bắt đầu")}`.

---

## 3. Acceptance Criteria (AC)

- **AC-01.1**: `buildShareGroupUrl("0x6afaa0825d2e05ef00d571d4a043ab5dcc03534b")` with no second parameter in Node returns `/?group=0x6afaa0825d2e05ef00d571d4a043ab5dcc03534b`.
- **AC-01.2**: `buildShareGroupUrl("0x6afaa0825d2e05ef00d571d4a043ab5dcc03534b", "https://tontine-phi.vercel.app")` returns `https://tontine-phi.vercel.app/?group=0x6afaa0825d2e05ef00d571d4a043ab5dcc03534b`.
- **AC-02.1**: `src/components/savings/WaitingView.tsx` is created, typed, and exported cleanly.
- **AC-02.2**: `src/components/savings/NonMemberActiveView.tsx` is created, typed, and exported cleanly.
- **AC-02.3**: `ActionPanel.tsx` imports and uses `WaitingView` and `NonMemberActiveView`.
- **AC-03.1**: `ClubCard` renders skeleton pulse when `isLoading === true`.
- **AC-03.2**: `ClubCard` renders `Pending` (or `Chờ bắt đầu`) instead of `"—"` when state is `GROUP_STATE.OPEN`.
- **AC-04.1**: 100% of existing tests pass (`npm test`). No regressions.
- **AC-04.2**: Work is isolated on `review/task-055` branch and NOT merged to `main`.
