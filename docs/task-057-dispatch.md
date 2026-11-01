# Task-057 — Fix Invite Link Routing & Unauthenticated Club Join Redirection

- **Task ID**: task-057
- **Date**: 2026-11-01
- **Leader**: Leader Agent
- **Assigned BA**: BA Agent (`docs/ba/task-057/**`)
- **Assigned Developer**: Dev Agent (`src/App.tsx`, `docs/manifests/task-057/**`)
- **Assigned Tester**: Independent QA Agent (`tests/invite-link-and-unauthenticated-join.test.ts`, `docs/qa/task-057/**`)

---

## 1. Problem Statement

User feedback:
> "sao copy link club để cho người khác join không được? người khác truy cập vào link thì bị redirect về trang chủ"

### Root Cause Analysis:
1. In `src/App.tsx`, an aggressive URL cleaner hook (`useEffect`) contained the logic:
   ```ts
   if (!address) {
     ...
     else if (params.has("group") || view) {
       cleanUrl.searchParams.delete("group");
       cleanUrl.searchParams.set("tab", "app");
       window.history.replaceState({}, "", cleanUrl.toString());
       setHasExplicitGroup(false);
     }
   }
   ```
2. When a recipient opened an invite link (`?group=0x...` or `?tab=app&group=0x...`), because they did not have their wallet connected yet (`!address`), the effect immediately erased `group` from the URL and set `hasExplicitGroup(false)`.
3. When `group` was removed from the URL, subsequent popstate/effects triggered fallback logic that routed to `activeTab = "home"` (Trang chủ / LandingPage), effectively kicking the recipient out of the club invite!
4. Furthermore, even if the user remained on `app`, line 1239 strictly required `Boolean(address) && (hasExplicitGroup || isUserAffiliated)`. Since `hasExplicitGroup` was wiped to `false` and the user hadn't joined yet (`!isUserAffiliated`), the club card was hidden, showing "Bạn chưa tham gia nhóm Hụi nào" and preventing them from seeing or joining the club.

---

## 2. Requirements & Deliverables

1. **BA**:
   - Deliver `docs/ba/task-057/spec-v1.md`.
   - Gate 1: Ready for Development.
2. **Developer**:
   - Snapshot baseline of `src/App.tsx`.
   - In `src/App.tsx`:
     - In `activeTab` useState: ensure `if (isValidAddress(group)) return "app"` takes precedence over default home.
     - In URL cleaner `useEffect`: DO NOT delete `group` when `isValidAddress(group)`. Preserve valid invite club parameters and maintain `hasExplicitGroup = true`.
     - In Unauthenticated View (`!address`): when `hasExplicitGroup === true`, display informative invite card showing the club name (`Bạn được mời tham gia nhóm: ...`) and a direct "Connect Wallet to Join" button.
     - When wallet is connected, because `hasExplicitGroup === true`, smoothly render the ClubCard and ActionPanel with the Join/Collateral deposit button.
   - Freeze manifest `node scripts/manifest-tool.mjs freeze task-057 src/App.tsx`.
3. **Tester**:
   - Verify frozen manifest.
   - Add test suite `tests/invite-link-and-unauthenticated-join.test.ts`.
   - Verify 100% test pass and zero regressions on the existing 466 tests.
   - Run production build.
   - Deliver `docs/qa/task-057/test-report.md`.
4. **BA**:
   - Coverage review in `docs/ba/task-057/coverage-review.md`.
5. **Leader**:
   - Accept in `docs/task-057-acceptance.md`.
