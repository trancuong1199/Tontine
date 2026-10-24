# Báo Cáo Kiểm Thử Độc Lập (QA Test Report): Quỹ Đạo Vệ Tinh Đồng Hành Toàn Trang Cố Định Theo Khung Nhìn (Continuous Viewport Orbital Companion) & Chuyển Động Cuộn Trang Liên Tục Qua Mọi Phân Khu

**Task ID**: `task-029`  
**Dispatch ID**: `dispatch-029-qa`  
**Tester độc lập**: `qa-agent`  
**Ngày kiểm thử**: `2026-10-15`  
**Mã băm đóng băng (Frozen SHA-256)**: `d9a322641f3b9a76d711bb31a3941e81b2a6bd79e7bb2087e43452b7057cea0f` (`src/components/landing/LandingPage.tsx`)  
**Kết quả tổng quan**: **308/308 PASS (100%)** — Không phát sinh bất kỳ lỗi hồi quy nào.  
**Quyết định**: **APPROVED & SIGNOFF (Gate 3 Passed)**  

---

## 1. Mục Tiêu & Cơ Sở Kiểm Thử

Kiểm định độc lập tính năng đáp ứng yêu cầu người dùng:
> *"nhưng khi tôi scroll thì ở dưới này vẫn k có gì, tôi muốn nó di chuyển theo khi scroll nữa https://capture.avada.io/i/mogBjT49b659"*

Bao gồm:
1. **Lớp quỹ đạo đồng hành khung nhìn (Continuous Viewport Orbital Companion Layer)**: Đảm bảo hai dải quỹ đạo đồng tâm nét đứt và 8 biểu tượng hệ sinh thái luôn hiển thị ở hai biên trái/phải của màn hình khi người dùng cuộn chuột qua Section 2, 3, 4, 5, 6; không bị trôi mất hay để lại khoảng đen trống trải như ảnh `mogBjT49b659.webp`.
2. **Chuyển động quỹ đạo cuộn trang liên tục (Full-Page Continuous Scroll Gliding)**: Các icon tiếp tục dịch chuyển mượt mà dọc theo cung quỹ đạo Bezier khi người dùng cuộn từ đỉnh trang xuống chân trang.
3. **Kiểm chứng thực nghiệm trực quan qua BrowserSkill (`bsk`)**: Kết nối trực tiếp trình duyệt Chromium thực tế, cuộn chuột và chụp ảnh màn hình lưu vào hệ thống làm bằng chứng nghiệm thu.
4. **Bảo toàn bất biến Zero-Regression**: Toàn bộ 299 test cũ tiếp tục PASS 100%.

---

## 2. Kiểm Tra Mã Băm Toàn Vẹn (SHA-256 Manifest Verification)

- **Trước khi chạy test**:
  ```bash
  $ node scripts/manifest-tool.mjs verify task-029
  [Verify] Verifying manifest for Task: task-029 (Frozen at: 2026-10-15T02:31:35.651Z)
  [MATCH] src/components/landing/LandingPage.tsx (d9a322641f3b9a76...)
  All files verified successfully! Integrity confirmed.
  ```
- **Sau khi chạy test**:
  ```bash
  $ node scripts/manifest-tool.mjs verify task-029
  [Verify] Verifying manifest for Task: task-029 (Frozen at: 2026-10-15T02:31:35.651Z)
  [MATCH] src/components/landing/LandingPage.tsx (d9a322641f3b9a76...)
  All files verified successfully! Integrity confirmed.
  ```

---

## 3. Kết Quả Kiểm Thử Tự Động (Automated Test Execution)

Tệp kiểm thử mới: `tests/continuous-viewport-orbital-companion.test.ts` (9 test cases mới).  
Toàn bộ test suite dự án: `308 tests` (299 tests cũ + 9 tests mới).

| Test Case ID | Tiêu Chí Nghiệm Thu (AC) | Trọng Tâm Kiểm Thử | Trạng Thái | Thời Gian |
| :--- | :--- | :--- | :--- | :--- |
| **TC-FIXED-01** | AC-01.1 | Viewport-Fixed Companion Layer bọc hai cánh quỹ đạo tại `fixed inset-0 pointer-events-none z-20 overflow-hidden` trước Hero Section | **PASS** | 0.81 ms |
| **TC-FIXED-02** | AC-01.2 | Bảo toàn cấu trúc SVG viewBox `0 0 500 750`, cung nét đứt `strokeDasharray="6, 8"` & `"5, 7"`, sao vàng phát sáng | **PASS** | 0.94 ms |
| **TC-FIXED-03** | AC-01.3 | Giữ nguyên thẻ compatibility anchor `<div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true"></div>` | **PASS** | 0.35 ms |
| **TC-FIXED-04** | AC-01.4 | Toàn bộ tương tác click/touch không bị che khuất nhờ `pointer-events-none` và căn sát hai biên ngoài `max-w-7xl` | **PASS** | 0.42 ms |
| **TC-GLIDE-01** | AC-02.1 | Công thức `continuousScrollDelta = Math.min(0.16, Math.max(0, (scrollY / 2400) * 0.16))` mở rộng toàn tài liệu | **PASS** | 0.39 ms |
| **TC-GLIDE-02** | AC-02.2 | 8 icon kết hợp đồng thời `scrollOffset` và `continuousScrollDelta` di chuyển dọc theo cung Bezier | **PASS** | 0.51 ms |
| **TC-GLIDE-03** | AC-02.3 | Mô phỏng toán học vị trí icon tại `scrollY = 0`, `600`, `1200` chứng minh tọa độ dịch chuyển liên tục và đối xứng gương | **PASS** | 0.46 ms |
| **TC-GLIDE-04** | AC-02.4 | Ràng buộc an toàn tham số $t$ trong khoảng $[0.04, 0.96]$ không làm icon văng khỏi đường vẽ | **PASS** | 0.28 ms |
| **TC-MANIFEST-01**| AC-04.2 | Manifest verification cho task-029 trạng thái FROZEN và mã băm SHA256 64 ký tự | **PASS** | 0.32 ms |

**Tóm tắt kết quả chạy toàn bộ test runner (`npm test`)**:
```
ℹ tests 308
ℹ suites 0
ℹ pass 308
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2386.015881
```

---

## 4. Bằng Chứng Thực Nghiệm Trực Quan Qua BrowserSkill (`bsk`)

Sử dụng phiên BrowserSkill CLI kết nối trực tiếp với instance Chromium `d80cd412` của người dùng:
- **Lớp quỹ đạo thực tế tại runtime**:
  - `div.fixed.z-20`: `position: fixed`, `width: 1702px`, `height: 793px`, `top: 0`, `bottom: 793px`, `z-index: 20`.
  - Cánh trái: `width: 500px`, `height: 750px`, `top: 21.5px`, `left: 0`.
  - Cánh phải: `width: 500px`, `height: 750px`, `top: 21.5px`, `left: 1202px`.
  - Hai cánh được căn giữa trục dọc hoàn hảo theo khung nhìn (viewport), đóng khung hai biên trái/phải toàn bộ màn hình.
- **Tọa độ dịch chuyển động của icon theo độ sâu cuộn trang**:
  - Tại `scrollY = 600px` (Section 2 - đối chứng ảnh lỗi `mogBjT49b659.webp`):
    - `PiggyBank`: $(x=133.3, y=136.7)$
    - `Users`: $(x=233.3, y=333.2)$
    - `RefreshCw`: $(x=214.1, y=494.4)$
    - `Calendar`: $(x=124.7, y=608.2)$
  - Tại `scrollY = 1400px` (Section 3 & 4):
    - `PiggyBank`: $(x=157.0, y=162.5)$ — lướt tiếp dọc cung cong!
    - `Users`: $(x=236.0, y=361.0)$ — lướt tiếp dọc cung cong!
    - `RefreshCw`: $(x=222.4, y=472.6)$ — lướt tiếp dọc cung cong!
    - `Calendar`: $(x=147.9, y=587.9)$ — lướt tiếp dọc cung cong!

### Bằng Chứng Ảnh Chụp Màn Hình (Artifacts)
1. **Ảnh Hero Section (`scrollY = 0`)**:  
   [screenshot-task029-hero.png](file:///home/avada/.gemini/antigravity-cli/brain/d739f6c6-f85d-4942-b153-db57d5f85e9a/screenshot-task029-hero.png) — Quỹ đạo và 8 icon hiển thị rực rỡ, cân đối ở hai cánh.
2. **Ảnh Section 2 (*"The Pain of Traditional Tontines & HụiChain's Solution"*) lúc `scrollY = 600`)**:  
   [screenshot-task029-section2.png](file:///home/avada/.gemini/antigravity-cli/brain/d739f6c6-f85d-4942-b153-db57d5f85e9a/screenshot-task029-section2.png) — **Khắc phục triệt để lỗi của người dùng trong ảnh `mogBjT49b659.webp`**: Hai biên trái và phải giờ đây luôn có hai cánh quỹ đạo đồng tâm nét đứt và 4 icon mỗi bên lướt dọc theo khung nhìn.
3. **Ảnh Section 3 (*"Cách Thức Hoạt Động 4 Bước Đơn Giản"*) lúc `scrollY = 1400`)**:  
   [screenshot-task029-section3.png](file:///home/avada/.gemini/antigravity-cli/brain/d739f6c6-f85d-4942-b153-db57d5f85e9a/screenshot-task029-section3.png) — Quỹ đạo tiếp tục đồng hành mượt mà suốt chiều dài trang web.

---

## 5. Kết Luận & Ký Duyệt Sign-off (Gate 3)

- **Độ tin cậy mã nguồn**: Bất biến SHA-256 được bảo toàn nguyên vẹn 100%.
- **Chất lượng kiểm thử**: 308/308 tests pass (100%), không gây ra bất kỳ regression nào.
- **Bằng chứng thị giác**: Xác thực bằng ảnh chụp màn hình thực tế qua BrowserSkill.
- **Ký duyệt nghiệm thu (Gate 3 Sign-off)**: **qa-agent** — `2026-10-15`
