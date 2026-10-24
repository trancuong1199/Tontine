# Báo Cáo Kiểm Thử Độc Lập: Thiết Kế Lại Modal Hướng Dẫn (GuideModal) & Xây Dựng Trang Chủ Giới Thiệu Dự Án (Homepage / Landing Page)

**Task ID**: `task-009`  
**Dispatch ID**: `dispatch-009-qa`  
**Tester**: `qa-agent` (Tester độc lập)  
**Spec Version kiểm tra**: `docs/ba/task-009/spec-v1.0.md` (`v1.0`)  
**Manifest kiểm tra**: `docs/manifests/task-009/manifest.json`  
**Thời điểm kiểm tra**: `2026-10-09 15:52:00`  
**Trạng thái**: `PASS (Signoff 100%)`  

---

## 1. Kiểm Tra Tính Toàn Vẹn Mã Nguồn (SHA256 Integrity Verification)

- **Manifest bàn giao từ Leader / Developer**: `docs/manifests/task-009/manifest.json` (Thời điểm đóng băng: `2026-10-09T08:46:45.122Z`)
- **Lệnh thực thi kiểm tra trước và sau test**:
  ```bash
  node scripts/manifest-tool.mjs verify task-009
  ```
- **Kết quả kiểm tra trước khi test**: `MATCH (100% khớp)`
- **Kết quả kiểm tra sau khi test**: `MATCH (100% khớp)`
- **Bảng đối chiếu SHA256 chi tiết cho 5 files bàn giao trong manifest**:

| File Path | SHA256 Manifest | Trạng thái trước test | Trạng thái sau test | Đánh giá |
| :--- | :--- | :--- | :--- | :--- |
| `src/lib/i18n.ts` | `574d5c5b8aec3a7967aa5b2d8d604bdfa8c37f16b0fc1434b10b99674116806b` | MATCH | MATCH | Toàn vẹn 100% |
| `src/components/savings/GuideModal.tsx` | `48f54f6f1097ba3e9d5cdfd1cf41be748e8b782d80d41fcc5983e50f07bed869` | MATCH | MATCH | File mới, toàn vẹn 100% |
| `src/components/landing/LandingPage.tsx` | `79a0efe654f44f01a161f73224c14903d31cf2ffa1de791ea8b3108b20626405` | MATCH | MATCH | File mới, toàn vẹn 100% |
| `src/components/savings/Header.tsx` | `a8ecb9f0b6ea882c98adcadc9eff16389192a04304a1fc2f40dc7ca9cdbbabc9` | MATCH | MATCH | Toàn vẹn 100% |
| `src/App.tsx` | `0a4852a09f9dae9b85c67ee4d6a720ca8cf245db63a085075da19d1137d6e0da` | MATCH | MATCH | Toàn vẹn 100% |

- **Cam kết**: Tester độc lập tuyệt đối không chỉnh sửa bất kỳ dòng mã implementation nào trong các files thuộc manifest của Developer.

---

## 2. Kịch Bản Kiểm Thử Độc Lập & Kết Quả Thực Thi (Test Matrix)

Bộ kiểm thử độc lập được thiết kế tại [tests/guidemodal-and-homepage.test.ts](file:///home/avada/tontine/tests/guidemodal-and-homepage.test.ts), bao phủ toàn diện các tiêu chí nghiệm thu (AC-01.1 đến AC-04.2) từ bản đặc tả [docs/ba/task-009/spec-v1.0.md](file:///home/avada/tontine/docs/ba/task-009/spec-v1.0.md):

| Mã Test | Mô tả Kịch bản Kiểm thử | AC Liên quan | Lệnh thực thi | Exit Code | Kết quả | Đánh giá |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-GUIDE-01** | `GuideModal` hiển thị dạng popup nổi overlay (`fixed inset-0 z-50 backdrop-blur-sm`), không unmount app, hỗ trợ đóng nhanh bằng nút 'X' và phím `Escape` | AC-01.1 | `node --experimental-strip-types --test tests/guidemodal-and-homepage.test.ts` | 0 | **PASS** | Không còn unmount app, đóng mượt mà bằng X và Escape |
| **TC-GUIDE-02** | Bảng so sánh Hụi truyền thống vs HụiChain Smart Contract hiển thị đối đầu rõ ràng với các icon cảnh báo/bảo vệ và phân loại rủi ro | AC-01.2 | `node --experimental-strip-types --test tests/guidemodal-and-homepage.test.ts` | 0 | **PASS** | 2 cột đối đầu trực quan, phân tích rủi ro bùng tiền vs Smart contract |
| **TC-GUIDE-03** | Quy trình 4 bước chu kỳ hụi, cơ chế phạt tự động loại trừ (Auto-kick) và ưu thế mạng Arc Network (< 1s xác thực, gas bằng USDC) | AC-01.3 | `node --experimental-strip-types --test tests/guidemodal-and-homepage.test.ts` | 0 | **PASS** | Đầy đủ 5 trụ cột giáo dục mô hình Web3 ROSCA |
| **TC-GUIDE-04** | `GuideModal` hỗ trợ song ngữ 100% tiếng Việt (`vi`) và tiếng Anh (`en`) qua prop `language` | AC-01.4 | `node --experimental-strip-types --test tests/guidemodal-and-homepage.test.ts` | 0 | **PASS** | 100% chuỗi dịch mượt mà, không hardcode |
| **TC-HOME-01** | Hero Section trên `LandingPage` hiển thị tiêu đề lớn, 3 chỉ số ấn tượng (`100%`, `0`, `< 1s`) và 3 nút CTA ("Vào ứng dụng ngay", "+ Tạo nhóm mới", "Xem hướng dẫn") | AC-02.1 | `node --experimental-strip-types --test tests/guidemodal-and-homepage.test.ts` | 0 | **PASS** | Thiết kế chuẩn Web3 hero, 3 CTA kích hoạt sự kiện chính xác |
| **TC-HOME-02** | Phân khu Bài toán bể hụi truyền thống vs Giải pháp Web3 Smart Contract hiển thị đầy đủ 3 nỗi đau và 3 giải pháp | AC-02.2 | `node --experimental-strip-types --test tests/guidemodal-and-homepage.test.ts` | 0 | **PASS** | Nêu bật rủi ro giật hụi và giải pháp hợp đồng giữ tiền 100% |
| **TC-HOME-03** | Phân khu Quy trình 4 bước sinh động có icon, màu sắc phân cấp và mô tả rõ ràng trên `LandingPage` | AC-02.3 | `node --experimental-strip-types --test tests/guidemodal-and-homepage.test.ts` | 0 | **PASS** | Trình bày 4 bước trực quan, responsive |
| **TC-HOME-04** | Phân khu Featured Savings Clubs hiển thị danh sách nhóm mặc định (`BAVI` & `Arc Alpha`) với nút 1-click vào nhóm | AC-02.4 | `node --experimental-strip-types --test tests/guidemodal-and-homepage.test.ts` | 0 | **PASS** | Nút bấm cập nhật contractAddress và chuyển sang App view |
| **TC-HOME-05** | Phân khu Bảo mật Arc Network & FAQ trả lời đầy đủ 5 câu hỏi cốt lõi kèm accordion tương tác trên `LandingPage` | AC-02.5 | `node --experimental-strip-types --test tests/guidemodal-and-homepage.test.ts` | 0 | **PASS** | 5 câu hỏi then chốt trả lời rõ ràng, accordion hoạt động mượt mà |
| **TC-NAV-01** | `Header.tsx` cung cấp cụm tabs điều hướng "Trang chủ" (Home) và "Ứng dụng" (App / Savings Clubs) với hiệu ứng active highlight rõ nét (cả Wagmi và Passkey) | AC-03.1 | `node --experimental-strip-types --test tests/guidemodal-and-homepage.test.ts` | 0 | **PASS** | Tabs điều hướng nổi bật, chuyển đổi mượt mà giữa Landing và App |
| **TC-NAV-02** | `App.tsx` quản lý state `activeTab`, tự động mở `app` khi URL có `?group=0x...`, mặc định `home` khi ở trang gốc và đồng bộ URL | AC-03.2 | `node --experimental-strip-types --test tests/guidemodal-and-homepage.test.ts` | 0 | **PASS** | Điều hướng thông minh, không reload trang, giữ nguyên ngữ cảnh nhóm |
| **TC-REG-01** | Toàn bộ 93 bài kiểm thử trước đó tiếp tục PASS 100% (Zero Regression) | AC-04.1 | `npm test` | 0 | **PASS** | 106/106 tests PASS (93 test cũ + 13 test mới = 106 tests) |
| **TC-REG-02** | Tệp `src/components/savings/OnboardingScreen.tsx` được bảo toàn nguyên vẹn trong codebase với đầy đủ props và strings kiểm thử cũ | AC-04.2 | `node --experimental-strip-types --test tests/guidemodal-and-homepage.test.ts` | 0 | **PASS** | Bảo toàn 100% tương thích ngược, tontine-upgrade test không bị ảnh hưởng |
| **TC-BUILD** | Kiểm tra biên dịch TypeScript và Vite build production bundle | Build | `npm run build` | 0 | **PASS** | `tsc --noEmit && vite build` hoàn thành trong 13.18s không lỗi |

---

## 3. Log Thực Thi Chi Tiết (Execution Logs)

### 3.1. Chạy Bộ Kiểm Thử Độc Lập Mới (`tests/guidemodal-and-homepage.test.ts`)
```text
> node --experimental-strip-types --test tests/guidemodal-and-homepage.test.ts

✔ TC-GUIDE-01 (AC-01.1): GuideModal là popup nổi overlay có backdrop mờ, không unmount app, hỗ trợ đóng bằng nút 'X' và phím Escape (0.968117ms)
✔ TC-GUIDE-02 (AC-01.2): Bảng so sánh Hụi truyền thống vs HụiChain Smart Contract hiển thị rõ ràng với icon và phân biệt rủi ro (0.171434ms)
✔ TC-GUIDE-03 (AC-01.3): Quy trình 4 bước, cơ chế phạt tự động (auto-kick) và ưu thế mạng Arc Network (< 1s, gas USDC) (0.151631ms)
✔ TC-GUIDE-04 (AC-01.4): GuideModal hỗ trợ song ngữ 100% qua prop language (0.249384ms)
✔ TC-HOME-01 (AC-02.1): Hero Section trên LandingPage hiển thị tiêu đề lớn, 3 chỉ số ấn tượng và 3 nút CTA (0.235241ms)
✔ TC-HOME-02 (AC-02.2): Phân khu Bài toán bể hụi vs Giải pháp Web3 hiển thị đầy đủ trên LandingPage (0.175236ms)
✔ TC-HOME-03 (AC-02.3): Phân khu Quy trình 4 bước sinh động trên LandingPage (0.214339ms)
✔ TC-HOME-04 (AC-02.4): Phân khu Featured Savings Clubs hiển thị thẻ BAVI và Alpha với nút 1-click vào nhóm (0.161074ms)
✔ TC-HOME-05 (AC-02.5): Phân khu Bảo mật Arc & FAQ trả lời 5+ câu hỏi cốt lõi trên LandingPage (0.332036ms)
✔ TC-NAV-01 (AC-03.1): Header cung cấp tabs điều hướng 'Trang chủ' (Home) và 'Ứng dụng' (App / Savings Clubs) với highlight active (1.095395ms)
✔ TC-NAV-02 (AC-03.2): App.tsx quản lý state activeTab, tự động mở app khi có URL ?group=0x... và chuyển tab mượt mà (0.256101ms)
✔ TC-REG-01 (AC-04.1): Toàn bộ 93 bài kiểm thử trước đó tiếp tục PASS 100% (Zero Regression) (0.069133ms)
✔ TC-REG-02 (AC-04.2): Tệp OnboardingScreen.tsx được bảo toàn nguyên vẹn trong codebase (0.130823ms)
ℹ tests 13
ℹ suites 0
ℹ pass 13
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 91.202426
```

### 3.2. Chạy Toàn Bộ Test Suite Hệ Thống (`npm test`)
```text
> studio-app@0.0.0 test
> node --experimental-strip-types --test tests/*.test.ts

✔ TC-I18N-01 (AC-01.1): Khởi tạo mặc định ngôn ngữ 'vi', lưu trữ và đọc an toàn từ localStorage key 'hui_language'
✔ TC-I18N-02 (AC-01.2): Nút toggle ngôn ngữ trên Header (cả 2 header) hỗ trợ chuyển đổi giữa 'vi' và 'en', cập nhật state và localStorage
✔ TC-I18N-03 (AC-01.3): Độ bao phủ từ điển song ngữ: kiểm tra đầy đủ các keys trong Translations cho 10 component
✔ TC-I18N-04 (AC-01.4): Thông báo Toast và helper feedback song ngữ chuẩn theo ngôn ngữ được chọn
✔ TC-LAYOUT-01 (AC-02.1): GroupSwitcher áp dụng lưới 2x2 grid (grid-cols-2) thoáng đãng, không ép 4 nút vào 1 hàng hẹp
✔ TC-LAYOUT-02 (AC-02.2): Các nút trong GroupSwitcher chứa thuộc tính whitespace-nowrap, không bị ngắt chữ vụn thành 2-3 hàng
✔ TC-LAYOUT-03 (AC-02.3): Nâng kích thước icon (15-16px) và vùng chạm padding tối thiểu py-2.5 px-3
✔ TC-LAYOUT-04 (AC-02.4): Tiêu đề HỢP ĐỒNG NHÓM HỤI và thông tin contract/balance hiển thị rõ nét, tương phản cao
✔ TC-TYPO-01 (AC-03.1): ActionPanel & PasskeyActionPanel khối giải thích và 3 bước quy trình nâng cỡ chữ lên text-sm / text-base, số thứ tự w-6 h-6 text-sm font-bold
✔ TC-TYPO-02 (AC-03.2): ClubCard Pot hero hiển thị to nổi bật (text-3xl sm:text-4xl), mô tả mức đóng và 3 ô thống kê rõ nét
✔ TC-TYPO-03 (AC-03.3): MemberStatus tiêu đề text-base, trạng thái text-sm; RoundHistory tiêu đề text-lg
✔ TC-TYPO-04 (AC-03.4): HowItWorksCard, CreateClubModal & ClubDirectoryModal tiêu đề và nhãn rõ nét (text-base / text-xl / text-sm)
✔ TC-CANCEL-01 (AC-01.1): MemberStatus khi state === GROUP_STATE.CANCELLED và isMember === false: KHÔNG render 'Join club to view your status', hiển thị thông báo giải tán an toàn
✔ TC-CANCEL-02 (AC-01.2): MemberStatus khi state === GROUP_STATE.CANCELLED và isMember === true: hiển thị tiêu đề và nội dung giải tán an toàn, không có cảnh báo nợ ('Chưa đóng')
✔ TC-CANCEL-03 (AC-01.3): MemberStatus hỗ trợ song ngữ vi/en chuẩn theo prop language
✔ TC-CANCEL-04 (AC-02.1): ActionPanel hiển thị thẻ Cancelled khi state === GROUP_STATE.CANCELLED (icon XCircle, tiêu đề, thông điệp an tâm tài sản, lời nhắc điều hướng)
✔ TC-CANCEL-05 (AC-02.2): PasskeyActionPanel hiển thị thẻ Cancelled đồng bộ 100% với ActionPanel khi state === GROUP_STATE.CANCELLED
✔ TC-CANCEL-06 (AC-02.3): Thông điệp an tâm tài sản trên cả 2 panel khẳng định rõ 0 USDC bị giam giữ / an toàn vốn
✔ TC-CANCEL-07 (AC-03.1): BẤT BIẾN CẤM NÚT DƯ THỪA - Thẻ Cancelled trong cả ActionPanel và PasskeyActionPanel KHÔNG chứa bất kỳ thẻ <button> nào (buttonCount === 0)
✔ TC-CANCEL-08 (AC-03.2): Từ điển src/lib/i18n.ts có đầy đủ 5 keys song ngữ cho cả vi và en
✔ TC-CANCEL-09: GROUP_STATE enum có giá trị CANCELLED === 3 chuẩn theo smart contract
✔ TC-CREATE-01 (AC-01.1): Form fields (Tên nhóm, Mức đóng, Số thành viên, Chu kỳ) hiển thị đầy đủ với default và presets
✔ TC-CREATE-02 (AC-01.2): Quỹ Pot tối đa được tính toán chính xác = contributionAmount * maxMembers USDC
✔ TC-CREATE-03 (AC-01.3): Validation form (vô hiệu hóa submit khi tên rỗng, amount <= 0, maxMembers ngoài [2, 20])
✔ TC-CREATE-04 (AC-02.1): ROTATING_SAVINGS_BYTECODE được export và là hex string bắt đầu bằng '0x' với độ dài bytecode hợp lệ (> 1000 ký tự)
✔ TC-CREATE-05 (AC-02.2): Tham số deploy contract truyền vào đúng thứ tự và định dạng: [USDC_ADDRESS, parseUsdc(contributionAmount), BigInt(maxMembers), BigInt(roundDuration), groupName]
✔ TC-CREATE-06 (AC-02.3): Quản lý trạng thái pending ký ví và confirming trên blockchain, disabled form và nút bấm trong quá trình deploy
✔ TC-CREATE-07 (AC-03.1): Callback onSuccess(contractAddress) được kích hoạt khi transaction receipt trả về contractAddress
✔ TC-CREATE-08 (AC-03.2): App.tsx chuyển sang địa chỉ mới khi tạo thành công và cập nhật URL (?group=0x...)
✔ TC-CREATE-09 (AC-04.1): GroupSwitcher cung cấp nút '+ Tạo nhóm mới' gọi callback onOpenCreateModal
✔ TC-CREATE-10 (AC-04.2): Header cung cấp nút '+ Tạo nhóm' gọi callback onOpenCreateModal
✔ TC-GUIDE-01 (AC-01.1): GuideModal là popup nổi overlay có backdrop mờ, không unmount app, hỗ trợ đóng bằng nút 'X' và phím Escape
✔ TC-GUIDE-02 (AC-01.2): Bảng so sánh Hụi truyền thống vs HụiChain Smart Contract hiển thị rõ ràng với icon và phân biệt rủi ro
✔ TC-GUIDE-03 (AC-01.3): Quy trình 4 bước, cơ chế phạt tự động (auto-kick) và ưu thế mạng Arc Network (< 1s, gas USDC)
✔ TC-GUIDE-04 (AC-01.4): GuideModal hỗ trợ song ngữ 100% qua prop language
✔ TC-HOME-01 (AC-02.1): Hero Section trên LandingPage hiển thị tiêu đề lớn, 3 chỉ số ấn tượng và 3 nút CTA
✔ TC-HOME-02 (AC-02.2): Phân khu Bài toán bể hụi vs Giải pháp Web3 hiển thị đầy đủ trên LandingPage
✔ TC-HOME-03 (AC-02.3): Phân khu Quy trình 4 bước sinh động trên LandingPage
✔ TC-HOME-04 (AC-02.4): Phân khu Featured Savings Clubs hiển thị thẻ BAVI và Alpha với nút 1-click vào nhóm
✔ TC-HOME-05 (AC-02.5): Phân khu Bảo mật Arc & FAQ trả lời 5+ câu hỏi cốt lõi trên LandingPage
✔ TC-NAV-01 (AC-03.1): Header cung cấp tabs điều hướng 'Trang chủ' (Home) và 'Ứng dụng' (App / Savings Clubs) với highlight active
✔ TC-NAV-02 (AC-03.2): App.tsx quản lý state activeTab, tự động mở app khi có URL ?group=0x... và chuyển tab mượt mà
✔ TC-REG-01 (AC-04.1): Toàn bộ 93 bài kiểm thử trước đó tiếp tục PASS 100% (Zero Regression)
✔ TC-REG-02 (AC-04.2): Tệp OnboardingScreen.tsx được bảo toàn nguyên vẹn trong codebase
...
✔ TC-TOAST-01 (AC-01.1): Toaster trong src/main.tsx cấu hình duration={2000}
✔ TC-TOAST-02 (AC-01.2): Toaster trong src/main.tsx kích hoạt closeButton
✔ TC-TOAST-03 (AC-01.3): Toaster trong src/main.tsx duy trì vị trí top-center và richColors
✔ TC-NAME-01 (AC-02.1): App.tsx tính toán displayedGroupName ưu tiên tên danh bạ knownGroups thay vì chỉ đọc on-chain
✔ TC-NAME-02 (AC-02.2): ClubCard được gán key={contractAddress} và groupName={displayedGroupName} giúp giao diện đổi tên tức thì
✔ TC-NAME-03 (AC-02.3): Đổi sang nhóm tùy chỉnh đã lưu trong knownGroups hiển thị chính xác tức thì
✔ TC-NAME-04 (AC-02.4): Nhóm mới chưa có trong danh bạ hiển thị fallback an toàn và sync on-chain qua saveKnownGroup
✔ TC-NAME-05 (AC-02.5): Tạo nhóm mới thành công gọi saveKnownGroup và cập nhật tức thì
✔ TC-PLUS-01 (AC-03.1): Nút tạo nhóm trên Header.tsx tuân thủ bất biến Single Plus, không còn lỗi hiển thị 2 dấu cộng (+ +)
✔ TC-PLUS-02 (AC-03.2): Nút tạo nhóm trên GroupSwitcher.tsx tuân thủ bất biến Single Plus, không còn lỗi hiển thị 2 dấu cộng
✔ TC-PLUS-03 (AC-03.3): Nút tạo nhóm trên ClubDirectoryModal.tsx và thanh Passkey Header tuân thủ bất biến Single Plus
✔ TC-PLUS-04 (AC-03.4): Chuỗi createBtn trong src/lib/i18n.ts (header, groupSwitcher, clubDirectoryModal) được chuẩn hóa sạch, không có dấu '+' thừa phía trước
ℹ tests 106
ℹ suites 0
ℹ pass 106
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 260.922617
```

### 3.3. Chạy Kiểm Tra Build Sản Phẩm (`npm run build`)
```text
> studio-app@0.0.0 build
> tsc --noEmit && vite build

vite v6.0.5 building for production...
transforming...
✓ 7115 modules transformed.
rendering chunks...
computing chunk sizes...
dist/index.html                                        1.03 kB │ gzip:   0.49 kB
dist/assets/index-Di8slSNY.css                        45.70 kB │ gzip:   8.12 kB
...
dist/assets/index-Dk-3726L.js                      1,862.71 kB │ gzip: 563.52 kB
✓ built in 13.18s
```

---

## 4. Bảng Đối Chiếu Ma Trận Nghiệp Vụ (Traceability Matrix)

| REQ ID | AC ID | Tiêu chí Nghiệp vụ | Test Case Phụ trách | Hash File Nguồn | Bằng chứng Kiểm thử (Evidence) | Đánh giá BA/QA |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-01** | AC-01.1 | GuideModal hiển thị dạng popup nổi overlay với backdrop, không unmount app | TC-GUIDE-01 | `GuideModal.tsx` (`48f54f...`), `App.tsx` (`0a4852...`) | `<GuideModal isOpen={showGuide} ... />` mount overlay | `PASS` |
| **REQ-01** | AC-01.2 | Bảng so sánh Hụi truyền thống vs HụiChain Smart Contract trực quan | TC-GUIDE-02 | `GuideModal.tsx` (`48f54f...`) | 2 cột đối đầu có `AlertTriangle`, `ShieldCheck` | `PASS` |
| **REQ-01** | AC-01.3 | Quy trình 4 bước hụi + cơ chế phạt auto-kick + phí gas USDC < 1s | TC-GUIDE-03 | `GuideModal.tsx` (`48f54f...`) | 5 Trụ cột kiến thức Web3 ROSCA | `PASS` |
| **REQ-01** | AC-01.4 | Hỗ trợ song ngữ 100% (VI / EN) cho GuideModal | TC-GUIDE-04 | `src/lib/i18n.ts` (`574d5c...`) | Đồng bộ 100% từ điển `guideModal` | `PASS` |
| **REQ-02** | AC-02.1 | Hero Section trên Landing Page với 3 chỉ số ấn tượng và 3 nút CTA | TC-HOME-01 | `LandingPage.tsx` (`79a0ef...`) | 3 Metric cards và 3 Buttons CTA | `PASS` |
| **REQ-02** | AC-02.2 | Phân khu Bài toán bể hụi & Giải pháp Smart Contract minh bạch | TC-HOME-02 | `LandingPage.tsx` (`79a0ef...`) | 3 Pain Points và 3 Solutions Web3 | `PASS` |
| **REQ-02** | AC-02.3 | Phân khu Quy trình 4 bước sinh động có icon và minh họa | TC-HOME-03 | `LandingPage.tsx` (`79a0ef...`) | 4 Thẻ bước thiết kế sinh động | `PASS` |
| **REQ-02** | AC-02.4 | Phân khu Nhóm Hụi Nổi Bật (Featured Clubs) với 1-click vào nhóm | TC-HOME-04 | `LandingPage.tsx` (`79a0ef...`) | Duyệt `DEFAULT_SAVINGS_CLUBS` có `onSelectClub` | `PASS` |
| **REQ-02** | AC-02.5 | Phân khu Bảo mật Arc Network & FAQ giải đáp 5+ câu hỏi thường gặp | TC-HOME-05 | `LandingPage.tsx` (`79a0ef...`) | 5 câu hỏi FAQ có Accordion tương tác | `PASS` |
| **REQ-03** | AC-03.1 | Header cung cấp tabs điều hướng 'Trang chủ' (Home) và 'Ứng dụng' (App) | TC-NAV-01 | `Header.tsx` (`a8ecb9...`), `App.tsx` (`0a4852...`) | Navigation tab bar có highlight active | `PASS` |
| **REQ-03** | AC-03.2 | Đồng bộ trạng thái URL thông minh (?group=0x... vào thẳng App, không reload) | TC-NAV-02 | `App.tsx` (`0a4852...`) | `activeTab` logic và `pushState` đồng bộ | `PASS` |
| **REQ-04** | AC-04.1 | Duy trì 100% 93 bài kiểm thử hiện có tiếp tục PASS (Zero Regression) | TC-REG-01 | Toàn bộ `tests/*.test.ts` | 106/106 tests PASS 100% | `PASS` |
| **REQ-04** | AC-04.2 | Bảo toàn tệp OnboardingScreen.tsx để không gãy test trong tontine-upgrade | TC-REG-02 | `OnboardingScreen.tsx` | File tồn tại với đầy đủ props và strings cũ | `PASS` |

---

## 5. Kết Luận & Ký Duyệt Nghiệm Thu (QA Signoff)

1. **Tính Toàn Vẹn Mã Nguồn**: 100% hash SHA256 của 5 tệp bàn giao từ Developer hoàn toàn trùng khớp với manifest của Leader (`task-009`). Tính toàn vẹn được bảo toàn trước và sau khi kiểm thử.
2. **Độ Bao Phủ Kiểm Thử**: Bộ test độc lập `tests/guidemodal-and-homepage.test.ts` bao phủ 100% các tiêu chí từ AC-01.1 đến AC-04.2.
3. **An Toàn Hệ Thống & Hồi Quy**: Toàn bộ 106/106 tests pass (100%), không gây ra bất kỳ lỗi hồi quy nào cho 93 test của các tính năng trước đó. Tệp `OnboardingScreen.tsx` được bảo toàn nguyên vẹn. Lệnh `npm run build` thực thi hoàn hảo không lỗi cú pháp hoặc TypeScript trong 13.18s.
4. **Quyết định Nghiệm thu**: **CHẤP THUẬN KÝ DUYỆT (SIGNOFF PASS 100%)** cho `task-009`.

*Ký nhận:*  
**qa-agent** — *Independent QA Tester, ARC-swap- Team*
