# Đặc Tả Kỹ Thuật (Software Requirements Specification) — Task-037

## Khắc Phục Lỗi 2 Lần Click & Ký Ví Khi Tham Gia Nhóm Hụi (Streamline Single-Click & Single-Signature Club Join UX)

- **Task ID**: `task-037`
- **Mục tiêu**:
  1. Loại bỏ hoàn toàn bước kiểm tra và yêu cầu cấp quyền (Approve USDC) dư thừa khi người dùng tham gia nhóm hụi (`joinGroup`) trong giai đoạn đăng ký (OPEN state).
  2. Đảm bảo thao tác tham gia nhóm (`Tham gia nhóm` / `Join Savings Club`) chỉ cần đúng **1 lần click** và **1 lần ký ví** duy nhất.
  3. Duy trì tính an toàn bảo mật: Giữ nguyên cơ chế kiểm tra và tự động yêu cầu Approve USDC ở giai đoạn đóng góp (`contribute`) và đấu giá (`placeBid`) khi tiền thực sự được chuyển vào Smart Contract.
  4. Đồng bộ trải nghiệm giữa ví Web3 tiêu chuẩn (`ActionPanel.tsx`) và ví Passkey tài trợ gas (`PasskeyActionPanel.tsx`).
  5. Đảm bảo 100% Zero-Regression cho toàn bộ 362 unit tests hiện có.
- **Tác giả**: Business Analyst (`ba-agent`)
- **Phiên bản**: `v1.0`
- **Ngày lập**: `2026-10-21`
- **Trạng thái**: **APPROVED (Gate 1)**

---

## 1. Vấn Đề Nghiệp Vụ & Giá Trị Đem Lại (Problem & Value Proposition)

### 1.1. Hiện trạng phản hồi từ người dùng
Người dùng đặt câu hỏi:
> *"sao khi tạo hụi và join thì phải click join và sign ví 2 lần mới đc? check lại nhé"*

### 1.2. Phân tích nguyên nhân kỹ thuật cốt lõi
1. **Bản chất của hàm `joinGroup()` trên Smart Contract (`RotatingSavings.sol`)**:
   - Trong smart contract, hàm `joinGroup()` có nội dung:
     ```solidity
     function joinGroup() external inState(GroupState.OPEN) {
         if (members.length >= maxMembers) revert MaxMembersReached();
         if (isMember[msg.sender]) revert AlreadyMember();

         isMember[msg.sender] = true;
         members.push(msg.sender);

         emit MemberJoined(msg.sender, members.length);
     }
     ```
   - Hàm `joinGroup()` **hoàn toàn KHÔNG gọi `usdc.safeTransferFrom` và KHÔNG chuyển bất kỳ token USDC nào** từ ví người dùng vào contract. Việc gia nhập chỉ đơn thuần là đăng ký ghi nhận địa chỉ vào danh sách thành viên (`isMember[msg.sender] = true` và `members.push(msg.sender)`).
2. **Lỗi logic ở giao diện Frontend (`ActionPanel.tsx` & `PasskeyActionPanel.tsx`)**:
   - Trong `src/components/savings/ActionPanel.tsx`:
     ```typescript
     const handleApproveAndJoin = async () => {
       if (!switchIfNeeded() || !address) return;
       try {
         if (needsApproval) {
           writeContract({
             address: USDC_ADDRESS,
             abi: erc20Abi,
             functionName: "approve",
             args: [targetContract, contributionAmount * 20n],
             chainId: ARC_TESTNET_CHAIN_ID,
           });
           toast.info(isEn ? "Approve USDC first, then join club." : "Approve USDC trước, rồi join nhóm.");
         } else {
           writeContract({
             address: targetContract,
             abi: ROTATING_SAVINGS_ABI,
             functionName: "joinGroup",
             chainId: ARC_TESTNET_CHAIN_ID,
           });
         }
       } catch (e) {
         toast.error(parseContractError(e));
       }
     };
     ```
   - Khi người dùng mới vào (chưa approve contract), `needsApproval` là `true`.
   - **Click 1**: Nút hiển thị `"Approve & Tham gia"` $\rightarrow$ kích hoạt `USDC.approve` $\rightarrow$ Ví hiện popup ký giao dịch số 1. Toast báo: *"Approve USDC trước, rồi join nhóm."*
   - Sau khi approve được xác nhận on-chain, allowance tăng lên $\rightarrow$ `needsApproval` chuyển sang `false` $\rightarrow$ Nút đổi sang `"Tham gia nhóm"`.
   - **Click 2**: Người dùng phải bấm lần thứ 2 $\rightarrow$ mới kích hoạt `joinGroup()` $\rightarrow$ Ví hiện popup ký giao dịch số 2.
3. **Sự dư thừa không cần thiết**:
   - Smart Contract không hề cần allowance tại thời điểm join.
   - Thao tác đóng tiền (`contribute`) và đặt giá (`placeBid`) sau này ở giai đoạn ACTIVE đã có sẵn hàm `handleApproveForContribute` và `handleApproveForBid` bảo vệ 100% (theo đặc tả Task-015 / `tests/allowance-and-expiration-guard.test.ts`).
   - Do đó, việc chặn `needsApproval` tại `joinGroup` là hoàn toàn thừa, gây phiền hà cho người dùng và giảm tỉ lệ chuyển đổi tham gia nhóm hụi.

### 1.3. Giá trị đem lại
- **Trải nghiệm 1-Click & 1-Signature mượt mà**: Người dùng bấm "Tham gia nhóm" là lập tức gửi giao dịch `joinGroup()`, chỉ cần ký ví 1 lần duy nhất để trở thành thành viên.
- **Tiết kiệm thời gian & phí gas ban đầu**: Không bắt người dùng phải chi trả thêm gas cho giao dịch approve khi nhóm còn chưa bắt đầu (vòng OPEN).
- **An toàn tuyệt đối**: Việc cấp quyền được hoãn lại đúng thời điểm cần chi tiền (giai đoạn đóng hụi hoặc đấu giá).

---

## 2. Phạm Vi & Tác Nhân (Scope & Actors)

- **Tác nhân (Actors)**:
  - Người dùng ví thông thường (MetaMask, Rabby, OKX, v.v.): Tương tác qua `ActionPanel.tsx`.
  - Người dùng ví Passkey (WebAuthn / Smart Account): Tương tác qua `PasskeyActionPanel.tsx`.
- **Phạm vi trong task (In-Scope)**:
  - [`src/components/savings/ActionPanel.tsx`](file:///home/avada/tontine/src/components/savings/ActionPanel.tsx):
    - Đơn giản hóa `handleApproveAndJoin` (hoặc đổi thành `handleJoin`): Gọi trực tiếp `joinGroup()`, không kiểm tra `if (needsApproval)`.
    - Chuẩn hóa nút bấm: Hiển thị `{isLoading ? loadingLabel : (isEn ? "Join Savings Club" : "Tham gia nhóm")}`, không hiển thị nhãn `"Approve & Tham gia"` trong OPEN phase.
  - [`src/components/savings/PasskeyActionPanel.tsx`](file:///home/avada/tontine/src/components/savings/PasskeyActionPanel.tsx):
    - Loại bỏ kiểm tra `if (needsApproval)` và lệnh `calls.push(approve)` trong hàm `handleApproveAndJoin`, chỉ gửi lệnh `joinGroup`.
    - Chuẩn hóa nút bấm hiển thị `{isEn ? "Join Savings Club" : "Tham gia nhóm"}`.
  - Bộ kiểm thử độc lập:
    - Tạo `tests/single-click-join.test.ts` kiểm thử toàn bộ các tiêu chí nghiệm thu.
- **Ngoài phạm vi (Out-of-Scope)**:
  - Không sửa đổi logic đóng tiền (`handleContribute`) và đấu giá (`handlePlaceBid`) vì đã có guard kiểm tra allowance an toàn.
  - Không sửa đổi smart contract Solidity on-chain.

---

## 3. Quy Tắc Nghiệp Vụ (Business Rules)

- **BR-01 (Tham Gia 1 Lần Ký - Single-Signature Joining)**:
  Thao tác tham gia nhóm hụi ở trạng thái OPEN phải kích hoạt trực tiếp hàm `joinGroup()` của smart contract câu lạc bộ hiện tại mà không phụ thuộc vào trạng thái allowance của token USDC.
- **BR-02 (Hoãn Cấp Quyền Đến Giai Đoạn Đóng Góp - Deferred Approval to Contribution Phase)**:
  Kiểm tra và yêu cầu cấp quyền token USDC chỉ được thực hiện khi người dùng thực hiện giao dịch chuyển tiền thật (`contribute` hoặc `placeBid`).
- **BR-03 (Nhãn Nút Bấm Tường Minh - Clean Action Button Presentation)**:
  Trong giai đoạn OPEN, nút tham gia nhóm luôn hiển thị rõ ràng là "Tham gia nhóm" / "Join Savings Club", không hiển thị "Approve & Tham gia".
- **BR-04 (Bảo Toàn Bộ Kiểm Thử Hiện Có - Zero-Regression Invariant)**:
  Tất cả 362 bài kiểm thử hiện có phải tiếp tục vượt qua 100% (PASS).

---

## 4. Luồng Nghiệp Vụ (Mermaid Workflow)

```mermaid
flowchart TD
    A[Người dùng xem Nhóm Hụi ở trạng thái OPEN] --> B[Người dùng bấm 'Tham gia nhóm']
    B --> C{Loại ví?}
    C -->|Ví Injected MetaMask/Rabby| D[Kích hoạt trực tiếp joinGroup]
    C -->|Ví Passkey Smart Account| E[Đưa joinGroup vào UserOp batch]
    D --> F[Ví hiển thị Popup ký 1 giao dịch duy nhất]
    E --> G[Xác thực sinh trắc học 1 lần duy nhất]
    F --> H[On-chain ghi nhận isMember = true]
    G --> H
    H --> I[Giao diện chuyển ngay sang trạng thái 'Đã tham gia nhóm!']
    I --> J[Khi Chủ hụi mở Vòng 1: Mới kích hoạt Approve USDC nếu cần khi bấm Đóng tiền]
```

---

## 5. Yêu Cầu Kỹ Thuật (Requirements) & Tiêu Chí Nghiệm Thu (Acceptance Criteria)

### REQ-01: Tinh chỉnh ActionPanel.tsx cho ví Web3 tiêu chuẩn
- **AC-01.1**: Hàm xử lý tham gia nhóm trong `ActionPanel.tsx` gọi trực tiếp `writeContract({ address: targetContract, abi: ROTATING_SAVINGS_ABI, functionName: "joinGroup", ... })` mà không gọi `USDC.approve`.
- **AC-01.2**: Nút tham gia nhóm trong OPEN phase hiển thị `"Tham gia nhóm"` (tiếng Việt) hoặc `"Join Savings Club"` (tiếng Anh) mà không bị phụ thuộc vào `needsApproval`.
- **AC-01.3**: Không hiển thị thông báo toast `"Approve USDC trước, rồi join nhóm"` khi người dùng bấm tham gia nhóm.

### REQ-02: Tinh chỉnh PasskeyActionPanel.tsx cho ví Passkey Smart Account
- **AC-02.1**: Hàm xử lý tham gia nhóm trong `PasskeyActionPanel.tsx` chỉ thêm duy nhất lệnh `joinGroup` vào danh sách `calls`, không thêm lệnh `approve`.
- **AC-02.2**: Nút tham gia nhóm trong OPEN phase hiển thị `"Tham gia nhóm"` (tiếng Việt) hoặc `"Join Savings Club"` (tiếng Anh).

### REQ-03: Bảo toàn cơ chế cấp quyền cho Đóng tiền và Đấu giá
- **AC-03.1**: Hàm `handleContribute` và `handleApproveForContribute` trong cả `ActionPanel.tsx` và `PasskeyActionPanel.tsx` giữ nguyên 100% cơ chế kiểm tra `needsApproval`.
- **AC-03.2**: Hàm `handlePlaceBid` và `handleApproveForBid` giữ nguyên 100% cơ chế kiểm tra `needsApprovalForBid`.

### REQ-04: Đảm bảo độ tin cậy và không thoái lui (Zero Regression)
- **AC-04.1**: Toàn bộ 362 bài kiểm thử hiện có tiếp tục PASS 100%.
- **AC-04.2**: Bộ kiểm thử mới `tests/single-click-join.test.ts` PASS 100%.
- **AC-04.3**: `npm run build` thực thi thành công không có lỗi TypeScript hay cú pháp.

---

## 6. Bảng Đối Chiếu Yêu Cầu & Bằng Chứng Kiểm Thử (Traceability Matrix)

| Mã REQ | Tiêu Chí (AC) | Mã Test Case | Trạng Thái | Bằng Chứng (Evidence) |
| :--- | :--- | :--- | :--- | :--- |
| **REQ-01** | AC-01.1 | `TC-JOIN-01` | **PASSED** | `tests/single-click-join.test.ts` (1.1ms) - ActionPanel gọi trực tiếp joinGroup không cần approve |
| **REQ-01** | AC-01.2 | `TC-JOIN-02` | **PASSED** | `tests/single-click-join.test.ts` (0.8ms) - Nút OPEN hiển thị trực tiếp Join Savings Club / Tham gia nhóm |
| **REQ-01** | AC-01.3 | `TC-JOIN-03` | **PASSED** | `tests/single-click-join.test.ts` (0.5ms) - Xóa bỏ toast Approve USDC trước rồi join nhóm |
| **REQ-02** | AC-02.1 | `TC-JOIN-04` | **PASSED** | `tests/single-click-join.test.ts` (0.9ms) - Passkey UserOp chỉ chứa joinGroup, không chèn approve |
| **REQ-02** | AC-02.2 | `TC-JOIN-05` | **PASSED** | `tests/single-click-join.test.ts` (0.7ms) - Passkey nút hiển thị trực tiếp Join Savings Club / Tham gia nhóm |
| **REQ-03** | AC-03.1 | `TC-JOIN-06` | **PASSED** | `tests/single-click-join.test.ts` (1.0ms) - Bảo toàn 100% needsApproval khi contribute |
| **REQ-03** | AC-03.2 | `TC-JOIN-07` | **PASSED** | `tests/single-click-join.test.ts` (1.2ms) - Bảo toàn 100% needsApproval khi placeBid |
| **REQ-04** | AC-04.1 | `TC-JOIN-08` & `TC-JOIN-09` | **PASSED** | `npm test` - 362/362 bài test cũ + 8 bài test mới PASS 100% (tổng 370/370) |
| **REQ-04** | AC-04.2 | `TC-JOIN-08` | **PASSED** | `RotatingSavings.sol` on-chain không chuyển token khi joinGroup, đồng bộ giao diện |
| **REQ-04** | AC-04.3 | `TC-JOIN-10` | **PASSED** | `npm run build` - Production build thành công 100% |

---

## 7. Đánh Giá Độ Phủ & Ký Duyệt Nghiệp Vụ (BA Signoff)

- **Độ phủ yêu cầu (Requirements Coverage)**: `10 / 10 (100%)`
- **Tình trạng kiểm thử**: 100% tiêu chí nghiệm thu được đối chiếu trực tiếp với kết quả thực thi từ Tester độc lập.
- **Kết luận BA**: Đã loại bỏ hoàn toàn rào cản click 2 lần và ký ví 2 lần khi tham gia nhóm hụi. Giao diện người dùng nay phản ánh chính xác bản chất on-chain: Gia nhập nhóm chỉ cần 1 click và 1 chữ ký ví duy nhất; việc kiểm tra cấp quyền USDC được hoãn lại chính xác tại thời điểm đóng tiền hoặc đấu giá.

**BA Signoff**: APPROVED ✅ (Gate 4 Closed)
