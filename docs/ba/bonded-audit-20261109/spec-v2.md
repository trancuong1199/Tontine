# BA Specification: Follow-Up Audit Review (bonded-audit-20261109 / v2)

## 1. Context & Scope
Follow-up review on Arc Testnet identified UX, accessibility, terminology, and synchronization refinements (V1–V11):
1. **V1 (Grace Terminology & Bilateral Risk Consent)**:
   - Unify English & Vietnamese consent wording in `CreateBondedClubModal.tsx`:
     - VN: `"Nếu tôi không trả lãi trong vòng {formatRoundDuration(interestGraceSec, false)} sau khi vòng kết thúc, hoặc không tất toán trong vòng {formatRoundDuration(settlementGraceSec, false)} sau khi chu kỳ kết thúc, nhóm có thể bị tuyên bố vỡ nợ và toàn bộ cọc CirBTC bị tịch thu."`
     - EN: `"If I do not pay interest within {formatRoundDuration(interestGraceSec, true)} after a round ends, or do not settle within {formatRoundDuration(settlementGraceSec, true)} after the cycle ends, default may be declared and all CirBTC collateral seized."`
   - Align input label: EN `"Extra grace period for interest / settlement (s)"` / VN `"Thời gian gia hạn thêm sau mỗi vòng (giây)"`.
   - In `BondedClubWorkspace.tsx`, timeline cards display operational explanation when NOT overdue:
     - Card 2 (Interest): VN `"Hạn trả khoản lãi phát sinh sau mỗi vòng."` / EN `"Interest payment due after each round."`
     - Card 3 (Settlement): VN `"Hạn tất toán toàn bộ nợ gốc khi kết thúc chu kỳ."` / EN `"Full principal settlement due at cycle end."`
   - Consequence warning is displayed ONLY when overdue (`isOverdue === true`):
     - VN: `"Quá hạn: bất kỳ ai cũng có thể kích hoạt tuyên bố vỡ nợ và cọc bị tịch thu."`
     - EN: `"Overdue: anyone can declare default and collateral will be seized."`
2. **V2 (Accessibility & Landmarks)**:
   - "Copy Club Link" button `aria-label` must match visible text.
   - Language selector buttons accessible names must match visible text without mismatch.
   - `CreateBondedClubModal.tsx`: modal close button (`X`) and all number inputs must have explicit accessible names / `aria-label`.
   - Ensure `<main>` landmark exists on landing page and app view.
3. **V3 (Deadlines Display Date When Not Today & Unified Locale)**:
   - When deadline is not on current calendar day, display both time and date (e.g. `22:01:38, 12/11/2026` in VN, `10:01:38 PM, 11/12/2026` in EN).
   - Both time and date strictly use the interface `locale` (`vi-VN` vs `en-US`), eliminating browser system locale mixing.
4. **V4 (Clock Drift Correction with Block Timestamp)**:
   - Query latest block timestamp via RPC to calculate client clock drift offset, avoiding false overdue states on devices with skewed system clocks.
5. **V5 (Digital Timer Format Standard, Live Region & Emoji Removal)**:
   - Standardize ended state countdown as `"00:00:00 (Hết giờ)"` / `"00:00:00 (Ended)"` (consistent `hh:mm:ss`).
   - Add `aria-live="off"` to the header deadline countdown summary to avoid screen reader spam.
   - Remove `💡` emoji from strings.
6. **V6 (Do Not Auto-Fill Borrow & Repay with Max)**:
   - Inputs start empty `""` with descriptive placeholder. User must explicitly enter an amount or click `[Tối đa / Max]`.
7. **V7 (Vite Server Host Binding)**:
   - In `vite.config.ts`, only bind `0.0.0.0` when `process.env.VITE_HOST === 'true'`.
8. **V8 (Manifest Integrity)**:
   - Re-freeze `task-059` and `bonded-audit-20261109` manifests.
9. **V9 (Interest Rate Label Truthfulness)**:
   - Change label from `"Fixed Interest Rate Paid to Members"` to `"Interest rate per round (set at creation)"` / `"Lãi suất mỗi vòng (cố định khi tạo nhóm)"` to truthfully convey that actual payout depends on peak borrower exposure.
10. **V10 (Unified Terminology: Thành viên)**:
    - Replace all legacy occurrences of `"hụi viên"` with `"thành viên"`.

## 2. Requirements & Acceptance Criteria (AC)

| ID | Requirement | Acceptance Criteria (AC) |
|---|---|---|
| REQ-V1 | Bilateral risk consent text & conditional deadline warning | Checkbox text in VN & EN states exact condition on grace and total collateral seizure. Timeline cards show operational description when not overdue; overdue warning appears only when overdue. |
| REQ-V2 | Accessible names & landmarks | Close button, copy link, and inputs have compliant accessible names matching visible text. Home and app tabs wrapped in `<main>`. |
| REQ-V3 | Deadline date formatting & unified locale | Deadlines on future days show both time and date, strictly formatted under interface locale (`vi-VN` / `en-US`). |
| REQ-V4 | Block timestamp drift sync | Countdown timers offset client `Date.now()` with RPC block timestamp drift. |
| REQ-V5 | Digital timer format & emoji removal | Ended timer displays `00:00:00 (Ended)` / `00:00:00 (Hết giờ)`. No `💡` emojis in UI. |
| REQ-V6 | Empty borrow/repay inputs | Inputs start empty `""`; typing or clicking `[Tối đa / Max]` sets amount; blank submit triggers error toast. |
| REQ-V7 | Configurable server host | Default dev server does not bind `0.0.0.0` unconditionally. |
| REQ-V8 | Green manifests | `manifest verify task-059` and `manifest verify bonded-audit-20261109` exit with code 0. |
| REQ-V9 | Interest rate label | Label reflects `"Interest rate per round (set at creation)"`. |
| REQ-V10 | Unified terminology | Zero occurrences of `"hụi viên"` in codebase; replaced with `"thành viên"`. |

## 3. Traceability Matrix

| REQ | Target File | Verification Method |
|---|---|---|
| REQ-V1 | `src/components/savings/CreateBondedClubModal.tsx`, `src/components/savings/BondedClubWorkspace.tsx` | Unit tests & string assertions |
| REQ-V2 | `src/App.tsx`, `src/components/savings/CreateBondedClubModal.tsx`, `src/components/savings/BondedClubWorkspace.tsx` | Axe / DOM inspection & unit tests |
| REQ-V3 | `src/components/savings/BondedClubWorkspace.tsx` | Helper formatting test |
| REQ-V4 | `src/components/savings/BondedClubWorkspace.tsx` | Clock drift synchronization test |
| REQ-V5 | `src/components/savings/BondedClubWorkspace.tsx` | Countdown formatting & regex test |
| REQ-V6 | `src/components/savings/BondedClubWorkspace.tsx` | State initialization & validation test |
| REQ-V7 | `vite.config.ts` | Config inspection test |
| REQ-V8 | `docs/manifests/*` | `node scripts/manifest-tool.mjs verify` |
| REQ-V9 | `src/components/savings/CreateBondedClubModal.tsx` | Label assertion test |
| REQ-V10 | `src/components/savings/BondedClubWorkspace.tsx` | Grep assertion test |
