# Báo cáo Kiểm thử Độc lập: Tính năng Tạo Nhóm Hụi Mới (Create New Savings Club)
**Task ID**: `task-004`  
**Dispatch ID**: `dispatch-004-qa`  
**Tester**: `qa-agent` (Tester độc lập)  
**Spec Version kiểm tra**: `docs/ba/task-004/spec-v1.0.md` (`v1.0`)  
**Thời điểm kiểm tra**: `2026-10-09 10:32:30`  
**Trạng thái**: `PASS`  

---

## 1. Kiểm tra Tính Toàn Vẹn Mã Nguồn (SHA256 Integrity)
- **Manifest bàn giao từ Developer**: `docs/manifests/task-004/manifest.json` (Thời điểm đóng băng: `2026-10-09T03:27:59.108Z`)
- **Lệnh kiểm tra trước và sau khi test**: `node scripts/manifest-tool.mjs verify task-004`
- **Kết quả so sánh SHA256 trước khi test**: `MATCH` (100% khớp)
- **Chi tiết hash 5 files bàn giao**:
  - `src/contract.ts`: `c34c5aaf7204f077a9a75bf9a7deeb3d88a00f633824263339b6d692e7da3be6` (Khớp)
  - `src/components/savings/CreateClubModal.tsx`: `29eb24a3860c26dcd8dd697691d60865c36b7b501d7958c0d85471b92188feae` (Khớp)
  - `src/components/savings/GroupSwitcher.tsx`: `247da61526373c55c8a401681139b3ec67b56c9553ed3a09a3fd94dd6d2ee448` (Khớp)
  - `src/components/savings/Header.tsx`: `780ba8d95b169ae53e35b9644035db3e31d510f23589ab2754fac4f557f3cb44` (Khớp)
  - `src/App.tsx`: `4111fe707250c84aeacfd740b219d8e1bb2f7f683c6794e7f2b73bbfadee437c` (Khớp)

---

## 2. Kịch bản Kiểm thử & Kết quả Thực thi

Bộ kiểm thử độc lập được thiết kế tại [tests/create-club.test.ts](file:///home/avada/tontine/tests/create-club.test.ts), bao phủ toàn bộ 10 tiêu chí nghiệm thu (AC-01.1 đến AC-04.2 / TC-CREATE-01 đến TC-CREATE-10) cùng suite hồi quy 35 bài test hiện có:

| Mã Test | Mô tả Kịch bản | AC Liên quan | Lệnh thực chạy | Exit Code | Kết quả | Ghi chú |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-CREATE-01 | Form fields (Tên nhóm, Mức đóng, Số thành viên, Chu kỳ) hiển thị đầy đủ với default và presets | AC-01.1 | `node --experimental-strip-types --test tests/create-club.test.ts` | 0 | PASS | Default & presets khớp spec |
| TC-CREATE-02 | Quỹ Pot tối đa được tính toán chính xác = contributionAmount * maxMembers USDC | AC-01.2 | `node --experimental-strip-types --test tests/create-club.test.ts` | 0 | PASS | 10*10=100 USDC, thời gian chu kỳ chuẩn |
| TC-CREATE-03 | Validation form (vô hiệu hóa submit khi tên rỗng, amount <= 0, maxMembers ngoài [2, 20]) | AC-01.3 | `node --experimental-strip-types --test tests/create-club.test.ts` | 0 | PASS | Chặn submit toàn bộ edge cases |
| TC-CREATE-04 | `ROTATING_SAVINGS_BYTECODE` được export và là hex string bắt đầu bằng "0x" với độ dài bytecode hợp lệ (> 1000 ký tự) | AC-02.1 | `node --experimental-strip-types --test tests/create-club.test.ts` | 0 | PASS | Bytecode hợp lệ, 18784 ký tự hex |
| TC-CREATE-05 | Tham số deploy contract truyền vào đúng thứ tự và định dạng: [USDC_ADDRESS, parseUsdc(contributionAmount), BigInt(maxMembers), BigInt(roundDuration), groupName] | AC-02.2 | `node --experimental-strip-types --test tests/create-club.test.ts` | 0 | PASS | 100% khớp ABI constructor 5 tham số |
| TC-CREATE-06 | Quản lý trạng thái pending ký ví và confirming trên blockchain, disabled form và nút bấm trong quá trình deploy | AC-02.3 | `node --experimental-strip-types --test tests/create-club.test.ts` | 0 | PASS | Trạng thái hiển thị spinner và khóa nút |
| TC-CREATE-07 | Callback `onSuccess(contractAddress)` được kích hoạt khi transaction receipt trả về contractAddress | AC-03.1 | `node --experimental-strip-types --test tests/create-club.test.ts` | 0 | PASS | Kích hoạt đúng address, reset & đóng modal |
| TC-CREATE-08 | `App.tsx` chuyển sang địa chỉ mới khi tạo thành công và cập nhật URL (?group=0x...) | AC-03.2 | `node --experimental-strip-types --test tests/create-club.test.ts` | 0 | PASS | Cập nhật state, history.pushState và toast |
| TC-CREATE-09 | `GroupSwitcher` cung cấp nút "+ Tạo nhóm mới" gọi callback onOpenCreateModal | AC-04.1 | `node --experimental-strip-types --test tests/create-club.test.ts` | 0 | PASS | Nút hiển thị và liên kết đúng prop callback |
| TC-CREATE-10 | `Header` cung cấp nút "+ Tạo nhóm" gọi callback onOpenCreateModal | AC-04.2 | `node --experimental-strip-types --test tests/create-club.test.ts` | 0 | PASS | Khớp cả Wagmi header lẫn Passkey top bar |
| TC-REG-ALL | Chạy toàn bộ test suite hệ thống (35 test hồi quy + 10 test mới = 45 tests) | Hồi quy | `npm test` | 0 | PASS | 45/45 tests PASS (0 fail, 0 skip) |
| TC-BUILD | Kiểm tra build TypeScript và Vite bundle toàn dự án | Build | `npm run build` | 0 | PASS | TypeScript check sạch, bundle hoàn tất |

---

## 3. Log Thực Thi Chi Tiết (Execution Logs)

### 3.1. Chạy Suite Kiểm Thử Toàn Hệ Thống (`npm test`)
```text
> studio-app@0.0.0 test
> node --experimental-strip-types --test tests/*.test.ts

✔ TC-CREATE-01 (AC-01.1): Form fields (Tên nhóm, Mức đóng, Số thành viên, Chu kỳ) hiển thị đầy đủ với default và presets (1.0643ms)
✔ TC-CREATE-02 (AC-01.2): Quỹ Pot tối đa được tính toán chính xác = contributionAmount * maxMembers USDC (11.49196ms)
✔ TC-CREATE-03 (AC-01.3): Validation form (vô hiệu hóa submit khi tên rỗng, amount <= 0, maxMembers ngoài [2, 20]) (0.510641ms)
✔ TC-CREATE-04 (AC-02.1): ROTATING_SAVINGS_BYTECODE được export và là hex string bắt đầu bằng '0x' với độ dài bytecode hợp lệ (> 1000 ký tự) (0.313684ms)
✔ TC-CREATE-05 (AC-02.2): Tham số deploy contract truyền vào đúng thứ tự và định dạng: [USDC_ADDRESS, parseUsdc(contributionAmount), BigInt(maxMembers), BigInt(roundDuration), groupName] (0.389271ms)
✔ TC-CREATE-06 (AC-02.3): Quản lý trạng thái pending ký ví và confirming trên blockchain, disabled form và nút bấm trong quá trình deploy (1.142842ms)
✔ TC-CREATE-07 (AC-03.1): Callback onSuccess(contractAddress) được kích hoạt khi transaction receipt trả về contractAddress (0.631354ms)
✔ TC-CREATE-08 (AC-03.2): App.tsx chuyển sang địa chỉ mới khi tạo thành công và cập nhật URL (?group=0x...) (0.549557ms)
✔ TC-CREATE-09 (AC-04.1): GroupSwitcher cung cấp nút '+ Tạo nhóm mới' gọi callback onOpenCreateModal (0.795074ms)
✔ TC-CREATE-10 (AC-04.2): Header cung cấp nút '+ Tạo nhóm' gọi callback onOpenCreateModal (0.676432ms)
✔ TC-OPEN-01: MemberStatus renders 'Chờ mở vòng 1' with Clock icon in OPEN state (AC-01.1) (1.398799ms)
✔ TC-OPEN-02: MemberStatus conditionally displays 'Đã đóng' vs 'Chưa đóng' when state != OPEN (AC-01.2) (0.305351ms)
✔ TC-OPEN-03: MemberStatusProps declares state prop and App.tsx passes it (AC-01.3) (0.385722ms)
✔ TC-OPEN-04: ActionPanel renders clear member confirmation badge in OPEN state (AC-02.1) (0.372107ms)
✔ TC-OPEN-05: ActionPanel explains why contribution button is not yet present (AC-02.2) (0.275348ms)
✔ TC-OPEN-06: ActionPanel renders 3-step lifecycle progress roadmap (AC-02.3) (0.276539ms)
✔ TC-OPEN-07: ActionPanel provides invite friends copy link button with feedback (AC-02.4) (0.817255ms)
✔ TC-OPEN-08: PasskeyActionPanel provides matching explanation, stepper & invite (AC-03.1) (0.364998ms)
✔ TC-OPEN-09: ClubCard displays capacity condition in OPEN state (AC-04.1) (0.47942ms)
✔ AC-01.1: Safe execution in useEffect (Render loop fix in ActionPanel.tsx) (1.212529ms)
✔ AC-01.2: No duplicate trigger on state reset (0.226722ms)
✔ AC-02.1: parseUsdc parses valid integer strings to 6-decimal raw BigInt (0.249582ms)
✔ AC-02.2: parseUsdc parses valid decimal strings accurately without floating-point error (0.254854ms)
✔ AC-02.3: parseUsdc handles minimum precision decimal (0.000001 = 1 micro-USDC) (1.030538ms)
✔ AC-02.4: parseUsdc safely rejects negative numbers returning 0n without throwing (0.12395ms)
✔ AC-02.5: parseUsdc safely rejects empty and whitespace-only strings returning 0n (0.155512ms)
✔ AC-02.6: parseUsdc safely rejects non-numeric and malformed strings returning 0n (0.093079ms)
✔ AC-02.7: parseUsdc safely truncates excessive decimals (> 6 decimals) without crashing (0.257793ms)
✔ AC-02.8: Passkey & Regular ActionPanel bid input safety mechanism (0.577673ms)
✔ AC-03.1: Owner identification logic in App.tsx (0.460343ms)
✔ AC-03.2: Start button disabled when members < 2 (0.307492ms)
✔ AC-03.3: Start button enabled when members >= 2 (0.242476ms)
✔ AC-03.4: Cancel group button available in OPEN state (0.249606ms)
✔ AC-03.5: Non-owner cannot see Owner Controls (0.203019ms)
✔ AC-03.6: Controls hidden when state != OPEN (0.165952ms)
✔ AC-04.1: Render settled rounds with roundId, winner, totalPot, and totalBids (10.784974ms)
✔ AC-04.2: Highlight connected user as winner with 'Bạn!' badge (0.2988ms)
✔ AC-04.3: Empty history state displays friendly message when no rounds settled (0.161364ms)
✔ AC-05.1: Load group from valid URL query param (?group=0x...) (0.289242ms)
✔ AC-05.2: Fallback to ROTATING_SAVINGS_ADDRESS on invalid or missing URL param (0.278555ms)
✔ AC-05.3: Switch group dynamically updates state and URL without page reload (0.204214ms)
✔ AC-05.4: Copy share link to clipboard with correct format and toast notification (0.109331ms)
✔ AC-06.1: Non-blocking public layout when unauthenticated (!address) (0.249845ms)
✔ AC-06.2: Onboarding guide is non-blocking, on-demand with dismissible onClose (0.254464ms)
✔ AC-06.3: No alarming developer missing-config alert in unauthenticated user view (0.147134ms)
ℹ tests 45
ℹ suites 0
ℹ pass 45
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 166.894428
```

### 3.2. Quá Trình Build Ứng Dụng (`npm run build`)
```text
> studio-app@0.0.0 build
> tsc --noEmit && vite build

vite v6.0.5 building for production...
transforming...
✓ 4930 modules transformed.
rendering chunks...
computing chunk sizes...
dist/index.html                                        0.98 kB │ gzip:   0.49 kB
dist/assets/index-Dm6Rdi39.css                        37.14 kB │ gzip:   6.80 kB
...
dist/assets/index-B9jX6_c-.js                      1,888.28 kB │ gzip: 581.86 kB
✓ built in 25.34s
```

---

## 4. Xác nhận SHA256 sau khi Test
- **Lệnh thực thi**: `node scripts/manifest-tool.mjs verify task-004`
- **Kết quả so sánh SHA256 sau khi test**: `MATCH`
```text
[Verify] Verifying manifest for Task: task-004 (Frozen at: 2026-10-09T03:27:59.108Z)
[MATCH] src/contract.ts (c34c5aaf7204f077...)
[MATCH] src/components/savings/CreateClubModal.tsx (29eb24a3860c26dc...)
[MATCH] src/components/savings/GroupSwitcher.tsx (247da61526373c55...)
[MATCH] src/components/savings/Header.tsx (780ba8d95b169ae5...)
[MATCH] src/App.tsx (4111fe707250c84a...)

 All files verified successfully! Integrity confirmed.
```
- **Cam kết tính toàn vẹn**: Toàn bộ 5 files mã nguồn implementation trong manifest được bảo toàn nguyên vẹn 100% hash SHA256 đã đóng băng. Tester độc lập tuyệt đối không can thiệp hay sửa đổi bất kỳ dòng mã implementation nào.

---

## 5. Kết luận & Signoff
- **Tổng số test độc lập**: `45` | **Pass**: `45` | **Fail**: `0` | **Skip**: `0`
- **Tỷ lệ Pass**: `100%` (Toàn bộ 10/10 AC đạt chuẩn và 35/35 bài test hồi quy pass)
- **Ý kiến Tester**: `ĐẠT CHUẨN TOÀN DIỆN (Signoff)`
- **Chuyển giao**: Bàn giao cho BA đối chiếu nghiệp vụ và Leader nghiệm thu Gate 5.
