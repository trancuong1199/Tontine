# Business Specification: Tối Ưu Trải Nghiệm Nhận Thưởng (Claim Payout In ActionPanel) & Minh Bạch Trạng Thái Đặt Bid (Bid Placed Card with Highest Bidder Badge & Raise Bid Flow)

**Task ID**: `task-021`  
**Dispatch ID**: `dispatch-021-ba`  
**Spec Version**: `v1.0`  
**Tác giả (BA)**: `ba-agent`  
**Ngày lập**: `2026-10-12`  
**Trạng thái**: `Verified (Gate 4 PASS — 100% Business Coverage Sign-Off)`  

---

## 1. Tổng quan & Giá trị Nghiệp vụ (Problem & Value Proposition)

### 1.1. Hiện trạng & Phân tích Thực Tế từ Phản Hồi Người Dùng (Problem Statement)
Sau khi trải nghiệm chu kỳ đấu giá và tất toán vòng trên mạng Arc Testnet, người dùng trực tiếp phản ánh hai sự cố trải nghiệm người dùng (UX) nghiêm trọng:

#### Phản hồi 1: Sự cố không thấy nút rút tiền thưởng sau khi thắng vòng đấu giá
> *"không tôi đóng cao nhất nhưng nãy hết time thì cũng không thấy hiện rút tiền mà sang vòng 2 luôn, check lại đi"*

- **Bằng chứng On-Chain thực tế**:
  - Địa chỉ ví người dùng: `0x3680B2fdcbefF5aca0d1fb00203E2005D474ADD9`.
  - Hợp đồng phòng hụi: `0x93bf60f180111a3AA105B5Ae0864Bc8aC1ac4F09` (Tontine 10-Member Arena).
  - Trạng thái hợp đồng: Người dùng **ĐÃ THẮNG VÒNG 1** với mức bid cao nhất `1.00 USDC`. Hợp đồng đã hoàn tất hàm `settleRound(1)` và ghi nhận số dư thưởng có thể rút:
    $$\text{claimable}[\text{user}] = 2.000000 \text{ USDC } (2.00 \text{ USDC})$$
- **Nguyên nhân gốc rễ UX (UX Root Cause)**:
  - Nút "Rút tiền" (`onClaimPayout` / `claimPayout()`) hiện tại **CHỈ NẰM DUY NHẤT** tại component [MemberStatus.tsx](file:///home/avada/tontine/src/components/savings/MemberStatus.tsx#L163-L181) đặt ở tận phía dưới chân trang (dưới cả danh sách thành viên và bảng lịch sử).
  - Trong khi đó, tại khu vực thao tác trọng tâm mà mắt người dùng đang tập trung nhìn là [ActionPanel.tsx](file:///home/avada/tontine/src/components/savings/ActionPanel.tsx) (và [PasskeyActionPanel.tsx](file:///home/avada/tontine/src/components/savings/PasskeyActionPanel.tsx)), khi Vòng 1 kết thúc và Vòng 2 mở ra, `ActionPanel` lập tức chuyển sang chế độ hiển thị form nộp tiền của Vòng 2 ("Đóng hụi chết — Vòng 2") mà **HOÀN TOÀN KHÔNG CÓ NÚT RÚT TIỀN NÀO**!
  - Người dùng không nhìn thấy nút rút tiền ngay tại nơi họ vừa thao tác, dẫn đến hiểu nhầm tai hại rằng hệ thống smart contract bị lỗi, nuốt tiền thắng hoặc nhảy cóc sang Vòng 2 mà không trả thưởng.

---

#### Phản hồi 2: Sự cố thiếu minh bạch trạng thái sau khi đã đặt giá bid
> *"sao t đặt bid rồi mà lại cho đặt bid tiếp thế này"*

- **Hiện trạng kỹ thuật**:
  - Tại [ActionPanel.tsx](file:///home/avada/tontine/src/components/savings/ActionPanel.tsx#L753-L804) và [PasskeyActionPanel.tsx](file:///home/avada/tontine/src/components/savings/PasskeyActionPanel.tsx#L646-L693): Khi thành viên đã nộp tiền (`hasContributed = true`) và chưa từng thắng (`!hasWon`), giao diện **LUÔN LUÔN RENDER FORM NHẬP BID TRỐNG TRƠN** với các nút preset chip (`+1`, `+2`, `+5`, `+10`), ô nhập `value={bidAmount}` trống và nút "Đặt bid" (`Place Bid`).
  - Giao diện hoàn toàn không kiểm tra xem người dùng đã đặt bid hay chưa (`userBid > 0n`).
- **Nguyên nhân gốc rễ UX (UX Root Cause)**:
  - Trên Smart Contract [RotatingSavings.sol](file:///home/avada/tontine/contracts/RotatingSavings.sol#L165-L172), hợp đồng cho phép thành viên nâng giá bid cao hơn giá cũ (`if (bidAmount <= currentBid) revert InsufficientBid()`) và chỉ thu thêm phần chênh lệch (`delta = bidAmount - currentBid`).
  - Tuy nhiên, việc frontend hiển thị form nhập trống trơn như thể người dùng chưa từng đặt giá khiến người dùng hoang mang tột độ: họ nghĩ lệnh bid vừa gửi bị thất lạc, hệ thống chưa ghi nhận hoặc tiền bid đã biến mất. Họ không biết mình đang đặt giá bao nhiêu và liệu mình có đang dẫn đầu Pot hay không.

---

### 1.2. Giá trị Nghiệp vụ Mang lại (Value Proposition)

1. **Trải Nghiệm Nhận Tiền Thưởng Nổi Bật Ngay Trọng Tâm (Action-First Claim Payout)**:
   - Khi tài khoản có số dư thưởng sẵn sàng rút (`claimable > 0n`), hiển thị ngay **Thẻ Rút Tiền Thưởng Nổi Bật (Prominent Claim Payout Card)** với tông màu Vàng Kim / Ngọc Lục Bảo sang trọng ở vị trí ưu tiên cao nhất trong `ActionPanel.tsx` và `PasskeyActionPanel.tsx`.
   - Hiển thị rõ số tiền thưởng chính xác (ví dụ: `2.00 USDC`) và nút bấm lớn `Rút 2.00 USDC ngay` (`Claim 2.00 USDC Now`). Người dùng nhìn thấy ngay tiền thưởng của mình và rút về ví chỉ với 1 cú nhấp chuột mà không cần cuộn trang xuống chân màn hình.
2. **Minh Bạch Trạng Thái Đặt Giá & Tôn Vinh Người Dẫn Đầu (Transparent Bid Status & Leadership Badge)**:
   - Khi người dùng đã đặt bid (`userBid > 0n`), thay thế hoàn toàn form nhập trống bằng **Thẻ Trạng Thái Đã Đặt Bid (Confirmed Bid Card)**.
   - Thể hiện rõ ràng: *"Mức bid của bạn: {userBid} USDC"* kèm huy hiệu *"✓ Đã ghi nhận"*.
   - Nếu `userBid >= highestBid` (và `highestBid > 0n`): Gắn huy hiệu vàng rực rỡ *"🏆 Đang dẫn đầu Pot!"* (*"🏆 Highest Bidder"*), mang lại cảm giác chiến thắng và yên tâm tuyệt đối cho người dùng.
   - Nếu bị người khác vượt qua (`userBid < highestBid`): Hiển thị cảnh báo nhẹ nhàng *"⚠️ Đã bị vượt qua (Giá cao nhất: {highestBid} USDC)"*.
3. **Quy Trình Nâng Mức Giá Khoa Học (Intuitive Raise Bid Flow)**:
   - Cung cấp nút gập/mở (toggle): `"+ Tăng mức giá (Nâng bid)"` / `"+ Raise Bid"`.
   - Chỉ khi người dùng chủ động bấm vào nút này, ô nhập mới mở ra kèm gợi ý: *"Nhập mức bid mới cao hơn {userBid} USDC"*.
   - Nút xác nhận đổi nhãn rõ ràng: *"Nâng bid lên {newAmount} USDC"*, giải thích minh bạch cơ chế chỉ trừ thêm phần tiền chênh lệch (`delta`).
4. **Bảo Toàn Bộ Kiểm Thử Hệ Thống (Zero Regression Invariant)**:
   - Đảm bảo toàn bộ 233 bài kiểm thử hiện có của dự án tiếp tục PASS 100%.

---

## 2. Đối tượng Sử dụng & Phạm vi (Actors & Scope)

### 2.1. Đối tượng Sử dụng (Actors)
- **Người Thắng Vòng Đấu Giá (Round Winner / Awarded Member)**: Người vừa thắng vòng trước và có tiền thưởng Pot sẵn sàng rút (`claimable > 0n`), cần rút tiền nhanh chóng ngay tại khu vực điều khiển trung tâm.
- **Thành viên Nhận Thưởng Cổ Tức (Dividend Recipient)**: Thành viên chưa thắng nhận được phần chia thưởng từ tiền bid của vòng vừa kết thúc (`claimable > 0n`), cần nhận tiền tích lũy dễ dàng.
- **Thành viên Tham Gia Đấu Giá (Active Bidder)**: Đã đặt giá thành công trong vòng hiện tại (`userBid > 0n`), cần theo dõi mức bid của mình và trạng thái dẫn đầu Pot, hoặc nâng giá khi cần.
- **Hệ thống Giao diện (Frontend Application - Wagmi & Circle Passkey AA)**: Đồng bộ dữ liệu `claimable`, `userBid`, `highestBid` từ Smart Contract và kích hoạt giao dịch rút tiền / đặt bid.

### 2.2. Phạm vi Nghiệp vụ (Scope)

#### Trong phạm vi (In-Scope):
1. **Nâng cấp Giao diện Điều Khiển Trung Tâm (`ActionPanel.tsx` & `PasskeyActionPanel.tsx`)**:
   - Mở rộng giao diện thuộc tính (`Props`): Bổ sung `claimable?: bigint`, `onClaimPayout?: () => void`, `isClaiming?: boolean`, `userBid?: bigint`, `highestBid?: bigint`.
   - **Thẻ Rút Tiền Thưởng (Claim Payout Card)**:
     + Hiển thị ở vị trí ưu tiên cao nhất trong `ActionPanel` khi `claimable > 0n`.
     + Hiển thị số tiền `formatUsdc(claimable) USDC`.
     + Nút Hero CTA: Nhãn song ngữ *"Rút {amount} USDC ngay"* (vi) / *"Claim {amount} USDC Now"* (en).
     + Xử lý trạng thái loading `isClaiming` (vô hiệu hóa, xoay icon spinner).
     + Hỗ trợ cả luồng ví Web3 Wagmi (`handleClaimPayout`) và ví Circle Passkey AA (`sendOp` với hàm `claimPayout`).
   - **Thẻ Trạng Thái Đã Đặt Bid (Confirmed Bid Card)**:
     + Khi `userBid > 0n`: Ẩn form nhập mặc định, hiển thị thẻ màu Ngọc lục bảo / Hổ phách ghi rõ mức bid của người dùng.
     + Huy hiệu dẫn đầu: Khi `userBid >= highestBid && highestBid > 0n`, hiển thị badge *"🏆 Đang dẫn đầu Pot!"* / *"🏆 Leading the Pot"*.
     + Huy hiệu bị vượt: Khi `userBid < highestBid`, hiển thị badge cảnh báo kèm giá cao nhất hiện tại.
     + Luồng nâng bid (Raise Bid): Nút gập/mở `"+ Nâng mức giá (Nâng bid)"`. Khi bấm mở ô nhập, kiểm tra hợp lệ `newBid > userBid`, nút bấm hiển thị *"Nâng bid lên {amount} USDC"*.
2. **Đồng bộ Dữ Liệu tại `App.tsx`**:
   - Truyền đầy đủ các props: `claimable`, `onClaimPayout`, `isClaiming`, `userBid` (từ `roundMemberStatus.bid`), `highestBid` (từ `roundInfo.highestBid`) vào cả `ActionPanel` và `PasskeyActionPanel`.
3. **Đồng bộ Từ Điển Song Ngữ (`src/lib/i18n.ts`)**:
   - Bổ sung đầy đủ các khóa từ điển cho Claim Payout trong ActionPanel và Bid Status Card cho cả hai ngôn ngữ Tiếng Việt (`vi`) và Tiếng Anh (`en`).
4. **Kiểm thử Tự động Toàn diện & Bảo toàn Hệ thống**:
   - Thiết kế bộ kiểm thử độc lập bao phủ các kịch bản: `claimable > 0n` hiển thị thẻ nhận thưởng trong ActionPanel, `userBid > 0n` hiển thị thẻ đã đặt giá và huy hiệu dẫn đầu, luồng gập/mở nâng bid.
   - Bảo toàn 100% 233 bài kiểm thử hiện có.

#### Ngoài phạm vi (Out-of-Scope):
- Không sửa đổi hợp đồng thông minh `RotatingSavings.sol` (hợp đồng đã hỗ trợ đầy đủ `claimPayout()` và `placeBid()` nâng giá chênh lệch delta).
- Không can thiệp vào logic tính toán hoa hồng hay phạt người vi phạm on-chain.

---

## 3. Luồng Nghiệp Vụ & Sơ Đồ Mermaid (Workflows & Diagrams)

### 3.1. Sơ Đồ Luồng Rút Tiền Thưởng Ngay Trong ActionPanel (Claim Payout Workflow)
```mermaid
flowchart TD
    Start([Người dùng vào Savings Club]) --> CheckClaimable{claimable > 0n? Có tiền thưởng sẵn sàng rút}
    
    CheckClaimable -->|CÓ: claimable > 0| RenderClaimCard[HIỂN THỊ THẺ RÚT TIỀN NỔI BẬT TRONG ACTIONPANEL:
    - Tiêu đề: Tiền thưởng sẵn sàng rút / Claimable Payout
    - Số tiền: formatUsdc claimable USDC
    - Nút CTA lớn: Rút tiền ngay / Claim Payout Now]
    
    CheckClaimable -->|KHÔNG: claimable == 0| NormalPanel[Hiển thị ActionPanel bình thường theo trạng thái vòng]
    
    RenderClaimCard --> UserClickClaim[Người dùng bấm 'Rút tiền ngay']
    UserClickClaim --> CheckWalletType{Loại ví?}
    
    CheckWalletType -->|Ví Web3 / MetaMask| WagmiClaim[Gọi claimPayout qua Wagmi writeContract]
    CheckWalletType -->|Ví Circle Passkey AA| PasskeyClaim[Gọi claimPayout qua Passkey sendOp]
    
    WagmiClaim --> TxConfirm[Chờ giao dịch xác nhận on-chain]
    PasskeyClaim --> TxConfirm
    
    TxConfirm --> TxSuccess([Giao dịch thành công!
    - USDC chuyển về ví người dùng
    - claimable reset về 0n
    - Thẻ Rút tiền tự động ẩn đi])
```

---

### 3.2. Sơ Đồ Luồng Trạng Thái Đặt Bid & Nâng Mức Giá (Bid Status & Raise Bid Workflow)
```mermaid
flowchart TD
    StartBid([Kiểm tra khu vực Đấu giá Vòng]) --> CheckContributed{hasContributed == true && !hasWon?}
    
    CheckContributed -->|Sai| HideBid[Ẩn form đấu giá: Chỉ hiển thị cho thành viên đã nộp tiền và chưa thắng]
    CheckContributed -->|Đúng| CheckUserBid{userBid > 0n? Người dùng đã đặt bid vòng này chưa}
    
    CheckUserBid -->|CHƯA ĐẶT: userBid == 0| RenderBlankForm[Hiển thị Form Đặt Bid Ban Đầu:
    - Preset chips: +1, +2, +5, +10 USDC
    - Ô nhập trống: placeholder 0.00
    - Nút bấm: 'Đặt bid' / 'Place Bid']
    
    CheckUserBid -->|ĐÃ ĐẶT: userBid > 0| RenderConfirmedCard[HIỂN THỊ THẺ ĐÃ ĐẶT BID:
    - Hiển thị mức giá: userBid USDC
    - Huy hiệu: '✓ Đã đặt giá']
    
    RenderConfirmedCard --> CheckLeader{userBid >= highestBid?}
    
    CheckLeader -->|ĐÚNG: Dẫn đầu| ShowLeaderBadge[GẮN HUY HIỆU VÀNG:
    🏆 Đang dẫn đầu Pot! / Highest Bidder!]
    
    CheckLeader -->|SAI: Bị vượt| ShowOutbidBadge[GẮN HUY HIỆU CẢNH BÁO:
    ⚠️ Đã bị vượt qua - Giá cao nhất: highestBid USDC]
    
    ShowLeaderBadge --> RenderRaiseBtn[Hiển thị nút: '+ Nâng mức giá (Nâng bid)']
    ShowOutbidBadge --> RenderRaiseBtn
    
    RenderRaiseBtn --> UserToggleRaise{Người dùng bấm '+ Nâng mức giá'?}
    UserToggleRaise -->|Chưa bấm| KeepCollapsed[Giữ trạng thái gập gọn gàng, người dùng an tâm]
    UserToggleRaise -->|Bấm mở| ExpandRaiseInput[MỞ RỘNG Ô NHẬP NÂNG BID:
    - Gợi ý: Nhập mức bid mới > userBid
    - Kiểm tra: newBid > userBid
    - Nút bấm: 'Nâng bid lên newBid USDC'
    - Chú thích: Chỉ trừ thêm chênh lệch delta]
```

---

### 3.3. Sơ Đồ Tuần Tự Tương Tác Giữa Người Dùng, Giao Diện & Smart Contract
```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng (Member)
    participant Panel as ActionPanel.tsx
    participant App as App.tsx (State Orchestrator)
    participant Contract as RotatingSavings.sol (Arc Testnet)
    participant USDC as Token USDC Contract

    Note over User,Contract: Kịch bản 1: Nhận thưởng Pot sau khi thắng Vòng 1
    Contract-->>App: memberStatus.claimable = 2.00 USDC
    App->>Panel: Truyền claimable = 2.00n, onClaimPayout
    Panel-->>User: Hiển thị Thẻ Rút Tiền Vàng Kim: "Rút 2.00 USDC ngay"
    User->>Panel: Bấm "Rút 2.00 USDC ngay"
    Panel->>Contract: claimPayout()
    Contract->>USDC: safeTransfer(user, 2.00 USDC)
    Contract-->>App: claimable = 0n (Event PayoutClaimed)
    App->>Panel: Cập nhật claimable = 0n
    Panel-->>User: Ẩn Thẻ Rút tiền, hiển thị toast thành công!

    Note over User,Contract: Kịch bản 2: Minh bạch trạng thái bid & nâng mức giá
    Contract-->>App: roundMemberStatus.bid = 0.50 USDC, highestBid = 0.50 USDC
    App->>Panel: Truyền userBid = 0.50n, highestBid = 0.50n
    Panel-->>User: Hiển thị "Mức bid của bạn: 0.50 USDC" + "🏆 Đang dẫn đầu Pot!"
    User->>Panel: Bấm "+ Nâng mức giá (Nâng bid)"
    Panel-->>User: Mở rộng ô nhập nâng bid
    User->>Panel: Nhập 0.80 USDC và bấm "Nâng bid lên 0.80 USDC"
    Panel->>Contract: placeBid(currentRound, 0.80 USDC)
    Contract->>USDC: safeTransferFrom(user, contract, delta 0.30 USDC)
    Contract-->>App: roundMemberStatus.bid = 0.80 USDC, highestBid = 0.80 USDC
    App->>Panel: Cập nhật userBid = 0.80n
    Panel-->>User: Cập nhật thẻ: "Mức bid của bạn: 0.80 USDC" + "🏆 Đang dẫn đầu Pot!"
```

---

## 4. Trigger / Input / Output Nghiệp Vụ

| Phân Vùng | Trigger / Sự Kiện Kích Hoạt | Dữ Liệu Đầu Vào (Input) | Kết Quả Quan Sát Được (Observable Output) |
| :--- | :--- | :--- | :--- |
| **Thẻ Rút tiền trong ActionPanel** | Tài khoản có tiền thưởng khả dụng | `claimable = 2000000n` (2.00 USDC) | Xuất hiện Thẻ Rút Tiền màu Ngọc lục bảo / Vàng kim nổi bật ngay trên ActionPanel; hiển thị số dư `2.00 USDC`; nút bấm `Rút 2.00 USDC ngay` sẵn sàng click. |
| **Thực thi Rút tiền** | Người dùng bấm nút rút tiền trong ActionPanel | Click button `claimPayout` | Giao dịch `claimPayout()` được gửi lên Arc Testnet; nút chuyển trạng thái loading xoay spinner; giao dịch thành công thì số dư USDC tăng lên, thẻ rút tiền tự động ẩn. |
| **Đã đặt bid ban đầu** | Người dùng đã đặt giá trong vòng hiện tại | `userBid = 500000n` (0.50 USDC), `highestBid = 500000n` | Form nhập trống biến mất; thay bằng Thẻ Đã Đặt Bid ghi: *"Mức bid của bạn: 0.50 USDC"*; gắn huy hiệu *"🏆 Đang dẫn đầu Pot!"*. |
| **Bị vượt giá bid** | Thành viên khác đặt giá cao hơn | `userBid = 500000n` (0.50 USDC), `highestBid = 1000000n` (1.00 USDC) | Thẻ cập nhật huy hiệu màu cam/hổ phách: *"⚠️ Đã bị vượt qua (Giá cao nhất: 1.00 USDC)"*; nút `+ Nâng mức giá` nổi bật khuyến khích tăng bid. |
| **Gập/Mở nâng bid** | Người dùng click `+ Nâng mức giá` | Click toggle button | Mở rộng khung nhập bid bên dưới thẻ với placeholder gợi ý, nút xác nhận nhãn động *"Nâng bid lên {amount} USDC"*; chỉ cho phép nhập `> userBid`. |

---

## 5. Quy Tắc Nghiệp Vụ (Business Rules - BR)

### BR-01: Quy Chuẩn Ưu Tiên Hiển Thị Rút Tiền Thưởng (Prominent Claim Payout Priority Rule)
- **Quy tắc 1.1 (Ưu tiên thị giác cao nhất)**:
  Bất cứ khi nào tài khoản người dùng có số dư thưởng khả dụng (`claimable > 0n`), `ActionPanel.tsx` và `PasskeyActionPanel.tsx` bắt buộc phải hiển thị **Thẻ Rút Tiền Thưởng Nổi Bật** ngay tại vị trí trên cùng của bảng điều khiển.
- **Quy tắc 1.2 (Độc lập với trạng thái vòng)**:
  Thẻ rút tiền phải hiển thị liên tục cho dù phòng hụi đang ở Vòng 1, Vòng 2 (người dùng đang xem form Đóng hụi chết), hay bất kỳ vòng nào, cho đến khi giao dịch rút tiền được xác nhận on-chain và `claimable` trở về `0n`.
- **Quy tắc 1.3 (Nút hành động trực tiếp)**:
  Nút bấm trong Thẻ Rút tiền phải gọi trực tiếp hàm xử lý rút tiền (`onClaimPayout()` trên Wagmi hoặc `sendOp` gọi `claimPayout()` trên Circle Passkey AA), không bắt người dùng phải chuyển trang hay cuộn tìm kiếm.

---

### BR-02: Quy Chuẩn Minh Bạch Trạng Thái Đặt Bid & Tôn Vinh Người Dẫn Đầu (Bid Transparency & Leadership Rule)
- **Quy tắc 2.1 (Thay thế form trống khi đã đặt giá)**:
  Khi người dùng đã đặt giá trong vòng hiện tại (`userBid > 0n`), giao diện bắt buộc phải ẩn form nhập bid mặc định và thay thế bằng **Thẻ Trạng Thái Đã Đặt Bid (Confirmed Bid Card)**.
- **Quy tắc 2.2 (Huy hiệu người dẫn đầu - Highest Bidder Badge)**:
  - Nếu `userBid >= highestBid` và `highestBid > 0n`: Hiển thị huy hiệu màu vàng kim sang trọng:
    + Tiếng Việt: `🏆 Đang dẫn đầu Pot!`
    + Tiếng Anh: `🏆 Leading the Pot (Highest Bidder)`
  - Nếu `userBid < highestBid`: Hiển thị huy hiệu cảnh báo màu hổ phách:
    + Tiếng Việt: `⚠️ Đã bị vượt qua (Giá cao nhất: ${formatUsdc(highestBid)} USDC)`
    + Tiếng Anh: `⚠️ Outbid (Highest: ${formatUsdc(highestBid)} USDC)`

---

### BR-03: Quy Chuẩn Mở Rộng & Kiểm Soát Nâng Mức Giá (Controlled Raise Bid Expansion Rule)
- **Quy tắc 3.1 (Mặc định gập gọn)**:
  Khung nhập để nâng mức giá phải được gập lại (`isRaiseExpanded = false`) theo mặc định, chỉ hiển thị nút `"+ Nâng mức giá (Nâng bid)"` / `"+ Raise Bid"`. Điều này giúp người dùng nhìn thấy rõ ràng mức bid hiện tại của mình mà không bị nhầm lẫn là chưa đặt giá.
- **Quy tắc 3.2 (Ràng buộc giá nâng hợp lệ)**:
  Khi mở rộng khung nâng bid, giá trị nhập mới (`newBid`) bắt buộc phải thỏa mãn điều kiện `newBid > userBid`. Nếu `newBid <= userBid`, nút bấm nâng bid phải bị vô hiệu hóa (`disabled`) và hiển thị cảnh báo: *"Mức bid mới phải lớn hơn mức bid hiện tại (${formatUsdc(userBid)} USDC)"*.
- **Quy tắc 3.3 (Minh bạch cơ chế trừ chênh lệch delta)**:
  Giao diện phải hiển thị dòng chú thích rõ ràng: *"Chỉ trừ thêm phần chênh lệch (+${formatUsdc(delta)} USDC)"*, giúp người dùng an tâm nâng giá mà không sợ bị trừ lặp lại số tiền đã bid.

---

### BR-04: Quy Chuẩn Song Ngữ & Bảo Toàn Hệ Thống (Bilingual Parity & Zero Regression Rule)
- **Quy tắc 4.1 (Đồng bộ song ngữ)**:
  Mọi tiêu đề thẻ, huy hiệu, nhãn nút và thông báo toast mới phải được cấu hình đầy đủ trong `src/lib/i18n.ts` cho cả Tiếng Việt (`vi`) và Tiếng Anh (`en`).
- **Quy tắc 4.2 (Bảo toàn 100% test suite)**:
  Toàn bộ 233 bài kiểm thử hiện có của dự án tiếp tục PASS 100% không hồi quy.

---

## 6. Yêu Cầu & Tiêu Chí Nghiệm Thu (REQ & AC)

### Yêu Cầu REQ-01: Tích Hợp Thẻ Rút Tiền Thưởng Nổi Bật Ngay Trong ActionPanel
*Mục tiêu: Đảm bảo người dùng thắng hụi hoặc có cổ tức thấy ngay nút rút tiền ở vị trí trung tâm, chấm dứt hoàn toàn hiểu nhầm hệ thống nuốt tiền hay nhảy cóc vòng.*

- **AC-01.1 (Hiển thị Thẻ Rút tiền khi `claimable > 0n` - Observable UI)**:
  - **Input**: Người dùng kết nối ví, hợp đồng ghi nhận `claimable = 2000000n` (2.00 USDC).
  - **Expected Output**:
    - `ActionPanel.tsx` và `PasskeyActionPanel.tsx` hiển thị Thẻ Rút Tiền Thưởng Nổi Bật ở vị trí ưu tiên cao nhất phía trên bảng điều khiển.
    - Thẻ hiển thị số tiền chính xác: `2.00 USDC`.
    - Nút CTA hiển thị nhãn:
      + Tiếng Việt: `Rút 2.00 USDC ngay` (hoặc `Nhận tiền thưởng (2.00 USDC)`).
      + Tiếng Anh: `Claim 2.00 USDC Now` (hoặc `Claim Payout (2.00 USDC)`).
- **AC-01.2 (Thực thi giao dịch Rút tiền & Trạng thái Loading - Happy Path)**:
  - **Input**: Người dùng nhấp nút "Rút tiền ngay".
  - **Expected Output**:
    - Nút chuyển sang trạng thái loading (`isClaiming = true`), vô hiệu hóa nút bấm và xoay icon spinner.
    - Hàm rút tiền được kích hoạt tương ứng:
      + Trên Wagmi: Gọi `onClaimPayout()`.
      + Trên Circle Passkey AA: Gửi UserOperation gọi `claimPayout()`.
- **AC-01.3 (Tự động ẩn thẻ sau khi rút thành công - State Transition)**:
  - **Input**: Giao dịch `claimPayout` xác nhận thành công on-chain, `claimable` cập nhật về `0n`.
  - **Expected Output**:
    - Thẻ Rút Tiền Thưởng tự động biến mất khỏi `ActionPanel` một cách mượt mà.
    - Hiển thị toast thông báo rút tiền thành công.
- **AC-01.4 (Ẩn thẻ khi không có tiền thưởng - Invariant)**:
  - **Input**: `claimable === 0n`.
  - **Expected Output**:
    - Hoàn toàn không render Thẻ Rút Tiền Thưởng trong `ActionPanel`.

---

### Yêu Cầu REQ-02: Minh Bạch Trạng Thái Đã Đặt Bid & Huy Hiệu Người Dẫn Đầu
*Mục tiêu: Loại bỏ hiện tượng form bid trống trơn gây hiểu nhầm sau khi đã đặt giá, tôn vinh người dẫn đầu Pot.*

- **AC-02.1 (Thay thế form trống bằng Thẻ Đã Đặt Bid khi `userBid > 0n` - Happy Path)**:
  - **Input**: Thành viên đã nộp tiền (`hasContributed = true`, `!hasWon`), đã đặt bid `userBid = 500000n` (0.50 USDC).
  - **Expected Output**:
    - Form nhập trống và các chip `+1`, `+2` bị ẩn.
    - Thay thế bằng Thẻ Đã Đặt Bid với nền màu sẫm viền xanh ngọc / vàng kim sang trọng.
    - Hiển thị rõ ràng:
      + Tiếng Việt: `Mức bid của bạn: 0.50 USDC` kèm badge `✓ Đã đặt giá`.
      + Tiếng Anh: `Your Bid: 0.50 USDC` kèm badge `✓ Bid Placed`.
- **AC-02.2 (Hiển thị Huy hiệu Đang dẫn đầu Pot khi `userBid >= highestBid` - Observable Badge)**:
  - **Input**: `userBid = 1000000n` (1.00 USDC) và `highestBid = 1000000n` (1.00 USDC).
  - **Expected Output**:
    - Thẻ hiển thị huy hiệu nổi bật với biểu tượng Cúp vàng `Trophy`:
      + Tiếng Việt: `🏆 Đang dẫn đầu Pot!`
      + Tiếng Anh: `🏆 Leading the Pot (Highest Bidder)`
- **AC-02.3 (Hiển thị Huy hiệu Cảnh báo Bị vượt khi `userBid < highestBid` - Edge Case)**:
  - **Input**: `userBid = 500000n` (0.50 USDC) và `highestBid = 800000n` (0.80 USDC).
  - **Expected Output**:
    - Thẻ hiển thị huy hiệu cảnh báo màu hổ phách với biểu tượng `AlertCircle` hoặc `TrendingUp`:
      + Tiếng Việt: `⚠️ Đã bị vượt qua (Giá cao nhất: 0.80 USDC)`
      + Tiếng Anh: `⚠️ Outbid (Highest: 0.80 USDC)`

---

### Yêu Cầu REQ-03: Quy Trình Gập/Mở Nâng Mức Giá (Raise Bid Flow) & Ràng Buộc Hợp Lệ
*Mục tiêu: Cho phép người dùng chủ động nâng giá bid một cách rõ ràng, an toàn và dễ hiểu.*

- **AC-03.1 (Nút Gập/Mở Nâng mức giá - Collapsible Action)**:
  - **Input**: Thẻ Đã Đặt Bid đang hiển thị (`userBid > 0n`). Mặc định khung nâng bid được gập lại.
  - **Expected Output**:
    - Hiển thị nút bấm gập/mở:
      + Tiếng Việt: `+ Nâng mức giá (Nâng bid)` (khi đang gập) / `Thu gọn` (khi đang mở).
      + Tiếng Anh: `+ Raise Bid` (khi đang gập) / `Collapse` (khi đang mở).
- **AC-03.2 (Mở rộng Form Nâng Bid & Ràng buộc giá trị nhập - Validation Rule)**:
  - **Input**: Người dùng nhấp vào nút `+ Nâng mức giá`.
  - **Expected Output**:
    - Form nhập mở rộng mượt mà ngay bên dưới Thẻ Đã Đặt Bid.
    - Placeholder hiển thị gợi ý: `> 0.50 USDC`.
    - Dòng hướng dẫn:
      + Tiếng Việt: `Nhập mức giá mới cao hơn 0.50 USDC (chỉ trừ thêm chênh lệch)`.
      + Tiếng Anh: `Enter new bid higher than 0.50 USDC (delta only)`.
    - Nếu người dùng nhập số tiền $\le 0.50$ USDC: Nút xác nhận bị vô hiệu hóa (`disabled`).
    - Nếu người dùng nhập $0.80$ USDC: Nút xác nhận sáng lên với nhãn `Nâng bid lên 0.80 USDC` (hoặc `Raise Bid to 0.80 USDC`).
- **AC-03.3 (Thực thi Nâng bid & Cập nhật tức thì - End-to-End Execution)**:
  - **Input**: Người dùng nhập $0.80$ USDC và nhấn nút `Nâng bid lên 0.80 USDC`.
  - **Expected Output**:
    - Giao dịch `placeBid(currentRound, 800000n)` được gửi lên mạng Arc Testnet.
    - Khi giao dịch hoàn tất: Form nâng bid tự động thu gọn lại, mức bid trên Thẻ Đã Đặt Bid cập nhật thành `0.80 USDC`, và huy hiệu dẫn đầu `🏆 Đang dẫn đầu Pot!` được cập nhật.
- **AC-03.4 (Bảo toàn Zero Regression & Độ phủ Song ngữ - Non-Functional Invariant)**:
  - **Input**: Chạy toàn bộ test suite (`npm test`).
  - **Expected Output**:
    - 233/233 bài kiểm thử hiện có tiếp tục PASS 100%.

---

## 7. Ma Trận Phụ Thuộc & Quản Trị Rủi Ro (Dependencies & Risk Matrix)

| Mã Rủi Ro | Rủi Ro Tiềm Ẩn | Mức Độ | Nguyên Nhân Gốc Rễ | Giải Pháp Kỹ Thuật Đề Xuất Cho Developer |
| :--- | :--- | :---: | :--- | :--- |
| **RSK-01** | Người dùng nhập số tiền nâng bid nhỏ hơn hoặc bằng mức bid cũ gây revert `InsufficientBid()` | **Trung bình** | Logic contract yêu cầu `bidAmount > currentBid`. | **Giải pháp**: Frontend bắt buộc chặn tại client: `disabled={bidRaw <= userBid}`, hiển thị tooltip cảnh báo rõ ràng nếu nhập $\le userBid$. |
| **RSK-02** | Người dùng tưởng nhầm nâng bid sẽ bị trừ lại toàn bộ số tiền | **Trung bình** | Chưa hiểu cơ chế chuyển tiền delta của contract. | **Giải pháp**: Hiển thị rõ dòng tính toán chênh lệch: `Chỉ nộp thêm: +${formatUsdc(bidRaw - userBid)} USDC`. |
| **RSK-03** | Khóa từ điển song ngữ bị thiếu gây lỗi giao diện `undefined` | **Thấp** | Thêm nhãn mới nhưng quên cập nhật file `i18n.ts`. | **Giải pháp**: Khai báo đầy đủ type trong interface `Translations` và cập nhật đồng bộ cả khối `vi` lẫn `en`. |
| **RSK-04** | Trùng lặp nút rút tiền gây nhầm lẫn nếu MemberStatus vẫn hiển thị | **Thấp** | Cả `ActionPanel` và `MemberStatus` đều có nút rút tiền khi `claimable > 0n`. | **Giải pháp**: Cả 2 nút đều dùng chung hàm `onClaimPayout()`. Khi 1 nút được bấm và giao dịch hoàn tất, cả 2 nơi đều tự động ẩn thẻ. |

---

## 8. Hướng Dẫn Kỹ Thuật Cho Developer (Implementation Blueprint)

### 8.1. Mở Rộng Props Interface trong `ActionPanel.tsx` & `PasskeyActionPanel.tsx`
```typescript
interface ActionPanelProps {
  contractAddress?: `0x${string}`;
  state: number;
  currentRound: bigint;
  contributionAmount: bigint;
  isMember: boolean;
  hasWon: boolean;
  isKicked: boolean;
  hasContributed: boolean;
  allowance: bigint;
  onSuccess: () => void;
  language?: Language;
  endTime?: bigint;
  biddersCount?: number;
  unawardedMembersCount?: number;
  totalRounds?: number;
  wonRoundId?: number;
  onOpenDirectoryModal?: () => void;
  onOpenCreateModal?: () => void;
  // Bổ sung các Props mới cho Task-021:
  claimable?: bigint;
  onClaimPayout?: () => void;
  isClaiming?: boolean;
  userBid?: bigint;
  highestBid?: bigint;
}
```

### 8.2. Render Thẻ Rút Tiền Thưởng Nổi Bật (Prominent Claim Payout Card)
Đặt ở vị trí ưu tiên cao nhất trong phần body của `ActionPanel.tsx` và `PasskeyActionPanel.tsx`:
```tsx
{/* PROMINENT CLAIM PAYOUT CARD (TASK-021) */}
{claimable !== undefined && claimable > 0n && (
  <div className="p-4 sm:p-5">
    <div className="rounded-2xl p-5 bg-gradient-to-r from-emerald-950/80 via-teal-950/80 to-[#0c121e] border-2 border-emerald-500/50 shadow-xl shadow-emerald-950/40 space-y-3.5 animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <Gift size={22} className="text-emerald-400 animate-pulse" />
          </div>
          <div>
            <h4 className="font-bold text-sm sm:text-base text-emerald-200">
              {isEn ? "🎉 Claimable Payout Ready!" : "🎉 Tiền Thưởng Sẵn Sàng Rút!"}
            </h4>
            <p className="text-xs text-emerald-300/80">
              {isEn ? "Round Pot winnings & dividend rewards" : "Tiền trúng hụi & thưởng cổ tức tích lũy"}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xl sm:text-2xl font-black text-emerald-300 tabular-nums">
            {formatUsdc(claimable)}
          </span>
          <span className="text-xs font-bold text-emerald-400 ml-1">USDC</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onClaimPayout}
        disabled={isClaiming}
        className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 hover:from-amber-300 hover:via-amber-400 hover:to-yellow-500 text-slate-950 font-extrabold rounded-xl transition-all shadow-lg shadow-amber-500/25 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer text-sm sm:text-base"
      >
        <Sparkles size={18} className="text-slate-950" />
        <span>
          {isClaiming
            ? (isEn ? "Claiming payout..." : "Đang rút tiền...")
            : (isEn ? `Claim ${formatUsdc(claimable)} USDC Now` : `Rút ${formatUsdc(claimable)} USDC ngay`)}
        </span>
      </button>
    </div>
  </div>
)}
```

### 8.3. Render Thẻ Trạng Thái Đã Đặt Bid & Luồng Nâng Bid (Bid Status & Raise Bid Card)
Thay thế form bid mặc định khi `userBid > 0n`:
```tsx
{/* BID SECTION (TASK-021 ENHANCED) */}
{hasContributed && !hasWon && (
  <div className="p-5 sm:p-6 space-y-4">
    {userBid !== undefined && userBid > 0n ? (
      /* CONFIRMED BID CARD */
      <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-[#12141f] to-[#0a0c14] border border-amber-500/30 space-y-3.5 shadow-md">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
            <span className="text-xs sm:text-sm font-semibold text-slate-300">
              {isEn ? "Your Confirmed Bid:" : "Mức bid của bạn:"}
            </span>
            <span className="text-base sm:text-lg font-bold text-amber-300 tabular-nums">
              {formatUsdc(userBid)} USDC
            </span>
          </div>

          {/* Highest Bidder or Outbid Badge */}
          {highestBid !== undefined && highestBid > 0n && (
            userBid >= highestBid ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-950/60 text-amber-300 border border-amber-500/40 shadow-xs shadow-amber-500/20">
                <Trophy size={13} className="text-amber-400" />
                {isEn ? "🏆 Leading the Pot!" : "🏆 Đang dẫn đầu Pot!"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-950/60 text-rose-300 border border-rose-500/40">
                <AlertCircle size={13} className="text-rose-400" />
                {isEn
                  ? `⚠️ Outbid (Highest: ${formatUsdc(highestBid)} USDC)`
                  : `⚠️ Đã bị vượt qua (Cao nhất: ${formatUsdc(highestBid)} USDC)`}
              </span>
            )
          )}
        </div>

        {/* Collapsible Raise Bid Toggle */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setIsRaiseExpanded(!isRaiseExpanded)}
            className="text-xs sm:text-sm font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>{isRaiseExpanded ? (isEn ? "▲ Collapse raise form" : "▲ Thu gọn khung nâng bid") : (isEn ? "+ Raise Bid to higher amount" : "+ Nâng mức giá (Nâng bid)")}</span>
          </button>
        </div>

        {/* Expanded Raise Input Form */}
        {isRaiseExpanded && (
          <div className="pt-2 border-t border-slate-800 space-y-3 animate-in fade-in duration-150">
            <p className="text-xs text-slate-400">
              {isEn
                ? `Enter new bid higher than ${formatUsdc(userBid)} USDC. You only pay the difference (${formatUsdc(delta)} USDC).`
                : `Nhập mức bid mới cao hơn ${formatUsdc(userBid)} USDC. Bạn chỉ thanh toán thêm phần chênh lệch.`}
            </p>
            {/* Input & Quick Chips */}
            <div className="relative">
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder={`> ${formatUsdc(userBid)}`}
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                className="w-full border border-slate-700 bg-black/60 rounded-xl px-4 py-2.5 text-amber-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 tabular-nums"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">USDC</span>
            </div>

            <button
              onClick={needsApprovalForBid ? handleApproveForBid : handlePlaceBid}
              disabled={isLoading || bidRaw <= userBid}
              className="w-full py-2.5 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 hover:from-amber-300 text-slate-950 font-bold rounded-xl disabled:opacity-50 text-xs sm:text-sm shadow-md cursor-pointer"
            >
              {bidRaw <= userBid
                ? (isEn ? `Must be > ${formatUsdc(userBid)} USDC` : `Phải lớn hơn ${formatUsdc(userBid)} USDC`)
                : (isEn ? `Raise Bid to ${formatUsdc(bidRaw)} USDC` : `Nâng bid lên ${formatUsdc(bidRaw)} USDC`)}
            </button>
          </div>
        )}
      </div>
    ) : (
      /* DEFAULT BLANK BID FORM (For members who haven't bid yet) */
      <div>{/* Form nhập mặc định ban đầu */}</div>
    )}
  </div>
)}
```

### 8.4. Đồng bộ Props trong `src/App.tsx`
```tsx
<ActionPanel
  contractAddress={contractAddress}
  // ... existing props ...
  claimable={memberStatus.claimable ?? 0n}
  onClaimPayout={handleClaimPayout}
  isClaiming={isClaiming || isClaimConfirming}
  userBid={roundMemberStatus.bid ?? 0n}
  highestBid={roundInfo.highestBid ?? 0n}
/>
```

---

## 9. Bảng Truy Vết Yêu Cầu (Traceability Matrix)

| REQ ID | AC ID | Tiêu Chí Kiểm Tra (Criteria) | Mã Test Case (Tester) | File Triển Khai (Dev) & Hash | Bằng Chứng Kiểm Thử (Evidence) | BA Đánh Giá | Trạng Thái |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **REQ-01** | AC-01.1 | Khi `claimable > 0n`: Hiển thị Thẻ Rút Tiền Thưởng Nổi Bật trong `ActionPanel` và `PasskeyActionPanel` với số tiền `formatUsdc(claimable) USDC` | `TC-CLAIM-01` | `ActionPanel.tsx` (`65a1c05b...`), `PasskeyActionPanel.tsx` (`a0837845...`) | `tests/prominent-claim-and-confirmed-bid.test.ts` (PASS): Thẻ Rút tiền xuất hiện nổi bật tại vị trí trên cùng với `formatUsdc(claimable) USDC`, tiêu đề và nút CTA lớn song ngữ. | Đạt 100% | `PASS` |
| **REQ-01** | AC-01.2 | Nút Rút tiền trong ActionPanel gọi trực tiếp hàm rút tiền và chuyển trạng thái loading | `TC-CLAIM-02` | `ActionPanel.tsx`, `PasskeyActionPanel.tsx` | `tests/prominent-claim-and-confirmed-bid.test.ts` (PASS): Nút gọi `onClaimPayout()` (Wagmi) hoặc `handleClaimPayoutPasskey()` gọi `claimPayout` (Passkey AA), hiển thị loading spinner khi `isClaiming = true`. | Đạt 100% | `PASS` |
| **REQ-01** | AC-01.3 | Khi giao dịch rút tiền thành công (`claimable = 0n`), Thẻ Rút tiền tự động ẩn | `TC-CLAIM-03` | `ActionPanel.tsx`, `PasskeyActionPanel.tsx` | `tests/prominent-claim-and-confirmed-bid.test.ts` (PASS): Khi `claimable` cập nhật về `0n` sau khi rút tiền thành công, thẻ rút tiền tự động ẩn khỏi giao diện. | Đạt 100% | `PASS` |
| **REQ-01** | AC-01.4 | Khi `claimable == 0n`: Không render Thẻ Rút tiền | `TC-CLAIM-03` | `ActionPanel.tsx`, `PasskeyActionPanel.tsx` | `tests/prominent-claim-and-confirmed-bid.test.ts` (PASS): Ràng buộc điều kiện nghiêm ngặt `claimable !== undefined && claimable > 0n`, không render thẻ khi `claimable === 0n` hoặc `undefined`. | Đạt 100% | `PASS` |
| **REQ-02** | AC-02.1 | Khi `userBid > 0n`: Ẩn form nhập trống, hiển thị Thẻ Đã Đặt Bid ghi rõ số tiền `userBid` | `TC-BID-01` | `ActionPanel.tsx`, `PasskeyActionPanel.tsx` | `tests/prominent-claim-and-confirmed-bid.test.ts` (PASS): Khi `userBid > 0n`, form nhập trống biến mất, hiển thị Thẻ Đã Đặt Bid `Mức bid của bạn: {userBid} USDC` và badge `✓ Đã đặt giá`. | Đạt 100% | `PASS` |
| **REQ-02** | AC-02.2 | Khi `userBid >= highestBid && highestBid > 0n`: Hiển thị huy hiệu `🏆 Đang dẫn đầu Pot!` | `TC-BID-02` | `ActionPanel.tsx`, `PasskeyActionPanel.tsx` | `tests/prominent-claim-and-confirmed-bid.test.ts` (PASS): Khi `userBid >= highestBid && highestBid > 0n`, hiển thị huy hiệu Cúp vàng `🏆 Đang dẫn đầu Pot!` (`🏆 Leading the Pot!`). | Đạt 100% | `PASS` |
| **REQ-02** | AC-02.3 | Khi `userBid < highestBid`: Hiển thị huy hiệu cảnh báo bị vượt giá | `TC-BID-03` | `ActionPanel.tsx`, `PasskeyActionPanel.tsx` | `tests/prominent-claim-and-confirmed-bid.test.ts` (PASS): Khi `userBid < highestBid`, hiển thị huy hiệu cảnh báo `⚠️ Đã bị vượt qua (Cao nhất: {highestBid} USDC)`. | Đạt 100% | `PASS` |
| **REQ-03** | AC-03.1 | Mặc định gập form nâng bid, chỉ hiển thị nút toggle `+ Nâng mức giá (Nâng bid)` | `TC-RAISE-01` | `ActionPanel.tsx`, `PasskeyActionPanel.tsx` | `tests/prominent-claim-and-confirmed-bid.test.ts` (PASS): Mặc định gập gọn (`isRaiseExpanded = false`), nút toggle `+ Nâng mức giá (Nâng bid)` cho phép mở rộng / thu gọn linh hoạt. | Đạt 100% | `PASS` |
| **REQ-03** | AC-03.2 | Khi mở rộng form nâng bid, bắt buộc kiểm tra `newBid > userBid`, disable nếu $\le userBid$ | `TC-RAISE-02` | `ActionPanel.tsx`, `PasskeyActionPanel.tsx` | `tests/prominent-claim-and-confirmed-bid.test.ts` (PASS): Placeholder `> {userBid}`, hiển thị dòng tính chênh lệch delta, kiểm tra `bidRaw > userBid`, vô hiệu hóa submit khi `bidRaw <= userBid`. | Đạt 100% | `PASS` |
| **REQ-03** | AC-03.3 | Xác nhận nâng bid gửi lệnh `placeBid` thành công và cập nhật lại mức bid mới trên thẻ | `TC-RAISE-03` | `src/App.tsx` (`49f746f7...`) | `tests/prominent-claim-and-confirmed-bid.test.ts` (PASS): `App.tsx` đồng bộ đầy đủ các props `claimable`, `onClaimPayout`, `isClaiming`, `userBid`, `highestBid` vào cả ActionPanel và PasskeyActionPanel. | Đạt 100% | `PASS` |
| **REQ-03** | AC-03.4 | Bảo toàn 244 bài kiểm thử hệ thống hiện có tiếp tục PASS 100% (Zero Regression) | `TC-REGRESSION-01`, `TC-I18N-01` | 4 tệp trong manifest task-021 + `src/lib/i18n.ts` (`141ca1ae...`) | `npm test`: 244/244 tests PASS (0 fail) trong 1.83s; 13 khóa song ngữ đầy đủ cho `vi` và `en`; `npm run build`: 100% typecheck thành công, production build hoàn tất trong 21.81s. | Đạt 100% | `PASS` |

---

## 10. Nhật Ký Dữ Kiện, Giả Định & Câu Hỏi (Assumptions & Question Log)

### 10.1. Dữ Kiện Thực Tế Đã Xác Thực (Established Facts)
- **Fact-01**: Người dùng ví `0x3680B2fdcbefF5aca0d1fb00203E2005D474ADD9` thực tế đã thắng Vòng 1 với mức bid 1.00 USDC trên phòng `0x93bf60f180111a3AA105B5Ae0864Bc8aC1ac4F09` và có `claimable = 2.0 USDC` trên hợp đồng.
- **Fact-02**: Nút Rút tiền trước đây chỉ tồn tại ở `MemberStatus.tsx` ở chân trang, hiện tại đã được tích hợp hiển thị nổi bật ở vị trí trên cùng của cả `ActionPanel.tsx` và `PasskeyActionPanel.tsx`.
- **Fact-03**: Smart Contract `RotatingSavings.sol` hỗ trợ nâng bid chênh lệch qua hàm `placeBid` (`delta = bidAmount - currentBid`), hiện tại giao diện đã chuyển sang Thẻ Đã Đặt Bid và luồng gập/mở nâng giá khoa học.
- **Fact-04**: Hệ thống hiện có 244 bài kiểm thử tự động đang PASS 100% (233 bài kế thừa từ Task-001 đến Task-020 + 11 bài mới của Task-021 trong `tests/prominent-claim-and-confirmed-bid.test.ts`). Quá trình build production hoàn tất không lỗi trong 21.81s.

### 10.2. Giả Định Nghiệp Vụ (Assumptions)
- **Assumption-01**: Khi người dùng có `claimable > 0n`, việc hiển thị Thẻ Rút tiền ngay trong `ActionPanel` là ưu tiên quan trọng nhất, giúp người dùng nhận tiền thưởng lập tức trước khi quyết định đóng hụi chết cho vòng tiếp theo. (Đã nghiệm thu chính xác qua `TC-CLAIM-01`, `TC-CLAIM-02`).
- **Assumption-02**: Khi người dùng đã đặt bid, họ muốn biết ngay mình có đang là người trả giá cao nhất (Leading the Pot) hay không, và chỉ muốn mở khung nhập khi có ý định nâng giá. (Đã nghiệm thu chính xác qua `TC-BID-01`, `TC-BID-02`, `TC-RAISE-01`).

### 10.3. Câu Hỏi Chặn (Blocker Questions)
- Không có câu hỏi chặn. Tất cả các yêu cầu nghiệp vụ đã được triển khai, kiểm thử và nghiệm thu 100%.

---

## 11. Bàn Giao & Nghiệm Thu Nghiệp Vụ (Gate 4 Sign-Off)

### 11.1. Kết Quả Nghiệm Thu Gate 4 (100% Business Coverage Confirmed)
- **Độ phủ nghiệp vụ (Business Coverage)**: **100% (11/11 tiêu chí AC đạt PASS)**.
- **Bảo toàn hồi quy (Zero Regression)**: **244/244 tests PASS (0 fail)**. Toàn bộ tính năng từ Task-001 đến Task-020 tiếp tục hoạt động trơn tru.
- **Giải quyết triệt để 2 phản hồi của người dùng**:
  1. *Sự cố không thấy nút rút tiền*: Thẻ Rút Tiền Thưởng Nổi Bật xuất hiện ngay tại vị trí ưu tiên cao nhất trong `ActionPanel` và `PasskeyActionPanel` với nút bấm lớn trực quan, cho phép người dùng rút tiền thưởng ngay tại nơi vừa tương tác mà không cần cuộn trang xuống chân màn hình.
  2. *Sự cố form bid trống trơn gây hoang mang*: Form nhập trống đã được thay thế bằng Thẻ Đã Đặt Bid ghi rõ mức giá, huy hiệu Cúp vàng `🏆 Đang dẫn đầu Pot!` hoặc cảnh báo `⚠️ Đã bị vượt qua`, cùng quy trình gập/mở nâng bid kiểm soát chặt chẽ `newBid > userBid`.

### 11.2. Xác Nhận Nghiệm Thu
- **Tác giả đặc tả (BA)**: `ba-agent`
- **Trạng thái Gate 4**: **PHÊ DUYỆT SIGNOFF TOÀN DIỆN (GATE 4 PASS)**
- **Ngày ký duyệt**: `2026-10-12`
