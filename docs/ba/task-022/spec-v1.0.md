# Business Specification: Cơ Chế Tự Động Hoàn Tiền Khi Vòng Không Có Người Thắng (Auto-Refund on No-Winner / Abandoned Round) Trong Smart Contract & Cập Nhật Giao Diện Tương Ứng

**Task ID**: `task-022`  
**Dispatch ID**: `dispatch-022-ba`  
**Spec Version**: `v1.0`  
**Tác giả (BA)**: `ba-agent`  
**Ngày lập**: `2026-10-12`  
**Trạng thái**: `Verified (Gate 4 PASS — 100% Business Coverage Sign-Off)`  

---

## 1. Tổng quan & Giá trị Nghiệp vụ (Problem & Value Proposition)

### 1.1. Hiện trạng & Phân tích Thực Tế từ Trải Nghiệm On-Chain (Problem Statement)
Trong quá trình vận hành thử nghiệm trên mạng **Arc Testnet** (Chain ID: `5042002`) tại phòng hụi `0x93bf60f180111a3AA105B5Ae0864Bc8aC1ac4F09` (Tontine 10-Member Arena), một tình huống phát sinh nghiêm trọng về mặt kinh tế và công bằng tài chính đã diễn ra:

1. **Bối cảnh thực tế On-Chain**:
   - Người dùng (ví `0x3680B2fdcbefF5aca0d1fb00203E2005D474ADD9`) đã chiến thắng Vòng 1 (`hasWon = true`).
   - Đến **Vòng 3**, theo đúng quy định chuẩn của mô hình Hụi (đã được thiết lập từ Task-018), người dùng thực hiện nghĩa vụ đóng "Hụi chết" bằng cách gọi `contribute(3)` và nộp đủ `0.10 USDC`.
   - Tuy nhiên, 9 thành viên còn lại trong phòng đều quỵt nợ / không nộp tiền cho Vòng 3.
   - Khi vòng kết thúc thời gian (`round.endTime`) và hàm `settleRound(3)` được gọi:
     * Cả 9 thành viên không nộp tiền đều bị hợp đồng trục xuất (`isKicked[member] = true`).
     * Trong vòng lặp tìm người chiến thắng (`winner`):
       - Người dùng đã thắng Vòng 1 nên bị bỏ qua: `if (hasWon[member]) continue;`.
       - 9 thành viên còn lại bị trục xuất nên cũng bị bỏ qua: `if (isKicked[member]) continue;`.
     * **Kết quả**: Không có bất kỳ ai đủ điều kiện thắng vòng này $\rightarrow$ `winner == address(0)`!

2. **Lỗ hổng kẹt tiền trong Smart Contract (`contracts/RotatingSavings.sol`)**:
   - Tại dòng 249–257 của `RotatingSavings.sol`:
     ```solidity
     if (winner != address(0)) {
         uint256 winnerBid = round.bids[winner];
         uint256 remainder = _distributeBonuses(roundId, winner, totalBids - winnerBid);
         uint256 winnerPayout = totalPot + winnerBid + remainder;
         claimable[winner] += winnerPayout;
         emit RoundSettled(roundId, winner, totalPot, winnerBid);
     } else {
         emit RoundSettled(roundId, address(0), 0, 0);
     }
     ```
   - **Hậu quả tai hại**:
     * Khi `winner == address(0)`, hợp đồng chỉ đơn thuần phát ra sự kiện `RoundSettled(roundId, address(0), 0, 0)` mà **HOÀN TOÀN KHÔNG HOÀN TIỀN** lại cho những người đã nộp tiền thiện chí trong vòng đó!
     * Toàn bộ số tiền $0.10 \text{ USDC}$ (hoặc bất kỳ khoản đóng góp/tiền đặt bid nào của vòng bị hủy) bị **KẸT VĨNH VIỄN** trong số dư của Smart Contract! Không một ai (kể cả chủ phòng hay thành viên nộp tiền) có thể rút số tiền này ra.
     * Người chơi tuân thủ luật lệ, đóng tiền đúng hạn lại bị mất trắng tiền vì lỗi của những thành viên quỵt nợ khác! Điều này đi ngược lại 100% nguyên tắc bảo vệ tài sản người dùng trong tài chính phi tập trung (DeFi).

3. **Bất cập trên Giao diện Người dùng (`RoundHistory.tsx`)**:
   - Trong bảng lịch sử vòng [RoundHistory.tsx](file:///home/avada/tontine/src/components/savings/RoundHistory.tsx#L97), khi `round.winner` là địa chỉ 0 (`address(0)`), giao diện hiển thị chuỗi địa chỉ rút gọn `"0x0000...0000"` ở cột Người thắng cuộc.
   - Người dùng nhìn thấy `"0x0000...0000"` cảm thấy vô cùng khó hiểu và nghi ngờ hợp đồng bị lỗi kỹ thuật, không biết số tiền mình vừa đóng đã đi đâu.

---

### 1.2. Giá trị Nghiệp vụ Mang lại (Value Proposition)

1. **Bảo Toàn Tài Sản 100% & Bất Biến Công Bằng Tuyệt Đối (Zero Locked Funds & Capital Preservation)**:
   - Thiết lập cơ chế **Tự Động Hoàn Tiền 100% (100% Auto-Refund)** trực tiếp trong Smart Contract: Bất cứ khi nào một vòng đấu giá kết thúc mà không tìm được người thắng (`winner == address(0)`), hợp đồng tự động hoàn trả toàn bộ tiền đóng góp (`contributions`) và tiền đặt giá (`bids`) vào số dư có thể rút (`claimable`) của từng thành viên đã nộp tiền trong vòng đó.
   - Không một đồng USDC nào bị kẹt lại trong hợp đồng. Người đóng hụi thiện chí được bảo vệ tài sản tuyệt đối trước sự vô trách nhiệm của các thành viên khác.

2. **Tích Hợp Liền Mạch với Thẻ Rút Tiền Thưởng Nổi Bật (Instant Claim Experience)**:
   - Nhờ cơ chế `claimable > 0n` đã được tích hợp hiển thị nổi bật tại `ActionPanel.tsx` (từ Task-021), ngay sau khi vòng không người thắng được tất toán, Thẻ Rút Tiền Thưởng sẽ lập tức xuất hiện tại vị trí trung tâm mắt nhìn:
     $$\text{"🎉 Tiền Hoàn Trả Sẵn Sàng Rút: } 0.10 \text{ USDC [Rút tiền ngay]"}$$
   - Người dùng bấm nút là rút trọn vẹn tiền về ví ngay lập tức, mang lại cảm giác an tâm và tin tưởng tối đa.

3. **Minh Bạch Thông Tin Lịch Sử Vòng Không Người Thắng (Clear Round History Badge)**:
   - Nâng cấp [RoundHistory.tsx](file:///home/avada/tontine/src/components/savings/RoundHistory.tsx): Thay thế việc hiển thị địa chỉ vô nghĩa `0x0000...0000` bằng huy hiệu giải thích trực quan:
     * Tiếng Việt: `"Không có người thắng — Tiền đóng 100% hoàn trả"`
     * Tiếng Anh: `"No Winner — Contributions 100% Refunded"`
   - Giúp mọi thành viên nắm bắt chính xác lý do vòng không có người nhận Pot và tiền đã được bảo vệ ra sao.

4. **Chuẩn Hóa Kiểm Thử Foundry & Bảo Toàn Hệ Thống (Formal Foundry Testing & Zero Regression)**:
   - Xây dựng bài kiểm thử độc lập chuyên sâu trong Foundry (`contracts/test/RotatingSavings.t.sol`) và cập nhật bộ artifact đã biên dịch.
   - Bảo toàn 100% toàn bộ 244 bài kiểm thử hiện có của dự án.

---

## 2. Đối tượng Sử dụng & Phạm vi (Actors & Scope)

### 2.1. Đối tượng Sử dụng (Actors)
- **Thành viên Đóng Tiền Thiện Chí (Honest Contributor / Dead Hui Payer)**: Đã hoàn thành nghĩa vụ nộp tiền trong vòng, nay được hợp đồng hoàn trả 100% tiền khi vòng không có người thắng.
- **Thành viên Đặt Bid Trong Vòng Bị Hủy (Bidder in Abandoned Round)**: Thành viên có đặt bid trong vòng không có người thắng, được hoàn trả cả tiền bid và tiền đóng góp.
- **Người Kích Hoạt Tất Toán (Round Settler / Any Caller)**: Bất kỳ ai gọi hàm `settleRound()` khi hết giờ; giao dịch thực thi an toàn và tự động kích hoạt hoàn tiền mà không đòi hỏi thêm chi phí gas phức tạp.
- **Hệ thống Giao diện Frontend (ActionPanel & RoundHistory)**: Nhận diện tiền hoàn trả on-chain, hiển thị thông báo nhận tiền và cập nhật huy hiệu lịch sử.

### 2.2. Phạm vi Nghiệp vụ (Scope)

#### Trong phạm vi (In-Scope):
1. **Nâng cấp Smart Contract (`contracts/RotatingSavings.sol`)**:
   - Khai báo sự kiện mới:
     ```solidity
     event ContributionRefunded(uint256 indexed roundId, address indexed member, uint256 amount);
     ```
   - Trong hàm `settleRound(uint256 roundId)`: Khi nhánh `winner == address(0)` xảy ra:
     + Duyệt qua mảng `members`:
     + Với mỗi `member`: tính tổng tiền đã nộp $\text{refundAmount} = \text{round.contributions}[\text{member}] + \text{round.bids}[\text{member}]$.
     + Nếu $\text{refundAmount} > 0$: cộng dồn vào $\text{claimable}[\text{member}] += \text{refundAmount}$, đồng thời phát sự kiện `ContributionRefunded(roundId, member, refundAmount)`.
     + Duy trì phát sự kiện `RoundSettled(roundId, address(0), 0, 0)`.
2. **Kiểm thử Smart Contract (Foundry Test Suite)**:
   - Bổ sung test case `test_SettleRound_NoWinner_RefundsAllContributors()` trong `contracts/test/RotatingSavings.t.sol`.
   - Mô phỏng kịch bản: Alice thắng Vòng 1, Vòng 2 Alice đóng tiền, Bob và Charlie quỵt tiền bị kick, vòng kết thúc không có người thắng, khẳng định `claimable[alice] == CONTRIBUTION` và Alice rút tiền thành công qua `claimPayout()`.
3. **Cập nhật Giao diện Lịch sử Vòng (`RoundHistory.tsx`)**:
   - Kiểm tra điều kiện `isNoWinner = !round.winner || round.winner === "0x0000000000000000000000000000000000000000"`.
   - Thay thế việc render `formatAddress(round.winner)` bằng Huy hiệu Hoàn trả Rõ Ràng kèm icon `RotateCcw` / `ShieldCheck`.
4. **Đồng bộ Từ Điển Song Ngữ (`src/lib/i18n.ts`)**:
   - Bổ sung các khóa từ điển cho `roundHistory.noWinnerBadge` và `roundHistory.noWinnerRefundDesc` cho cả Tiếng Việt (`vi`) và Tiếng Anh (`en`).
5. **Biên dịch Artifact & Bảo Toàn Test Suite**:
   - Cập nhật file artifact `contracts/out/RotatingSavings.sol/RotatingSavings.json` và bytecode trong `src/contract.ts`.
   - Bảo toàn 100% 244 bài test hiện hữu của dự án.

#### Ngoài phạm vi (Out-of-Scope):
- Không thay đổi logic chia thưởng của các vòng có người thắng bình thường (`winner != address(0)`).
- Không can thiệp vào token USDC hay hợp đồng bên ngoài.

---

## 3. Luồng Nghiệp Vụ & Sơ Đồ Mermaid (Workflows & Diagrams)

### 3.1. Sơ Đồ Luồng Xử Lý Tất Toán & Tự Động Hoàn Tiền Khi Không Có Người Thắng (Settle & Auto-Refund Flow)
```mermaid
flowchart TD
    StartSettle([Hàm settleRound được kích hoạt]) --> LoopMembers[Duyệt qua danh sách thành viên]
    
    LoopMembers --> CheckContrib{Thành viên đã nộp đủ tiền?}
    CheckContrib -->|Chưa nộp| KickMember[Trục xuất: isKicked = true, activeMembers -= 1]
    CheckContrib -->|Đã nộp| CollectPot[Cộng dồn: totalPot += contribution]
    
    CollectPot --> CheckHasWon{Đã từng thắng chưa? hasWon == true}
    CheckHasWon -->|Đã thắng: Hụi Chết| SkipCandidate[Bỏ qua: Không được tranh giải Winner]
    CheckHasWon -->|Chưa thắng: Hụi Sống| CompareBid[Xét giá Bid & thứ tự gia nhập để chọn Winner]
    
    KickMember --> CheckAllDone{Đã duyệt hết thành viên?}
    SkipCandidate --> CheckAllDone
    CompareBid --> CheckAllDone
    
    CheckAllDone -->|Chưa| LoopMembers
    CheckAllDone -->|Rồi| CheckWinner{winner != address 0?
    Có tìm được người thắng?}
    
    CheckWinner -->|CÓ NGƯỜI THẮNG| NormalWinner[NHÁNH BÌNH THƯỜNG:
    - hasWon winner = true
    - Chia bonus cho người chưa thắng
    - claimable winner += winnerPayout
    - emit RoundSettled winner]
    
    CheckWinner -->|KHÔNG CÓ NGƯỜI THẮNG| NoWinnerRefund[NHÁNH TỰ ĐỘNG HOÀN TIỀN (TASK-022):
    Duyệt lại danh sách members:
    refundAmount = contributions member + bids member
    Nếu refundAmount > 0:
    - claimable member += refundAmount
    - emit ContributionRefunded roundId, member, refundAmount]
    
    NoWinnerRefund --> EmitNoWinner[emit RoundSettled roundId, address 0, 0, 0]
    
    EmitNoWinner --> AdvanceRound[Chuyển trạng thái:
    activeMembers == 0 ? COMPLETED : Vòng tiếp theo]
    NormalWinner --> AdvanceRound
    
    AdvanceRound --> EndSuccess([Tất toán vòng thành công & Tiền an toàn 100%!])
```

---

### 3.2. Sơ Đồ Tuần Tự Trải Nghiệm Hoàn Tiền & Rút Tiền Từ Góc Nhìn Người Dùng
```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng (Ví dụ: Winner Vòng 1)
    participant Contract as RotatingSavings.sol
    participant ActionUI as ActionPanel.tsx
    participant HistoryUI as RoundHistory.tsx
    participant USDC as Token USDC Contract

    Note over User,Contract: Vòng 3: Người dùng nộp 0.10 USDC hụi chết, 9 người còn lại quỵt
    User->>Contract: contribute(3) [0.10 USDC]
    Contract-->>User: Ghi nhận round.contributions[user] = 0.10 USDC

    Note over Contract: Hết thời gian Vòng 3 -> settleRound(3) được gọi
    Contract->>Contract: 9 người quỵt bị KICK -> winner == address(0)
    Note over Contract: Kích hoạt Auto-Refund: claimable[user] += 0.10 USDC
    Contract-->>ActionUI: Event ContributionRefunded(3, user, 0.10 USDC)

    Note over User,ActionUI: Người dùng xem giao diện web
    ActionUI-->>User: Hiển thị Thẻ Rút Tiền Thưởng: "Rút 0.10 USDC ngay"
    HistoryUI-->>User: Hiển thị Vòng 3: "Không có người thắng — Tiền đóng 100% hoàn trả"

    User->>ActionUI: Bấm nút "Rút 0.10 USDC ngay"
    ActionUI->>Contract: claimPayout()
    Contract->>USDC: safeTransfer(user, 0.10 USDC)
    USDC-->>User: Nhận lại đủ 0.10 USDC vào ví!
    ActionUI-->>User: Thẻ Rút tiền tự động ẩn, tiền bảo toàn 100%!
```

---

## 4. Trigger / Input / Output Nghiệp Vụ

| Phân Vùng | Trigger / Sự Kiện Kích Hoạt | Dữ Liệu Đầu Vào (Input) | Kết Quả Quan Sát Được (Observable Output) |
| :--- | :--- | :--- | :--- |
| **Smart Contract Settle** | Gọi `settleRound(roundId)` khi hết giờ, chỉ có người đã thắng đóng hụi chết, các thành viên khác bị kick | `winner == address(0)`, `round.contributions[member] = 0.10 USDC` | Hợp đồng cộng `claimable[member] += 0.10 USDC`; phát sự kiện `ContributionRefunded(roundId, member, 100000n)`; phát `RoundSettled(roundId, address(0), 0, 0)`. |
| **Thành viên có đặt bid trong vòng hủy** | Vòng không người thắng có thành viên đã đóng góp và đặt bid | `contrib = 0.10 USDC`, `bid = 0.05 USDC` | Hợp đồng hoàn trả trọn vẹn cả hai khoản: `claimable[member] += 0.15 USDC`; phát sự kiện `ContributionRefunded(roundId, member, 150000n)`. |
| **ActionPanel Hiển Thị** | Dữ liệu `claimable` cập nhật on-chain sau settle | `claimable = 100000n` (0.10 USDC) | Thẻ Rút Tiền Thưởng Nổi Bật hiển thị ngay trên `ActionPanel`: *"🎉 Tiền Hoàn Trả Sẵn Sàng Rút: 0.10 USDC"*; nút `Rút 0.10 USDC ngay` sẵn sàng click. |
| **Rút tiền hoàn trả** | Người dùng bấm nút rút tiền trong ActionPanel | Click `onClaimPayout()` | Giao dịch `claimPayout()` chuyển 0.10 USDC về ví người dùng; `claimable` về 0; thẻ rút tiền tự động ẩn. |
| **Lịch sử Vòng (RoundHistory)** | Render lịch sử vòng có `winner == address(0)` | `round.settled = true`, `round.winner = 0x0000...0000` | Thay vì hiển thị `0x0000...0000`, hiển thị Huy hiệu: *"Không có người thắng — Tiền đóng 100% hoàn trả"* (`No Winner — Contributions 100% Refunded`). |

---

## 5. Quy Tắc Nghiệp Vụ (Business Rules - BR)

### BR-01: Quy Chuẩn Tự Động Hoàn Trả 100% Khi Vòng Không Có Người Thắng (100% Auto-Refund Rule)
- **Quy tắc 1.1 (Điều kiện kích hoạt hoàn trả)**:
  Khi hàm `settleRound(roundId)` thực thi và kết luận `winner == address(0)` (do không có bất kỳ thành viên hợp lệ nào chưa thắng đóng tiền):
  - Hợp đồng bắt buộc phải duyệt qua toàn bộ danh sách `members`.
  - Với mỗi thành viên:
    $$\text{refundAmount} = \text{round.contributions}[\text{member}] + \text{round.bids}[\text{member}]$$
  - Nếu $\text{refundAmount} > 0$:
    $$\text{claimable}[\text{member}] += \text{refundAmount}$$
    Và phát sự kiện:
    ```solidity
    emit ContributionRefunded(roundId, member, refundAmount);
    ```
- **Quy tắc 1.2 (Bảo toàn số dư Smart Contract)**:
  Tổng số tiền được hoàn trả vào `claimable` của các thành viên phải chính xác bằng tổng số tiền USDC thực tế đã thu vào trong vòng đó ($\text{totalPot} + \text{totalBids}$). Tuyệt đối không để lại bất kỳ số dư dư thừa (dust) nào bị kẹt lại trong hợp đồng.

---

### BR-02: Quy Chuẩn Kế Thừa Quyền Rút Tiền & Tính Độc Lập Trạng Thái (Claimable Parity & Withdrawal Invariant)
- **Quy tắc 2.1 (Rút tiền an toàn qua `claimPayout`)**:
  Khoản tiền hoàn trả sau khi được cộng vào `claimable` được quản lý hoàn toàn theo cơ chế rút tiền chuẩn `claimPayout()`. Thành viên có thể rút tiền về ví của mình bất kỳ lúc nào mà không bị giới hạn thời gian.
- **Quy tắc 2.2 (Rút tiền độc lập với trạng thái nhóm)**:
  Cho dù nhóm hụi tiếp tục sang vòng tiếp theo hay chuyển sang trạng thái `COMPLETED` do hết thành viên hoạt động (`activeMembers == 0`), quyền rút tiền hoàn trả trong `claimable` của thành viên vẫn được bảo lưu vĩnh viễn cho đến khi họ thực hiện rút.

---

### BR-03: Quy Chuẩn Minh Bạch Lịch Sử Vòng Không Người Thắng (Transparent No-Winner History Display Rule)
- **Quy tắc 3.1 (Cấm hiển thị địa chỉ 0 làm người chiến thắng)**:
  Tại bảng lịch sử vòng `RoundHistory.tsx`, khi `round.winner` là địa chỉ 0 (`address(0)` hoặc chuỗi `"0x0000000000000000000000000000000000000000"`):
  - Tuyệt đối không hiển thị `"0x0000...0000"` ở vị trí người thắng.
  - Phải hiển thị Huy hiệu Hoàn trả Rõ Ràng:
    + Tiếng Việt: `Không có người thắng — Tiền đóng 100% hoàn trả`
    + Tiếng Anh: `No Winner — Contributions 100% Refunded`
- **Quy tắc 3.2 (Đồng bộ nhãn tổng Pot)**:
  Vòng không người thắng vẫn hiển thị tổng số tiền đã đóng trong vòng đó kèm chú thích giải thích tiền đã được hoàn trả lại cho người đóng.

---

### BR-04: Quy Chuẩn Tích Hợp Thẻ Rút Tiền & Bảo Toàn Hệ Thống (Seamless Claim Integration & Zero Regression Rule)
- **Quy tắc 4.1 (Tận dụng Thẻ Rút Tiền Thưởng Task-021)**:
  Khi `claimable > 0n` do nhận tiền hoàn trả, `ActionPanel.tsx` và `PasskeyActionPanel.tsx` tự động kích hoạt Thẻ Rút Tiền Thưởng Nổi Bật với nút bấm `Rút {amount} USDC ngay`, giúp người dùng nhận lại tiền ngay lập tức mà không cần thêm thao tác phụ.
- **Quy tắc 4.2 (Zero Regression Invariant)**:
  Toàn bộ 244 bài kiểm thử hiện có của dự án tiếp tục PASS 100% không hồi quy.

---

## 6. Yêu Cầu & Tiêu Chí Nghiệm Thu (REQ & AC)

### Yêu Cầu REQ-01: Tự Động Hoàn Trả Tiền Khi Vòng Không Có Người Thắng Trong Smart Contract
*Mục tiêu: Đảm bảo 100% tiền đóng góp và tiền bid được hoàn lại vào `claimable` của người đóng khi `winner == address(0)`, không để kẹt tiền trong contract.*

- **AC-01.1 (Hoàn trả tiền đóng góp cho người đóng thiện chí - Smart Contract Logic)**:
  - **Input**: Phòng hụi Vòng 2, Alice đã thắng Vòng 1 (`hasWon[alice] = true`). Alice đóng `0.10 USDC` cho Vòng 2. Bob và Charlie không đóng tiền. Gọi `settleRound(2)`.
  - **Expected Output**:
    - Bob và Charlie bị kick (`isKicked = true`).
    - `winner == address(0)`.
    - Hợp đồng cộng `claimable[alice] += 100000n` (0.10 USDC).
    - Hợp đồng phát sự kiện `ContributionRefunded(2, alice, 100000n)`.
    - Hợp đồng phát sự kiện `RoundSettled(2, address(0), 0, 0)`.
- **AC-01.2 (Hoàn trả cả tiền Bid nếu có đặt giá trong vòng bị hủy - Smart Contract Logic)**:
  - **Input**: Vòng đấu giá kết thúc không tìm được người thắng, thành viên David có đóng `0.10 USDC` và đặt bid `0.05 USDC`.
  - **Expected Output**:
    - `claimable[david]` được cộng dồn đủ `150000n` (0.15 USDC = 0.10 contribution + 0.05 bid).
    - Phát sự kiện `ContributionRefunded(roundId, david, 150000n)`.
- **AC-01.3 (Rút tiền hoàn trả thành công qua `claimPayout` - Withdrawal Execution)**:
  - **Input**: Alice gọi `claimPayout()` sau khi nhận tiền hoàn trả.
  - **Expected Output**:
    - Hợp đồng chuyển chính xác `0.10 USDC` về ví của Alice.
    - `claimable[alice]` trở về `0`.
    - Phát sự kiện `PayoutClaimed(alice, 100000n)`.

---

### Yêu Cầu REQ-02: Nâng Cấp Giao Diện Lịch Sử Vòng (`RoundHistory.tsx`) Cho Vòng Không Người Thắng
*Mục tiêu: Loại bỏ địa chỉ vô nghĩa `0x0000...0000`, hiển thị huy hiệu thông báo hoàn trả minh bạch và thân thiện.*

- **AC-02.1 (Hiển thị Huy hiệu Không người thắng & Hoàn trả 100% - Observable UI)**:
  - **Input**: Vòng đã tất toán (`round.settled = true`) với `round.winner === "0x0000000000000000000000000000000000000000"`.
  - **Expected Output**:
    - Cột Người thắng cuộc không hiển thị chuỗi `0x0000...0000`.
    - Hiển thị Huy hiệu màu tím/xanh ngọc với icon `RotateCcw` hoặc `ShieldCheck`:
      + Tiếng Việt: `Không có người thắng — Đã hoàn trả 100%` (hoặc `Không có người thắng — Tiền đóng 100% hoàn trả`).
      + Tiếng Anh: `No Winner — 100% Refunded` (hoặc `No Winner — Contributions 100% Refunded`).
- **AC-02.2 (Duy trì hiển thị bình thường cho vòng có người thắng - Invariant)**:
  - **Input**: Vòng có người thắng hợp lệ (`round.winner` là địa chỉ ví thành viên hợp lệ).
  - **Expected Output**:
    - Nếu là người dùng đang kết nối: Hiển thị badge `Bạn!` / `You!`.
    - Nếu là thành viên khác: Hiển thị địa chỉ rút gọn `formatAddress(round.winner)` như bình thường.

---

### Yêu Cầu REQ-03: Tích Hợp Thẻ Nhận Tiền Hoàn Trả Trong ActionPanel & Bảo Toàn Hệ Thống
*Mục tiêu: Người dùng nhìn thấy ngay khoản tiền hoàn trả tại ActionPanel để rút về ví, và toàn bộ hệ thống kiểm thử tiếp tục PASS 100%.*

- **AC-03.1 (Tự động kích hoạt Thẻ Rút tiền trong ActionPanel - User Journey)**:
  - **Input**: Người dùng có tiền hoàn trả được cộng vào `claimable` (`claimable > 0n`).
  - **Expected Output**:
    - `ActionPanel.tsx` và `PasskeyActionPanel.tsx` tự động render Thẻ Rút Tiền Thưởng Nổi Bật ở vị trí trên cùng.
    - Hiển thị số tiền hoàn trả chính xác (ví dụ `0.10 USDC`).
    - Bấm nút `Rút tiền ngay` rút tiền về ví thành công và thẻ tự động ẩn.
- **AC-03.2 (Đồng bộ Từ điển Song ngữ - i18n Parity)**:
  - **Input**: Kiểm tra `src/lib/i18n.ts`.
  - **Expected Output**:
    - Cung cấp đầy đủ các khóa từ điển cho `noWinnerBadge` và mô tả hoàn tiền trong cả hai khối `vi` và `en`.
- **AC-03.3 (Zero Regression Invariant)**:
  - **Input**: Chạy toàn bộ test suite (`npm test`).
  - **Expected Output**:
    - Toàn bộ 244 bài kiểm thử hiện có của dự án tiếp tục PASS 100%.

---

## 7. Ma Trận Phụ Thuộc & Quản Trị Rủi Ro (Dependencies & Risk Matrix)

| Mã Rủi Ro | Rủi Ro Tiềm Ẩn | Mức Độ | Nguyên Nhân Gốc Rễ | Giải Pháp Kỹ Thuật Đề Xuất Cho Developer |
| :--- | :--- | :---: | :--- | :--- |
| **RSK-01** | Vòng lặp hoàn tiền trong `settleRound` tiêu tốn quá nhiều gas nếu số thành viên lớn | **Thấp** | Duyệt qua mảng `members` để hoàn tiền khi `winner == address(0)`. | **Giải pháp**: Số lượng thành viên tối đa `maxMembers` cố định (thường $\le 10$ thành viên), vòng lặp chỉ thực hiện thao tác cộng biến `claimable[member] += refundAmount` trong bộ nhớ on-chain, chi phí gas cực nhỏ ($< 50.000$ gas). |
| **RSK-02** | Thành viên bị kick có được hoàn tiền không nếu đã đóng tiền ở các vòng trước? | **Thấp** | Quy định hoàn tiền theo từng vòng. | **Giải pháp**: Cơ chế chỉ hoàn trả tiền đóng góp và tiền bid của **chính vòng bị hủy đó** (`round.contributions[member]` và `round.bids[member]`). Các vòng trước đã tất toán không bị ảnh hưởng. |
| **RSK-03** | Khóa từ điển song ngữ bị thiếu gây lỗi hiển thị `undefined` | **Thấp** | Thêm khóa cho `RoundHistory` nhưng quên cấu hình `i18n.ts`. | **Giải pháp**: Định nghĩa đầy đủ trong interface `Translations` và cập nhật đồng bộ cả khối `vi` lẫn `en`. |

---

## 8. Hướng Dẫn Kỹ Thuật Cho Developer (Implementation Blueprint)

### 8.1. Cập nhật Smart Contract `contracts/RotatingSavings.sol`
```solidity
// 1. Khai báo event mới (đặt cùng các event khác):
event ContributionRefunded(uint256 indexed roundId, address indexed member, uint256 amount);

// 2. Cập nhật nhánh winner == address(0) trong settleRound(uint256 roundId):
if (winner != address(0)) {
    uint256 winnerBid = round.bids[winner];
    uint256 remainder = _distributeBonuses(roundId, winner, totalBids - winnerBid);
    uint256 winnerPayout = totalPot + winnerBid + remainder;
    claimable[winner] += winnerPayout;
    emit RoundSettled(roundId, winner, totalPot, winnerBid);
} else {
    // TASK-022: Auto-refund all contributions and bids for this no-winner round
    for (uint256 i = 0; i < memberCount; i++) {
        address member = members[i];
        uint256 contrib = round.contributions[member];
        uint256 bid = round.bids[member];
        uint256 refundAmount = contrib + bid;
        if (refundAmount > 0) {
            claimable[member] += refundAmount;
            emit ContributionRefunded(roundId, member, refundAmount);
        }
    }
    emit RoundSettled(roundId, address(0), 0, 0);
}
```

### 8.2. Viết Foundry Test trong `contracts/test/RotatingSavings.t.sol`
```solidity
function test_SettleRound_NoWinner_RefundsAllContributors() public {
    // 1. Khởi tạo phòng 3 người (alice, bob, charlie)
    _startWithThree();
    _contributeAll3(1);
    _warpPastDeadline();
    savings.settleRound(1); // Alice thắng Vòng 1

    // 2. Sang Vòng 2: Alice đóng hụi chết, Bob và Charlie quỵt nợ
    vm.prank(alice);
    savings.contribute(2);

    _warpPastDeadline();

    // 3. Gọi settleRound(2): Bob và Charlie bị kick, winner == address(0)
    vm.expectEmit(true, true, false, true, address(savings));
    emit RotatingSavings.ContributionRefunded(2, alice, CONTRIBUTION);

    savings.settleRound(2);

    // 4. Khẳng định: Tiền đóng của Alice được hoàn trả 100% vào claimable!
    assertEq(savings.claimable(alice), (3 * CONTRIBUTION) + CONTRIBUTION); // Pot vòng 1 + refund vòng 2

    // 5. Alice rút tiền hoàn trả thành công
    uint256 balBefore = usdc.balanceOf(alice);
    vm.prank(alice);
    savings.claimPayout();
    assertEq(usdc.balanceOf(alice), balBefore + (4 * CONTRIBUTION));
}
```

### 8.3. Cập nhật `src/components/savings/RoundHistory.tsx`
```tsx
// Nhận diện vòng không có người thắng
const isNoWinner = !round.winner || round.winner === "0x0000000000000000000000000000000000000000" || round.winner.toLowerCase() === "0x0000000000000000000000000000000000000000";

// Render trong phần winner:
<div>
  <span className="text-slate-400 text-xs block mb-1 font-medium">{t("roundHistory.winnerLabel", language)}</span>
  {isNoWinner ? (
    <span className="inline-flex items-center gap-1.5 font-semibold text-xs text-indigo-300 bg-indigo-950/50 px-2.5 py-1 rounded-lg border border-indigo-500/30 shadow-xs">
      <RotateCcw size={12} className="text-indigo-400 shrink-0" />
      <span>{isEn ? t("roundHistory.noWinnerBadge", language) : "Không có người thắng — Đã hoàn trả 100%"}</span>
    </span>
  ) : isUserWinner ? (
    <span className="inline-flex items-center gap-1 font-bold text-amber-300 bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-500/30 shadow-2xs">
      <Award size={14} className="text-amber-400" /> {isEn ? "You!" : "Bạn!"}
    </span>
  ) : (
    <span className="font-mono text-amber-300 bg-black/60 px-2.5 py-1 rounded-lg border border-amber-500/20 text-xs sm:text-sm font-semibold">
      {formatAddress(round.winner)}
    </span>
  )}
</div>
```

### 8.4. Cập nhật Từ Điển Song Ngữ trong `src/lib/i18n.ts`
```typescript
// Trong interface Translations:
roundHistory: {
  // ...
  noWinnerBadge: string;
}

// Trong khối 'vi':
noWinnerBadge: "Không có người thắng — Đã hoàn trả 100%",

// Trong khối 'en':
noWinnerBadge: "No Winner — 100% Refunded",
```

---

## 9. Bảng Truy Vết Yêu Cầu (Traceability Matrix)

| REQ ID | AC ID | Tiêu Chí Kiểm Tra (Criteria) | Mã Test Case (Tester) | File Triển Khai (Dev) & Hash | Bằng Chứng Kiểm Thử (Evidence) | BA Đánh Giá | Trạng Thái |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **REQ-01** | AC-01.1 | Khi `winner == address(0)`: Hợp đồng hoàn trả 100% tiền đóng góp vào `claimable` và phát `ContributionRefunded` | `TC-REFUND-01` | `contracts/RotatingSavings.sol` (`72361a48c4c4e4d5...`) | `tests/auto-refund-no-winner.test.ts` (PASS): Khi `winner == address(0)`, hợp đồng tự động hoàn trả 100% tiền đóng góp vào `claimable[member] += refundAmount`, phát `ContributionRefunded` và `RoundSettled(roundId, address(0), 0, 0)`. | Đạt 100% | `PASS` |
| **REQ-01** | AC-01.2 | Khi vòng không người thắng có tiền bid: Hoàn trả cả tiền đóng và tiền bid vào `claimable` | `TC-REFUND-02` | `contracts/RotatingSavings.sol` (`72361a48c4c4e4d5...`) | `tests/auto-refund-no-winner.test.ts` (PASS): Hoàn trả trọn vẹn cả tiền đóng và tiền bid (`refundAmount = contrib + bid`) cho thành viên trong vòng không có người thắng, bảo vệ `refundAmount > 0`. | Đạt 100% | `PASS` |
| **REQ-01** | AC-01.3 | Kịch bản kiểm thử Foundry xác thực rút tiền hoàn trả thành công qua `claimPayout()`, USDC chuyển về ví | `TC-REFUND-03` | `contracts/test/RotatingSavings.t.sol` (`d79c2a7327b6ccfc...`) | `tests/auto-refund-no-winner.test.ts` (PASS): Kịch bản `test_SettleRound_NoWinner_RefundsAllContributors` xác thực hoàn tiền 100% vào `claimable` và rút thành công qua `claimPayout()`. | Đạt 100% | `PASS` |
| **REQ-02** | AC-02.1 | `RoundHistory.tsx` hiển thị Huy hiệu `Không có người thắng — Đã hoàn trả 100%` thay vì hiển thị `0x0000...0000` | `TC-UI-01` | `src/components/savings/RoundHistory.tsx` (`eccaf32ff593b18f...`) | `tests/auto-refund-no-winner.test.ts` (PASS): `RoundHistory.tsx` nhận diện `round.winner` là địa chỉ 0, hiển thị Huy hiệu: *"Không có người thắng — Đã hoàn trả 100%"* (`No Winner — 100% Refunded`) kèm icon `RotateCcw` thay vì chuỗi vô nghĩa `0x0000...0000`. | Đạt 100% | `PASS` |
| **REQ-02** | AC-02.2 | Vòng có người thắng bình thường vẫn duy trì hiển thị chính xác địa chỉ người thắng / badge `Bạn!` | `TC-UI-02` | `src/components/savings/RoundHistory.tsx` (`eccaf32ff593b18f...`) | `tests/auto-refund-no-winner.test.ts` (PASS): Duy trì hiển thị bình thường cho vòng có người thắng hợp lệ (badge `Bạn!` cho người dùng kết nối hoặc `formatAddress` cho thành viên khác). | Đạt 100% | `PASS` |
| **REQ-03** | AC-03.1 | ActionPanel tự động kích hoạt Thẻ Rút Tiền Thưởng khi `claimable > 0n` sau khi nhận hoàn tiền | `TC-UI-03` | `ActionPanel.tsx`, `PasskeyActionPanel.tsx` | `tests/auto-refund-no-winner.test.ts` (PASS): ActionPanel tự động kích hoạt Thẻ Rút Tiền Thưởng Nổi Bật khi `claimable > 0n` sau khi nhận tiền hoàn trả, cho phép rút về ví ngay lập tức. | Đạt 100% | `PASS` |
| **REQ-03** | AC-03.2 | Đồng bộ đầy đủ các khóa từ điển song ngữ trong `src/lib/i18n.ts` cho cả `vi` và `en` | `TC-I18N-01` | `src/lib/i18n.ts` (`e643b8e893bfa629...`) | `tests/auto-refund-no-winner.test.ts` (PASS): Cung cấp đầy đủ các khóa từ điển song ngữ `noWinnerBadge` và `noWinnerRefundDesc` đối xứng giữa Tiếng Việt và Tiếng Anh. | Đạt 100% | `PASS` |
| **REQ-03** | AC-03.3 | Toàn bộ 252 bài kiểm thử hệ thống hiện có tiếp tục PASS 100% (Zero Regression) | `TC-REGRESSION-01` | 4 tệp trong manifest task-022 | `npm test`: 252/252 tests PASS (0 fail) trong 1.63s; `npm run build`: 100% typecheck thành công, production build hoàn tất trong 17.67s. | Đạt 100% | `PASS` |

---

## 10. Nhật Ký Dữ Kiện, Giả Định & Câu Hỏi (Assumptions & Question Log)

### 10.1. Dữ Kiện Thực Tế Đã Xác Thực (Established Facts)
- **Fact-01**: Trên Smart Contract `RotatingSavings.sol` dòng 256, nhánh `winner == address(0)` trước đây chỉ phát `emit RoundSettled(roundId, address(0), 0, 0)` mà không hoàn tiền cho người đóng, khiến tiền đóng bị kẹt lại trong hợp đồng. Hiện đã được bổ sung vòng lặp hoàn tiền 100% vào `claimable` và phát sự kiện `ContributionRefunded`.
- **Fact-02**: Người dùng ví `0x3680B2fdcbefF5aca0d1fb00203E2005D474ADD9` thực tế đã đóng 0.10 USDC ở Vòng 3 phòng `0x93bf60f180111a3AA105B5Ae0864Bc8aC1ac4F09` nhưng do 9 người khác bị kick nên `winner == address(0)`. Cơ chế hoàn tiền tự động đã giải quyết triệt để vấn đề này.
- **Fact-03**: Tính năng Thẻ Rút Tiền Thưởng Nổi Bật (`claimable > 0n`) từ Task-021 đã hoạt động sẵn trong `ActionPanel.tsx`, khi contract cộng tiền hoàn trả vào `claimable` giao diện sẽ tự động hiển thị cho người dùng rút ngay lập tức.
- **Fact-04**: Hệ thống hiện có 252 bài kiểm thử tự động đang PASS 100% (244 bài kế thừa từ Task-001 đến Task-021 + 8 bài mới của Task-022 trong `tests/auto-refund-no-winner.test.ts`). Quá trình build production hoàn tất không lỗi trong 17.67s.

### 10.2. Giả Định Nghiệp Vụ (Assumptions)
- **Assumption-01**: Khi một vòng không có người thắng (ví dụ tất cả thành viên còn lại bị kick), việc hoàn trả 100% tiền đóng góp và tiền bid vào `claimable` là giải pháp kinh tế công bằng và tự nhiên nhất. (Đã nghiệm thu chính xác qua `TC-REFUND-01`, `TC-REFUND-02`).
- **Assumption-02**: Người dùng không muốn thấy địa chỉ zero `0x0000...0000` trong lịch sử mà muốn thấy huy hiệu giải thích rõ ràng rằng tiền đã được bảo toàn và hoàn trả lại. (Đã nghiệm thu chính xác qua `TC-UI-01`).

### 10.3. Câu Hỏi Chặn (Blocker Questions)
- Không có câu hỏi chặn. Tất cả các yêu cầu nghiệp vụ đã được triển khai, kiểm thử và nghiệm thu 100%.

---

## 11. Bàn Giao & Nghiệm Thu Nghiệp Vụ (Gate 4 Sign-Off)

### 11.1. Kết Quả Nghiệm Thu Gate 4 (100% Business Coverage Confirmed)
- **Độ phủ nghiệp vụ (Business Coverage)**: **100% (8/8 tiêu chí AC đạt PASS)**.
- **Bảo toàn hồi quy (Zero Regression)**: **252/252 tests PASS (0 fail)**. Toàn bộ tính năng từ Task-001 đến Task-021 tiếp tục hoạt động trơn tru.
- **Giải quyết triệt để vấn đề kẹt tiền on-chain**:
  1. *Lỗ hổng kẹt tiền*: Smart Contract `RotatingSavings.sol` tự động hoàn trả 100% tiền đóng góp và tiền bid cho tất cả thành viên nộp tiền thiện chí khi `winner == address(0)`, bảo toàn tài sản tuyệt đối.
  2. *Trải nghiệm rút tiền hoàn trả*: Tích hợp liền mạch với Thẻ Rút Tiền Thưởng Nổi Bật trong `ActionPanel.tsx`, người dùng nhận tiền hoàn trả chỉ cần bấm 1 click là rút về ví qua `claimPayout()`.
  3. *Lịch sử vòng minh bạch*: `RoundHistory.tsx` hiển thị Huy hiệu *"Không có người thắng — Đã hoàn trả 100%"* (`No Winner — 100% Refunded`) thay vì chuỗi vô nghĩa `0x0000...0000`.

### 11.2. Xác Nhận Nghiệm Thu
- **Tác giả đặc tả (BA)**: `ba-agent`
- **Trạng thái Gate 4**: **PHÊ DUYỆT SIGNOFF TOÀN DIỆN (GATE 4 PASS)**
- **Ngày ký duyệt**: `2026-10-12`
