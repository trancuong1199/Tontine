# Đặc tả Nghiệp vụ & Kỹ thuật: Task-060 (Fix R1-R6 BondedTontine)

> **Mã công việc:** `task-060`  
> **Nhánh:** `feat/bonded-tontine` (Commit cơ sở: `3779e72`)  
> **Mục tiêu:** Khắc phục triệt để 6 vấn đề R1 - R6 được phát hiện trong đợt kiểm thử thực tế trên Arc Testnet.  

---

## 1. Bối cảnh & Mục tiêu

Sau đợt triển khai và kiểm thử giao diện BondedTontine trên bản fork Arc Testnet và RPC công khai Arc Testnet, hệ thống hoạt động ổn định các luồng nghiệp vụ chính (tạo nhóm, nạp cọc, tham gia, góp tiền, vay, vỡ nợ, rút gốc). Tuy nhiên, phát hiện một số lỗi vận hành và giao diện:
- **R1 (Trung bình):** Danh sách thành viên luôn trống trên RPC thật do lỗi `-32012 "requested range too large"` khi gọi `getLogs` từ block 0.
- **R2 (Trung bình):** Nút "Max" của ô Borrow điền sai số tiền (không tính thanh khoản quỹ và lãi dự phóng của vòng).
- **R3 (Vận hành):** Oracle của nhóm mặc định quá hạn (`Price age > 3600s`).
- **R4 (Nhẹ):** Lỗi hiển thị `$$60000`, chuỗi tiếng Việt cứng `(ân hạn: 120s)` trong giao diện tiếng Anh, và các ô Repay/Withdraw điền sẵn số thay vì để trống/dùng Max.
- **R5 (Nhẹ):** Toast loading có thể bị kẹt nếu giao dịch bị timeout/ném lỗi.
- **R6 (Hiệu năng):** Giảm tải RPC công khai của Arc Testnet bằng Multicall và cơ chế cache log.

---

## 2. Quy tắc nghiệp vụ (BR) & Yêu cầu (REQ)

### BR-01: Truy vấn Thành viên Kháng Lỗi (Resilient Member Log Fetching)
- Khi chạy trên Arc Testnet (chain ID 5042002), ưu tiên truy vấn sự kiện `MemberJoined` và `MemberRemoved` qua Blockscout Explorer API (`https://explorer.testnet.arc.io/api?module=logs&action=getLogs&address=...&fromBlock=0&toBlock=latest`).
- Nếu Explorer API không phản hồi hoặc đang chạy trên local fork / anvil, chuyển sang gọi RPC `getLogs`.
- Nếu RPC từ chối do vượt giới hạn block (`-32012`), thực hiện quét log theo đoạn tối đa 4,000 blocks gần nhất.
- Khi không tải được danh sách thành viên nhưng `memberCount > 0`, UI phải hiển thị trạng thái lỗi rõ ràng: `"Không thể tải danh sách thành viên (giới hạn RPC / lỗi mạng)"` kèm nút `"Thử lại"` thay vì thông báo sai lệch `"Chưa có ai tham gia"`.
- Lưu kết quả vào bộ nhớ đệm (Cache) theo `address` và `memberCount` để tránh spam request log liên tục.

### BR-02: Công thức Tính Nút Max của Vay (Borrow Max Calculation)
- Hạn mức vay thực tế bị ràng buộc bởi 2 điều kiện on-chain:
  1. **Thanh khoản khả dụng trong quỹ**:  
     $$\text{liquidityLimit} = \max(0, \text{totalDeposits} - \text{totalDebt})$$
  2. **Hạn mức cọc cho phép sau khi tính lãi vòng**:  
     Khoản nợ mới sau khi vay và lãi vòng hiện tại không được vượt quá `borrowLimit`:
     $$\text{exposureAfter} = \text{newDebt} + \text{interestOwed} + \frac{\text{newDebt} \times \text{rateBpsPerRound}}{10000} \le \text{borrowLimit}$$
     $$\Rightarrow \text{newDebt} \le \frac{(\text{borrowLimit} - \text{interestOwed}) \times 10000}{10000 + \text{rateBpsPerRound}}$$
     $$\text{collateralLimit} = \max\left(0, \frac{(\text{borrowLimit} - \text{interestOwed}) \times 10000}{10000 + \text{rateBpsPerRound}} - \text{totalDebt}\right)$$
- Giá trị nút Max:  
  $$\text{maxBorrow} = \min(\text{liquidityLimit}, \text{collateralLimit})$$
- Khi bấm Max, giá trị điền vào ô Borrow đảm bảo thực hiện giao dịch `borrow()` thành công mà không bị revert `InsufficientLiquidity` hoặc `ExceedsBorrowLimit`.

### BR-03: Xử lý Vòng đời Toast Loading
- Mọi thao tác qua `runAction` phải giải phóng `toast.loading` trong khối `finally` để không bao giờ bị kẹt spinner khi người dùng gặp timeout hoặc RPC error.

### BR-04: Hiển thị Song ngữ & Chuẩn hóa Input
- Khắc phục `$$` thành `$`.
- Chuỗi `(ân hạn: ...s)` phải đổi sang `(grace: ...s)` khi ngôn ngữ là tiếng Anh.
- Ô Repay và Withdraw khởi tạo rỗng `""` để người dùng chủ động nhập hoặc bấm Max.

### BR-05: Tối ưu hóa Tải RPC (Multicall)
- Thay thế 25+ cuộc gọi `readContract` đơn lẻ trong `useBondedClub` bằng Viem `multicall` (sử dụng Multicall3 có sẵn tại `0xcA11bde05977b3631167028862bE2a173976CA11` trên Arc Testnet) với cơ chế fallback an toàn.

---

## 3. Tiêu chí Nghiệm thu (AC)

- **AC-01 (R1 - Danh sách thành viên):**  
  Trên RPC công khai Arc Testnet, nhóm có thành viên hiển thị đầy đủ danh sách địa chỉ; khi có lỗi RPC/mạng, giao diện hiển thị cảnh báo lỗi và nút "Thử lại", không hiện "Chưa có ai tham gia" khi `memberCount > 0`.
- **AC-02 (R2 - Nút Max Borrow):**  
  Bấm nút Max tại ô Borrow điền số tiền không vượt quá thanh khoản quỹ và không vượt quá hạn mức cọc trừ lãi. Gọi borrow với số Max này không bị revert.
- **AC-03 (R4 - Lỗi hiển thị):**  
  Không còn xuất hiện `$$` tại dòng Oracle; dòng Deadline hiển thị đúng "(grace: Xs)" khi chọn tiếng Anh; các ô Repay và Withdraw khởi tạo rỗng `""`.
- **AC-04 (R5 - Toast Loading):**  
  Khi giao dịch chờ biên nhận bị lỗi hoặc timeout, thông báo loading lập tức biến mất (dismiss trong `finally`).
- **AC-05 (R6 - Tối ưu RPC):**  
  `useBondedClub` gom các lệnh đọc qua `multicall`, giảm tối thiểu số lượng JSON-RPC request và cache danh sách sự kiện thành viên khi `memberCount` không đổi.

---

## 4. Ma trận Traceability (REQ → AC → Test)

| REQ | AC | Phương pháp kiểm thử | Bằng chứng |
| :--- | :--- | :--- | :--- |
| REQ-01 (Member List) | AC-01 | Kiểm thử unit test mock RPC & Explorer API fallback; kiểm thử component hiển thị | `tests/bonded-tontine-r1-r6.test.ts` |
| REQ-02 (Borrow Max) | AC-02 | Tính toán công thức `maxBorrow` với các trường hợp thanh khoản < cọc và cọc < thanh khoản | `tests/bonded-tontine-r1-r6.test.ts` |
| REQ-03 (UI & i18n) | AC-03 | Kiểm tra text renderer không có `$$`, kiểm tra song ngữ grace / ân hạn, default inputs | `tests/bonded-tontine-r1-r6.test.ts` |
| REQ-04 (Toast Cleanup) | AC-04 | Kiểm tra code inspection và unit test mô phỏng error trong `runAction` | `tests/bonded-tontine-r1-r6.test.ts` |
| REQ-05 (Multicall & Cache) | AC-05 | Kiểm tra `useBondedClub` gọi multicall và lưu cache | `tests/bonded-tontine-r1-r6.test.ts` |
