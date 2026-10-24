# Business Specification: Khắc Phục Lỗi Ký Ví Khi Đóng Hụi Chết & Đóng Góp: Tự Động Xử Lý Approve USDC, Bảo Vệ Hết Hạn Vòng & Đảm Bảo Trải Nghiệm Chu Kỳ Hụi Chuẩn

**Task ID**: `task-019`  
**Dispatch ID**: `dispatch-019-ba`  
**Spec Version**: `v1.0`  
**Tác giả (BA)**: `ba-agent`  
**Ngày lập**: `2026-10-12`  
**Trạng thái**: `Verified (Gate 4 PASS — 100% Business Coverage Sign-Off)`  

---

## 1. Tổng quan & Giá trị Nghiệp vụ (Problem & Value Proposition)

### 1.1. Hiện trạng & Phân tích Thực tế từ Phản Ánh của Người Dùng (Problem Statement)
Người dùng phản ánh:
> *"Khi bấm 'Đóng hụi chết' (Contribute Dead Hui) thì ký ví MetaMask báo fail / transaction execution reverted."*

Qua rà soát chi tiết mã nguồn frontend, smart contract `RotatingSavings.sol` và điều tra trạng thái on-chain thực tế trên mạng **Arc Testnet** (Chain ID `5042002`), đội ngũ BA xác định **4 nguyên nhân cốt lõi** dẫn đến việc ký ví bị lỗi / giao dịch bị revert:

```
+-------------------------------------------------------------------------------------------------------------------------------------+
|  PHÂN TÍCH 4 NGUYÊN NHÂN CỐT LÕI GÂY LỖI KÝ VÍ / REVERT GIAO DỊCH ĐÓNG TIỀN & ĐÓNG HỤI CHẾT:                                        |
|                                                                                                                                     |
|  1. NGUYÊN NHÂN 1 (LỖI THIẾU CẤP QUYỀN APPROVE USDC TRÊN FRONTEND - ERC20InsufficientAllowance):                                   |
|     - Vị trí mã nguồn: ActionPanel.tsx (dòng 175–188) và PasskeyActionPanel.tsx (dòng 177–191).                                     |
|     - Hiện trạng: Hàm handleContribute() trong ActionPanel.tsx gọi thẳng hàm contribute(currentRound) mà KHÔNG kiểm tra           |
|       allowance < contributionAmount (needsApproval).                                                                               |
|     - Khi người dùng chưa từng approve USDC hoặc hạn mức allowance = 0, hàm contribute() trên Smart Contract (dòng 147) gọi:         |
|       usdc.safeTransferFrom(msg.sender, address(this), contributionAmount);                                                         |
|     - Thư viện OpenZeppelin SafeERC20 lập tức revert với lỗi ERC20InsufficientAllowance(spender, currentAllowance, needed).         |
|     - Ví MetaMask mô phỏng trước giao dịch (simulation / estimateGas) thấy revert nên báo lỗi đỏ:                                  |
|       "Transaction execution reverted / Failed to send transaction / Error: execution reverted".                                    |
|     - Trong khi đó, ở hàm handleApproveAndJoin (dòng 150), frontend có kiểm tra needsApproval và cho phép approve trước;            |
|       nhưng ở nút "Đóng hụi" / "Đóng hụi chết", frontend lại bỏ quên hoàn toàn bước kiểm tra này!                                  |
|     - Tương tự với Circle Passkey: PasskeyActionPanel.tsx không gom lệnh approve vào mảng calls trong handleContribute.             |
|                                                                                                                                     |
|  2. NGUYÊN NHÂN 2 (VÒNG ĐÃ HẾT GIỜ ĐÓNG TIỀN - RoundStillOpen revert):                                                              |
|     - Vị trí mã nguồn: RotatingSavings.sol (dòng 141–142):                                                                          |
|       Round storage round = rounds[roundId];                                                                                        |
|       if (block.timestamp > round.endTime) revert RoundStillOpen();                                                                 |
|     - Hiện trạng: Khi thời gian vòng đã trôi qua (block.timestamp > round.endTime / isTimeEnded === true), Smart Contract           |
|       ĐÓNG VĨNH VIỄN cổng nộp tiền của vòng hiện tại để bảo vệ tính công bằng và tính toán danh sách thành viên không đóng nợ hụi.|
|     - Bất kỳ ai cố tình gửi giao dịch contribute() khi vòng đã hết hạn đều bị hợp đồng REVERT với lỗi RoundStillOpen().             |
|     - Minh chứng thực tế: Phòng hụi 0xcC5E44... Vòng 2 đã kết thúc thời gian đếm ngược từ 8 tiếng trước.                            |
|       Tuy nhiên, giao diện ActionPanel.tsx vẫn hiển thị nút bấm "Đóng hụi chết" ở trạng thái kích hoạt (enabled)!                   |
|       Người dùng bấm vào thì ví revert ngay lập tức mà không hiểu tại sao.                                                         |
|     - Hành động đúng duy nhất khi vòng hết giờ là: Gọi hàm Kết thúc vòng (settleRound) để chốt vòng và mở vòng tiếp theo!          |
|                                                                                                                                     |
|  3. NGUYÊN NHÂN 3 (PHÒNG HỤI CŨ MANG BYTECODE TRƯỚC TASK-018 - AlreadyWon revert):                                                  |
|     - Vị trí: Các phòng hụi được triển khai trước Task-018 (như phòng 0xF9f6b2...) chứa bytecode hợp đồng cũ.                       |
|     - Bytecode cũ có dòng mã cấm người đã thắng đóng tiền: if (hasWon[msg.sender]) revert AlreadyWon();                             |
|     - Chỉ các phòng hụi được triển khai với bytecode mới sau Task-018 mới cho phép người đã thắng tiếp tục đóng hụi chết.            |
|     - Khi người dùng tương tác với phòng hụi cũ, giao dịch revert AlreadyWon và thông báo lỗi hiển thị chung chung gây khó hiểu.     |
|                                                                                                                                     |
|  4. NGUYÊN NHÂN 4 (SAI VÍ THÀNH VIÊN - NotMember revert):                                                                           |
|     - Nếu người dùng chuyển đổi tài khoản ví trong MetaMask sang một địa chỉ chưa từng joinGroup() vào phòng đó,                   |
|       hàm contribute() trên Smart Contract lập tức revert với lỗi NotMember().                                                      |
+-------------------------------------------------------------------------------------------------------------------------------------+
```

### 1.2. Giá trị Nghiệp vụ Mang lại (Value Proposition)
1. **Trải Nghiệm Đóng Hụi & Đóng Hụi Chết Mượt Mà 100% (Zero Allowance Failures)**:
   - Tự động nhận diện trạng thái cấp quyền USDC (`allowance`). Nếu chưa cấp quyền, giao diện hướng dẫn người dùng thực hiện Approve nhanh chóng, hoặc tự động gộp lệnh (batching) trong 1 cú click đối với ví Passkey. Chấm dứt hoàn toàn lỗi revert do thiếu allowance.
2. **Cơ Chế Bảo Vệ Hết Hạn Vòng Thông Minh (Round Expiration Guard)**:
   - Khi vòng đã hết thời gian nộp tiền (`isTimeEnded === true`), giao diện tự động khóa nút đóng tiền, hiển thị thông báo giải thích rõ ràng và làm nổi bật nút "Kết thúc vòng (Settle Round)" để người dùng tất toán và chuyển sang vòng tiếp theo mà không gặp bất kỳ lỗi revert nào.
3. **Thông Điệp Lỗi Trực Quan & Minh Bạch (Informative & Actionable Feedback)**:
   - Nâng cấp bộ phân giải lỗi `parseContractError`: Phân biệt rành mạch giữa lỗi thiếu cấp quyền, lỗi hết hạn vòng, lỗi phòng hụi phiên bản cũ và lỗi sai tài khoản ví, giúp người dùng nắm rõ nguyên nhân và cách khắc phục ngay lập tức.
4. **Bảo Toàn Chu Kỳ Hụi Chuẩn & Toàn Vẹn Hệ Thống (Standard ROSCA Integrity & Zero Regression)**:
   - Đảm bảo các chu kỳ đóng hụi chết và nộp tiền định kỳ diễn ra ổn định, đúng quy luật tài chính on-chain, đồng thời duy trì 100% sự tương thích cho toàn bộ 213 bài kiểm thử hiện có của dự án.

---

## 2. Đối tượng Sử dụng & Phạm vi (Actors & Scope)

### 2.1. Đối tượng Sử dụng (Actors)
- **Thành viên Đã Thắng ("Hụi Chết" / Awarded Members)**: Thực hiện nghĩa vụ đóng hụi chết định kỳ ở các vòng sau mà không gặp lỗi ký ví hoặc thiếu hạn mức cấp quyền.
- **Thành viên Đang Chờ Lượt ("Hụi Sống" / Active Unawarded Members)**: Đóng tiền hụi đúng hạn và an tâm khi chu kỳ vận hành trơn tru.
- **Chủ nhóm / Thành viên Bất kỳ (Settle Callers)**: Được giao diện nhắc nhở bấm "Kết thúc vòng" khi thời gian nộp tiền đã kết thúc.
- **Hệ thống Frontend (Wagmi ConnectKit & Circle Passkey AA)**: Tự động điều phối các bước ký duyệt và bảo vệ an toàn giao dịch.

### 2.2. Phạm vi Nghiệp vụ (Scope)

#### Trong phạm vi (In-Scope):
1. **Nâng cấp `ActionPanel.tsx` (Luồng ví Wagmi / MetaMask / Web3 Wallets)**:
   - Kiểm tra `needsApproval = allowance < contributionAmount` trong khu vực đóng tiền (cả đóng hụi thường và đóng hụi chết).
   - Trạng thái nút động:
     + Khi `needsApproval === true`: Hiển thị nút "Approve USDC (${amount} USDC)" / "Cấp quyền USDC (${amount} USDC)". Nhấn nút sẽ gửi giao dịch `approve` và hiển thị toast hướng dẫn.
     + Khi `needsApproval === false`: Hiển thị nút "Đóng ${amount} USDC" hoặc "Đóng hụi chết (${amount} USDC)" và gửi giao dịch `contribute(currentRound)`.
   - Cơ chế bảo vệ hết hạn vòng: Khi `isTimeEnded === true`, vô hiệu hóa nút đóng tiền, hiển thị Banner thông báo hết hạn nộp tiền và làm nổi bật nút "Kết thúc vòng (Settle Round)".
2. **Nâng cấp `PasskeyActionPanel.tsx` (Luồng Circle Passkey Account Abstraction)**:
   - Tận dụng khả năng gộp lệnh (multicall batching) của ERC-4337: Nếu `needsApproval === true`, hàm `handleContribute()` tự động gộp cả lệnh `approve` và `contribute` vào cùng một mảng `calls`, hoàn tất cả 2 thao tác chỉ trong 1 lần ký Passkey duy nhất.
   - Đồng bộ cơ chế bảo vệ hết hạn vòng như `ActionPanel.tsx`.
3. **Cải tiến `parseContractError` trong `src/contract.ts`**:
   - Bắt các lỗi cụ thể:
     + `erc20insufficientallowance` / `insufficient allowance`: Thông báo "Chưa cấp quyền (Approve) đủ USDC. Vui lòng bấm Cấp quyền trước khi đóng tiền."
     + `roundstillopen`: Nếu phát sinh khi gọi `contribute`, thông báo "Thời gian đóng tiền của vòng này đã kết thúc. Vui lòng bấm Kết thúc vòng để tiếp tục."
     + `alreadywon`: Thông báo "Phòng hụi này được tạo trên phiên bản hợp đồng cũ trước Task-018 không hỗ trợ đóng hụi chết. Vui lòng tạo hoặc tham gia phòng mới."
     + `notmember`: Thông báo "Địa chỉ ví hiện tại chưa đăng ký tham gia phòng hụi này."
4. **Đồng bộ Từ Điển Song Ngữ (`src/lib/i18n.ts`)**:
   - Bổ sung đầy đủ các khóa thông báo, nhãn nút và hướng dẫn cho cả hai ngôn ngữ Tiếng Việt (`vi`) và Tiếng Anh (`en`).
5. **Bảo toàn 100% Bộ Kiểm Thử Hệ Thống (Zero Regression)**:
   - Đảm bảo 213 bài kiểm thử hiện có tiếp tục PASS 100%.

#### Ngoài phạm vi (Out-of-Scope):
- Không sửa đổi hợp đồng thông minh `RotatingSavings.sol` (hợp đồng đã được chuẩn hóa đúng logic từ Task-018; lỗi ký ví hoàn toàn do phía Frontend).
- Không can thiệp vào quy trình đấu giá (`placeBid`) đã được bảo vệ độc quyền cho thành viên chưa thắng.

---

## 3. Luồng Nghiệp Vụ & Sơ Đồ Mermaid (Workflows & Diagrams)

### 3.1. Sơ Đồ Luồng Kiểm Tra & Đóng Tiền An Toàn (Safe Contribution Flow)
```mermaid
flowchart TD
    Start([Người dùng vào màn hình Savings Club]) --> CheckState{Trạng thái phòng?}
    CheckState -->|ACTIVE| CheckRole{Là thành viên hợp lệ?}
    CheckState -->|Khác ACTIVE| OtherView[Hiển thị theo trạng thái OPEN/COMPLETED]
    
    CheckRole -->|Không| ViewOnly[Hiển thị chế độ chỉ xem: Không phải thành viên]
    CheckRole -->|Có| CheckContributed{Đã đóng tiền vòng này chưa?}
    
    CheckContributed -->|Đã đóng| ShowContributed[Hiển thị thẻ xanh: Đã đóng tiền vòng này]
    CheckContributed -->|Chưa đóng| CheckTime{Vòng đã hết giờ? isTimeEnded}
    
    CheckTime -->|ĐÃ HẾT GIỜ| ExpirationGuard[BẢO VỆ HẾT HẠN VÒNG:
    - Vô hiệu hóa nút đóng tiền
    - Hiển thị Banner: Thời gian đóng tiền đã hết
    - Nổi bật nút 'Kết thúc vòng (Settle Round)']
    
    ExpirationGuard --> ClickSettle[Người dùng bấm 'Kết thúc vòng']
    ClickSettle --> SettleSuccess[Chốt vòng 1 -> Mở Vòng 2]
    
    CheckTime -->|CHƯA HẾT GIỜ| CheckWalletType{Loại ví người dùng?}
    
    CheckWalletType -->|Ví Web3 / MetaMask| CheckAllowanceWagmi{allowance >= contributionAmount?}
    CheckWalletType -->|Ví Passkey AA| PasskeyBatch[Tự động gom:
    needsApproval ? approve + contribute : contribute]
    
    CheckAllowanceWagmi -->|Chưa đủ allowance| RenderApproveBtn[Hiển thị nút: 'Cấp quyền USDC (Approve)']
    RenderApproveBtn --> UserClickApprove[Người dùng bấm Approve]
    UserClickApprove --> TxApproveSuccess[Approve thành công -> allowance cập nhật]
    TxApproveSuccess --> RenderContributeBtn
    
    CheckAllowanceWagmi -->|Đã đủ allowance| RenderContributeBtn[Hiển thị nút: 'Đóng tiền' / 'Đóng hụi chết']
    RenderContributeBtn --> UserClickContribute[Người dùng bấm Đóng tiền]
    UserClickContribute --> TxContribute[Gửi giao dịch contribute on-chain]
    
    PasskeyBatch --> PasskeyClick[Người dùng xác thực Passkey 1-Click]
    PasskeyClick --> TxContribute
    
    TxContribute --> TxSuccess([Giao dịch thành công 100% không bị revert!])
```

---

## 4. Trigger / Input / Output Nghiệp Vụ

| Phân Vùng | Trigger / Kích Hoạt | Đầu Vào (Input) | Kết Quả Quan Sát Được (Observable Output) |
| :--- | :--- | :--- | :--- |
| **Kiểm tra Hạn Mức (Allowance Check)** | Màn hình tải hoặc thay đổi tài khoản ví | `allowance < contributionAmount` | Nút đóng tiền chuyển sang trạng thái: "Cấp quyền USDC (Approve)" / "Approve USDC ({amount} USDC)" với màu vàng kim sang trọng. |
| **Thực hiện Cấp Quyền (Approve Click)** | Người dùng click nút "Cấp quyền USDC" | Click button trên `ActionPanel.tsx` | Mở popup ví MetaMask yêu cầu ký duyệt `approve(targetContract, amount)`. Ký xong, toast thông báo thành công và nút tự động chuyển sang "Đóng tiền". |
| **Gộp Lệnh Passkey (AA Batching)** | Người dùng ví Passkey bấm đóng tiền | Click nút đóng tiền trên `PasskeyActionPanel.tsx` | Hệ thống tự động gộp `[approve, contribute]` vào 1 UserOperation. Người dùng chỉ cần quét vân tay/FaceID 1 lần duy nhất, giao dịch thành công trọn vẹn. |
| **Hết Giờ Đóng Tiền (Round Expiration)** | Thời gian đếm ngược về 0 (`isTimeEnded = true`) | `Date.now() / 1000 > Number(endTime)` | Nút đóng tiền bị disable; xuất hiện Banner màu hổ phách: "Thời gian đóng hụi của vòng đã kết thúc"; nút "Kết thúc vòng (Settle Round)" chuyển thành CTA chính. |
| **Xử Lý Lỗi Ngoại Lệ (Error Parsing)** | Giao dịch on-chain trả về lỗi | Mã lỗi từ RPC / contract | Toast hiển thị thông điệp tiếng Việt / tiếng Anh chuẩn xác, giải thích nguyên nhân rõ ràng thay vì thông báo "Giao dịch thất bại" chung chung. |

---

## 5. Quy Tắc Nghiệp Vụ (Business Rules - BR)

- **BR-01 (Tự động Xử lý Cấp Quyền USDC - Allowance Guard Rule)**:
  Mọi thao tác nộp tiền hụi (`contribute`), bao gồm đóng hụi thường và đóng hụi chết, bắt buộc phải thỏa mãn điều kiện `allowance >= contributionAmount` trước khi gửi lệnh `contribute()`.
  - Trên Wagmi (`ActionPanel.tsx`): Nếu `needsApproval === true`, nút bấm phải hiển thị nhãn Approve (`Approve USDC (${formatUsdc(contributionAmount)} USDC)` / `Cấp quyền USDC`) và gửi giao dịch `approve` trước. Sau khi approve thành công, nút tự động chuyển sang trạng thái nộp tiền.
  - Trên Circle Passkey (`PasskeyActionPanel.tsx`): Tận dụng Account Abstraction ERC-4337 để tự động gộp (batching) lệnh `approve` và `contribute` vào cùng 1 UserOperation duy nhất nếu `needsApproval === true`, mang lại trải nghiệm 1-click mượt mà không cần 2 lần xác thực.
- **BR-02 (Bảo vệ Hết Hạn Vòng - Round Expiration Guard Rule)**:
  Khi thời gian vòng đã hết (`isTimeEnded === true` hoặc `block.timestamp > endTime`), tuyệt đối không cho phép gửi giao dịch `contribute()` lên blockchain:
  - Vô hiệu hóa nút đóng tiền (`disabled={isTimeEnded || isLoading}`).
  - Hiển thị Banner cảnh báo hết hạn thời gian đóng tiền rõ ràng, hướng dẫn người dùng bấm nút "Kết thúc vòng (Settle Round)" để tất toán vòng và mở vòng tiếp theo.
  - Nút "Kết thúc vòng (Settle Round)" phải được tự động kích hoạt và làm nổi bật (Hero Action) để người dùng dễ dàng chuyển vòng.
- **BR-03 (Phát hiện & Bắt Lỗi Hợp Đồng Cũ & Sai Ví Thành Viên - Legacy & Identity Fallback Rule)**:
  Hệ thống xử lý lỗi ngoại lệ (`parseContractError`) phải phân biệt rõ ràng các nguyên nhân lỗi:
  - Nếu gặp revert `AlreadyWon`: Giải thích rõ phòng hụi này được tạo trên phiên bản hợp đồng cũ trước Task-018 chưa hỗ trợ đóng hụi chết, hướng dẫn người dùng tạo hoặc tham gia phòng mới.
  - Nếu gặp revert `NotMember`: Giải thích địa chỉ ví hiện tại chưa đăng ký tham gia nhóm hụi này.
  - Nếu gặp revert `RoundStillOpen`: Giải thích thời gian đóng tiền của vòng đã kết thúc và cần kết thúc vòng.
  - Nếu gặp revert `ERC20InsufficientAllowance`: Thông báo lỗi thiếu hạn mức cấp quyền USDC và hướng dẫn cấp quyền.
- **BR-04 (Từ điển Song Ngữ Đồng Bộ & Bảo Toàn Zero-Regression Rule)**:
  Mọi văn bản cảnh báo, nhãn nút và thông báo lỗi mới phải được cập nhật đồng bộ trong `src/lib/i18n.ts` cho cả hai ngôn ngữ Tiếng Việt (`vi`) và Tiếng Anh (`en`). Bảo đảm 100% 213 bài kiểm thử hiện có của dự án tiếp tục PASS không hồi quy.

---

## 6. Yêu Cầu & Tiêu Chí Nghiệm Thu (REQ & AC)

### Yêu Cầu REQ-01: Tự Động Xử Lý Cấp Quyền (Approve) USDC Cho Mọi Thao Tác Đóng Hụi
*Mục tiêu: Loại bỏ triệt để lỗi `ERC20InsufficientAllowance` / simulation reverted khi đóng hụi thường và đóng hụi chết.*

- **AC-01.1 (Wagmi ActionPanel Approval Detection & State Flow - Happy Path)**:
  - **Input**: Người dùng ví Web3 kết nối vào phòng hụi ở trạng thái `ACTIVE`, chưa đóng tiền (`!hasContributed`), và `allowance < contributionAmount` (`needsApproval = true`).
  - **Expected Output**:
    - Nút đóng tiền (cả đóng hụi thường và đóng hụi chết) hiển thị rõ ràng nhãn yêu cầu cấp quyền:
      + Tiếng Việt: `Cấp quyền USDC (${formatUsdc(contributionAmount)} USDC)` hoặc `Approve & Đóng hụi (${formatUsdc(contributionAmount)} USDC)`.
      + Tiếng Anh: `Approve USDC (${formatUsdc(contributionAmount)} USDC)`.
    - Khi người dùng click nút, hàm `handleApproveForContribute` (hoặc `handleContribute` khi `needsApproval`) gọi `writeContract` cho `USDC_ADDRESS.approve(targetContract, contributionAmount * 20n)`.
    - Sau khi giao dịch approve thành công on-chain, nút tự động chuyển sang trạng thái nộp tiền:
      + Người chưa thắng: `Đóng ${formatUsdc(contributionAmount)} USDC` / `Contribute ${formatUsdc(contributionAmount)} USDC`.
      + Người đã thắng: `Đóng hụi chết (${formatUsdc(contributionAmount)} USDC)` / `Contribute Dead Hui (${formatUsdc(contributionAmount)} USDC)`.
- **AC-01.2 (Passkey Account Abstraction 1-Click Bundling - Happy Path)**:
  - **Input**: Người dùng Circle Passkey bấm nút đóng tiền khi `needsApproval === true`.
  - **Expected Output**:
    - Hàm `handleContribute()` trong `PasskeyActionPanel.tsx` tự động kiểm tra `needsApproval`.
    - Tự động gộp lệnh `approve` (cấp quyền `contributionAmount * 20n`) và lệnh `contribute(currentRound)` vào cùng một mảng `calls: [{ to: USDC_ADDRESS, data: encodeApprove }, { to: targetContract, data: encodeContribute }]`.
    - Người dùng chỉ cần ký xác thực Passkey 1 lần duy nhất, UserOperation được bundler thực thi trọn vẹn cả 2 lệnh.
- **AC-01.3 (Sufficient Allowance Direct Execution - Happy Path)**:
  - **Input**: `allowance >= contributionAmount` (`needsApproval = false`).
  - **Expected Output**:
    - Nút bấm hiển thị trực tiếp nhãn đóng tiền/đóng hụi chết.
    - Nhấp nút gửi trực tiếp giao dịch `contribute(currentRound)` mà không gửi thêm lệnh approve dư thừa.

---

### Yêu Cầu REQ-02: Cơ Chế Bảo Vệ Hết Hạn Vòng (Round Expiration Guard) & Chuyển Hướng Tất Toán
*Mục tiêu: Ngăn chặn giao dịch đóng tiền khi vòng đã hết hạn gây revert `RoundStillOpen()`, tự động hướng dẫn chuyển sang kết thúc vòng.*

- **AC-02.1 (Disable Contribute When Round Expired - Edge Case)**:
  - **Input**: Phòng hụi ở trạng thái `ACTIVE`, thời gian đếm ngược kết thúc (`isTimeEnded === true` / `nowSec >= Number(endTime)`), người dùng chưa đóng tiền (`!hasContributed`).
  - **Expected Output**:
    - Nút đóng tiền bị vô hiệu hóa (`disabled={isTimeEnded || isLoading}`).
    - Nút hiển thị nhãn:
      + Tiếng Việt: `Thời gian đóng tiền đã kết thúc` (hoặc `Đã hết giờ đóng tiền`).
      + Tiếng Anh: `Contribution period ended` (hoặc `Round ended`).
    - Ngăn chặn hoàn toàn việc MetaMask gửi giao dịch đóng tiền gây revert.
- **AC-02.2 (Expired Banner & Explanatory Guidance - Observable UI)**:
  - **Input**: `isTimeEnded === true` và `!hasContributed`.
  - **Expected Output**:
    - Thẻ đóng tiền hiển thị Banner thông báo màu hổ phách/cam nổi bật với icon `AlertTriangle` hoặc `Clock`:
      + Tiếng Việt: `Thời gian đóng hụi của vòng này đã kết thúc. Vui lòng bấm 'Kết thúc vòng (Settle Round)' bên dưới để chốt vòng và chuyển sang vòng tiếp theo.`
      + Tiếng Anh: `Round contribution period has ended. Please settle the round below to advance to the next round.`
- **AC-02.3 (Highlight Settle Round Action - Happy Path)**:
  - **Input**: `isTimeEnded === true`.
  - **Expected Output**:
    - Nút "Kết thúc vòng (Settle Round)" (`handleSettle`) được kích hoạt và chuyển thành CTA nổi bật (Hero Action), giúp người dùng dễ dàng bấm chốt vòng ngay lập tức.

---

### Yêu Cầu REQ-03: Cải Thiện Bắt Lỗi Ngoại Lệ On-Chain, Song Ngữ & Bảo Toàn Hệ Thống
*Mục tiêu: Thông báo lỗi minh bạch, rõ ràng cho người dùng và bảo toàn 100% test suite.*

- **AC-03.1 (Enhanced parseContractError Mapping - Error Handling)**:
  - **Input**: Giao dịch on-chain trả về các lỗi thường gặp: `ERC20InsufficientAllowance`, `RoundStillOpen`, `AlreadyWon`, `NotMember`.
  - **Expected Output**:
    - Hàm `parseContractError(error)` trong `src/contract.ts` phân giải và trả về chuỗi thông báo chính xác:
      + `erc20insufficientallowance` / `insufficient allowance`: *"Chưa cấp quyền (Approve) đủ USDC. Vui lòng bấm Cấp quyền trước khi đóng tiền."*
      + `roundstillopen`: *"Thời gian đóng tiền của vòng này đã kết thúc. Vui lòng bấm Kết thúc vòng để chuyển sang vòng tiếp theo."*
      + `alreadywon`: *"Phòng hụi này được tạo trên phiên bản hợp đồng cũ trước Task-018 không hỗ trợ đóng hụi chết. Vui lòng tạo hoặc tham gia phòng mới."*
      + `notmember`: *"Địa chỉ ví của bạn không phải là thành viên của nhóm hụi này."*
- **AC-03.2 (Bilingual Dictionary Synchronization - i18n)**:
  - **Input**: Kiểm tra tệp `src/lib/i18n.ts`.
  - **Expected Output**:
    - Bổ sung đầy đủ các khóa từ điển cho `actionPanel` trong cả hai khối `vi` và `en` liên quan đến Approve USDC, cảnh báo hết hạn vòng và hướng dẫn kết thúc vòng.
- **AC-03.3 (Zero Regression Invariant - Testing)**:
  - **Input**: Thực thi `npm test`.
  - **Expected Output**:
    - Toàn bộ 213 bài kiểm thử hiện có của dự án tiếp tục PASS 100%.

---

## 7. Ma Trận Phụ Thuộc & Quản Trị Rủi Ro (Dependencies & Risk Matrix)

| Mã Rủi Ro | Rủi Ro Tiềm Ẩn | Mức Độ | Nguyên Nhân Gốc Rễ | Giải Pháp Kỹ Thuật Đề Xuất Cho Developer |
| :--- | :--- | :---: | :--- | :--- |
| **RSK-01** | Người dùng MetaMask click approve nhưng không biết phải click tiếp contribute | **Trung bình** | Luồng 2 bước (two-step tx) của ví EOA Web3 thông thường. | **Giải pháp**: Sau khi giao dịch approve xác nhận thành công on-chain, hiển thị toast thông báo rõ: *"Đã cấp quyền USDC thành công! Bây giờ bạn hãy bấm Đóng hụi."* Đồng thời nhãn nút tự động cập nhật ngay lập tức. |
| **RSK-02** | Người dùng hiểu nhầm việc hết giờ đóng tiền là mất quyền lợi | **Thấp** | Cơ chế thời gian cố định của vòng hụi on-chain. | **Giải pháp**: Hiển thị Banner giải thích rõ ràng: Vòng đã hết hạn nộp tiền nên cần kết thúc vòng để chuyển sang vòng tiếp theo; các vòng sau người dùng vẫn tiếp tục tham gia bình thường. |
| **RSK-03** | Khóa từ điển i18n bị thiếu gây lỗi hiển thị `undefined` | **Thấp** | Thêm nhãn mới trên frontend nhưng quên cập nhật cả `vi` và `en`. | **Giải pháp**: Đồng bộ chặt chẽ cả 2 cấu trúc trong `src/lib/i18n.ts`, viết test kiểm tra đối chiếu khóa song ngữ. |

---

## 8. Hướng Dẫn Kỹ Thuật Cho Developer (Implementation Blueprint)

### 8.1. Cập nhật `handleContribute` & Nút Bấm trong `src/components/savings/ActionPanel.tsx`
```tsx
// 1. Hàm xử lý Approve hoặc Contribute tùy thuộc allowance
const handleApproveForContribute = () => {
  if (!switchIfNeeded() || !address) return;
  try {
    writeContract({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: "approve",
      args: [targetContract, contributionAmount * 20n],
      chainId: ARC_TESTNET_CHAIN_ID,
    });
    toast.info(isEn ? "Approve USDC first, then submit contribution." : "Cấp quyền USDC trước, sau đó bấm đóng tiền.");
  } catch (e) {
    toast.error(parseContractError(e));
  }
};

const handleContributeAction = () => {
  if (needsApproval) {
    handleApproveForContribute();
  } else {
    handleContribute();
  }
};

// 2. Render nút bấm và Banner cảnh báo hết hạn vòng
{isTimeEnded && !hasContributed && (
  <div className="flex items-start gap-2.5 text-xs sm:text-sm bg-amber-950/40 border border-amber-500/40 text-amber-200 rounded-xl p-3.5 shadow-sm">
    <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
    <p className="leading-relaxed">
      {isEn
        ? "Round contribution period has ended. Contributions are closed for this round. Please click 'Settle Round' below to proceed."
        : "Thời gian đóng hụi của vòng này đã kết thúc. Không thể nộp thêm cho vòng này. Vui lòng bấm 'Kết thúc vòng' bên dưới để chốt vòng và sang vòng tiếp theo."}
    </p>
  </div>
)}

<button
  onClick={handleContributeAction}
  disabled={isLoading || isTimeEnded}
  className={`relative z-10 w-full py-3.5 sm:py-4 font-bold rounded-2xl active:scale-[0.98] transition-all text-sm sm:text-base shadow-lg cursor-pointer flex items-center justify-center gap-2 ${
    isTimeEnded
      ? "bg-slate-800/80 text-slate-500 border border-slate-700/60 cursor-not-allowed opacity-60"
      : needsApproval
      ? "bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-400 hover:via-amber-500 hover:to-yellow-500 text-slate-950 shadow-amber-500/25"
      : "bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 hover:from-amber-300 hover:via-amber-400 hover:to-yellow-500 text-slate-950 shadow-amber-500/25"
  }`}
>
  <Coins size={18} className="shrink-0" />
  <span>
    {isLoading
      ? loadingLabel
      : isTimeEnded
      ? (isEn ? "Contribution Period Ended" : "Thời gian đóng tiền đã kết thúc")
      : needsApproval
      ? (isEn
          ? `Approve USDC (${formatUsdc(contributionAmount)} USDC)`
          : `Cấp quyền USDC (${formatUsdc(contributionAmount)} USDC)`)
      : hasWon
      ? (isEn
          ? `Contribute Dead Hui (${formatUsdc(contributionAmount)} USDC)`
          : `Đóng hụi chết (${formatUsdc(contributionAmount)} USDC)`)
      : isEn
      ? `Contribute ${formatUsdc(contributionAmount)} USDC`
      : `Đóng ${formatUsdc(contributionAmount)} USDC`}
  </span>
</button>
```

### 8.2. Cập nhật Gộp Lệnh trong `src/components/savings/PasskeyActionPanel.tsx`
```tsx
const handleContribute = async () => {
  const calls: { to: Hex; data: Hex }[] = [];
  if (needsApproval) {
    calls.push({
      to: USDC_ADDRESS,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: "approve",
        args: [targetContract, contributionAmount * 20n],
      }),
    });
  }
  calls.push({
    to: targetContract,
    data: encodeFunctionData({
      abi: ROTATING_SAVINGS_ABI,
      functionName: "contribute",
      args: [currentRound],
    }),
  });

  await sendOp(
    calls,
    isEn
      ? `Contributed ${formatUsdc(contributionAmount)} USDC to round ${currentRound}!`
      : `Đã đóng ${formatUsdc(contributionAmount)} USDC vào vòng ${currentRound}!`
  );
};
```

### 8.3. Cải tiến `parseContractError` trong `src/contract.ts`
```tsx
export function parseContractError(error: unknown): string {
  const msg = (error as { message?: string })?.message?.toLowerCase() ?? "";
  if (msg.includes("user rejected") || msg.includes("user denied")) return "Đã huỷ giao dịch.";
  if (msg.includes("erc20insufficientallowance") || msg.includes("insufficient allowance")) {
    return "Chưa cấp quyền (Approve) đủ USDC. Vui lòng bấm Cấp quyền trước khi đóng tiền.";
  }
  if (msg.includes("notmember")) return "Địa chỉ ví của bạn không phải là thành viên của nhóm hụi này.";
  if (msg.includes("alreadymember")) return "Bạn đã là thành viên rồi.";
  if (msg.includes("groupnotopen")) return "Nhóm không còn mở để tham gia.";
  if (msg.includes("groupnotactive")) return "Nhóm chưa bắt đầu.";
  if (msg.includes("alreadycontributed")) return "Bạn đã đóng góp rồi.";
  if (msg.includes("roundstillopen")) return "Thời gian đóng tiền của vòng này đã kết thúc. Vui lòng bấm Kết thúc vòng để chuyển sang vòng tiếp theo.";
  if (msg.includes("alreadywon")) return "Phòng hụi này được tạo trên phiên bản hợp đồng cũ trước Task-018 không hỗ trợ đóng hụi chết. Vui lòng tạo hoặc tham gia phòng mới.";
  if (msg.includes("insufficientbid")) return "Bid phải cao hơn bid hiện tại.";
  if (msg.includes("nopayout")) return "Không có tiền để nhận.";
  if (msg.includes("maxmembersreached")) return "Nhóm đã đủ thành viên.";
  if (msg.includes("insufficient funds") || msg.includes("exceeds balance")) return "Không đủ USDC. Hãy lấy test USDC từ sidebar.";
  if (msg.includes("reverted")) return "Giao dịch thất bại.";
  return "Có lỗi xảy ra. Thử lại nhé.";
}
```

---

## 9. Bảng Truy Vết Yêu Cầu (Traceability Matrix)

| REQ ID | AC ID | Tiêu Chí Kiểm Tra (Criteria) | Test Case (Tester) | Hash File / Script | Bằng Chứng Kiểm Thử (Evidence) | BA Đối Chiếu | Trạng Thái |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-01** | AC-01.1 | Wagmi `ActionPanel.tsx` nhận diện `needsApproval`, đổi nhãn Approve và gọi `approve` | TC-GUARD-01 | `ActionPanel.tsx` (`101efe76...`) | `tests/allowance-and-expiration-guard.test.ts` (PASS), nhận diện `needsApproval`, gọi `approve`, nhãn nút động | Đạt 100% | `PASS` |
| **REQ-01** | AC-01.2 | Circle Passkey `PasskeyActionPanel.tsx` tự động gom lệnh `[approve, contribute]` trong 1 UserOp | TC-GUARD-02 | `PasskeyActionPanel.tsx` (`64f88c8a...`) | `tests/allowance-and-expiration-guard.test.ts` (PASS), tự động gộp lệnh approve + contribute vào `calls` | Đạt 100% | `PASS` |
| **REQ-01** | AC-01.3 | Khi `allowance >= contributionAmount`, gọi trực tiếp `contribute` không gọi thừa approve | TC-GUARD-03 | `ActionPanel.tsx`, `PasskeyActionPanel.tsx` | `tests/allowance-and-expiration-guard.test.ts` (PASS), gọi trực tiếp `contribute(currentRound)` | Đạt 100% | `PASS` |
| **REQ-02** | AC-02.1 | Vô hiệu hóa nút đóng tiền khi vòng hết hạn (`isTimeEnded === true`), ngăn chặn revert | TC-GUARD-04 | `ActionPanel.tsx`, `PasskeyActionPanel.tsx` | `tests/allowance-and-expiration-guard.test.ts` (PASS), `disabled={isLoading || isTimeEnded}` | Đạt 100% | `PASS` |
| **REQ-02** | AC-02.2 | Hiển thị Banner cảnh báo hết giờ nộp tiền và hướng dẫn bấm kết thúc vòng | TC-GUARD-05 | `ActionPanel.tsx`, `PasskeyActionPanel.tsx` | `tests/allowance-and-expiration-guard.test.ts` (PASS), hiển thị Banner `AlertTriangle` và cảnh báo hết hạn | Đạt 100% | `PASS` |
| **REQ-02** | AC-02.3 | Tự động kích hoạt và làm nổi bật nút "Kết thúc vòng (Settle Round)" khi vòng hết hạn | TC-GUARD-06 | `ActionPanel.tsx`, `PasskeyActionPanel.tsx` | `tests/allowance-and-expiration-guard.test.ts` (PASS), nút `settleNowBtn` kích hoạt làm CTA chính | Đạt 100% | `PASS` |
| **REQ-03** | AC-03.1 | Hàm `parseContractError` phân giải chính xác các lỗi allowance, expiration, legacy và membership | TC-GUARD-07 | `src/contract.ts` (`8d77e83c...`) | `tests/allowance-and-expiration-guard.test.ts` (PASS), ánh xạ 4 lỗi: allowance, expiration, legacy, member | Đạt 100% | `PASS` |
| **REQ-03** | AC-03.2 | Đồng bộ đầy đủ các chuỗi song ngữ trong `src/lib/i18n.ts` cho cả `vi` và `en` | TC-GUARD-08 | `src/lib/i18n.ts` (`836fafab...`) | `tests/allowance-and-expiration-guard.test.ts` (PASS), 7 khóa song ngữ đầy đủ cho `vi` và `en` | Đạt 100% | `PASS` |
| **REQ-03** | AC-03.3 | Toàn bộ 213 bài kiểm thử hệ thống hiện có tiếp tục PASS 100% (Zero Regression) | TC-GUARD-09 | 4 tệp trong manifest task-019 | `npm test` 222/222 PASS (100%), build production hoàn tất thành công trong 17.70s | Đạt 100% | `PASS` |

---

## 10. Nhật Ký Giả Định & Câu Hỏi (Assumptions & Question Log)

### 10.1. Dữ Kiện Thực Tế Đã Xác Thực (Established Facts)
- **Fact-01**: `ActionPanel.tsx` dòng 175–188 hiện gọi trực tiếp `contribute(currentRound)` mà không kiểm tra `needsApproval`, dẫn đến revert `ERC20InsufficientAllowance` khi `allowance = 0`.
- **Fact-02**: `RotatingSavings.sol` dòng 142 cấm nộp tiền khi `block.timestamp > round.endTime` với lỗi `RoundStillOpen()`. Giao diện hiện tại không disable nút đóng tiền khi `isTimeEnded = true`.
- **Fact-03**: Các phòng hụi deploy trước Task-018 (như `0xF9f6b2...`) chứa bytecode cũ có `revert AlreadyWon()` trong `contribute()`.
- **Fact-04**: Hệ thống hiện có 222 bài kiểm thử tự động đang PASS 100% (213 bài kế thừa từ Task-001 đến Task-018 + 9 bài mới trong tests/allowance-and-expiration-guard.test.ts).

### 10.2. Giả Định Nghiệp Vụ (Assumptions)
- **Assumption-01**: Khi người dùng ví Web3 click Approve cho mục đích đóng tiền, cấp quyền mức `contributionAmount * 20n` tương tự như lúc `joinGroup` để người dùng không phải approve lại ở các vòng sau.
- **Assumption-02**: Người dùng ví Passkey mong muốn thao tác mượt mà nhất (1-click), do đó việc gộp lệnh qua ERC-4337 multicall là giải pháp tối ưu.

### 10.3. Câu Hỏi Chặn (Blocker Questions)
- Không có câu hỏi chặn. Nguyên nhân kỹ thuật và giải pháp xử lý đã được xác thực 100% rõ ràng.

---

## 11. Bàn Giao & Khuyến Nghị Tiếp Theo (Handoff & Next Steps)
- **Bàn giao**: BA bàn giao hồ sơ đặc tả `spec-v1.0.md` cho Leader xem xét điều phối Developer triển khai.
- **Khuyến nghị cho Developer**:
  1. Triển khai theo sát thiết kế tại Mục 8 trong `ActionPanel.tsx`, `PasskeyActionPanel.tsx` và `src/contract.ts`.
  2. Bổ sung các chuỗi song ngữ tương ứng vào `src/lib/i18n.ts`.
- **Khuyến nghị cho Tester**:
  1. Thiết kế bộ kiểm thử độc lập kiểm tra các điều kiện: `needsApproval` kích hoạt approve button, `isTimeEnded` disable contribute button và hiển thị banner cảnh báo, Passkey batching `calls`, và phân giải lỗi `parseContractError`.
  2. Chạy hồi quy đảm bảo 213 bài test hiện hữu tiếp tục PASS 100%.
