# BA Specification: Task-056 (Revision v2) — Allow Deletion of Empty Newly Created Clubs

- **Task ID**: task-056
- **Author**: Business Analyst
- **Version**: 2.0.0
- **Status**: READY_FOR_DEV (Gate 1 Passed)
- **Date**: 2026-11-01

---

## 1. Additional User Requirement

User Feedback:
> "thêm điều kiện nữa là, khi mới tạo club mà chưa đóng hụi và chưa có thành viên nào thì cũng xóa đc"

### Business Analysis:
- In revision v1, all clubs in `OPEN` state were locked against deletion.
- However, when a user creates a new club for testing or configuration, before any member joins and before rounds start (`state === GROUP_STATE.OPEN` with `members.length === 0`), no member has committed capital or collateral, and no contributions have taken place.
- Therefore, empty newly-created clubs SHOULD be removable from the directory to allow creators to discard mistaken setups or test configurations.
- Conversely, once at least 1 member has joined (`hasMember0 === true` / `members.length >= 1`), or once rounds have started (`state === GROUP_STATE.ACTIVE`), the club is strictly active and MUST NOT be deleted.

---

## 2. Updated Business Rules (BR)

### REQ-01: Enhanced State & Membership Query
- **BR-01.1**: `ClubDirectoryModal` queries both `state()` and `members(0n)` for every savings club in `groups` via `useReadContracts`.
- **BR-01.2**: If `members(0n)` returns an address, `hasMember0` is `true` (at least 1 member has joined). If it reverts or returns undefined, `hasMember0` is `false` (0 members).

### REQ-02: Granular Deletion Classification
- **BR-02.1**: A club is classified as `isActive` (non-deletable) IF AND ONLY IF:
  - `rawState === GROUP_STATE.ACTIVE` (ongoing contribution & auction rounds), OR
  - `rawState === GROUP_STATE.OPEN && hasMember0` (open club with at least 1 registered/collateralized member).
- **BR-02.2**: A club is classified as `!isActive` (deletable) IF:
  - `rawState === GROUP_STATE.OPEN && !hasMember0` (newly created club, 0 members, no contributions yet), OR
  - `rawState === GROUP_STATE.COMPLETED` (all rounds finished), OR
  - `rawState === GROUP_STATE.CANCELLED` (club dissolved), OR
  - RPC read fails / defunct address.

### REQ-03: Tooltip & Status Nuance
- **BR-03.1**: When a club is in `OPEN` with 0 members, status badge displays `"Mở tham gia (0 tv)"` / `"Open (0 members)"`, and the delete button is ENABLED.
- **BR-03.2**: When a club is in `OPEN` with >= 1 members, status badge displays `"Mở tham gia"` / `"Open"`, and delete button is DISABLED with tooltip:
  - VI: `"Không thể xóa nhóm đang hoạt động (Đã có thành viên tham gia)"`
  - EN: `"Cannot remove active savings club (Members already joined)"`
- **BR-03.3**: When a club is in `ACTIVE`, delete button is DISABLED with tooltip:
  - VI: `"Không thể xóa nhóm đang hoạt động (Đang chạy các vòng)"`
  - EN: `"Cannot remove active savings club (Rounds in progress)"`

---

## 3. Acceptance Criteria (AC)

- [ ] **AC-01**: Newly created club in `OPEN` with 0 members has enabled delete button and can be deleted.
- [ ] **AC-02**: Club in `OPEN` with >= 1 members has disabled delete button and cannot be deleted.
- [ ] **AC-03**: Club in `ACTIVE` has disabled delete button and cannot be deleted.
- [ ] **AC-04**: Club in `COMPLETED` or `CANCELLED` has enabled delete button.
- [ ] **AC-05**: Handlers `handleDeleteGroup` and `handleConfirmDelete` enforce this logic.
- [ ] **AC-06**: All 466+ unit tests pass without regression.
