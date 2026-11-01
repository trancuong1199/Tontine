# Leader Acceptance Signoff: Task-057 — Fix Invite Link Routing & Unauthenticated Club Join

- **Task ID**: task-057
- **Date**: 2026-11-01
- **Leader**: Leader Agent
- **Status**: ACCEPTED (Gate 5 Passed)

---

## 1. Executive Summary

- **User Feedback**: "sao copy link club để cho người khác join không được? người khác truy cập vào link thì bị redirect về trang chủ"
- **Root Cause**:
  In `src/App.tsx`, an over-aggressive URL cleaner hook (`useEffect`) removed the `group` parameter whenever `!address` was true. This caused:
  1. Loss of `group` parameter from URL for unauthenticated recipients.
  2. Fallback routing logic to misinterpret the missing parameters as home navigation, bouncing the user to the LandingPage.
  3. Reset of `hasExplicitGroup` to `false`, preventing the club card and Join action panel from showing even after connecting the wallet.
- **Resolution**:
  - `activeTab` useState: gives precedence to valid `group` address so invite links always target `"app"`.
  - URL cleaner: preserves valid `group` addresses when `!address`, keeping `hasExplicitGroup = true`.
  - Unauthenticated view: displays a personalized invitation banner (`Bạn được mời tham gia: [Tên nhóm]`) and a direct `Kết nối ví để tham gia ngay` button.
  - Post-connection: renders the target club card and ActionPanel immediately with the "Tham gia" / "Approve Ký Quỹ CirBTC" flow.

---

## 2. Gate Verification Summary

- [x] **Gate 1 (BA Spec)**: `docs/ba/task-057/spec-v1.md` - APPROVED.
- [x] **Gate 2 (Dev Freeze)**: `docs/manifests/task-057/manifest.json` - FROZEN & VERIFIED.
- [x] **Gate 3 (QA Report)**: `docs/qa/task-057/test-report.md` - 5/5 new tests passed, 471/471 suite passed, build exit 0.
- [x] **Gate 4 (BA Coverage Review)**: `docs/ba/task-057/coverage-review.md` - 100% AC/BR traceability.
- [x] **Gate 5 (Leader Acceptance)**: Formally signed off.
