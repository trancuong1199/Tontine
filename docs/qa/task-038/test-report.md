# Báo Cáo Kiểm Thử Độc Lập (QA Test Report) — Task-038

## Chuẩn Hóa Hiển Thị Quỹ Pot Giai Đoạn Đăng Ký (Accurate Hero Pot Display During Registration Phase)

- **Task ID**: `task-038`
- **Người thực hiện kiểm thử**: Independent Tester (`qa-agent`)
- **Ngày kiểm thử**: `2026-10-21`
- **Tài liệu tham chiếu**:
  - Đặc tả kỹ thuật: [`docs/ba/task-038/spec-v1.0.md`](file:///home/avada/tontine/docs/ba/task-038/spec-v1.0.md)
  - Mã băm đóng băng (Manifest): [`docs/manifests/task-038/manifest.json`](file:///home/avada/tontine/docs/manifests/task-038/manifest.json)
  - Bộ kiểm thử mới: [`tests/open-phase-pot-display.test.ts`](file:///home/avada/tontine/tests/open-phase-pot-display.test.ts)
  - Bằng chứng thực tế: Ảnh chụp lỗi màn hình từ người dùng [`zMfuVfTF282L.webp`](file:///home/avada/.gemini/antigravity-cli/brain/d739f6c6-f85d-4942-b153-db57d5f85e9a/zMfuVfTF282L.webp)
- **Kết luận chung**: **PASS & SIGNOFF (Gate 3)**

---

## 1. Xác Minh Tính Toàn Vẹn Mã Nguồn (SHA256 Manifest Integrity)

Công cụ `scripts/manifest-tool.mjs` được thực thi trước và sau khi chạy test để đối chiếu với mã băm đã đóng băng:

```bash
$ node scripts/manifest-tool.mjs verify task-038
[Verify] Verifying manifest for Task: task-038 (Frozen at: 2026-10-21T07:20:01.404Z)
[MATCH] src/lib/i18n.ts (6e1872dc53115033...)
[MATCH] src/components/savings/ClubCard.tsx (004e97e1d1d71aca...)

 All files verified successfully! Integrity confirmed.
```

- **Mã băm trước kiểm thử**: `MATCH 100%` (Exit Code 0)
- **Mã băm sau kiểm thử**: `MATCH 100%` (Exit Code 0)
- **Tính toàn vẹn mã nguồn**: Hoàn toàn không bị sửa đổi trong suốt quá trình chạy kiểm thử độc lập.

---

## 2. Kết Quả Kiểm Thử Chi Tiết Từng Tiêu Chí Nghiệm Thu

| Test ID | AC Tham Chiếu | Mục Tiêu & Mô Tả Kiểm Thử | Kết Quả Thực Tế | Exit Code | Đánh Giá |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TC-POT-01` | **AC-01.1** | `Translations.clubCard` khai báo đầy đủ `heroPotOpenLabel` và `roundNotStartedBadge`. | PASS (0.5ms) | 0 | **ĐẠT** |
| `TC-POT-02` | **AC-01.2** | Bản dịch tiếng Việt `translations.vi.clubCard` có `heroPotOpenLabel` = "Tổng Pot vòng này (Chưa mở vòng)" và `roundNotStartedBadge` = "Chưa mở vòng". | PASS (0.4ms) | 0 | **ĐẠT** |
| `TC-POT-03` | **AC-01.3** | Bản dịch tiếng Anh `translations.en.clubCard` có `heroPotOpenLabel` = "Total Pot this round (Not started)" và `roundNotStartedBadge` = "Round not started". | PASS (0.4ms) | 0 | **ĐẠT** |
| `TC-POT-04` | **AC-01.4** | So khớp key parity 100% giữa `vi` và `en` trong `i18n.ts`, không thiếu sót key nào. | PASS (0.3ms) | 0 | **ĐẠT** |
| `TC-POT-05` | **AC-02.1** | `ClubCard.tsx` tính toán `potSize = state === GROUP_STATE.OPEN ? 0n : contributionAmount * activeMembers`. | PASS (0.5ms) | 0 | **ĐẠT** |
| `TC-POT-06` | **AC-02.2** | Khi `state === GROUP_STATE.OPEN`, `potSize` trả về `0n` và `formatUsdc(potSize)` hiển thị chuẩn xác `0.00` USDC (kể cả khi đã có 1 hoặc nhiều người join). | PASS (0.6ms) | 0 | **ĐẠT** |
| `TC-POT-07` | **AC-02.3** | `ClubCard.tsx` hiển thị nhãn `heroPotOpenLabel` và huy hiệu `roundNotStartedBadge` nổi bật trong khu vực Hero Pot khi `state === GROUP_STATE.OPEN`. | PASS (0.4ms) | 0 | **ĐẠT** |
| `TC-POT-08` | **AC-02.4** | Khi `state === GROUP_STATE.ACTIVE`, `potSize` tiếp tục phản ánh quy mô pot vòng theo số thành viên (`contributionAmount * activeMembers`). | PASS (0.5ms) | 0 | **ĐẠT** |
| `TC-POT-09` | **AC-03.1** | Toàn bộ 370 bài kiểm thử cũ tiếp tục PASS 100% (Zero Regression). | PASS (370/370) | 0 | **ĐẠT** |
| `TC-POT-10` | **AC-03.2** | Toàn bộ 8 bài test mới trong `tests/open-phase-pot-display.test.ts` PASS 100%. | PASS (8/8) | 0 | **ĐẠT** |
| `TC-POT-11` | **AC-03.3** | Quá trình build production `npm run build` thực thi thành công không lỗi TypeScript hay đóng gói bundle. | PASS (Exit 0) | 0 | **ĐẠT** |

---

## 3. Tổng Hợp Kết Quả Thực Thi Hệ Thống

```bash
$ npm test
ℹ tests 378
ℹ suites 0
ℹ pass 378
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 6164.226857
```

- **Tổng số test cases**: 378 tests
- **Số lượng Passed**: 378 / 378 (100%)
- **Số lượng Failed**: 0
- **Regression**: 0%
- **Production Build (`npm run build`)**: Thành công (Exit 0).

---

## 4. Kết Luận & Ký Duyệt

Bộ kiểm thử độc lập xác nhận:
1. Hiện tượng hiển thị sai lệch `Total Pot this round: 10.00 USDC` khi người dùng vừa tạo nhóm và join trong ảnh `zMfuVfTF282L.webp` đã được khắc phục triệt để.
2. Trong giai đoạn đăng ký (OPEN), Quỹ Pot vòng này nay hiển thị chính xác là **`0.00 USDC`** kèm nhãn **"Total Pot this round (Not started)"** / **"Tổng Pot vòng này (Chưa mở vòng)"** và huy hiệu **`[Chưa mở vòng]`** / **`[Round not started]`**.
3. Người dùng sẽ không còn bị hiểu nhầm là hệ thống đã thu 10 USDC hoặc Pot đã tích lũy tiền khi vòng chưa mở.

**Tester Signoff**: APPROVED ✅ (Gate 3 Closed)
