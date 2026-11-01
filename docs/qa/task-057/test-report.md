# QA Test Report: Task-057 — Fix Invite Link Routing & Unauthenticated Club Join Redirection

- **Task ID**: task-057
- **Date**: 2026-11-01
- **Tester**: Independent QA Agent
- **Status**: PASSED (Gate 3 Approved)
- **Manifest Hash**: `1db4ac4496dbea797889b2a6786ee3fe2bc5542c0bfb863d378ee697b59b7bb9` (`src/App.tsx`)

---

## 1. Scope & Objective

Verify that when users copy a club invite link (e.g. `/?group=0x...` or `/?tab=app&group=0x...`) and share it with someone:
1. Recipients who open the link without a connected wallet are NOT redirected to the homepage (`LandingPage`).
2. The URL cleaner does NOT delete valid `group` parameters when unauthenticated.
3. Unauthenticated view displays a personalized invitation banner with the club name and a direct "Connect Wallet to Join" button.
4. Once the recipient connects their wallet, the club card and action panel are immediately rendered with join/collateral capabilities.
5. All 471 unit tests pass with zero regressions.

---

## 2. Integrity & Manifest Verification

```bash
$ node scripts/manifest-tool.mjs verify task-057
[Verify] Verifying manifest for Task: task-057 (Frozen at: 2026-11-01T13:30:57.152Z)
[MATCH] src/App.tsx (1db4ac4496dbea79...)
 All files verified successfully! Integrity confirmed.
```
- **Exit Code**: 0

---

## 3. Test Cases & Execution Results

### Test Suite: `tests/invite-link-and-unauthenticated-join.test.ts`

| Test ID | Requirement / AC | Description | Result |
|---|---|---|---|
| **TC-INVITE-01** | AC-01, BR-01.1 | `activeTab` initializes with precedence to `'app'` when `group` is a valid address | **PASS** |
| **TC-INVITE-02** | AC-02, BR-02.1 | URL cleaner preserves valid `group` and sets `hasExplicitGroup = true` when unauthenticated (`!address`) | **PASS** |
| **TC-INVITE-03** | AC-03, BR-03.1 | Unauthenticated view displays personalized invitation banner and "Connect Wallet to Join" when `hasExplicitGroup === true` | **PASS** |
| **TC-INVITE-04** | AC-04, BR-04.1 | Main content condition `Boolean(address) && (hasExplicitGroup || isUserAffiliated)` displays club card immediately on connection | **PASS** |
| **TC-INVITE-05** | AC-01, BR-01.2 | `onPopState` preserves `activeTab = 'app'` and sets `contractAddress` on valid `group` | **PASS** |

### Execution Command & Output:
```bash
$ node --experimental-strip-types --test tests/invite-link-and-unauthenticated-join.test.ts
✔ TC-INVITE-01 (AC-01, BR-01.1): activeTab khởi tạo ưu tiên 'app' khi URL có tham số group hợp lệ (1.252434ms)
✔ TC-INVITE-02 (AC-02, BR-02.1): URL cleaner bảo lưu tham số group hợp lệ khi chưa kết nối ví (!address) (0.538069ms)
✔ TC-INVITE-03 (AC-03, BR-03.1): Giao diện Unauthenticated hiển thị thông điệp mời tham gia cụ thể khi có hasExplicitGroup (0.475749ms)
✔ TC-INVITE-04 (AC-04, BR-04.1): Điều kiện hiển thị Main Content hiển thị nhóm ngay khi kết nối ví với hasExplicitGroup (0.396226ms)
✔ TC-INVITE-05 (AC-01, BR-01.2): onPopState ưu tiên activeTab='app' và contractAddress khi URL chứa group hợp lệ (0.482241ms)
ℹ tests 5
ℹ pass 5
ℹ fail 0
```

---

## 4. Full Regression Test Suite

```bash
$ npm test
ℹ tests 471
ℹ suites 0
ℹ pass 471
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 6683.804727
```

---

## 5. Production Build Verification

```bash
$ npm run build
> studio-app@0.0.0 build
> tsc --noEmit && vite build

vite v6.4.4 building for production...
✓ built in 32.84s
```
- **Exit Code**: 0
- **TypeScript Errors**: 0

---

## 6. QA Signoff

Independent QA certifies that Task-057 satisfies all acceptance criteria (AC-01 through AC-05) without introducing any regressions into the codebase. Gate 3 is officially **PASSED**.
