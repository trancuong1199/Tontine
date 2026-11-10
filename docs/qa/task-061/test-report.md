# Báo cáo Kiểm thử Độc lập — Task 061 (Lọc danh bạ theo ví)

- **Task ID**: `task-061`
- **Tester**: Independent Tester
- **Ngày thực hiện**: 2026-11-10
- **Trạng thái**: SIGN-OFF PASSED (Gate 3 Passed)
- **Mã băm Manifest**: `docs/manifests/task-061/manifest.json` verified 100% MATCH

---

## 1. Kết quả kiểm tra tính toàn vẹn (SHA256 Manifest Verification)

```
[Verify] Verifying manifest for Task: task-061 (Frozen at: 2026-11-10T17:10:26.773Z)
[MATCH] src/lib/savingsClubDirectory.ts (97b507f95497a17d...)
[MATCH] src/lib/i18n.ts (caa5d25b7623449c...)
[MATCH] src/components/savings/ClubDirectoryModal.tsx (9d4d680374ca20f4...)

All files verified successfully! Integrity confirmed.
```

---

## 2. Kết quả thực thi Test Suite (`tests/task-061-wallet-filter-and-delete.test.ts`)

Lệnh thực thi:
`node --experimental-strip-types --test tests/task-061-wallet-filter-and-delete.test.ts`

Log thực tế:
```
✔ TC-061-01: Canonical default club can be permanently removed without auto-resurrection (1.084337ms)
✔ TC-061-02: getKnownGroups isolates per account and does not auto-dump default clubs into connected account (0.535862ms)
✔ TC-061-03: syncFactoryBondedClubs only syncs clubs where account is owner or member (0.755376ms)
✔ TC-061-04: ClubDirectoryModal source code includes STRIDE = 7 and wallet membership filtering (0.377936ms)
✔ TC-061-05: Manifest verification for task-061 integrity (0.395928ms)
ℹ tests 5
ℹ suites 0
ℹ pass 5
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 99.777732
```
Exit code: 0

---

## 3. Kiểm tra kiểm thử hồi quy (`tests/individual-club-delete.test.ts`)

Lệnh thực thi:
`node --experimental-strip-types --test tests/individual-club-delete.test.ts`

Log thực tế:
```
✔ TC-DEL-01 (AC-01.1 & AC-01.2): removeKnownGroup(address) đưa địa chỉ vào danh sách đã xóa và loại bỏ khỏi hui_known_groups (1.34612ms)
✔ TC-DEL-02 (AC-01.3): getKnownGroups() loại bỏ các địa chỉ trong danh sách đã xóa, kể cả nhóm mặc định (0.246294ms)
✔ TC-DEL-03 (AC-01.4): saveKnownGroup khôi phục nhóm nếu người dùng cố ý thêm lại (0.228204ms)
✔ TC-DEL-04 (AC-02.1 & AC-02.2): ClubDirectoryModal.tsx render nút icon Trash2 cho từng thẻ club với tooltip và aria-label (0.380282ms)
✔ TC-DEL-05 (AC-02.3, AC-02.4 & AC-02.5): handleDeleteGroup chặn nổi bọt, gọi removeKnownGroup, cập nhật state và xử lý chuyển nhóm an toàn (0.223874ms)
✔ TC-DEL-06 (AC-03.1 & AC-03.2): Từ điển i18n hỗ trợ song ngữ cho các thông báo xóa nhóm (0.090416ms)
✔ TC-DEL-07: syncFactoryBondedClubs không khôi phục nhóm đã bị người dùng xóa (REMOVED_CLUBS_STORAGE_KEY) (0.616273ms)
✔ TC-DEL-08: Phân tách danh bạ theo ví - Tài khoản 1 xóa club không làm Tài khoản 2 bị xóa theo (0.224588ms)
✔ TC-MANIFEST-01: File manifest docs/manifests/task-032/manifest.json tồn tại và chứa mã băm hợp lệ (0.320618ms)
ℹ tests 9
ℹ suites 0
ℹ pass 9
ℹ fail 0
```
Exit code: 0

---

## 4. Build Validation (`npm run build`)

`npm run build` (`tsc --noEmit && vite build`) hoàn thành thành công trong 15.93s, 0 lỗi TypeScript, 0 lỗi bundle.

---

## 5. Kết luận Sign-off

Tester độc lập ký xác nhận: Toàn bộ tiêu chí kiểm thử liên quan đến lọc danh bạ theo ví (chỉ hiển thị nhóm ví tạo hoặc tham gia, không nhồi nhóm lạ từ Factory) và xóa vĩnh viễn nhóm đã đạt 100%.
