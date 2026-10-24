# Báo Cáo Kiểm Thử Độc Lập: Tối Ưu & Dọn Dẹp URL Sạch (Clean URL for Homepage & App Navigation)

**Task ID**: `task-010`  
**Dispatch ID**: `dispatch-010-qa`  
**Tester**: `qa-agent` (Tester độc lập)  
**Spec Version kiểm tra**: `docs/ba/task-010/spec-v1.0.md` (`v1.0`)  
**Manifest kiểm tra**: `docs/manifests/task-010/manifest.json`  
**Thời điểm kiểm tra**: `2026-10-09 16:34:00`  
**Trạng thái**: `PASS (Signoff 100%)`  

---

## 1. Kiểm Tra Tính Toàn Vẹn Mã Nguồn (SHA256 Integrity Verification)

- **Manifest bàn giao từ Leader / Developer**: `docs/manifests/task-010/manifest.json` (Thời điểm đóng băng: `2026-10-09T09:31:09.294Z`)
- **Lệnh thực thi kiểm tra trước và sau test**:
  ```bash
  node scripts/manifest-tool.mjs verify task-010
  ```
- **Kết quả kiểm tra trước khi test**: `MATCH (100% khớp)`
- **Kết quả kiểm tra sau khi test**: `MATCH (100% khớp)`
- **Bảng đối chiếu SHA256 chi tiết cho tệp bàn giao trong manifest**:

| File Path | SHA256 Manifest | Trạng thái trước test | Trạng thái sau test | Đánh giá |
| :--- | :--- | :--- | :--- | :--- |
| `src/App.tsx` | `5c30c2cb53320667e6c2a46a5ee4f0cea7845876e2f8ef7f29ddb8096bcd24e3` | MATCH | MATCH | Toàn vẹn 100% |

- **Cam kết**: Tester độc lập tuyệt đối không chỉnh sửa bất kỳ dòng mã implementation nào trong các tệp thuộc manifest của Developer.

---

## 2. Kịch Bản Kiểm Thử Độc Lập & Kết Quả Thực Thi (Test Matrix)

Bộ kiểm thử độc lập được thiết kế tại [tests/clean-url-navigation.test.ts](file:///home/avada/tontine/tests/clean-url-navigation.test.ts), bao phủ toàn diện các tiêu chí nghiệm thu (AC-01.1 đến AC-03.2) từ bản đặc tả [docs/ba/task-010/spec-v1.0.md](file:///home/avada/tontine/docs/ba/task-010/spec-v1.0.md):

| Mã Test | Mô tả Kịch bản Kiểm thử | AC Liên quan | Lệnh thực thi | Exit Code | Kết quả | Đánh giá |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-URL-01** | Khi chọn tab 'home' (`handleSelectTab('home')`), `App.tsx` xóa bỏ triệt để query parameters `view` và `group`, đưa URL về pathname gốc sạch sẽ `/` | AC-01.1 | `node --experimental-strip-types --test tests/clean-url-navigation.test.ts` | 0 | **PASS** | URL chuyển sạch về `/`, không còn tham số `view` hay `group` |
| **TC-URL-02** | Khi chọn tab 'app' (`handleSelectTab('app')`), `App.tsx` xóa tham số `view`, chỉ giữ lại tham số định danh nhóm `?group=0x...` và cập nhật pushState sạch | AC-01.2 / AC-02.1 | `node --experimental-strip-types --test tests/clean-url-navigation.test.ts` | 0 | **PASS** | URL lưu duy nhất `?group=0x...`, không còn `&view=app` rườm rà |
| **TC-URL-03** | Khi đổi nhóm (`handleSwitchGroup`), `App.tsx` xóa tham số `view`, gán `url.searchParams.set('group', newAddress)` và cập nhật pushState | AC-02.1 / AC-02.3 | `node --experimental-strip-types --test tests/clean-url-navigation.test.ts` | 0 | **PASS** | Đổi nhóm mượt mà, URL chuẩn `?group=0x...`, loại bỏ `view` |
| **TC-URL-04** | Bất biến URL sạch: URL tuyệt đối không bao giờ chứa chuỗi rườm rà `&view=home` hoặc `&view=app` khi điều hướng giữa các tab | AC-01.3 / AC-02.2 | `node --experimental-strip-types --test tests/clean-url-navigation.test.ts` | 0 | **PASS** | Loại bỏ hoàn toàn `url.searchParams.set('view', ...)` |
| **TC-URL-05** | Cơ chế tự động thanh lọc (Auto-sanitization) URL cũ bằng `replaceState`: Khi truy cập với `view=home` đưa về `/`, khi có `view=app` gỡ bỏ `view` | AC-01.2 / BR-03 | `node --experimental-strip-types --test tests/clean-url-navigation.test.ts` | 0 | **PASS** | Tự động dọn URL bookmark rác khi mount mà không reload trang |
| **TC-URL-06** | Điều hướng Back/Forward (`popstate` listener): Xử lý đúng khi URL không có query params (chuyển về home) và khi có group hợp lệ (chuyển về app) | AC-03.1 | `node --experimental-strip-types --test tests/clean-url-navigation.test.ts` | 0 | **PASS** | Browser History (Back/Forward) hoạt động chính xác và an toàn |
| **TC-REG-01** | Bảo toàn cấu trúc state `activeTab` và conditional rendering của `App.tsx` tương thích 100% với các test trước | AC-03.2 | `node --experimental-strip-types --test tests/clean-url-navigation.test.ts` | 0 | **PASS** | Tương thích toàn diện, không gãy hợp đồng giao diện |
| **TC-REG-SYS** | Toàn bộ 106 bài kiểm thử hiện có tiếp tục PASS 100% (Zero Regression) | AC-03.2 | `npm test` | 0 | **PASS** | 113/113 tests PASS (106 test cũ + 7 test mới = 113 tests) |
| **TC-BUILD** | Kiểm tra biên dịch TypeScript và Vite build production bundle | Build | `npm run build` | 0 | **PASS** | `tsc --noEmit && vite build` hoàn thành không lỗi (exit code 0) |

---

## 3. Log Thực Thi Chi Tiết (Execution Logs)

### 3.1. Chạy Bộ Kiểm Thử Độc Lập Mới (`tests/clean-url-navigation.test.ts`)
```text
> node --experimental-strip-types --test tests/clean-url-navigation.test.ts

✔ TC-URL-01 (AC-01.1): Khi chọn tab 'home' (handleSelectTab('home')), App.tsx xóa bỏ triệt để query parameters 'view' và 'group', đưa URL về pathname gốc sạch sẽ (3.123157ms)
✔ TC-URL-02 (AC-01.2): Khi chọn tab 'app' (handleSelectTab('app')), App.tsx xóa tham số 'view', chỉ giữ lại tham số định danh nhóm '?group=0x...' và pushState sạch (0.273716ms)
✔ TC-URL-03 (AC-02.1): Khi đổi nhóm (handleSwitchGroup), App.tsx xóa tham số 'view', gán url.searchParams.set('group', newAddress) và cập nhật pushState (0.312764ms)
✔ TC-URL-04 (AC-02.2): Bất biến URL sạch: URL tuyệt đối không bao giờ chứa chuỗi rườm rà '&view=home' hoặc '&view=app' khi điều hướng giữa các tab (1.168447ms)
✔ TC-URL-05 (AC-03.1): Cơ chế tự động thanh lọc (Auto-sanitization) URL cũ bằng replaceState: Khi truy cập với view=home đưa về '/', khi có view=app gỡ bỏ 'view' (0.469122ms)
✔ TC-URL-06 (AC-03.2): Điều hướng Back/Forward (popstate listener): Xử lý đúng khi URL không có query params (chuyển về home) và khi có group hợp lệ (chuyển về app) (0.20185ms)
✔ TC-REG-01: Bảo toàn hồi quy: Cấu trúc state activeTab và conditional rendering của App.tsx tiếp tục tương thích 100% với các test trước (0.193304ms)
ℹ tests 7
ℹ suites 0
ℹ pass 7
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 97.85456
```

### 3.2. Chạy Toàn Bộ Test Suite Hệ Thống (`npm test`)
```text
> studio-app@0.0.0 test
> node --experimental-strip-types --test tests/*.test.ts

✔ TC-GUIDE-02 (AC-01.2): Bảng so sánh Hụi truyền thống vs HụiChain Smart Contract hiển thị rõ ràng với icon và phân biệt rủi ro (0.353913ms)
✔ TC-GUIDE-03 (AC-01.3): Quy trình 4 bước, cơ chế phạt tự động (auto-kick) và ưu thế mạng Arc Network (< 1s, gas USDC) (0.30206ms)
✔ TC-GUIDE-04 (AC-01.4): GuideModal hỗ trợ song ngữ 100% qua prop language (0.507217ms)
✔ TC-HOME-01 (AC-02.1): Hero Section trên LandingPage hiển thị tiêu đề lớn, 3 chỉ số ấn tượng và 3 nút CTA (0.452687ms)
✔ TC-HOME-02 (AC-02.2): Phân khu Bài toán bể hụi vs Giải pháp Web3 hiển thị đầy đủ trên LandingPage (0.335857ms)
✔ TC-HOME-03 (AC-02.3): Phân khu Quy trình 4 bước sinh động trên LandingPage (0.419264ms)
✔ TC-HOME-04 (AC-02.4): Phân khu Featured Savings Clubs hiển thị thẻ BAVI và Alpha với nút 1-click vào nhóm (0.274595ms)
✔ TC-HOME-05 (AC-02.5): Phân khu Bảo mật Arc & FAQ trả lời 5+ câu hỏi cốt lõi trên LandingPage (0.586722ms)
✔ TC-NAV-01 (AC-03.1): Header cung cấp tabs điều hướng 'Trang chủ' (Home) và 'Ứng dụng' (App / Savings Clubs) với highlight active (1.583006ms)
✔ TC-NAV-02 (AC-03.2): App.tsx quản lý state activeTab, tự động mở app khi có URL ?group=0x... và chuyển tab mượt mà (0.478396ms)
✔ TC-REG-01 (AC-04.1): Toàn bộ 93 bài kiểm thử trước đó tiếp tục PASS 100% (Zero Regression) (0.14181ms)
✔ TC-REG-02 (AC-04.2): Tệp OnboardingScreen.tsx được bảo toàn nguyên vẹn trong codebase (0.251093ms)
✔ TC-OPEN-01: MemberStatus renders 'Chờ mở vòng 1' with Clock icon in OPEN state (AC-01.1) (1.434403ms)
...
✔ TC-URL-01 (AC-01.1): Khi chọn tab 'home' (handleSelectTab('home')), App.tsx xóa bỏ triệt để query parameters 'view' và 'group', đưa URL về pathname gốc sạch sẽ
✔ TC-URL-02 (AC-01.2): Khi chọn tab 'app' (handleSelectTab('app')), App.tsx xóa tham số 'view', chỉ giữ lại tham số định danh nhóm '?group=0x...' và pushState sạch
✔ TC-URL-03 (AC-02.1): Khi đổi nhóm (handleSwitchGroup), App.tsx xóa tham số 'view', gán url.searchParams.set('group', newAddress) và cập nhật pushState
✔ TC-URL-04 (AC-02.2): Bất biến URL sạch: URL tuyệt đối không bao giờ chứa chuỗi rườm rà '&view=home' hoặc '&view=app' khi điều hướng giữa các tab
✔ TC-URL-05 (AC-03.1): Cơ chế tự động thanh lọc (Auto-sanitization) URL cũ bằng replaceState: Khi truy cập với view=home đưa về '/', khi có view=app gỡ bỏ 'view'
✔ TC-URL-06 (AC-03.2): Điều hướng Back/Forward (popstate listener): Xử lý đúng khi URL không có query params (chuyển về home) và khi có group hợp lệ (chuyển về app)
✔ TC-REG-01: Bảo toàn hồi quy: Cấu trúc state activeTab và conditional rendering của App.tsx tiếp tục tương thích 100% với các test trước
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
ℹ tests 113
ℹ suites 0
ℹ pass 113
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 308.115717
```

### 3.3. Chạy Kiểm Tra Build Sản Phẩm (`npm run build`)
```text
> studio-app@0.0.0 build
> tsc --noEmit && vite build

vite v6.0.5 building for production...
transforming...
✓ 6760 modules transformed.
rendering chunks...
computing chunk sizes...
dist/index.html                                        1.03 kB │ gzip:   0.49 kB
dist/assets/index-Di8slSNY.css                        45.70 kB │ gzip:   8.12 kB
...
dist/assets/index-aFYWXgMC.js                      1,863.52 kB │ gzip: 563.66 kB
✓ built in 13.74s
```

### 3.4. Xác Nhận Tính Toàn Vẹn Mã Nguồn Sau Kiểm Thử
```text
> node scripts/manifest-tool.mjs verify task-010

[Verify] Verifying manifest for Task: task-010 (Frozen at: 2026-10-09T09:31:09.294Z)
[MATCH] src/App.tsx (5c30c2cb53320667...)

 All files verified successfully! Integrity confirmed.
```

---

## 4. Bảng Đối Chiếu Ma Trận Nghiệp Vụ (Traceability Matrix)

| REQ ID | AC ID | Tiêu chí Nghiệp vụ | Test Case Phụ trách | Hash File Nguồn | Bằng chứng Kiểm thử (Evidence) | Đánh giá BA/QA |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-01** | AC-01.1 | Chuyển từ App sang Trang chủ dọn sạch hoàn toàn URL về `/` | TC-URL-01 | `src/App.tsx` (`5c30c2cb...`) | `handleSelectTab('home')` xóa `view` & `group`, `pushState` về `cleanPath` (`/`) | `PASS` |
| **REQ-01** | AC-01.2 | Tự động thanh lọc URL cũ chứa `view=home` về `/` qua `replaceState` | TC-URL-05 | `src/App.tsx` (`5c30c2cb...`) | Mount effect nhận diện `view=home` gọi `history.replaceState` về pathname | `PASS` |
| **REQ-01** | AC-01.3 | Loại bỏ triệt để chuỗi `?group=0x...&view=home` trên thanh địa chỉ | TC-URL-04 | `src/App.tsx` (`5c30c2cb...`) | Xóa vĩnh viễn `url.searchParams.set('view', 'home')` khi đang có `group` | `PASS` |
| **REQ-02** | AC-02.1 | Chuyển sang Ứng dụng chỉ lưu `?group=0x...` (không có `&view=app`) | TC-URL-02 | `src/App.tsx` (`5c30c2cb...`) | `handleSelectTab('app')` xóa `view`, chỉ set `group = contractAddress` | `PASS` |
| **REQ-02** | AC-02.2 | Chọn nhóm từ thẻ Featured Club trên Trang chủ chuyển sang App với URL sạch `?group=0x...` | TC-URL-03, TC-URL-04 | `src/App.tsx` (`5c30c2cb...`) | `handleSwitchGroup` xóa `view`, set `group = newAddress`, không sinh `&view=app` | `PASS` |
| **REQ-02** | AC-02.3 | Đổi nhóm trong màn hình Ứng dụng duy trì URL sạch `?group=0x...` | TC-URL-03 | `src/App.tsx` (`5c30c2cb...`) | Đổi nhóm đẩy URL sạch `?group=${newAddress}` | `PASS` |
| **REQ-03** | AC-03.1 | Nút Back/Forward của trình duyệt (PopState) điều hướng chuẩn xác giữa `/` và `?group=0x...` | TC-URL-06 | `src/App.tsx` (`5c30c2cb...`) | `onPopState` listener điều hướng về `home` nếu rỗng, về `app` nếu có `group` | `PASS` |
| **REQ-03** | AC-03.2 | Toàn bộ 106 bài kiểm thử hiện có tiếp tục PASS 100% (Zero Regression) | TC-REG-01, TC-REG-SYS | Toàn bộ `tests/*.test.ts` | 113/113 tests PASS 100% (Zero regression) | `PASS` |

---

## 5. Kết Luận & Ký Duyệt Nghiệm Thu (QA Signoff)

1. **Tính Toàn Vẹn Mã Nguồn**: Hash SHA256 của tệp `src/App.tsx` hoàn toàn trùng khớp với manifest đóng băng của Leader (`task-010`). Tính toàn vẹn được bảo toàn nguyên vẹn 100% trước và sau khi kiểm thử độc lập.
2. **Độ Bao Phủ Kiểm Thử**: Bộ test độc lập `tests/clean-url-navigation.test.ts` bao phủ 100% các tiêu chí từ AC-01.1 đến AC-03.2 của đặc tả `docs/ba/task-010/spec-v1.0.md`.
3. **An Toàn Hệ Thống & Hồi Quy**: Toàn bộ 113/113 tests pass (100%), không phát sinh bất kỳ lỗi hồi quy nào cho 106 test trước đó. Lệnh `npm run build` (`tsc --noEmit && vite build`) hoàn thành thành công trong 13.74s không lỗi cú pháp hoặc cảnh báo nghiêm trọng.
4. **Quyết định Nghiệm thu**: **CHẤP THUẬN KÝ DUYỆT (SIGNOFF PASS 100%)** cho `task-010`.

*Ký nhận:*  
**qa-agent** — *Independent QA Tester, ARC-swap- Team*
