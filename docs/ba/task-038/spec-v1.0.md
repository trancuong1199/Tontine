# Đặc Tả Kỹ Thuật (Software Requirements Specification) — Task-038

## Chuẩn Hóa Hiển Thị Quỹ Pot Giai Đoạn Đăng Ký (Accurate Hero Pot Display During Registration Phase)

- **Task ID**: `task-038`
- **Mục tiêu**:
  1. Khắc phục triệt để lỗi logic hiển thị Quỹ Pot trên thẻ câu lạc bộ ([`ClubCard.tsx`](file:///home/avada/tontine/src/components/savings/ClubCard.tsx)): Trong giai đoạn đăng ký ghi danh (**OPEN state**), Quỹ Pot vòng này (`Total Pot this round` / `Tổng Pot vòng này`) phải hiển thị chính xác là **`0.00 USDC`** kèm nhãn/huy hiệu rõ ràng **"Chưa mở vòng"** (*Round not started*).
  2. Xóa bỏ hoàn toàn hiện tượng hiển thị sai lệch **`10.00 USDC`** (hoặc `contributionAmount * memberCount`) khi người dùng mới tạo nhóm và join trong khi vòng chưa bắt đầu và hợp đồng chưa thu bất kỳ đồng tiền nào từ ví.
  3. Bảo toàn logic hiển thị Quỹ Pot ở các giai đoạn sau: Khi vòng hụi chuyển sang **ACTIVE** hoặc **COMPLETED**, Quỹ Pot tiếp tục hiển thị chuẩn xác quy mô pot tương ứng với số thành viên (`contributionAmount * activeMembers`).
  4. Đảm bảo 100% Zero-Regression cho toàn bộ 370 unit tests hiện có.
- **Tác giả**: Business Analyst (`ba-agent`)
- **Phiên bản**: `v1.0`
- **Ngày lập**: `2026-10-21`
- **Trạng thái**: **APPROVED (Gate 1)**

---

## 1. Vấn Đề Nghiệp Vụ & Giá Trị Đem Lại (Problem & Value Proposition)

### 1.1. Hiện trạng phản hồi từ người dùng kèm bằng chứng ảnh chụp
Người dùng phản hồi và cung cấp ảnh chụp thực tế màn hình tại:
> *"đâu có, hiện 10usdc này này https://capture.avada.io/i/zMfuVfTF282L , check lại nhé. ngoài ra từ giờ tôi cho bạn full quyền sửa code nhé và đọc ảnh nhé, không cần phải hỏi lại nữa"*

Phân tích ảnh chụp thực tế (`zMfuVfTF282L.webp`):
1. **Lỗi hiển thị Quỹ Pot trên Thẻ Nhóm ([ClubCard](file:///home/avada/tontine/src/components/savings/ClubCard.tsx))**:
   - Nhóm hụi đang ở trạng thái: **`Open for Members`** (Mở nhận thành viên, State = 0).
   - Vòng hiện tại ở ô thống kê dưới ghi rõ: **`Current Round: Not started`** (Chưa chạy).
   - Danh sách thành viên bên dưới ghi nhận ví `0x3680...ADD9` ở trạng thái: **`⚠️ Pending`** (Chờ đóng).
   - Số dư ví người dùng là `86.77 USDC`, hoàn toàn chưa bị trừ 10 USDC tiền nộp hụi.
   - **TUY NHIÊN**, ngay trên khối thẻ Hero Pot nổi bật nhất, giao diện lại đập vào mắt người dùng dòng chữ:
     ```
     Total Pot this round
     10.00 USDC
     ```
2. **Nguyên nhân kỹ thuật cốt lõi**:
   - Trong `src/App.tsx` (dòng 895):
     ```tsx
     activeMembers={clubInfo.state === GROUP_STATE.OPEN ? BigInt(clubInfo.memberCount) : (clubInfo.activeMembers ?? 0n)}
     ```
     Khi có 1 thành viên tham gia (chính người tạo), `clubInfo.memberCount` là `1`, nên `activeMembers` được truyền vào `ClubCard` là `1n`.
   - Trong `src/components/savings/ClubCard.tsx` (dòng 74):
     ```typescript
     const potSize = contributionAmount * activeMembers;
     ```
     Hệ thống lấy `10 USDC * 1 = 10.00 USDC`.
   - Sau đó render:
     ```tsx
     <span>{t("clubCard.heroPotLabel", language)}</span> // "Total Pot this round" / "Tổng Pot vòng này"
     <span>{formatUsdc(potSize)}</span> // "10.00"
     ```
   - Hậu quả: Dù vòng chưa bắt đầu, hợp đồng chưa thu bất kỳ 1 xu nào, thẻ vẫn hiển thị "Tổng Pot vòng này: 10.00 USDC", khiến người dùng tin chắc rằng hệ thống đang báo mình "đã nộp 10 USDC vào pot" nhưng ví lại không thấy bị trừ tiền!

### 1.2. Giá trị đem lại
- **Minh bạch tài chính 100%**: Trong giai đoạn đăng ký (OPEN), hiển thị đúng sự thật on-chain là **`0.00 USDC`** kèm chú thích rõ ràng `Chưa mở vòng` (*Round not started*).
- **Trải nghiệm người dùng thông suốt**: Người dùng hiểu ngay lý do ví chưa trừ tiền (vì Pot hiện tại là 0, tiền chỉ đóng khi Chủ nhóm mở Vòng 1).
- **Tính nhất quán giữa các khối thông tin**: Loại bỏ sự mâu thuẫn giữa `Current Round: Not started` và `Total Pot this round: 10.00 USDC`.

---

## 2. Phạm Vi & Tác Nhân (Scope & Actors)

- **Tác nhân (Actors)**: Tất cả người dùng tạo nhóm mới hoặc xem nhóm hụi trong giai đoạn đăng ký (**OPEN**).
- **Phạm vi trong task (In-Scope)**:
  - [`src/components/savings/ClubCard.tsx`](file:///home/avada/tontine/src/components/savings/ClubCard.tsx):
    - Cập nhật công thức tính `potSize`:
      ```typescript
      const potSize = state === GROUP_STATE.OPEN ? 0n : (contributionAmount * activeMembers);
      ```
    - Hiển thị nhãn và huy hiệu phân định rõ trạng thái OPEN:
      Khi `state === GROUP_STATE.OPEN`, hiển thị huy hiệu `[Chưa mở vòng]` / `[Round not started]` cạnh con số `0.00 USDC` và nhãn `heroPotOpenLabel`.
  - [`src/lib/i18n.ts`](file:///home/avada/tontine/src/lib/i18n.ts):
    - Bổ sung 2 khóa song ngữ trong namespace `clubCard`:
      - `heroPotOpenLabel`: "Tổng Pot vòng này (Chưa mở vòng)" / "Total Pot this round (Not started)"
      - `roundNotStartedBadge`: "Chưa mở vòng" / "Round not started"
  - Bộ kiểm thử độc lập:
    - Tạo `tests/open-phase-pot-display.test.ts` kiểm thử toàn diện các tiêu chí nghiệm thu.
- **Ngoài phạm vi (Out-of-Scope)**:
  - Không sửa đổi logic hợp đồng thông minh Solidity on-chain.

---

## 3. Quy Tắc Nghiệp Vụ (Business Rules)

- **BR-01 (Tính Chân Thực Của Quỹ Pot - True Escrow Pot Invariant)**:
  Khi nhóm hụi ở giai đoạn đăng ký (**OPEN state**), Quỹ Pot tích lũy của vòng phải luôn hiển thị là **`0.00 USDC`** (không nhân với số người đã ghi danh), vì chưa có bất kỳ giao dịch nộp tiền nào được thực thi on-chain.
- **BR-02 (Chỉ Dẫn Trực Quan Trạng Thái Chưa Mở Vòng - Clear Not-Started Indicator)**:
  Khi `state === GROUP_STATE.OPEN`, bên cạnh con số `0.00 USDC` phải có huy hiệu rõ ràng thông báo vòng chưa bắt đầu (`Chưa mở vòng` / `Round not started`).
- **BR-03 (Bảo Toàn Logic Vòng Đang Chạy - Active Round Pot Invariant)**:
  Khi nhóm ở trạng thái **ACTIVE**, `potSize` tiếp tục phản ánh quy mô pot của vòng dựa trên số thành viên hợp lệ (`contributionAmount * activeMembers`).
- **BR-04 (Bảo Toàn Bộ Kiểm Thử - Zero-Regression Invariant)**:
  Toàn bộ 370 bài kiểm thử hiện có trong hệ thống phải tiếp tục vượt qua 100% (PASS).

---

## 4. Luồng Nghiệp Vụ (Mermaid Workflow)

```mermaid
flowchart TD
    A[Người dùng xem Nhóm Hụi] --> B{Trạng thái nhóm?}
    B -->|State: OPEN| C[potSize = 0n]
    C --> D[Hiển thị Hero Pot: 0.00 USDC]
    D --> E[Gắn huy hiệu: 'Chưa mở vòng' / 'Round not started']
    D --> F[Hiển thị 'Tổng quỹ tối đa (100%): 100.00 USDC' ở góc phải]
    B -->|State: ACTIVE| G[potSize = contributionAmount * activeMembers]
    G --> H[Hiển thị Quỹ Pot thực tế của vòng đang chạy]
    B -->|State: COMPLETED| I[potSize = contributionAmount * activeMembers]
```

---

## 5. Yêu Cầu Kỹ Thuật (Requirements) & Tiêu Chí Nghiệm Thu (Acceptance Criteria)

### REQ-01: Cập nhật Từ Điển Song Ngữ i18n
- **AC-01.1**: Định nghĩa kiểu `Translations` trong `src/lib/i18n.ts` bổ sung `heroPotOpenLabel: string` và `roundNotStartedBadge: string` trong namespace `clubCard`.
- **AC-01.2**: Từ điển `vi` cung cấp:
  - `heroPotOpenLabel`: "Tổng Pot vòng này (Chưa mở vòng)"
  - `roundNotStartedBadge`: "Chưa mở vòng"
- **AC-01.3**: Từ điển `en` cung cấp:
  - `heroPotOpenLabel`: "Total Pot this round (Not started)"
  - `roundNotStartedBadge`: "Round not started"
- **AC-01.4**: Đảm bảo 100% key parity giữa `vi` và `en` theo `TC-I18N-03`.

### REQ-02: Chuẩn hóa tính toán & hiển thị Quỹ Pot trong ClubCard.tsx
- **AC-02.1**: Trong `src/components/savings/ClubCard.tsx`, biến `potSize` được tính bằng `state === GROUP_STATE.OPEN ? 0n : (contributionAmount * activeMembers)`.
- **AC-02.2**: Khi `state === GROUP_STATE.OPEN`, con số Quỹ Pot hiển thị định dạng `0.00` USDC qua `formatUsdc(potSize)`.
- **AC-02.3**: Khi `state === GROUP_STATE.OPEN`, giao diện hiển thị nhãn `heroPotOpenLabel` hoặc huy hiệu `roundNotStartedBadge` nổi bật, giúp người dùng phân biệt rõ ràng với vòng đã mở.
- **AC-02.4**: Khi `state === GROUP_STATE.ACTIVE`, con số Quỹ Pot hiển thị chính xác `contributionAmount * activeMembers`.

### REQ-03: Đảm bảo độ tin cậy và không thoái lui (Zero Regression)
- **AC-03.1**: Toàn bộ 370 bài kiểm thử hiện có tiếp tục PASS 100%.
- **AC-03.2**: Bộ kiểm thử độc lập mới `tests/open-phase-pot-display.test.ts` PASS 100%.
- **AC-03.3**: Quá trình build production `npm run build` thực thi thành công không có lỗi TypeScript hay cú pháp.

---

## 6. Bảng Đối Chiếu Yêu Cầu & Bằng Chứng Kiểm Thử (Traceability Matrix)

| Mã REQ | Tiêu Chí (AC) | Mã Test Case | Trạng Thái | Bằng Chứng (Evidence) |
| :--- | :--- | :--- | :--- | :--- |
| **REQ-01** | AC-01.1 | `TC-POT-01` | **PASSED** | `tests/open-phase-pot-display.test.ts` (0.5ms) - Translations khai báo heroPotOpenLabel & roundNotStartedBadge |
| **REQ-01** | AC-01.2 | `TC-POT-02` | **PASSED** | `tests/open-phase-pot-display.test.ts` (0.4ms) - Từ điển tiếng Việt dịch chuẩn xác |
| **REQ-01** | AC-01.3 | `TC-POT-03` | **PASSED** | `tests/open-phase-pot-display.test.ts` (0.4ms) - Từ điển tiếng Anh dịch chuẩn xác |
| **REQ-01** | AC-01.4 | `TC-POT-04` | **PASSED** | `tests/open-phase-pot-display.test.ts` (0.3ms) - 100% key parity giữa vi và en |
| **REQ-02** | AC-02.1 | `TC-POT-05` | **PASSED** | `tests/open-phase-pot-display.test.ts` (0.5ms) - ClubCard tính potSize = 0n khi OPEN |
| **REQ-02** | AC-02.2 | `TC-POT-06` | **PASSED** | `tests/open-phase-pot-display.test.ts` (0.6ms) - Quỹ Pot hiển thị 0.00 USDC khi OPEN |
| **REQ-02** | AC-02.3 | `TC-POT-07` | **PASSED** | `tests/open-phase-pot-display.test.ts` (0.4ms) - ClubCard hiển thị heroPotOpenLabel & roundNotStartedBadge |
| **REQ-02** | AC-02.4 | `TC-POT-08` | **PASSED** | `tests/open-phase-pot-display.test.ts` (0.5ms) - Quỹ Pot ACTIVE bảo toàn quy mô số người |
| **REQ-03** | AC-03.1 | `TC-POT-09` | **PASSED** | `npm test` - 370/370 bài test cũ tiếp tục PASS 100% |
| **REQ-03** | AC-03.2 | `TC-POT-10` | **PASSED** | `npm test` - 8/8 bài test mới PASS 100% (tổng 378/378 PASS) |
| **REQ-03** | AC-03.3 | `TC-POT-11` | **PASSED** | `npm run build` - Production build thành công 100% |

---

## 7. Đánh Giá Độ Phủ & Ký Duyệt Nghiệp Vụ (BA Signoff)

- **Độ phủ yêu cầu (Requirements Coverage)**: `11 / 11 (100%)`
- **Tình trạng kiểm thử**: 100% tiêu chí nghiệm thu được đối chiếu trực tiếp với kết quả chạy kiểm thử từ Tester độc lập.
- **Kết luận BA**: Đã khắc phục triệt để lỗi visual logic hiển thị `10.00 USDC` gây hiểu lầm trong ảnh chụp màn hình `zMfuVfTF282L.webp`. Giao diện nay phản ánh 100% sự thật on-chain: Khi nhóm ở giai đoạn đăng ký (OPEN), Quỹ Pot hiển thị chính xác là `0.00 USDC` kèm chú thích "Chưa mở vòng" (*Round not started*).

**BA Signoff**: APPROVED ✅ (Gate 4 Closed)
