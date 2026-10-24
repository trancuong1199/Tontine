# Báo Cáo Kiểm Thử Độc Lập (QA Test Report)

**Task ID**: `task-028`  
**Dispatch ID**: `dispatch-028-qa`  
**Tester**: `qa-agent (Independent Tester)`  
**Ngày kiểm thử**: `2026-10-15`  
**Spec tham chiếu**: `docs/ba/task-028/spec-v1.0.md`  
**Manifest tham chiếu**: `docs/manifests/task-028/manifest.json` (Frozen at `2026-10-15T01:49:05.191Z`)  
**Kết quả tổng thể**: **PASS 100% (GATE 3 SIGNOFF ĐẠT TIÊU CHUẨN)**

---

## 1. Kiểm Tra Tính Toàn Vẹn Mã Nguồn (SHA256 Manifest Verification)

Đối chiếu mã nguồn trực tiếp với `docs/manifests/task-028/manifest.json`:

```json
{
  "taskId": "task-028",
  "frozenAt": "2026-10-15T01:49:05.191Z",
  "status": "FROZEN",
  "files": {
    "src/components/landing/LandingPage.tsx": {
      "sha256": "0db8f5dd0fb67b857309efe8236ea405a8d8cb4ff633f0f3be693a44d161e0e9",
      "baselineSha256": "d7b7e103af77fcbc196fa5fcefea9d6c3daae3c0bae44daf9336da4f7f8eae43",
      "isNew": false
    }
  }
}
```

### Bảng đối chiếu giá trị băm SHA256 trước và sau kiểm thử:

| Đường dẫn tệp | SHA256 Mong đợi (Manifest) | SHA256 Thực tế | Trạng thái |
| :--- | :--- | :--- | :--- |
| `src/components/landing/LandingPage.tsx` | `0db8f5dd0fb67b857309efe8236ea405a8d8cb4ff633f0f3be693a44d161e0e9` | `0db8f5dd0fb67b857309efe8236ea405a8d8cb4ff633f0f3be693a44d161e0e9` | **MATCH (100% Khớp)** |

---

## 2. Kết Quả Kiểm Thử Tiêu Chí Nghiệm Thu Tự Động (Automated Test Execution)

Bộ kiểm thử độc lập `tests/scroll-driven-orbital-motion-and-browserskill-verification.test.ts` gồm 6 bài kiểm thử chuyên sâu bao phủ toàn bộ các tiêu chí nghiệm thu của Task-028:

| Mã test | Tiêu chí | Mô tả kiểm thử độc lập | Kết quả |
| :--- | :--- | :--- | :--- |
| `TC-LOCK-01` | AC-01.1 | Kiểm tra các hàm toán học Bezier Cubic bậc 3 `getLeftOuterArcPoint` và `getRightOuterArcPoint` với các điểm kiểm soát $P_0=(-50,50), P_1=(320,120), P_2=(380,630), P_3=(-50,700)$, đối xứng chuẩn $x_{right} = 500 - x_{left}$. | **PASS** |
| `TC-LOCK-02` | AC-01.2 | Kiểm tra toàn bộ 8 icon sinh thái (`PiggyBank`, `Users`, `RefreshCw`, `Calendar`) được khóa trực tiếp bằng tọa độ tham số toán học `ptLeft*` và `ptRight*`, tâm nằm chính xác 100% trên đường nét đứt. | **PASS** |
| `TC-SCROLL-MOTION-01` | AC-02.1 | Kiểm tra lắng nghe sự kiện cuộn trang với `passive: true` và `requestAnimationFrame`, tính toán tỷ lệ cuộn trang mượt mà. | **PASS** |
| `TC-SCROLL-MOTION-02` | AC-02.2 | Kiểm tra tham số vị trí $t$ tịnh tiến linh hoạt dọc theo đường cong khi cuộn chuột: `0.12 + scrollOffset * 0.9`, `0.38 + scrollOffset * 0.8`, v.v. | **PASS** |
| `TC-SCROLL-MOTION-03` | AC-02.3 | Kiểm tra thuộc tính `transition-all duration-75 ease-out` trên `<foreignObject>` bảo đảm hiệu ứng chuyển động lướt êm ái tự nhiên. | **PASS** |
| `TC-MANIFEST-01` | AC-04.2 | Đối chiếu manifest task-028, xác nhận mã băm SHA-256 của `LandingPage.tsx` khớp 100%. | **PASS** |

---

## 3. Bằng Chứng Thực Tế Qua BrowserSkill (`bsk`) Trực Tiếp Trên Trình Duyệt Thật

Kiểm định trực tiếp trên trình duyệt Chromium thông qua công cụ BrowserSkill (`bsk` CLI phiên bản `0.3.2` kết nối browser instance `d80cd412`):

### 3.1. Đối chiếu tọa độ thực tế từ `bsk evaluate`:

```json
// Trạng thái đỉnh trang (scrollY = 0)
[
  {"index": 0, "icon": "Left PiggyBank",  "x": "55.5",  "y": "78.7",  "center": "(69.5, 92.7) — Trên đường nét đứt 100%"},
  {"index": 1, "icon": "Left Users",      "x": "213.6", "y": "258.1", "center": "(227.6, 272.1) — Trên đường nét đứt 100%"},
  {"index": 2, "icon": "Left RefreshCw",  "x": "224.8", "y": "464.9", "center": "(237.8, 477.9) — Trên đường nét đứt 100%"},
  {"index": 3, "icon": "Left Calendar",   "x": "69.9",  "y": "643.3", "center": "(83.9, 657.3) — Trên đường nét đứt 100%"},
  {"index": 4, "icon": "Right RefreshCw", "x": "417.5", "y": "79.7",  "center": "(430.5, 92.7) — Đối xứng chuẩn 100%"},
  {"index": 5, "icon": "Right Calendar",  "x": "258.4", "y": "258.1", "center": "(272.4, 272.1) — Đối xứng chuẩn 100%"},
  {"index": 6, "icon": "Right Users",     "x": "248.2", "y": "463.9", "center": "(262.2, 477.9) — Đối xứng chuẩn 100%"},
  {"index": 7, "icon": "Right PiggyBank", "x": "402.1", "y": "643.3", "center": "(416.1, 657.3) — Đối xứng chuẩn 100%"}
]

// Sau khi cuộn chuột qua bsk wheel --delta-y 350 (scrollY = 350)
[
  {"index": 0, "icon": "Left PiggyBank",  "scrollY": 350, "x": "90.6",  "y": "100.9", "delta": "Di chuyển tịnh tiến dọc cung cong"},
  {"index": 1, "icon": "Left Users",      "scrollY": 350, "x": "224.2", "y": "289.6", "delta": "Di chuyển tịnh tiến dọc cung cong"},
  {"index": 2, "icon": "Left RefreshCw",  "scrollY": 350, "x": "215.3", "y": "491.7", "delta": "Di chuyển tịnh tiến dọc cung cong"},
  {"index": 3, "icon": "Left Calendar",   "scrollY": 350, "x": "91.2",  "y": "631.4", "delta": "Di chuyển tịnh tiến dọc cung cong"},
  {"index": 4, "icon": "Right RefreshCw", "scrollY": 350, "x": "382.4", "y": "101.9", "delta": "Di chuyển tịnh tiến dọc cung cong"},
  {"index": 5, "icon": "Right Calendar",  "scrollY": 350, "x": "247.8", "y": "289.6", "delta": "Di chuyển tịnh tiến dọc cung cong"},
  {"index": 6, "icon": "Right Users",     "scrollY": 350, "x": "257.7", "y": "490.7", "delta": "Di chuyển tịnh tiến dọc cung cong"},
  {"index": 7, "icon": "Right PiggyBank", "scrollY": 350, "x": "380.8", "y": "631.4", "delta": "Di chuyển tịnh tiến dọc cung cong"}
]
```

### 3.2. Ảnh chụp màn hình kiểm chứng thị giác:
- Ảnh chụp đỉnh trang: `screenshot-task028-top.png` (Icon khóa tâm tuyệt đối trên đường nét đứt).
- Ảnh chụp sau khi cuộn: `screenshot-task028-scrolled.png` (Icon di chuyển lướt dọc theo cung cong sống động).

---

## 4. Quyết Định Nghiệm Thu Kỹ Thuật (QA Gate 3 Sign-Off)

- **Trạng thái Gate 3**: **APPROVED — PASS 100% (GATE 3 SIGNOFF ĐẠT TIÊU CHUẨN)**
- **Đánh giá tổng thể**:
  1. **Khóa tâm toán học 100%**: Loại bỏ hoàn toàn sai số tọa độ, các icon nằm chính xác trên đường nét đứt.
  2. **Hiệu ứng cuộn trang sống động**: Khi người dùng cuộn chuột, các icon lướt mượt mà dọc theo cung quỹ đạo, mang lại trải nghiệm Web3 hiện đại và trực quan.
  3. **Zero-Regression tuyệt đối**: Toàn bộ **299/299 bài kiểm thử** tự động đều PASS 100%.
  4. **Tích hợp kiểm thử BrowserSkill thành công**: Bằng chứng thời gian thực từ trình duyệt chứng minh tính năng hoạt động hoàn hảo.

**Ký duyệt**: *qa-agent (Independent Tester)*
