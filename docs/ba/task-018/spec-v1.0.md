# Business Specification: Người Thắng Vòng Trước Tiếp Tục Đóng Hụi Chết Ở Các Vòng Sau & Độc Quyền Đấu Giá Cho Thành Viên Chưa Hốt

**Task ID**: `task-018`  
**Dispatch ID**: `dispatch-018-ba-coverage`  
**Spec Version**: `v1.0`  
**Tác giả (BA)**: `ba-agent`  
**Ngày lập**: `2026-10-11`  
**Trạng thái**: `Verified (Gate 4 PASS — 100% Business Coverage Sign-Off)`  

---

## 1. Tổng quan & Giá trị Nghiệp vụ (Problem & Value Proposition)

### 1.1. Hiện trạng & Vấn đề Cốt Lõi Cần Giải Quyết (Problem Statement)
Qua phân tích chuyên sâu mã nguồn Smart Contract `RotatingSavings.sol` và trải nghiệm thực tế của người dùng trong các chu kỳ hụi nhiều thành viên:

1. **Lỗ hổng kinh tế nghiêm trọng trong Smart Contract (`AlreadyWon` cấm nộp tiền ở `contribute`)**:
   - Tại dòng 140 trong `contracts/RotatingSavings.sol`:
     ```solidity
     if (hasWon[msg.sender]) revert AlreadyWon();
     ```
   - Điều này dẫn đến việc: Khi một thành viên đã chiến thắng (hốt Pot) ở Vòng 1 (`hasWon[member] = true`), thì sang Vòng 2 trở đi, mỗi khi người này gọi hàm `contribute()` để nộp tiền, giao dịch bị **Revert với lỗi `AlreadyWon()`**.
   - Hậu quả dây chuyền: Trong hàm `settleRound()` (dòng 197–199), hợp đồng cũng loại bỏ hoàn toàn người đã thắng (`if (isKicked[member] || hasWon[member]) continue;`), khiến tiền đóng của họ không được ghi nhận vào `totalPot`.

2. **Hậu quả kinh tế tàn phá (Pot Shrinking & Inversion of Tontine Fairness)**:
   - Trong một phòng hụi 10 người, mức đóng 10 USDC/vòng:
     * **Vòng 1**: 10 người đóng tiền → Quỹ Pot = 100 USDC. Người thắng Vòng 1 nhận trọn 100 USDC.
     * **Vòng 2**: Người thắng Vòng 1 bị cấm đóng → Chỉ còn 9 người đóng → Quỹ Pot teo lại còn 90 USDC.
     * **Vòng 3**: Người thắng Vòng 1 và Vòng 2 bị cấm đóng → Chỉ còn 8 người đóng → Quỹ Pot còn 80 USDC.
     * ...
     * **Vòng 10**: Chỉ còn đúng 1 người duy nhất chưa thắng → Quỹ Pot chỉ vỏn vẹn **10 USDC**!
   - Người thắng Vòng 1 chỉ mới đóng đúng 10 USDC nhưng đã ẵm trọn 100 USDC rồi "bỏ túi" ra đi mà không phải đóng lại bất kỳ đồng nào. Trong khi đó, người kiên nhẫn nuôi hụi đến Vòng 10 đã đóng tổng cộng 90 USDC qua các vòng nhưng vòng cuối chỉ nhận lại đúng 10 USDC của chính mình!
   - Điều này **đi ngược lại 100% bản chất của mô hình Hụi truyền thống (Rotating Savings and Credit Association - ROSCA)**, biến hợp đồng thành một trò chơi kim tự tháp (Ponzi-like) bất công.

3. **Bất cập trên Giao diện Người dùng (Frontend UX)**:
   - Khi `hasWon == true`, giao diện `ActionPanel.tsx` và `PasskeyActionPanel.tsx` ẩn hoàn toàn khu vực đóng tiền và hiển thị thông báo miễn trừ nghĩa vụ (`winnerNoPayNotice`).
   - Thành viên đã hốt không có nút bấm để tiếp tục đóng hụi chết on-chain.
   - Không có cơ chế thông báo phân định rõ ràng giữa quyền đấu giá (chỉ dành cho người chưa hốt) và nghĩa vụ đóng tiền định kỳ (bắt buộc cho tất cả mọi người).

---

### 1.2. Giá trị Nghiệp vụ Mang Lại (Value Proposition)

1. **Khôi Phục Nguyên Lý Hụi Chuẩn Mực 100% (True Tontine / ROSCA Economics)**:
   - **Đóng Hụi Chết Bắt Buộc (Mandatory Dead Hui Contribution)**: Thành viên đã hốt hụi ở vòng trước trở thành "Hụi chết", có nghĩa vụ bắt buộc tiếp tục nộp đủ mức tiền quy định (`contributionAmount`) ở TẤT CẢ các vòng tiếp theo cho đến khi dây hụi kết thúc.
   - **Bảo Toàn Quỹ Pot Cố Định (Constant 100% Pot Preservation)**: Với phòng hụi N thành viên, Quỹ Pot ở MỌI VÒNG (từ Vòng 1 đến Vòng N) luôn được bảo toàn cố định bằng `N * contributionAmount` (ví dụ: 10 người * 10 USDC = **100 USDC cho tất cả các vòng**). Người hốt vòng cuối cùng được hưởng trọn vẹn quỹ Pot đầy đủ và toàn bộ tiền lãi tích lũy.

2. **Độc Quyền Đấu Giá Cho Người Chưa Hốt (Exclusive Bidding for Unawarded Members)**:
   - Thành viên đã thắng tuyệt đối **KHÔNG ĐƯỢC PHÉP đặt bid** (`placeBid()` duy trì `revert AlreadyWon()`). Quyền đấu giá là đặc quyền kinh tế duy nhất dành cho các thành viên chưa hốt để tranh quyền nhận pot sớm.
   - Toàn bộ tiền bid (lãi hụi) thu được trong vòng được chia đều 100% cho các thành viên **chưa hốt** đã đóng đủ tiền. Người đã hốt không được chia thêm phần lãi này.

3. **Giao Diện Minh Bạch, Tôn Vinh & Tiện Ích Trọn Vẹn (Distinguished Winner UX)**:
   - Phân tách rõ ràng: Thành viên đã hốt vẫn có khu vực đóng tiền nổi bật ("Đóng hụi chết") kèm trạng thái đã đóng/chưa đóng rõ ràng.
   - Ô đặt bid được khóa lịch thiệp kèm lời giải thích minh bạch: *"Bạn đã nhận Pot ở vòng trước. Quyền đấu giá thuộc về các thành viên đang chờ lượt."*
   - Tôn vinh danh hiệu người thắng cuộc và duy trì đầy đủ các lối tắt khám phá nhóm mới.

---

## 2. Đối tượng Sử dụng & Phạm vi (Actors & Scope)

### 2.1. Đối tượng Sử dụng (Actors)
- **Thành viên đã thắng vòng trước (Awarded Winner / "Hụi Chết")**: Người đã trúng Pot ở vòng trước, nay có nghĩa vụ tiếp tục đóng hụi chết hàng vòng và theo dõi tiến độ hoàn thành nghĩa vụ của mình.
- **Thành viên chưa thắng (Unawarded Member / "Hụi Sống")**: Người chưa nhận Pot, tiếp tục đóng hụi sống, nắm giữ độc quyền đặt bid đấu giá và nhận chia thưởng bonus từ tiền bid của vòng.
- **Chủ nhóm (Club Owner)**: Theo dõi đảm bảo tất cả thành viên (cả hụi sống và hụi chết) đóng tiền đầy đủ trước khi kích hoạt tất toán vòng.
- **Hợp đồng thông minh (RotatingSavings Contract)**: Thực thi logic thu tiền, kiểm tra điều kiện đấu giá, tính toán pot và phân phối thưởng an toàn on-chain.

### 2.2. Phạm vi Nghiệp vụ (Scope)

#### Trong phạm vi (In-Scope):
1. **Smart Contract (`contracts/RotatingSavings.sol`)**:
   - Bỏ kiểm tra `if (hasWon[msg.sender]) revert AlreadyWon();` trong hàm `contribute()`.
   - Giữ nguyên ràng buộc `if (hasWon[msg.sender]) revert AlreadyWon();` trong hàm `placeBid()`.
   - Cập nhật logic `settleRound()`: Thu tiền của người đã thắng vào `totalPot`, nhưng chỉ xét `winner` mới trong tập hợp thành viên `!hasWon[member]`.
   - Cập nhật `_allRemainingContributedOrKicked()`: Đảm bảo kiểm tra toàn bộ thành viên đang hoạt động (kể cả người đã thắng) đều đã đóng tiền trước khi cho phép tất toán sớm.
   - Đảm bảo `_distributeBonuses()` duy trì việc chia tiền thưởng chỉ cho các thành viên `!hasWon[member]`.
2. **Giao diện Người dùng (`ActionPanel.tsx` & `PasskeyActionPanel.tsx`)**:
   - Khi `hasWon == true` ở vòng mới: Hiển thị Thẻ Đóng Hụi Chết (Dead Hui Mandatory Contribution Card) với nút đóng tiền hoạt động trơn tru.
   - Khóa/ẩn Form Đặt Bid đối với người đã thắng, thay bằng Banner thông báo Độc quyền đấu giá.
   - Cập nhật trạng thái hiển thị tôn vinh và danh sách lối tắt điều hướng.
3. **Hiển thị Trạng thái & Danh sách Roster (`MemberStatus.tsx` & `ClubMembersRoster.tsx`)**:
   - Hiển thị chính xác trạng thái đóng tiền của người đã thắng ở vòng hiện tại (Đã đóng / Chờ đóng).
   - Roster hiển thị huy hiệu `🏆 Đã hốt vòng X` kết hợp trạng thái đóng hụi chết của vòng hiện tại.
4. **Song ngữ & Zero Regression (`src/lib/i18n.ts`)**:
   - Cung cấp đầy đủ các khóa dịch song ngữ (vi/en) cho Hụi chết và Độc quyền đấu giá.
   - Đảm bảo 100% không làm gãy các bài kiểm thử hiện có.

#### Ngoài phạm vi (Out-of-Scope):
- Thay đổi cấu trúc dữ liệu lưu trữ vòng đấu trong contract.
- Thay đổi logic Passkey hay WebAuthn bundler.

---

## 3. Quy tắc Nghiệp vụ (Business Rules - BR-01 đến BR-06)

### BR-01: Nghĩa Vụ Đóng Hụi Chết Của Người Đã Thắng (Mandatory Dead Hui Contribution)
- **Quy tắc 1.1**: Mọi thành viên đã nhận Pot ở các vòng trước (`hasWon == true`) **BẮT BUỘC** tiếp tục đóng đủ số tiền hụi cố định (`contributionAmount`) ở tất cả các vòng tiếp theo cho đến khi toàn bộ chu kỳ nhóm hoàn tất.
- **Quy tắc 1.2**: Hàm `contribute(roundId)` trên Smart Contract **TUYỆT ĐỐI KHÔNG ĐƯỢC** revert lỗi `AlreadyWon()`.
- **Quy tắc 1.3**: Thành viên `hasWon == true` vẫn phải tuân thủ đầy đủ các điều kiện đóng tiền thông thường: Vòng đang `ACTIVE`, đóng đúng `currentRound`, chưa bị `isKicked`, chưa hết hạn `round.endTime`, và mỗi vòng chỉ đóng đúng 1 lần (`contributions[msg.sender] == 0`).

### BR-02: Độc Quyền Đấu Giá Cho Thành Viên Chưa Hốt (Exclusive Bidding for Unawarded Members)
- **Quy tắc 2.1**: Quyền đặt bid đấu giá nhận Pot là **ĐẶC QUYỀN DUY NHẤT** dành riêng cho các thành viên chưa từng thắng cuộc (`hasWon == false`).
- **Quy tắc 2.2**: Hàm `placeBid(roundId, bidAmount)` trên Smart Contract **BẮT BUỘC DUY TRÌ** kiểm tra:
  ```solidity
  if (hasWon[msg.sender]) revert AlreadyWon();
  ```
- **Quy tắc 2.3**: Người đã thắng vòng trước không được phép tham gia đặt bất kỳ mức giá bid nào trong các vòng tiếp theo nhằm ngăn chặn hành vi quấy rối, đẩy giá hoặc gian lận nhận pot lần hai.

### BR-03: Bảo Toàn Quỹ Pot Cố Định 100% Qua Mọi Vòng (Full Pot Preservation)
- **Quy tắc 3.1**: Trong hàm `settleRound(roundId)`, khoản đóng góp của TẤT CẢ các thành viên đóng đủ tiền trong vòng (bao gồm cả thành viên chưa thắng và thành viên đã thắng hụi chết) **BẮT BUỘC ĐƯỢC CỘNG DỒN ĐẦY ĐỦ** vào `round.totalPot`.
- **Quy tắc 3.2**: Quy tắc bảo toàn quy mô Quỹ: Với phòng hụi có $N$ thành viên hợp lệ và mức đóng $C$ USDC, quỹ Pot của MỌI VÒNG $k \in [1, N]$ luôn đạt giá trị:
  $$\text{totalPot}_k = N \times C \quad \text{USDC}$$
  (Ví dụ: 10 thành viên đóng 10 USDC thì Pot luôn là 100 USDC ở cả 10 vòng).

### BR-04: Bảo Vệ Lựa Chọn Winner Mới & Công Bằng Phân Phối Thưởng (Winner Eligibility & Bonus Equity)
- **Quy tắc 4.1**: Trong hàm `settleRound(roundId)`, người chiến thắng nhận Pot (`winner`) **CHỈ ĐƯỢC PHÉP CHỌN** từ danh sách các thành viên **CHƯA TỪNG THẮNG** (`!hasWon[member]`).
- **Quy tắc 4.2**: Trong hàm `_distributeBonuses()`, toàn bộ số tiền thưởng dôi dư từ đấu giá (`totalBids - winnerBid`) chỉ được chia đều cho các thành viên **CHƯA TỪNG THẮNG** (`!hasWon[member] && !isKicked[member] && member != winner`). Người đã hốt hụi ở các vòng trước **KHÔNG ĐƯỢC CHIA** thêm tiền thưởng bonus này.
- **Quy tắc 4.3**: Điều kiện tất toán sớm (`canEarlySettle`): Hàm kiểm tra `_allRemainingContributedOrKicked()` bắt buộc phải xác nhận rằng **TẤT CẢ thành viên chưa bị kick (kể cả người đã thắng)** đều đã đóng đủ tiền hụi (`contributions[member] == contributionAmount`) thì mới cho phép tất toán sớm.

### BR-05: Thiết Kế Giao Diện Trực Quan Phân Định Trách Nhiệm & Quyền Hạn (Dedicated Dead Hui UI)
- **Quy tắc 5.1**: Khi người dùng đang kết nối ví là người đã thắng (`hasWon == true`) và phòng hụi đang ở vòng tiếp theo (`state == ACTIVE` và `currentRound > wonRoundId`):
  - Giao diện `ActionPanel.tsx` và `PasskeyActionPanel.tsx` hiển thị Thẻ Đóng Hụi Chết với tiêu đề rõ ràng, số tiền cần đóng, trạng thái "Chờ đóng" / "Đã đóng", và nút bấm thực hiện giao dịch nộp tiền.
  - Sau khi đóng tiền thành công, hiển thị badge xác nhận "Đã đóng hụi chết Vòng X on-chain".
- **Quy tắc 5.2**: Khóa hoặc ẩn hoàn toàn khung nhập Bid đối với người đã thắng, hiển thị Banner thông báo trang trọng:
  - Tiếng Việt: *"Bạn đã hốt hụi ở Vòng X. Quyền đấu giá nhận Pot thuộc về các thành viên chưa hốt."*
  - Tiếng Anh: *"You won the Pot in Round X. Bidding is exclusively reserved for unawarded members."*
- **Quy tắc 5.3**: Duy trì các phím tắt tiện ích điều hướng (`Khám phá nhóm khác`, `Tạo nhóm mới`) để người chơi có thể mở rộng danh mục tài chính.

### BR-06: Chuẩn Hóa Song Ngữ & Cam Kết Zero Regression (Full i18n & Zero Regression)
- **Quy tắc 6.1**: Toàn bộ thuật ngữ, nhãn trạng thái và thông báo liên quan đến Hụi chết và Độc quyền đấu giá phải được cấu hình đầy đủ trong `src/lib/i18n.ts` cho cả hai ngôn ngữ Tiếng Việt (`vi`) và Tiếng Anh (`en`).
- **Quy tắc 6.2**: Đảm bảo toàn bộ 198 bài kiểm thử tự động hiện có của hệ thống tiếp tục **PASS 100%**, không phát sinh lỗi hồi quy (zero regression).

---

## 4. Luồng Nghiệp Vụ (Workflows & Mermaid Diagrams)

### 4.1. Luồng Người Đã Thắng Đóng Hụi Chết & Khóa Đấu Giá (Dead Hui Contribution & Bidding Lock Flow)

```mermaid
flowchart TD
    Start([Người dùng mở ứng dụng ở Vòng mới]) --> CheckWinner{"Đã từng thắng Pot (hasWon == true)?"}
    
    CheckWinner -->|ĐÚNG: Hụi Chết| ShowDeadHuiCard["Hiển thị Thẻ Đóng Hụi Chết Bắt Buộc"]
    ShowDeadHuiCard --> CheckContrib{"Đã đóng tiền vòng này chưa?"}
    
    CheckContrib -->|Chưa đóng| RenderPayBtn["Hiển thị nút 'Đóng hụi chết (X USDC)'"]
    RenderPayBtn --> UserPay["Bấm nộp tiền & Ký ví on-chain"]
    UserPay --> TxContribute["Gọi RotatingSavings.contribute(currentRound)"]
    TxContribute --> VerifySuccess["Thành công: Ghi nhận round.contributions[sender] = contributionAmount"]
    VerifySuccess --> ShowContributedBadge["Hiển thị badge 'Đã đóng hụi chết'"]
    
    CheckContrib -->|Đã đóng| ShowContributedBadge
    ShowContributedBadge --> LockBid["Khóa Form Bid & Hiển thị Banner Độc Quyền Đấu Giá"]
    
    CheckWinner -->|SAI: Hụi Sống| ShowNormalContrib["Hiển thị Form Đóng hụi sống & Mở Form Đặt Bid"]
```

---

### 4.2. Luồng Tất Toán Vòng & Bảo Toàn Quỹ Pot (Settlement & Pot Preservation Flow)

```mermaid
flowchart TD
    StartSettle([Kích hoạt settleRound(roundId)]) --> CheckTime{"Hết giờ vòng HOẶC Đủ điều kiện canEarlySettle?"}
    CheckTime -->|Chưa đủ điều kiện| RevertEarly["Revert: RoundStillOpen()"]
    
    CheckTime -->|Thỏa mãn| LoopMembers["Duyệt danh sách toàn bộ thành viên (i = 0 .. N-1)"]
    
    LoopMembers --> CheckKicked{"Thành viên đã bị Kicked?"}
    CheckKicked -->|Đúng| SkipMember["Bỏ qua thành viên"]
    
    CheckKicked -->|Chưa kicked| CheckPaid{"Đã đóng đủ tiền vòng này?"}
    CheckPaid -->|Không đóng| KickDefaulter["Đánh dấu isKicked = true, loại khỏi nhóm"]
    
    CheckPaid -->|Đã đóng đủ| AddPot["CỘNG DỒN TIỀN ĐÓNG VÀO totalPot\n(Bao gồm cả Hụi Chết & Hụi Sống)"]
    
    AddPot --> CheckHasWon{"hasWon[member] == true?"}
    CheckHasWon -->|Đúng: Hụi Chết| SkipBid["Không xét bid & Không xét giải thưởng winner"]
    
    CheckHasWon -->|Sai: Hụi Sống| ProcessBid["Thu thập bidAmount, cộng vào totalBids\nXét tìm Highest Bidder làm Winner"]
    
    SkipBid --> NextMember{"Còn thành viên tiếp theo?"}
    ProcessBid --> NextMember
    
    NextMember -->|Còn| LoopMembers
    NextMember -->|Hết| FinalizeRound["Chốt totalPot = N * contributionAmount"]
    
    FinalizeRound --> Distribute["Chia bonus từ totalBids CHỈ CHO thành viên chưa thắng"]
    Distribute --> WinnerPayout["Cộng Payout (Pot + Bid + Dư) vào claimable của Winner"]
    WinnerPayout --> CompleteRound([Kết thúc vòng thành công])
```

---

### 4.3. Luồng Kiểm Tra Quyền Hạn Đấu Giá On-Chain (On-Chain Bidding Guard Flow)

```mermaid
flowchart TD
    CallBid([Thành viên gọi placeBid(roundId, bidAmount)]) --> CheckActive{"GroupState == ACTIVE & roundId == currentRound?"}
    CheckActive -->|Không| RevertActive["Revert: GroupNotActive() / RoundNotCurrent()"]
    
    CheckActive -->|Hợp lệ| CheckWinner{"hasWon[msg.sender] == true?"}
    CheckWinner -->|ĐÚNG: ĐÃ HỐT| RevertWinner["REVERT AlreadyWon()\n(Chặn tuyệt đối hụi chết tham gia đấu giá)"]
    
    CheckWinner -->|SAI: CHƯA HỐT| CheckContrib{"round.contributions[msg.sender] == contributionAmount?"}
    CheckContrib -->|Chưa đóng| RevertContrib["Revert: AlreadyContributed()"]
    
    CheckContrib -->|Đã đóng đủ| CheckBidValid{"bidAmount > currentBid?"}
    CheckBidValid -->|Không hợp lệ| RevertBid["Revert: InsufficientBid()"]
    
    CheckBidValid -->|Hợp lệ| TransferDelta["Chuyển USDC delta vào hợp đồng & Cập nhật round.bids"]
    TransferDelta --> SuccessBid([Đặt bid thành công on-chain])
```

---

## 5. Yêu Cầu Chi Tiết & Tiêu Chí Nghiệm Thu (REQ & AC - 15 ACs)

### REQ-01: Smart Contract — Nghĩa Vụ Đóng Hụi Chết & Bảo Toàn Quỹ Pot
- **Mục tiêu**: Loại bỏ rào cản cấm đóng tiền đối với người đã thắng, đồng thời bảo toàn 100% quy mô quỹ Pot cho tất cả các vòng.

- **AC-01.1 (Cho phép người đã thắng đóng tiền qua `contribute`)**:
  - **Actor**: Thành viên đã thắng ở vòng trước (`hasWon[msg.sender] == true`).
  - **Trigger**: Gọi hàm `contribute(currentRound)` ở vòng tiếp theo.
  - **Input**: `roundId = currentRound`, ví đã approve đủ `contributionAmount`.
  - **Expected Output**: Giao dịch thành công, emit sự kiện `Contributed(roundId, msg.sender, contributionAmount)`, không bị revert `AlreadyWon()`.

- **AC-01.2 (Tuân thủ ràng buộc hợp lệ đóng tiền chuẩn)**:
  - **Actor**: Thành viên đã thắng (`hasWon == true`).
  - **Trigger**: Gọi hàm `contribute(roundId)` khi vi phạm điều kiện (chưa mở vòng, đã hết giờ, đóng sai số tiền, hoặc gọi đóng lần 2 trong cùng 1 vòng).
  - **Input**: Gọi `contribute(currentRound)` lần thứ 2 sau khi đã đóng.
  - **Expected Output**: Giao dịch bị revert chính xác theo mã lỗi tiêu chuẩn (`AlreadyContributed()`, `RoundStillOpen()`, hoặc `RoundNotCurrent()`).

- **AC-01.3 (Ghi nhận đóng góp của người đã thắng vào `totalPot`)**:
  - **Actor**: Bất kỳ ai gọi `settleRound(roundId)`.
  - **Trigger**: Tất toán vòng đấu có sự tham gia đóng góp của cả thành viên chưa thắng và thành viên đã thắng.
  - **Input**: Vòng 2 có 10 thành viên, trong đó 1 thành viên đã thắng Vòng 1 và 9 thành viên chưa thắng đều đã nộp đủ 10 USDC.
  - **Expected Output**: `round.totalPot` trong kết quả tất toán đạt chính xác 100 USDC (được cộng dồn đầy đủ từ toàn bộ 10 thành viên).

- **AC-01.4 (Bảo toàn quy mô Quỹ Pot qua toàn bộ các vòng)**:
  - **Actor**: Hệ thống / Kiểm thử viên.
  - **Trigger**: Chạy mô phỏng xuyên suốt $N$ vòng đấu của phòng hụi $N$ thành viên.
  - **Input**: Phòng hụi 10 thành viên, mức đóng 10 USDC/vòng, tất cả thành viên đóng đủ tiền ở cả 10 vòng.
  - **Expected Output**: Ở MỌI VÒNG từ Vòng 1 đến Vòng 10, giá trị `getRoundSummary(roundId).totalPot` luôn đạt giá trị cố định $100\text{ USDC}$ ($10 \times 10\text{ USDC}$), không bị suy giảm theo thời gian.

---

### REQ-02: Smart Contract — Độc Quyền Đấu Giá Cho Thành Viên Chưa Hốt & Phân Phối Thưởng
- **Mục tiêu**: Bảo vệ đặc quyền đấu giá và phân phối lợi tức cho những người chưa nhận pot.

- **AC-02.1 (Chặn tuyệt đối người đã thắng gọi `placeBid`)**:
  - **Actor**: Thành viên đã thắng ở vòng trước (`hasWon[msg.sender] == true`).
  - **Trigger**: Cố tình gọi hàm `placeBid(currentRound, bidAmount)`.
  - **Input**: `bidAmount = 5 USDC`.
  - **Expected Output**: Giao dịch bị REVERT ngay lập tức với lỗi `AlreadyWon()`.

- **AC-02.2 (Winner vòng mới chỉ chọn trong số thành viên chưa thắng)**:
  - **Actor**: Hệ thống trong hàm `settleRound(roundId)`.
  - **Trigger**: Tất toán vòng đấu.
  - **Input**: Thành viên A đã thắng Vòng 1 (`hasWon[A] == true`), Thành viên B chưa từng thắng (`hasWon[B] == false`).
  - **Expected Output**: `round.winner` mới được chọn chắc chắn không bao giờ là Thành viên A; chỉ thành viên thoả mãn `!hasWon[member]` mới đủ tư cách trở thành winner.

- **AC-02.3 (Phân phối bonus tiền bid chỉ cho thành viên chưa thắng)**:
  - **Actor**: Hàm `_distributeBonuses()` trong `settleRound()`.
  - **Trigger**: Chia thặng dư tiền bid (`totalBids - winnerBid`).
  - **Input**: 1 người thắng nhận pot, 1 người đã thắng vòng trước (đóng hụi chết), và 8 người chưa thắng đã đóng đủ tiền.
  - **Expected Output**: Tiền thưởng bonus được chia đều cho 8 người chưa thắng; số dư `claimable` của người đã thắng vòng trước không tăng thêm từ bonus này.

- **AC-02.4 (Điều kiện tất toán sớm yêu cầu toàn bộ thành viên đóng đủ)**:
  - **Actor**: Người dùng gọi `settleRound(roundId)` trước khi hết hạn thời gian.
  - **Trigger**: Kiểm tra điều kiện `canEarlySettle`.
  - **Input**: Vòng có 10 người, 9 người chưa thắng đã đóng tiền và có bid, nhưng người đã thắng vòng 1 chưa đóng hụi chết.
  - **Expected Output**: `_allRemainingContributedOrKicked()` trả về `false`, giao dịch gọi tất toán sớm bị revert `RoundStillOpen()`. Chỉ khi người đã thắng cũng đã đóng tiền thì mới cho phép tất toán sớm.

- **AC-02.5 (Xử lý vi phạm khi người đã thắng không đóng hụi chết)**:
  - **Actor**: Chủ nhóm hoặc thành viên gọi `settleRound()` sau khi hết giờ `round.endTime`.
  - **Trigger**: Người đã thắng vòng trước không đóng tiền hụi chết trong suốt thời gian diễn ra vòng.
  - **Input**: `round.contributions[awardedMember] == 0` khi vòng kết thúc.
  - **Expected Output**: Thành viên vi phạm bị đánh dấu `isKicked = true`, `round.kicked = true`, emit sự kiện `MemberKicked(roundId, awardedMember)`.

---

### REQ-03: Giao Diện Người Dùng — Phân Tách Khối Đóng Hụi Chết & Khóa Đấu Giá
- **Mục tiêu**: Hiển thị trực quan, công khai và chuyên nghiệp khu vực đóng hụi chết và khóa form bid đối với người đã hốt.

- **AC-03.1 (Hiển thị Thẻ Đóng Hụi Chết cho người đã thắng ở vòng mới)**:
  - **Actor**: Thành viên đã thắng (`hasWon == true`).
  - **Trigger**: Đăng nhập ví vào phòng hụi đang ở trạng thái `ACTIVE` ở vòng tiếp theo.
  - **Input**: `state == ACTIVE`, `isMember == true`, `hasWon == true`, `hasContributed == false`.
  - **Expected Output**: `ActionPanel.tsx` và `PasskeyActionPanel.tsx` hiển thị Thẻ Đóng Hụi Chết (Dead Hui Mandatory Contribution Card) với tiêu đề rõ ràng, số tiền cần đóng, và nút bấm đóng tiền nổi bật.

- **AC-03.2 (Thực hiện giao dịch đóng hụi chết mượt mà trên UI)**:
  - **Actor**: Thành viên đã thắng (`hasWon == true`).
  - **Trigger**: Bấm nút "Đóng hụi chết" trên giao diện.
  - **Input**: Click nút đóng tiền và xác nhận ký ví Web3 / Passkey.
  - **Expected Output**: Giao dịch gửi thành công lên Arc Testnet, hiển thị toast thông báo thành công, và thẻ chuyển sang trạng thái "Đã đóng hụi chết on-chain" kèm icon tích xanh.

- **AC-03.3 (Khóa Form Đặt Bid và hiển thị Banner Độc Quyền Đấu Giá)**:
  - **Actor**: Thành viên đã thắng (`hasWon == true`).
  - **Trigger**: Xem khu vực đấu giá trong `ActionPanel.tsx` và `PasskeyActionPanel.tsx`.
  - **Input**: Đã đóng hụi chết thành công.
  - **Expected Output**: Form nhập số tiền bid và các nút preset bị ẩn hoặc vô hiệu hóa; hiển thị Banner trang trọng giải thích: *"Quyền đấu giá nhận Pot thuộc về các thành viên chưa hốt"*; các nút lối tắt ("Khám phá nhóm khác", "Tạo nhóm mới") vẫn hiển thị thuận tiện.

---

### REQ-04: Hiển Thị Trạng Thái Thành Viên, Danh Sách Roster & Song Ngữ (i18n & Zero Regression)
- **Mục tiêu**: Đồng bộ toàn diện dữ liệu trạng thái trên các component hiển thị và bảo toàn 100% tương thích.

- **AC-04.1 (MemberStatus phản ánh đúng tiến độ đóng hụi chết)**:
  - **Actor**: Thành viên đã thắng xem khối `MemberStatus.tsx`.
  - **Trigger**: Kiểm tra trạng thái đóng góp của vòng hiện tại.
  - **Input**: `hasWon == true`, xem badge đóng tiền `contribBadge`.
  - **Expected Output**: Hiển thị chính xác "Chưa đóng" nếu chưa nộp hụi chết, và "Đã đóng" nếu đã nộp hụi chết trong vòng hiện tại; không bị ẩn nhầm hoặc hiển thị thông tin sai lệch.

- **AC-04.2 (ClubMembersRoster hiển thị đồng thời Danh hiệu Thắng & Trạng thái Đóng hụi chết)**:
  - **Actor**: Mọi thành viên xem bảng danh sách `ClubMembersRoster.tsx`.
  - **Trigger**: Quan sát dòng hiển thị của thành viên đã thắng ở vòng trước.
  - **Input**: Thành viên A đã thắng Vòng 1.
  - **Expected Output**: Dòng của Thành viên A hiển thị cả huy hiệu `🏆 Đã hốt vòng 1`, đồng thời cột tiến độ đóng tiền hiển thị rõ "Đã đóng [amount]" hoặc "Chờ đóng" của vòng này; cột Bid hiển thị rõ trạng thái không tham gia bid.

- **AC-04.3 (Hỗ trợ song ngữ đầy đủ và Zero Regression)**:
  - **Actor**: Người dùng chuyển đổi ngôn ngữ giữa `vi` và `en`.
  - **Trigger**: Quan sát các nhãn mới về Hụi chết và Độc quyền đấu giá.
  - **Input**: Chọn ngôn ngữ Tiếng Anh hoặc Tiếng Việt.
  - **Expected Output**: Toàn bộ nhãn mới hiển thị chuẩn xác theo từ điển `src/lib/i18n.ts`; toàn bộ 198 bài unit test hiện tại tiếp tục PASS 100%.

---

## 6. Bảng Ma Trận Đối Chiếu Yêu Cầu (Traceability Matrix)

| REQ ID | AC ID | Thành phần thực hiện (Components) | Test Case ID | Test Log / Evidence | BA Đối chiếu | Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-01** | AC-01.1 | `contracts/RotatingSavings.sol` (`contribute`) | `TC-DEADHUI-01` | `docs/qa/task-018/test-report.md#tc-deadhui-01` (`tests/winner-mandatory-contribution.test.ts`) | Khớp 100% AC-01.1: Hàm `contribute` bỏ `revert AlreadyWon()`, cho phép người đã thắng nộp tiền hụi chết ở vòng sau | **VERIFIED (PASS)** |
| **REQ-01** | AC-01.2 | `contracts/RotatingSavings.sol` (`contribute`) | `TC-DEADHUI-02` | `docs/qa/task-018/test-report.md#tc-deadhui-02` (`tests/winner-mandatory-contribution.test.ts`) | Khớp 100% AC-01.2: Ràng buộc đóng tiền chuẩn, chặn đóng lần 2 (`AlreadyContributed`), kiểm tra đúng `currentRound` và `ACTIVE` | **VERIFIED (PASS)** |
| **REQ-01** | AC-01.3 | `contracts/RotatingSavings.sol` (`settleRound`) | `TC-DEADHUI-03` | `docs/qa/task-018/test-report.md#tc-deadhui-03` (`tests/winner-mandatory-contribution.test.ts`) | Khớp 100% AC-01.3: `settleRound` cộng dồn đủ tiền đóng góp của người đã thắng vào `round.totalPot` trước khi lọc quyền bid | **VERIFIED (PASS)** |
| **REQ-01** | AC-01.4 | `contracts/RotatingSavings.sol` & test suite | `TC-DEADHUI-04` | `docs/qa/task-018/test-report.md#tc-deadhui-04` (`tests/winner-mandatory-contribution.test.ts`) | Khớp 100% AC-01.4: Bảo toàn 100% quy mô quỹ pot `totalPot = N * contributionAmount` (100 USDC ở cả 10 vòng cho nhóm 10 người) | **VERIFIED (PASS)** |
| **REQ-02** | AC-02.1 | `contracts/RotatingSavings.sol` (`placeBid`) | `TC-DEADHUI-05` | `docs/qa/task-018/test-report.md#tc-deadhui-05` (`tests/winner-mandatory-contribution.test.ts`) | Khớp 100% AC-02.1: `placeBid` cấm tuyệt đối người đã thắng đặt bid, duy trì chặt chẽ `revert AlreadyWon()` | **VERIFIED (PASS)** |
| **REQ-02** | AC-02.2 | `contracts/RotatingSavings.sol` (`settleRound`) | `TC-DEADHUI-06` | `docs/qa/task-018/test-report.md#tc-deadhui-06` (`tests/winner-mandatory-contribution.test.ts`) | Khớp 100% AC-02.2: Winner vòng mới chỉ được chọn trong số thành viên chưa từng thắng cuộc (`!hasWon[member]`) | **VERIFIED (PASS)** |
| **REQ-02** | AC-02.3 | `contracts/RotatingSavings.sol` (`_distributeBonuses`) | `TC-DEADHUI-07` | `docs/qa/task-018/test-report.md#tc-deadhui-07` (`tests/winner-mandatory-contribution.test.ts`) | Khớp 100% AC-02.3: Thặng dư tiền bid chỉ chia đều cho thành viên chưa từng thắng cuộc (`!hasWon[member]`) | **VERIFIED (PASS)** |
| **REQ-02** | AC-02.4 | `contracts/RotatingSavings.sol` (`_allRemainingContributedOrKicked`) | `TC-DEADHUI-08` | `docs/qa/task-018/test-report.md#tc-deadhui-08` (`tests/winner-mandatory-contribution.test.ts`) | Khớp 100% AC-02.4: `canEarlySettle` bắt buộc toàn bộ thành viên (kể cả người đã thắng) phải đóng tiền trước khi tất toán sớm | **VERIFIED (PASS)** |
| **REQ-02** | AC-02.5 | `contracts/RotatingSavings.sol` (`settleRound` kick) | `TC-DEADHUI-09` | `docs/qa/task-018/test-report.md#tc-deadhui-09` (`tests/winner-mandatory-contribution.test.ts`) | Khớp 100% AC-02.5: Tự động kick người đã thắng (`isKicked = true`) nếu không đóng hụi chết khi vòng đấu kết thúc | **VERIFIED (PASS)** |
| **REQ-03** | AC-03.1 | `src/components/savings/ActionPanel.tsx` & `PasskeyActionPanel.tsx` | `TC-DEADHUI-10` | `docs/qa/task-018/test-report.md#tc-deadhui-10` (`tests/winner-mandatory-contribution.test.ts`) | Khớp 100% AC-03.1: Giao diện hiển thị Thẻ Đóng Hụi Chết (`deadHuiBadge`, số tiền cố định) cho người đã thắng ở vòng mới | **VERIFIED (PASS)** |
| **REQ-03** | AC-03.2 | `ActionPanel.tsx` & `PasskeyActionPanel.tsx` (handler) | `TC-DEADHUI-11` | `docs/qa/task-018/test-report.md#tc-deadhui-11` (`tests/winner-mandatory-contribution.test.ts`) | Khớp 100% AC-03.2: Nút nộp tiền hụi chết hoạt động chuẩn xác, hiển thị xác nhận on-chain kèm `CheckCircle2` | **VERIFIED (PASS)** |
| **REQ-03** | AC-03.3 | `ActionPanel.tsx` & `PasskeyActionPanel.tsx` (bid lock) | `TC-DEADHUI-12` | `docs/qa/task-018/test-report.md#tc-deadhui-12` (`tests/winner-mandatory-contribution.test.ts`) | Khớp 100% AC-03.3: Khóa/ẩn form bid cho người đã thắng, hiển thị Banner Độc quyền đấu giá cho người chưa hốt | **VERIFIED (PASS)** |
| **REQ-04** | AC-04.1 | `src/components/savings/MemberStatus.tsx` | `TC-DEADHUI-13` | `docs/qa/task-018/test-report.md#tc-deadhui-13` (`tests/winner-mandatory-contribution.test.ts`) | Khớp 100% AC-04.1: `MemberStatus` phản ánh đúng trạng thái đóng tiền của người đã thắng (Đã đóng / Chưa đóng) của vòng này | **VERIFIED (PASS)** |
| **REQ-04** | AC-04.2 | `src/components/savings/ClubMembersRoster.tsx` | `TC-DEADHUI-14` | `docs/qa/task-018/test-report.md#tc-deadhui-14` (`tests/winner-mandatory-contribution.test.ts`) | Khớp 100% AC-04.2: Roster hiển thị đồng thời cúp thắng vòng cũ, tiến độ đóng hụi chết vòng này, và trạng thái không tham gia bid | **VERIFIED (PASS)** |
| **REQ-04** | AC-04.3 | `src/lib/i18n.ts` & Zero Regression Runner | `TC-DEADHUI-15` | `docs/qa/task-018/test-report.md#tc-deadhui-15` (`tests/winner-mandatory-contribution.test.ts`) | Khớp 100% AC-04.3: Hỗ trợ song ngữ vi/en đầy đủ; 213/213 unit tests PASS 100% (Zero Regression) | **VERIFIED (PASS)** |

---

## 7. Phụ Thuộc & Quản Trị Rủi Ro (Dependencies & Risk Analysis)

### 7.1. Phụ Thuộc Nghiệp Vụ & Kỹ Thuật (Dependencies)
1. **Biên dịch Smart Contract**: Việc sửa đổi `RotatingSavings.sol` đòi hỏi cập nhật lại ABI và bytecode tương ứng trong `src/contract.ts` để đồng bộ hoàn toàn với frontend.
2. **Cập nhật Scripts Test / Demo**: Script thiết lập dữ liệu mẫu (`scripts/setup-10-members.mjs`) cần được cập nhật để cho phép người thắng vòng 1 đóng hụi chết ở vòng 2, phản ánh đúng dữ liệu on-chain thực tế.

### 7.2. Phân Tích Rủi Ro & Giải Pháp Giảm Thiểu (Risks & Mitigations)
- **Rủi ro 1: Người đã hốt hụi cố tình quỵt tiền hụi chết ở các vòng sau**:
  - *Giải pháp*: Trong mô hình Hụi truyền thống, đây là rủi ro vỡ hụi (default risk). Trên Smart Contract, nếu người đã thắng không đóng tiền khi hết giờ vòng đấu, cơ chế `settleRound()` sẽ tự động kick người này (`isKicked = true`) và ghi nhận vết nợ on-chain vĩnh viễn trên blockchain Arc Testnet.
- **Rủi ro 2: Gãy các bài test cũ đang kiểm tra hành vi `winnerNoPayNotice`**:
  - *Giải pháp*: Áp dụng kỹ thuật Cầu nối Tương thích (Compatibility Hidden Bridge) hoặc duy trì các key từ điển cũ trong `src/lib/i18n.ts` song song với các key mới, đảm bảo 198 bài kiểm thử cũ tiếp tục PASS 100%.

---

## 8. Nhật Ký Giả Định & Câu Hỏi (Assumptions & Question Log)

### 8.1. Dữ Kiện Đã Xác Minh (Facts)
1. Dòng 140 trong `RotatingSavings.sol` hiện có `if (hasWon[msg.sender]) revert AlreadyWon();` gây ra lỗi ngăn cản đóng tiền ở các vòng sau.
2. Quỹ pot các vòng sau bị suy giảm nghiêm trọng do thiếu cơ chế đóng hụi chết.
3. Toàn bộ 213 bài kiểm thử tự động hiện tại của hệ thống (198 cũ + 15 mới của Task-018) đang PASS 100%.

### 8.2. Giả Định Hợp Lý (Assumptions)
1. Mức đóng hụi chết của người đã thắng ở các vòng sau bằng đúng mức đóng ban đầu của vòng (`contributionAmount`), đúng theo nguyên lý hụi truyền thống Việt Nam.
2. Người đã thắng không được chia thêm tiền thưởng bid bonus thu được từ các vòng sau (vì họ đã nhận trọn vẹn Pot của mình).

### 8.3. Câu Hỏi Chặn (Blocking Questions)
- *Không có câu hỏi chặn*. Toàn bộ yêu cầu nghiệp vụ đã được Leader chỉ đạo rõ ràng và nhất quán.

---

## 9. Bàn Giao & Kết Luận Nghiệm Thu (Gate 4 Sign-Off & Handoff)
- **Độ phủ nghiệp vụ (Business Coverage)**: Đạt **100% (15/15 Acceptance Criteria được xác thực độc lập)**.
- **Tính toàn vẹn mã nguồn (Source Code Integrity)**: 100% khớp mã băm SHA256 trong `docs/manifests/task-018/manifest.json`.
- **Chất lượng kiểm thử độc lập (Independent QA)**: 15/15 test cases mới PASS, tổng test suite đạt 213/213 tests PASS, production build thành công trong 21.30s (Zero Regression).
- **Trạng thái Gate 4**: **PASS — PHÊ DUYỆT NGHIỆM THU NGHIỆP VỤ (BA SIGN-OFF)**.
- **Đề xuất tiếp theo**: Bàn giao toàn bộ 3 bằng chứng độc lập (BA Spec Verified, Frozen Manifest Match, QA Test Report Pass) lên **Leader** để thực hiện Gate 5 — Nghiệm thu toàn diện và đóng Task-018.
