# Tài Liệu Đặc Tả Nghiệp Vụ (Business Requirements Document)

> **Mã task:** task-040  
> **Tên tính năng:** Bảo toàn quy mô Quỹ Pot qua mọi vòng đấu (Pot Size Preservation across All Active Rounds under ROSCA / Hụi Chết Rules)  
> **Người thực hiện:** BA (Business Analyst)  
> **Thời gian:** 2026-10-21  
> **Trạng thái:** DRAFT → READY FOR DEV (Gate 1 Passed)  

---

## 1. Bối cảnh & Vấn đề Nghiệp vụ (Problem Statement)

### 1.1 Hiện tượng thực tế người dùng gặp phải
Người dùng tạo và tham gia nhóm hụi 2 người (`0x72f20fc78e2832976934dcc9d5cd179c68ae21fe`), mức đóng `10.00 USDC/thành viên/vòng`:
1. Tại Vòng 1 (`ACTIVE`): Cả Chủ nhóm (Người dùng) và Bot 1 đều nộp 10.00 USDC $\rightarrow$ Tổng quỹ là **20.00 USDC**.
2. Người dùng đặt giá đấu cao hơn, thắng Vòng 1 và thực hiện rút tiền (`claimPayout`) thành công 20.00 USDC.
3. Hợp đồng chuyển sang Vòng 2 (`ACTIVE`). Người dùng là người đã thắng ở Vòng 1 nên được yêu cầu đóng **Hụi Chết** (`Dead Hui Contribution — Round 2: 10.00 USDC`).
4. Tuy nhiên, trên thẻ `ClubCard`, tiêu đề **"Total Pot this round"** lại hiển thị sụt giảm xuống còn **`10.00 USDC`** (thay vì 20.00 USDC), dù dòng bên cạnh ghi rõ `Max pool (at 100%): 20.00 USDC`.

### 1.2 Nguyên nhân kỹ thuật gốc rễ (Root Cause)
Trong file `src/components/savings/ClubCard.tsx`:
```typescript
const potSize =
  state === GROUP_STATE.OPEN
    ? contributionAmount * effectiveTotalJoined
    : contributionAmount * activeMembers;
```
- Khi hợp đồng thông minh chuyển sang Vòng 2 sau khi có 1 người thắng (`hasWon[user] = true`), biến `activeMembers` trên smart contract bị giảm từ 2 xuống 1 (vì smart contract định nghĩa `activeMembers` là *số thành viên chưa từng thắng / chưa hốt hụi*).
- `ClubCard.tsx` lấy `contributionAmount * activeMembers` = 10 USDC * 1 = **10.00 USDC**.
- **Sai lệch logic nghiệp vụ:** Theo luật Hụi / ROSCA (và cơ chế Hụi Chết đã triển khai trong Task-028/030), người đã thắng hụi ở các vòng trước **bắt buộc tiếp tục đóng đủ 10.00 USDC mỗi vòng** cho đến hết chu kỳ. Bot 1 cũng đóng 10.00 USDC. Do đó, tổng quỹ Pot thực tế thu vào của Vòng 2 vẫn là **`20.00 USDC`** (100% bảo toàn). Người thắng Vòng 2 (Bot 1) sẽ nhận trọn vẹn 20.00 USDC.
- Việc hiển thị 10.00 USDC làm người dùng hiểu lầm quỹ pot bị teo nhỏ một nửa sau khi mình nhận tiền.

---

## 2. Giá trị Nghiệp vụ & Phạm vi (Scope & Actors)

### 2.1 Giá trị mang lại
- **Chính xác kinh tế 100%:** Quỹ Pot hiển thị trên Hero Card luôn phản ánh đúng số tiền thực tế sẽ gom được trong vòng (`contributionAmount * effectiveTotalJoined`).
- **Nhất quán với Hụi Chết:** Khẳng định nguyên tắc hụi: Dù bạn đã hốt hụi, nghĩa vụ đóng hụi chết giúp các thành viên hốt sau vẫn nhận đủ 100% quỹ pot ban đầu.
- **Minh bạch trực quan:** Khớp hoàn hảo với `Max pool (at 100%): 20.00 USDC` và thẻ thống kê bên dưới `1 unawarded / 2`.

### 2.2 Phạm vi (Scope)
- **Trong phạm vi:**
  - `src/components/savings/ClubCard.tsx`: Chuẩn hóa công thức tính `potSize` = `contributionAmount * effectiveTotalJoined` cho cả trạng thái `OPEN` và `ACTIVE`.
  - Cập nhật các test suite liên quan (`tests/open-phase-pot-display.test.ts`, `tests/active-round-pot-preservation.test.ts`) để bảo đảm tính bất biến quy mô quỹ Pot qua mọi vòng.
- **Ngoài phạm vi:** Không sửa đổi smart contract (smart contract đã thu đủ 100% pot từ mọi thành viên kể cả người đóng hụi chết).

---

## 3. Quy tắc Nghiệp vụ (Business Rules)

- **BR-01 (Bảo toàn quy mô Quỹ Pot):** Trong mọi vòng đấu (`state === ACTIVE`), quy mô Quỹ Pot của vòng (`potSize`) luôn bằng `contributionAmount * effectiveTotalJoined` (tổng số thành viên thực tế của nhóm).
- **BR-02 (Phân định giữa Pot Size và Unawarded Members):** 
  - `potSize` (Quy mô quỹ): Tính theo toàn bộ thành viên còn trong nhóm (`effectiveTotalJoined`).
  - Ô thống kê `unawardedMembers`: Tiếp tục hiển thị chính xác số người chưa nhận pot (`activeMembers / effectiveTotalJoined`, ví dụ `1 unawarded / 2` ở Round 2).

---

## 4. Yêu Cầu Kỹ Thuật (Requirements) & Tiêu Chí Nghiệm Thu (Acceptance Criteria)

### REQ-01: Chuẩn hóa tính toán Quỹ Pot trong ClubCard.tsx
- **AC-01.1**: `potSize` trong `src/components/savings/ClubCard.tsx` được tính bằng `contributionAmount * effectiveTotalJoined`.
- **AC-01.2**: Ở Vòng 1 với 2 thành viên (mức đóng 10 USDC): `potSize` = `20.00 USDC`.
- **AC-01.3**: Ở Vòng 2 sau khi có 1 người thắng (activeMembers = 1, effectiveTotalJoined = 2): `potSize` vẫn bằng **`20.00 USDC`** (khắc phục triệt để lỗi hiển thị 10.00 USDC).
- **AC-01.4**: Ở nhóm 10 thành viên, tại Vòng 5 (đã có 4 người thắng, 6 người chờ hốt): `potSize` hiển thị đủ **`100.00 USDC`**.

### REQ-02: Đảm bảo độ tin cậy và không thoái lui (Zero Regression)
- **AC-02.1**: Toàn bộ 379 tests hiện có tiếp tục PASS 100% sau khi cập nhật test case phù hợp.
- **AC-02.2**: Build production `npm run build` hoàn thành thành công.

---

## 5. Bảng Đối Chiếu Yêu Cầu & Bằng Chứng Kiểm Thử (Traceability Matrix)

| Mã REQ | Tiêu Chí (AC) | Mã Test Case | Trạng Thái | Bằng Chứng (Evidence) |
| :--- | :--- | :--- | :--- | :--- |
| **REQ-01** | AC-01.1 | `TC-PRESERVE-01` | **PASSED** | `tests/active-round-pot-preservation.test.ts` (1.18ms) |
| **REQ-01** | AC-01.2 | `TC-PRESERVE-02` | **PASSED** | `tests/active-round-pot-preservation.test.ts` (29.6ms) |
| **REQ-01** | AC-01.3 | `TC-PRESERVE-03` | **PASSED** | `tests/active-round-pot-preservation.test.ts` (0.72ms) |
| **REQ-01** | AC-01.4 | `TC-PRESERVE-04` | **PASSED** | `tests/active-round-pot-preservation.test.ts` (1.21ms) |
| **REQ-02** | AC-02.1 | `TC-REGRESSION`  | **PASSED** | 384/384 tests passing (Exit 0) |
| **REQ-02** | AC-02.2 | `BUILD-PROD`     | **PASSED** | `npm run build` thành công trong 20.06s (Exit 0) |

---

## 6. Đánh Giá Độ Phủ & Ký Duyệt Nghiệp Vụ (BA Signoff)

- **Độ phủ yêu cầu (Coverage):** 100% các tiêu chí REQ-01, REQ-02 đã được chứng minh bằng test tự động thực thi thật.
- **Khắc phục lỗi người dùng:** Vòng 2 sau khi có người nhận pot (và nộp hụi chết) hiển thị chính xác toàn bộ 20.00 USDC.
- **Ký nhận BA:** **APPROVED (Gate 4 Passed)**. Đủ điều kiện để Leader nghiệm thu toàn task.
