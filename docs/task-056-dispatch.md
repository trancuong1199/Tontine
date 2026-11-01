# Task-056 — Prevent Deletion of Active Savings Clubs & Directory Logic Overhaul

- **Task ID**: task-056
- **Date**: 2026-11-01
- **Leader**: Leader Agent
- **Assigned BA**: BA Agent (`docs/ba/task-056/**`)
- **Assigned Developer**: Dev Agent (`src/components/savings/ClubDirectoryModal.tsx`, `src/lib/i18n.ts`, `docs/manifests/task-056/**`)
- **Assigned Tester**: Independent QA Agent (`tests/prevent-delete-active-club.test.ts`, `docs/qa/task-056/**`)

---

## 1. Context & User Request

User feedback:
> "sao lại xóa được club khi vẫn club vẫn đang hoạt động nhỉ? làm lại logic chỗ này nhé"

### Analysis:
1. In `ClubDirectoryModal.tsx`, the delete button (`<Trash2 size={16} />`) was rendered unconditionally next to every single club.
2. Users could delete clubs that are actively running (`ACTIVE` state) or open for member registration (`OPEN` state).
3. Deleting an active/open club causes loss of visibility for participating members, risking missed contribution rounds, locked collateral, or unclaimed payouts.
4. The intended business logic (indicated in original comments/tooltips: "đã hủy / hết hạn / không chơi nữa") is that only inactive clubs—specifically those that are `COMPLETED` (state 2) or `CANCELLED` (state 3), or invalid/defunct contract addresses—can be deleted from the directory.

---

## 2. Dispatch Assignments & Boundaries

1. **BA**:
   - Analyze requirements, business rules (BR), acceptance criteria (AC), and traceability matrix.
   - Deliver `docs/ba/task-056/spec-v1.md`.
   - Complete Gate 1: Ready for Development.

2. **Developer**:
   - File Ownership: `src/components/savings/ClubDirectoryModal.tsx` and `src/lib/i18n.ts`.
   - Take baseline snapshot: `node scripts/manifest-tool.mjs baseline task-056 <files>`.
   - Read on-chain state of clubs using `useReadContracts` (or integrate existing hook/ABI `state()` call).
   - Determine `isActive`: A club is active if `state === GROUP_STATE.OPEN || state === GROUP_STATE.ACTIVE`.
   - For active clubs:
     - The delete action must NOT be permitted.
     - Either disable the delete button with an explanatory tooltip (e.g. "Không thể xóa nhóm đang hoạt động (Mở tham gia / Đang chạy)" / "Cannot delete active savings club") or hide it.
     - Add guard check in `handleDeleteGroup` and `handleConfirmDelete` preventing deletion if active.
   - For inactive clubs (`COMPLETED` or `CANCELLED` or errored/defunct): Deletion is allowed as before.
   - Display a state indicator/badge for each club in the modal (e.g., `Mở tham gia`, `Đang chạy`, `Hoàn thành`, `Đã huỷ`) so users know the actual status of each club at a glance.
   - Update bilingual dictionary (`src/lib/i18n.ts`) with new tooltips and error messages.
   - Run freeze: `node scripts/manifest-tool.mjs freeze task-056 <files>`.

3. **Tester (Independent)**:
   - Verify SHA256 manifest before testing.
   - File Ownership: `tests/prevent-delete-active-club.test.ts`, `docs/qa/task-056/test-report.md`.
   - Write comprehensive tests verifying:
     - Inactive states (`COMPLETED`, `CANCELLED`, failed read) allow deletion.
     - Active states (`OPEN`, `ACTIVE`) strictly prohibit deletion (disabled/blocked + guard in handlers).
     - Badge display reflects accurate state.
     - 100% test suite pass without regression.
   - Issue QA test report with actual execution logs and exit codes.

4. **Gate 4 & 5**:
   - BA performs coverage review in `docs/ba/task-056/coverage-review.md`.
   - Leader inspects signoff and approves `docs/task-056-acceptance.md`.
