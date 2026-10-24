# Báo cáo Kiểm thử Độc lập: Danh Sách Nhóm Hụi & Nâng Cấp Typography/Font Tiếng Việt
**Task ID**: `task-005`  
**Dispatch ID**: `dispatch-005-qa`  
**Tester**: `qa-agent` (Tester độc lập)  
**Spec Version kiểm tra**: `docs/ba/task-005/spec-v1.0.md` (`v1.0`)  
**Thời điểm kiểm tra**: `2026-10-09 11:01:00`  
**Trạng thái**: `PASS (Signoff kèm ghi nhận kỹ thuật)`  

---

## 1. Kiểm tra Tính Toàn Vẹn Mã Nguồn (SHA256 Integrity)
- **Manifest bàn giao từ Developer**: `docs/manifests/task-005/manifest.json` (Thời điểm đóng băng: `2026-10-09T03:54:28.417Z`)
- **Lệnh kiểm tra trước và sau khi test**: `node scripts/manifest-tool.mjs verify task-005`
- **Kết quả so sánh SHA256 trước khi test**: `MATCH` (100% khớp)
- **Chi tiết hash 15 files bàn giao trong manifest**:
  - `index.html`: `8d2450edebc7149bf278d941ddfbfe91e10eb26d1024afd4387e5fe90c8d280e` (Khớp)
  - `src/index.css`: `cdb35e93c334390d639c29c69911651fcbfe43c16d0d819ab6f0f5db071d2e2c` (Khớp)
  - `tailwind.config.js`: `027c900354b61bcb00da7760bb80461ce5e9873f7bef0b48a14a402f175ad8b4` (Khớp)
  - `src/lib/savingsClubDirectory.ts`: `764a72bbb5172cdb373aa3db9b17901dc42b237853842d2c285f0a9dc9ae5438` (Khớp)
  - `src/components/savings/ClubDirectoryModal.tsx`: `877e1968a6879a93e92a59192b4666e2971cb409dddc669b3a8ea6109d78476a` (Khớp)
  - `src/components/savings/GroupSwitcher.tsx`: `58a16e16e461222fb3d1f778d87eb254f6c4e4d506af4a4ea7b79a75dfef28e7` (Khớp)
  - `src/components/savings/Header.tsx`: `4f9a058be23517afb9924e8edfb4a793f097acd1bb054131e94f445896f8b37d` (Khớp)
  - `src/components/savings/CreateClubModal.tsx`: `be707bafb3b658e6070bc38f70ec897d0920b8856ff1c29f5eafb024dd428b0b` (Khớp)
  - `src/components/savings/ActionPanel.tsx`: `5a70c57de748d04571c76cacef521a8b2a0c152379390e6f30bcf4b5c00ba65b` (Khớp)
  - `src/components/savings/PasskeyActionPanel.tsx`: `5ccff71dff71293b0dc18eca91647d727f91c91c3f0fba436f1d05ba836c7a1a` (Khớp)
  - `src/components/savings/ClubCard.tsx`: `31722562ffeddd7d7bab4e1a66c7dd130b8eaa199c30b50570db2dd7974de1c8` (Khớp)
  - `src/components/savings/HowItWorksCard.tsx`: `268a8e6d00be36179588c5bbec286bac0c41ac6ddb24fbbdd470108976b4dc5c` (Khớp)
  - `src/components/savings/RoundHistory.tsx`: `8363bd0e4ae323759c0601b0645a4dc4ab7695195ca3f33a02e8810800e1fdd1` (Khớp)
  - `src/components/savings/MemberStatus.tsx`: `c8b0fd97b28e9e6d1a1ffc4b45e838b38cbd462153e21aa8a0dc5fc86a53f65e` (Khớp)
  - `src/App.tsx`: `869c6dc652ecee09ca46cd4fe3690f0c50eff5c2edbeb40546c993345cfd38c0` (Khớp)

---

## 2. Kịch bản Kiểm thử & Kết quả Thực thi

Bộ kiểm thử độc lập được thiết kế tại [tests/savings-club-directory.test.ts](file:///home/avada/tontine/tests/savings-club-directory.test.ts), bao phủ toàn bộ 15 tiêu chí nghiệm thu (AC-01.1 đến AC-03.5 / TC-DIR-01 đến TC-DIR-10 và TC-TYPO-01 đến TC-TYPO-05) cùng suite hồi quy 45 bài test hiện có:

| Mã Test | Mô tả Kịch bản | AC Liên quan | Lệnh thực chạy | Exit Code | Kết quả | Ghi chú |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-DIR-01 | Khởi tạo nhóm mặc định - trả về ít nhất 2 nhóm mặc định (`BAVI Savings Club` & `Nhóm Hụi Arc Alpha`, `isDefault: true`) | AC-01.1 | `node --experimental-strip-types --test tests/savings-club-directory.test.ts` | 0 | PASS | Chuẩn địa chỉ và tên nhóm |
| TC-DIR-02 | Lưu trữ và khử trùng lặp trong localStorage key `hui_known_groups` - chuẩn hóa chữ thường `toLowerCase()` | AC-01.2 | `node --experimental-strip-types --test tests/savings-club-directory.test.ts` | 0 | PASS | Khử trùng lặp thành công |
| TC-DIR-03 | Tự động ghi nhận khi tạo nhóm mới thành công trong `CreateClubModal.tsx` và `App.tsx` | AC-01.3 | `node --experimental-strip-types --test tests/savings-club-directory.test.ts` | 0 | PASS | Tên nhóm nhập vào được giữ nguyên chuẩn |
| TC-DIR-04 | Tự động ghi nhận khi nhập địa chỉ đổi nhóm thủ công trong `GroupSwitcher.tsx` | AC-01.4 | `node --experimental-strip-types --test tests/savings-club-directory.test.ts` | 0 | PASS | Ghi nhận format `Nhóm Hụi [Địa chỉ rút gọn]` |
| TC-DIR-05 | Chịu lỗi dữ liệu hỏng trong localStorage (`corrupted_json_syntax_error`), không crash và tự fallback về default | AC-01.5 | `node --experimental-strip-types --test tests/savings-club-directory.test.ts` | 0 | PASS | Cơ chế try...catch an toàn |
| TC-DIR-06 | Nút mở "Danh sách nhóm" trên `Header.tsx` (cả Wagmi header lẫn Passkey top bar) và `GroupSwitcher.tsx` | AC-02.1 | `node --experimental-strip-types --test tests/savings-club-directory.test.ts` | 0 | PASS | Hiển thị nút kèm icon Layers và liên kết callback |
| TC-DIR-07 | Hiển thị `ClubDirectoryModal.tsx` đầy đủ thông tin: tiêu đề, địa chỉ rút gọn, tag "Nổi bật", tag "Đang xem", copy button | AC-02.2 | `node --experimental-strip-types --test tests/savings-club-directory.test.ts` | 0 | PASS | Modal hiển thị trực quan, hỗ trợ copy & explorer |
| TC-DIR-08 | Thao tác Chuyển nhóm 1-Click: gọi `onSelectGroup`, đóng modal, hiển thị toast success và cập nhật URL query `?group=0x...` | AC-02.3 | `node --experimental-strip-types --test tests/savings-club-directory.test.ts` | 0 | PASS | URL và App state đồng bộ tức thì |
| TC-DIR-09 | Nhận diện nhóm hiện tại: hiển thị tag "Đang xem" và vô hiệu hóa (`disabled`/`cursor-not-allowed`) click thừa | AC-02.4 | `node --experimental-strip-types --test tests/savings-club-directory.test.ts` | 0 | PASS | Ngăn người dùng chuyển lại chính nhóm đang xem |
| TC-DIR-10 | Lối tắt "+ Tạo nhóm mới" trong footer modal danh mục chuyển tiếp mượt mà sang `CreateClubModal` | AC-02.5 | `node --experimental-strip-types --test tests/savings-club-directory.test.ts` | 0 | PASS | Đóng modal danh bạ và mở ngay modal tạo nhóm |
| TC-TYPO-01 | Tích hợp Font Plus Jakarta Sans & Inter với Vietnamese Subset (`&subset=vietnamese`) trong `index.html` và `src/index.css` | AC-03.1 | `node --experimental-strip-types --test tests/savings-club-directory.test.ts` | 0 | PASS | Khai báo `lang="vi"`, loại bỏ DM Sans/Space Grotesk |
| TC-TYPO-02 | Cấu hình Font Family chuẩn trong `src/index.css` (body font-family) và `tailwind.config.js` (`fontFamily.sans`) | AC-03.2 | `node --experimental-strip-types --test tests/savings-club-directory.test.ts` | 0 | PASS | Font stack chuẩn: Plus Jakarta Sans, Inter, sans-serif |
| TC-TYPO-03 | Dọn sạch Inline Styles ép cứng Font cũ (`Space Grotesk`, `DM Sans`) trong toàn bộ 11 component được giao | AC-03.3 | `node --experimental-strip-types --test tests/savings-club-directory.test.ts` | 0 | PASS | 11/11 file giao trong manifest sạch 100% |
| TC-TYPO-04 | Xóa bỏ triệt để Class Cỡ chữ Siêu nhỏ `text-[10px]` và `text-[11px]` trong toàn bộ thư mục `src/` | AC-03.4 | `node --experimental-strip-types --test tests/savings-club-directory.test.ts` | 0 | PASS | Quét toàn bộ src/: 0 kết quả text-[10px]/text-[11px] |
| TC-TYPO-05 | Độ tương phản và thang đo cỡ chữ đạt chuẩn $\ge 12px$, antialiasing sắc nét và tiếng Việt hiển thị chuẩn | AC-03.5 | `node --experimental-strip-types --test tests/savings-club-directory.test.ts` | 0 | PASS | Không có class sub-12px, font-smoothing chuẩn |
| TC-REG-ALL | Chạy toàn bộ test suite hệ thống (45 test hồi quy + 15 test mới = 60 tests) | Hồi quy | `npm test` | 0 | PASS | 60/60 tests PASS (0 fail, 0 skip) |
| TC-BUILD | Kiểm tra build TypeScript và Vite production bundle toàn dự án | Build | `npm run build` | 0 | PASS | TypeScript check sạch, bundle hoàn tất trong 20s |

---

## 3. Log Thực Thi Chi Tiết (Execution Logs)

### 3.1. Chạy Suite Kiểm Thử Toàn Hệ Thống (`npm test`)
```text
> studio-app@0.0.0 test
> node --experimental-strip-types --test tests/*.test.ts

✔ TC-CREATE-01 (AC-01.1): Form fields (Tên nhóm, Mức đóng, Số thành viên, Chu kỳ) hiển thị đầy đủ với default và presets (1.005024ms)
✔ TC-CREATE-02 (AC-01.2): Quỹ Pot tối đa được tính toán chính xác = contributionAmount * maxMembers USDC (12.103325ms)
✔ TC-CREATE-03 (AC-01.3): Validation form (vô hiệu hóa submit khi tên rỗng, amount <= 0, maxMembers ngoài [2, 20]) (0.508466ms)
✔ TC-CREATE-04 (AC-02.1): ROTATING_SAVINGS_BYTECODE được export và là hex string bắt đầu bằng '0x' với độ dài bytecode hợp lệ (> 1000 ký tự) (0.227657ms)
✔ TC-CREATE-05 (AC-02.2): Tham số deploy contract truyền vào đúng thứ tự và định dạng: [USDC_ADDRESS, parseUsdc(contributionAmount), BigInt(maxMembers), BigInt(roundDuration), groupName] (0.401977ms)
✔ TC-CREATE-06 (AC-02.3): Quản lý trạng thái pending ký ví và confirming trên blockchain, disabled form và nút bấm trong quá trình deploy (0.979501ms)
✔ TC-CREATE-07 (AC-03.1): Callback onSuccess(contractAddress) được kích hoạt khi transaction receipt trả về contractAddress (0.375357ms)
✔ TC-CREATE-08 (AC-03.2): App.tsx chuyển sang địa chỉ mới khi tạo thành công và cập nhật URL (?group=0x...) (0.411005ms)
✔ TC-CREATE-09 (AC-04.1): GroupSwitcher cung cấp nút '+ Tạo nhóm mới' gọi callback onOpenCreateModal (0.499996ms)
✔ TC-CREATE-10 (AC-04.2): Header cung cấp nút '+ Tạo nhóm' gọi callback onOpenCreateModal (0.478998ms)
✔ TC-OPEN-01: MemberStatus renders 'Chờ mở vòng 1' with Clock icon in OPEN state (AC-01.1) (0.962745ms)
✔ TC-OPEN-02: MemberStatus conditionally displays 'Đã đóng' vs 'Chưa đóng' when state != OPEN (AC-01.2) (0.208506ms)
✔ TC-OPEN-03: MemberStatusProps declares state prop and App.tsx passes it (AC-01.3) (0.253113ms)
✔ TC-OPEN-04: ActionPanel renders clear member confirmation badge in OPEN state (AC-02.1) (0.253537ms)
✔ TC-OPEN-05: ActionPanel explains why contribution button is not yet present (AC-02.2) (0.199256ms)
✔ TC-OPEN-06: ActionPanel renders 3-step lifecycle progress roadmap (AC-02.3) (0.19696ms)
✔ TC-OPEN-07: ActionPanel provides invite friends copy link button with feedback (AC-02.4) (0.883991ms)
✔ TC-OPEN-08: PasskeyActionPanel provides matching explanation, stepper & invite (AC-03.1) (0.240806ms)
✔ TC-OPEN-09: ClubCard displays capacity condition in OPEN state (AC-04.1) (0.322272ms)
✔ TC-DIR-01 (AC-01.1): Khởi tạo nhóm mặc định - trả về ít nhất 2 nhóm mặc định (1.17965ms)
✔ TC-DIR-02 (AC-01.2): Lưu trữ và khử trùng lặp - chuẩn hóa chữ thường toLowerCase() (0.450933ms)
✔ TC-DIR-03 (AC-01.3): Tự động ghi nhận khi tạo nhóm mới thành công (0.31941ms)
✔ TC-DIR-04 (AC-01.4): Tự động ghi nhận khi nhập địa chỉ đổi nhóm thủ công (0.139846ms)
✔ TC-DIR-05 (AC-01.5): Chịu lỗi dữ liệu hỏng / Edge Case - không crash và fallback về default (0.912559ms)
✔ TC-DIR-06 (AC-02.1): Nút mở Danh sách nhóm trên Header & GroupSwitcher (0.345776ms)
✔ TC-DIR-07 (AC-02.2): Hiển thị Modal Danh Sách Nhóm Hụi đầy đủ thông tin (0.140954ms)
✔ TC-DIR-08 (AC-02.3): Thao tác Chuyển nhóm 1-Click đóng modal & toast (0.1422ms)
✔ TC-DIR-09 (AC-02.4): Nhận diện nhóm hiện tại - Disabled redundant action (0.306003ms)
✔ TC-DIR-10 (AC-02.5): Lối tắt Tạo nhóm mới từ Danh mục (0.463988ms)
✔ TC-TYPO-01 (AC-03.1): Tích hợp Font Plus Jakarta Sans & Inter với Vietnamese Subset (0.197099ms)
✔ TC-TYPO-02 (AC-03.2): Cấu hình Font Family chuẩn trong CSS & Tailwind (0.101315ms)
✔ TC-TYPO-03 (AC-03.3): Dọn sạch Inline Styles ép cứng Font cũ (0.625968ms)
✔ TC-TYPO-04 (AC-03.4): Xóa bỏ triệt để Class Cỡ chữ Siêu nhỏ text-[10px] và text-[11px] (5.17682ms)
✔ TC-TYPO-05 (AC-03.5): Độ tương phản và thang đo cỡ chữ đạt chuẩn >= 12px (3.629259ms)
✔ AC-01.1: Safe execution in useEffect (Render loop fix in ActionPanel.tsx) (1.489709ms)
✔ AC-01.2: No duplicate trigger on state reset (0.371246ms)
✔ AC-02.1: parseUsdc parses valid integer strings to 6-decimal raw BigInt (0.317214ms)
✔ AC-02.2: parseUsdc parses valid decimal strings accurately without floating-point error (0.252428ms)
✔ AC-02.3: parseUsdc handles minimum precision decimal (0.000001 = 1 micro-USDC) (1.469384ms)
✔ AC-02.4: parseUsdc safely rejects negative numbers returning 0n without throwing (0.212085ms)
✔ AC-02.5: parseUsdc safely rejects empty and whitespace-only strings returning 0n (0.172363ms)
✔ AC-02.6: parseUsdc safely rejects non-numeric and malformed strings returning 0n (0.099524ms)
✔ AC-02.7: parseUsdc safely truncates excessive decimals (> 6 decimals) without crashing (0.342408ms)
✔ AC-02.8: Passkey & Regular ActionPanel bid input safety mechanism (0.566514ms)
✔ AC-03.1: Owner identification logic in App.tsx (0.314325ms)
✔ AC-03.2: Start button disabled when members < 2 (0.26953ms)
✔ AC-03.3: Start button enabled when members >= 2 (0.181561ms)
✔ AC-03.4: Cancel group button available in OPEN state (0.169492ms)
✔ AC-03.5: Non-owner cannot see Owner Controls (0.172952ms)
✔ AC-03.6: Controls hidden when state != OPEN (0.190611ms)
✔ AC-04.1: Render settled rounds with roundId, winner, totalPot, and totalBids (12.143926ms)
✔ AC-04.2: Highlight connected user as winner with 'Bạn!' badge (0.200641ms)
✔ AC-04.3: Empty history state displays friendly message when no rounds settled (0.123378ms)
✔ AC-05.1: Load group from valid URL query param (?group=0x...) (0.292486ms)
✔ AC-05.2: Fallback to ROTATING_SAVINGS_ADDRESS on invalid or missing URL param (0.315596ms)
✔ AC-05.3: Switch group dynamically updates state and URL without page reload (0.20957ms)
✔ AC-05.4: Copy share link to clipboard with correct format and toast notification (0.112936ms)
✔ AC-06.1: Non-blocking public layout when unauthenticated (!address) (0.257645ms)
✔ AC-06.2: Onboarding guide is non-blocking, on-demand with dismissible onClose (0.284134ms)
✔ AC-06.3: No alarming developer missing-config alert in unauthenticated user view (0.159033ms)
ℹ tests 60
ℹ suites 0
ℹ pass 60
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 153.924351
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
dist/index.html                                        1.03 kB │ gzip:   0.50 kB
dist/assets/index-YZpWLgrU.css                        37.74 kB │ gzip:   6.89 kB
dist/assets/cursor-BtVZOyTf.js                         0.26 kB │ gzip:   0.22 kB
...
dist/assets/index-NSrtDMRS.js                      1,896.81 kB │ gzip: 583.65 kB
✓ built in 20.00s
```

---

## 4. Xác nhận SHA256 sau khi Test
- **Lệnh thực thi**: `node scripts/manifest-tool.mjs verify task-005`
- **Kết quả so sánh SHA256 sau khi test**: `MATCH` (100% khớp)
```text
[Verify] Verifying manifest for Task: task-005 (Frozen at: 2026-10-09T03:54:28.417Z)
[MATCH] index.html (8d2450edebc7149b...)
[MATCH] src/index.css (cdb35e93c334390d...)
[MATCH] tailwind.config.js (027c900354b61bcb...)
[MATCH] src/lib/savingsClubDirectory.ts (764a72bbb5172cdb...)
[MATCH] src/components/savings/ClubDirectoryModal.tsx (877e1968a6879a93...)
[MATCH] src/components/savings/GroupSwitcher.tsx (58a16e16e461222f...)
[MATCH] src/components/savings/Header.tsx (4f9a058be23517af...)
[MATCH] src/components/savings/CreateClubModal.tsx (be707bafb3b658e6...)
[MATCH] src/components/savings/ActionPanel.tsx (5a70c57de748d045...)
[MATCH] src/components/savings/PasskeyActionPanel.tsx (5ccff71dff71293b...)
[MATCH] src/components/savings/ClubCard.tsx (31722562ffeddd7d...)
[MATCH] src/components/savings/HowItWorksCard.tsx (268a8e6d00be3617...)
[MATCH] src/components/savings/RoundHistory.tsx (8363bd0e4ae32375...)
[MATCH] src/components/savings/MemberStatus.tsx (c8b0fd97b28e9e6d...)
[MATCH] src/App.tsx (869c6dc652ecee09...)

 All files verified successfully! Integrity confirmed.
```
- **Cam kết tính toàn vẹn**: Toàn bộ 15 files mã nguồn implementation trong manifest được bảo toàn nguyên vẹn 100% hash SHA256 đã đóng băng. Tester độc lập tuyệt đối không can thiệp hay sửa đổi bất kỳ dòng mã implementation nào của Developer.

---

## 5. Phát hiện & Khuyến nghị Kỹ thuật (Technical Findings)

Trong quá trình rà soát độc lập bằng static analysis trên toàn bộ thư mục `src/`, Tester phát hiện 2 điểm lưu ý:
1. **`src/components/savings/OnboardingScreen.tsx`**:
   - Vẫn còn 4 vị trí chứa inline style `style={{ fontFamily: "'Space Grotesk', sans-serif" }}` tại các dòng `72`, `116`, `133`, `224`.
   - **Nguyên nhân**: File này thuộc màn hình phụ Hướng dẫn (mở khi bấm nút "Hướng dẫn"), không nằm trong danh sách 15 file được bàn giao trong manifest `task-005` nên Developer chưa thực hiện dọn dẹp.
   - **Mức độ ảnh hưởng**: Thấp (Low / Cosmetic). Trình duyệt fallback sang font hệ thống khi font `Space Grotesk` không còn được nạp qua Google Fonts. Toàn bộ cỡ chữ trong file này đều đạt chuẩn $\ge 12px$ (không có `text-[10px]`/`text-[11px]`).
   - **Khuyến nghị**: Đề nghị Leader đưa file này vào scope dọn dẹp ở dispatch/task tiếp theo để loại bỏ triệt để 4 inline style trên.
2. **`src/components/Dashboard.tsx`**:
   - Chứa 7 vị trí `Space Grotesk`. Tuy nhiên đây là component cũ từ dự án sàn DEX gốc, không còn được import hay sử dụng trong ứng dụng Hụi hiện tại. Không gây bất kỳ ảnh hưởng nào tới ứng dụng.

---

## 6. Kết luận & Signoff
- **Tổng số test độc lập**: `60` | **Pass**: `60` | **Fail**: `0` | **Skip**: `0`
- **Tỷ lệ Pass**: `100%` (Toàn bộ 15/15 tiêu chí nghiệm thu đạt chuẩn và 45/45 bài test hồi quy pass).
- **Tính toàn vẹn SHA256**: `100% Khớp` trên cả 15 files bàn giao trước và sau kiểm thử.
- **Quy trình Build**: `PASS` (`tsc --noEmit && vite build` hoàn thành không lỗi).
- **Ý kiến Tester**: `ĐẠT CHUẨN TOÀN DIỆN (Signoff)`
- **Chuyển giao**: Bàn giao cho BA đối chiếu nghiệp vụ (Gate 4) và Leader nghiệm thu Gate 5.
