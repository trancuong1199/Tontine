# BondedTontine: Design Doc

Quỹ góp vốn theo vòng, chủ hụi (owner) vay theo hạn mức có thế chấp CirBTC, trả lãi mỗi vòng cho thành viên.

## 1. Metadata

| Mục | Giá trị |

| --- | --- |

| Trạng thái | Draft (chờ bạn duyệt trước khi code) |

| Tác giả | Arc Studio |

| Chain | Arc Testnet (chain ID 5042002) trước. Mainnet chỉ sau khi có kiểm toán độc lập |

| Ngôn ngữ / toolchain | Solidity ^0.8.20, biên dịch 0.8.28, Foundry (`forge`) |

| Thay thế | `RotatingSavings` (cơ chế đấu giá bid, hụi chết, kick/slash) |

| Milestone | M1: contract + test trên testnet. M2: giao diện. M3: kiểm toán độc lập, rồi mới tính mainnet |

Review tracker:

- \[ \] Design review

- \[ \] Security review (kiểm toán độc lập trước mainnet)

- \[ \] Ops review (oracle, monitoring)

- \[ \] Compliance review (tư vấn pháp lý về huy động vốn và cho vay cộng đồng, theo quy định nơi bạn hoạt động)

## 2. Action Items (living)

Mục này bắt đầu rỗng ở các vòng review sau. Hiện là danh sách việc phải chốt trước khi code:

- \[x\] Nguồn giá đã chốt: testnet dùng `MockAggregatorV3`, mainnet dùng feed Chainlink BTC/USD trong allowlist. Feed do **factory** cấp, owner không được chọn (mục 10.10, 12.1, Phụ lục C và D).

- \[ \] Chốt "tịch thu toàn bộ cọc" hay "tịch thu theo giá trị nợ" khi vỡ nợ (xem mục 19, mặc định: toàn bộ).

- \[ \] Chốt tham số mặc định ở mục 10.1.

- \[ \] Hỏi forum Arc: địa chỉ feed Chainlink BTC/USD trên testnet (nếu có) và lịch cập nhật. Khi có, deploy factory mới với feed đó, club không phải đổi gì.

- \[ \] Lấy địa chỉ feed Chainlink BTC/USD cho allowlist mainnet từ trang Price Feed Contract Addresses (chọn network Arc), ghi vào cấu hình.

- \[ \] Chạy `forge build --sizes`: nếu `BondedTontineFactory` vượt 24576 byte thì chuyển sang clone EIP-1167 (xem 10.10).

- \[ \] Xác nhận địa chỉ cirBTC trên Arc Testnet từ nguồn chính thức (hiện lấy từ cấu hình dự án).

## 3. Goals / Non-Goals

**Goals**

1. Thành viên góp USDC theo vòng và nhận lãi từ chủ hụi. Mức thiệt hại tối đa của thành viên bị chặn bởi giá trị cọc.

2. Chủ hụi là người duy nhất rút được tiền, và chỉ rút trong hạn mức tính theo giá trị cọc CirBTC.

3. Lãi theo % mỗi vòng, đặt lúc tạo nhóm và không đổi sau đó.

4. Không có quyền admin, không có hàm pause, không có proxy. Mọi quy tắc nằm trong hợp đồng.

5. Ai cũng gọi được các hàm "kích hoạt vỡ nợ" khi điều kiện đã thỏa, nên không cần tin vào chủ hụi hay đội ngũ dự án.

**Non-Goals**

- Không có đấu giá bid, hụi chết, kick/slash thành viên. Thành viên chỉ cho vay, không có nghĩa vụ phải đóng.

- Không đảm bảo "không bao giờ mất tiền". Rủi ro còn lại ở mục 15 và 16.

- Không tích hợp Aave / yield (có thể làm sau, ngoài phạm vi).

- Không thanh lý qua DEX. Cọc bị tịch thu được chia trực tiếp cho thành viên bằng CirBTC.

- Không có thành viên rời nhóm sau khi nhóm bắt đầu.

- Không hỗ trợ token khác USDC / CirBTC.

## 4. Requirements

**Functional**

| ID | Yêu cầu |

| --- | --- |

| F1 | Owner tạo nhóm với: số tiền góp mỗi vòng, số thành viên tối đa, độ dài vòng, lãi mỗi vòng (bps), hệ số an toàn, ngưỡng thanh lý, các thời gian ân hạn, tuổi giá tối đa, địa chỉ feed. |

| F2 | Owner nạp CirBTC làm cọc. Thành viên vào nhóm trong giai đoạn OPEN. |

| F3 | Owner bắt đầu vòng khi có tối thiểu 2 thành viên và cọc lớn hơn 0. |

| F4 | Mỗi vòng, thành viên góp đúng `contributionAmount`, tối đa một lần mỗi vòng. |

| F5 | Owner vay USDC trong hạn mức. Owner trả gốc bất kỳ lúc nào. |

| F6 | Lãi mỗi vòng = đỉnh dư nợ trong vòng x lãi suất. Owner trả lãi sau mỗi vòng. Lãi chia cho thành viên theo tỷ lệ tiền đã góp. |

| F7 | Hết chu kỳ, owner trả hết gốc và lãi, nhóm chuyển COMPLETED, thành viên rút đủ gốc, owner rút cọc. |

| F8 | Vỡ nợ (quá hạn lãi, quá hạn tất toán, hoặc cọc xuống dưới ngưỡng thanh lý) thì mọi người gọi được hàm kích hoạt. Thành viên nhận USDC còn trong quỹ và toàn bộ cọc CirBTC theo tỷ lệ tiền góp. |

**Security (mỗi dòng là một assertion kiểm thử được)**

| ID | Assertion |

| --- | --- |

| S1 | Chỉ owner rút được USDC khỏi quỹ, và `totalDebt` sau khi vay luôn nằm trong hạn mức tại thời điểm vay. |

| S2 | Không đường nào cho owner rút USDC mà không tăng `totalDebt`. |

| S3 | Tổng USDC mà thành viên rút được (gốc + lãi) không bao giờ vượt số USDC hợp đồng đang giữ cho họ. |

| S4 | Không hàm nào cho owner rút cọc khi sau đó dư nợ vượt hạn mức. |

| S5 | Giá oracle <= 0, hoặc quá hạn `maxPriceAge`, thì các hàm cần giá đều revert. Giá cũ không bao giờ được dùng. |

| S6 | Sau khi trạng thái là DEFAULTED hoặc COMPLETED thì không quay lại ACTIVE. |

| S7 | Không ai (kể cả owner) có thể pause, đóng băng hay đổi tham số sau khi deploy. |

| S8 | Một thành viên bị chặn USDC (blocklist) không làm kẹt việc rút của thành viên khác. |

## 5. Terminology & Actors

| Thuật ngữ | Nghĩa |

| --- | --- |

| Vòng (round) | Khoảng `roundDuration` giây, đánh số từ 1 đến `totalRounds`. `totalRounds = maxMembers`. |

| Chu kỳ | Toàn bộ `totalRounds` vòng, tính từ `startRounds()`. |

| Dư nợ (`totalDebt`) | Số USDC owner đã vay và chưa trả. |

| Đỉnh dư nợ của vòng | Dư nợ lớn nhất trong vòng (kể cả dư nợ mang từ vòng trước sang). |

| Hạn mức vay | Giá trị cọc (USDC) x 10000 / `safetyBps`. |

| Thanh lý / vỡ nợ | Chuyển nhóm sang DEFAULTED, chia cọc và USDC còn lại cho thành viên. |

| Bps | 1/10000. Lãi `rateBpsPerRound` là % mỗi vòng, không phải mỗi năm. |

| Actor | On/off-chain | Mức tin cậy | Quyền |

| --- | --- | --- | --- |

| Owner (chủ hụi, người vay) | On-chain | Không tin cậy hoàn toàn | Nạp/rút cọc (có điều kiện), bắt đầu vòng, vay, trả gốc, trả lãi, hủy nhóm khi OPEN, gỡ thành viên khi OPEN |

| Thành viên (người cho vay) | On-chain | Không tin cậy | Vào nhóm khi OPEN, góp mỗi vòng, nhận lãi, rút gốc sau khi kết thúc |

| Keeper (bất kỳ ai) | On-chain | Không tin cậy | Gọi `declareDefault`, `liquidate`, `finalize` khi điều kiện thỏa |

| Oracle (Chainlink-compatible) | Off-chain + on-chain | Bán tin cậy | Cung cấp giá BTC/USD |

| Circle (nhà phát hành USDC, CirBTC) | Off-chain | Bán tin cậy | Có quyền đặc quyền trên token (blocklist, v.v.) |

Không có admin, không có operator, không có upgrader.

## 6. Language / Runtime

- Solidity ^0.8.20 (checked arithmetic), biên dịch 0.8.28 theo `foundry.toml` của repo. EVM hardfork theo cấu hình Foundry hiện có của dự án.

- Base contracts: OpenZeppelin `Ownable2Step`, `ReentrancyGuard`, `SafeERC20`, `Math` (cho `mulDiv`). Không fork lại contract cũ. Chỉ tham khảo các test invariant của `RotatingSavings`.

- Giao diện oracle: `AggregatorV3Interface` của Chainlink (khai báo interface rút gọn trong repo, không cần thêm package).

## 7. Transaction & Execution Model

- Mỗi giao dịch atomic. Mọi hàm có chuyển token đều `nonReentrant` và theo thứ tự checks, effects, interactions.

- Điểm gọi ra ngoài: `usdc.safeTransfer(From)`, `cirBtc.safeTransfer(From)`, `priceFeed.latestRoundData()`. Oracle là hàm `view`, gọi trong các hàm đã có `nonReentrant`.

- Không có callback từ token (USDC và CirBTC là ERC-20 chuẩn). Không dùng `msg.value`: trên Arc, USDC native 18 decimals chỉ dùng trả gas, hợp đồng chỉ làm việc với ERC-20 USDC 6 decimals.

- Vòng lặp: chỉ lặp tối đa `totalRounds` (<= 20) để chốt vòng đã kết thúc. Không lặp qua danh sách thành viên (dùng bộ tích lũy lãi theo cổ phần).

## 8. Chain Standards & Interfaces

| Chuẩn | Dùng cho | Ghi chú |

| --- | --- | --- |

| ERC-20 | USDC (6 decimals), CirBTC (8 decimals) | Lấy địa chỉ USDC từ `getUsdc(chainId)` trong `@/onchain-facts` ở script deploy, truyền vào constructor của `BondedTontineFactory` (mục 10.10) |

| Chainlink `AggregatorV3Interface` | Giá BTC/USD | `latestRoundData()`, `decimals()` |

| EVM sang chain khác (mapping role) | N/A | Không port từ thiết kế EVM khác |

## 9. Architecture Overview

\`\`\`mermaid

stateDiagram-v2

    \[\*\] --> OPEN

    OPEN --> CANCELLED: cancelOpen (owner)

    OPEN --> ACTIVE: startRounds (owner)

    ACTIVE --> COMPLETED: finalize (ai cũng gọi, sau chu kỳ, nợ = 0, lãi đã trả đủ)

    ACTIVE --> DEFAULTED: declareDefault / liquidate (ai cũng gọi)

    COMPLETED --> \[\*\]

    DEFAULTED --> \[\*\]

    CANCELLED --> \[\*\]

\`\`\`

\`\`\`mermaid

sequenceDiagram

    participant O as Owner

    participant C as BondedTontine

    participant M as Thành viên

    participant P as Oracle

    O->>C: depositCollateral(cirBTC)

    M->>C: joinGroup()

    O->>C: startRounds()

    loop mỗi vòng

        M->>C: contribute() (USDC)

        O->>C: borrow(amount)

        C->>P: latestRoundData()

        C-->>O: USDC

    end

    O->>C: payInterest(amount) (sau mỗi vòng)

    C-->>M: lãi (claimInterest)

    O->>C: repay(amount)

    Note over C: hết chu kỳ, nợ = 0, lãi đủ

    M->>C: finalize() rồi withdrawPrincipal()

    O->>C: withdrawCollateral()

\`\`\`

**Flow of funds**

| Bước | Ai chuyển gì | Invariant |

| --- | --- | --- |

| Nạp cọc | Owner chuyển CirBTC vào hợp đồng | `collateral` tăng đúng bằng số nhận |

| Góp | Thành viên chuyển `contributionAmount` USDC | `totalDeposits` và `deposit[m]` tăng đúng số đó |

| Vay | Hợp đồng chuyển USDC cho owner | `totalDebt` tăng đúng số vay, `totalDebt + lãi chưa trả <= hạn mức` |

| Trả gốc | Owner chuyển USDC vào | `totalDebt` giảm đúng số trả |

| Trả lãi | Owner chuyển USDC vào | `interestPaidTotal` tăng, `accInterestPerShare` tăng theo tỷ lệ |

| Nhận lãi | Hợp đồng chuyển USDC cho thành viên | Chỉ trả số đã ghi nhận cho thành viên đó |

| Tất toán | Hợp đồng chuyển USDC (và CirBTC nếu vỡ nợ) cho thành viên | Tổng chi không vượt `settledRecoveredUsdc` và `settledCollateral` |

**Resting-state invariant** (khi không có giao dịch nào dở):

- `usdc.balanceOf(this) >= (totalDeposits - totalDebt) + lãi thành viên chưa rút`

- `cirBtc.balanceOf(this) >= collateral + cọc đã tịch thu chưa chia hết`

**Dependencies**

- USDC trên Arc (ERC-20, 6 decimals), CirBTC (ERC-20, 8 decimals), một feed BTC/USD tương thích Chainlink.

- `BondedTontineFactory` (mục 10.10): cấp USDC, CirBTC, feed và `maxPriceAge` cho mọi club; club chỉ do factory tạo mới được coi là đã xác minh.

- Nguồn giá theo môi trường: mock trên testnet, Chainlink trên mainnet (mục 12.1).

- Giả định chain: finality nhanh của Arc, `block.timestamp` đủ chính xác cho vòng từ vài phút trở lên.

## 10. Contract Design

### 10.1 Tham số cố định lúc deploy (immutable)

| Tham số | Kiểu | Ràng buộc | Mặc định gợi ý |

| --- | --- | --- | --- |

| `usdc` | address | khác 0, `decimals() == 6` | USDC của Arc |

| `cirBtc` | address | khác 0, khác `usdc`, `decimals() == 8` | CirBTC của Arc |

| `owner_` | address | khác 0 | `msg.sender` của `createClub`, do factory truyền vào |

| `priceFeed` | address | khác 0, `decimals()` <= 18 | do **factory** cấp, owner không chọn (mục 10.10) |

| `groupName` | string | 1 đến 32 ký tự | do owner nhập |

| `contributionAmount` | uint256 | > 0 (USDC 6 decimals) | 50 USDC |

| `maxMembers` | uint256 | 2 đến 20. Cũng là `totalRounds` | 10 |

| `roundDuration` | uint256 | 60 giây đến 365 ngày | 1 ngày (3 phút để test) |

| `rateBpsPerRound` | uint256 | 1 đến 1000 (tối đa 10% mỗi vòng) | 200 (2%) |

| `safetyBps` | uint256 | 15000 đến 50000 | 20000 (200%) |

| `liquidationBps` | uint256 | 11000 đến `safetyBps - 2000` | 12000 (120%) |

| `interestGrace` | uint256 | 0 đến 7 ngày | 1 ngày |

| `settlementGrace` | uint256 | 1 giờ đến 14 ngày | 2 ngày |

| `maxPriceAge` | uint256 | 1 giờ đến 48 giờ | do **factory** cấp. Mainnet: 25 giờ (feed Chainlink trên Arc có heartbeat 24 giờ). Testnet với mock: tùy ý |

Mọi ràng buộc kiểm tra trong constructor, vi phạm thì revert `InvalidConfiguration`. Lãi hiển thị cho người dùng nên quy ra %/năm = `rateBpsPerRound / 100 x (365 ngày / roundDuration)`.

### 10.2 Roles

| Role | Holder | Quyền | Vì sao tồn tại |

| --- | --- | --- | --- |

| Owner | Địa chỉ gọi `factory.createClub`, truyền vào constructor qua `owner_` (`Ownable2Step`) | Các hàm `onlyOwner` ở 10.5 | Là người vay, phải ký quỹ và trả nợ |

| Không còn role nào khác | | | Không pauser, không rescuer, không upgrader (xem mục 17) |

`transferOwnership` chỉ gọi được khi state là OPEN (đổi owner khi đang có nợ sẽ chuyển nợ và cọc sang người chưa cam kết). `renounceOwnership` luôn revert.

### 10.3 Storage layout

Không upgradeable nên không cần `__gap` hay EIP-7201.

| Biến | Kiểu | Ghi chú |

| --- | --- | --- |

| `state` | enum State {OPEN, ACTIVE, COMPLETED, DEFAULTED, CANCELLED} | |

| `startTime` | uint256 | đặt khi `startRounds` |

| `isMember` | mapping(address => bool) | |

| `memberCount` | uint256 | |

| `deposit` | mapping(address => uint256) | tổng USDC thành viên đã góp (cổ phần) |

| `totalDeposits` | uint256 | tổng `deposit` |

| `contributed` | mapping(uint256 => mapping(address => bool)) | đã góp ở vòng nào |

| `accInterestPerShare` | uint256 | độ chính xác 1e18 |

| `rewardDebt` | mapping(address => uint256) | |

| `interestClaimable` | mapping(address => uint256) | |

| `collateral` | uint256 | số CirBTC owner đang ký quỹ (đếm nội bộ, không dùng `balanceOf`) |

| `totalDebt` | uint256 | USDC owner đang nợ |

| `peakDebt` | mapping(uint256 => uint256) | đỉnh dư nợ theo vòng |

| `interestDue` | mapping(uint256 => uint256) | lãi của vòng đã kết thúc |

| `lastRolledRound` | uint256 | vòng cuối đã chốt |

| `interestDueTotal` | uint256 | tổng lãi các vòng đã chốt |

| `interestPaidTotal` | uint256 | tổng lãi owner đã trả |

| `interestClaimedTotal` | uint256 | tổng lãi thành viên đã rút (chặn tràn do làm tròn `mulDiv`) |

| `settledTotalDeposits` | uint256 | chụp khi kết thúc |

| `settledRecoveredUsdc` | uint256 | USDC để chia cho thành viên |

| `settledCollateral` | uint256 | CirBTC để chia cho thành viên (chỉ khi DEFAULTED) |

| `principalWithdrawn` | mapping(address => bool) | |

### 10.4 Modifiers

| Modifier | Guard |

| --- | --- |

| `onlyOwner` | `msg.sender == owner()` |

| `inState(s)` | `state == s`, ngược lại revert `WrongState` |

| `nonReentrant` | OZ |

### 10.5 Hàm ghi (write)

| Hàm | Ai gọi | State thay đổi | Event | Revert khi |

| --- | --- | --- | --- | --- |

| `depositCollateral(amount)` | owner | `collateral += amount`, kéo CirBTC từ owner | `CollateralDeposited` | state không phải OPEN/ACTIVE, `amount == 0` |

| `withdrawCollateral(amount)` | owner | `collateral -= amount`, chuyển CirBTC cho owner | `CollateralWithdrawn` | `amount > collateral`; state là DEFAULTED mà đã bị tịch thu; ACTIVE mà sau khi rút `exposure` vượt hạn mức; giá lỗi hoặc cũ khi `exposure > 0` |

| `joinGroup()` | bất kỳ (trừ owner) | `isMember`, `memberCount` | `MemberJoined` | state không phải OPEN, đã là thành viên, nhóm đầy, caller là owner |

| `removeMember(addr)` | owner | xóa thành viên | `MemberRemoved` | state không phải OPEN, không phải thành viên |

| `cancelOpen()` | owner | state = CANCELLED | `GroupCancelled` | state không phải OPEN |

| `startRounds()` | owner | state = ACTIVE, `startTime = now` | `RoundsStarted` | state không phải OPEN, `memberCount < 2`, `collateral == 0` |

| `contribute()` | thành viên | `deposit`, `totalDeposits`, `contributed`, cập nhật lãi chờ | `Contributed` | state không phải ACTIVE, đang đủ điều kiện vỡ nợ / thanh lý (`DefaultPending`), ngoài vòng 1..`totalRounds`, không phải thành viên, đã góp vòng này |

| `claimInterest()` | thành viên | `interestClaimable = 0`, `interestClaimedTotal += claimable`, chuyển USDC (tối đa `interestPaidTotal - interestClaimedTotal`) | `InterestClaimed` | không có lãi để rút |

| `borrow(amount)` | owner | `totalDebt`, `peakDebt[vòng]`, chuyển USDC cho owner | `Borrowed` | state không phải ACTIVE, ngoài vòng 1..`totalRounds`, `amount == 0`, `amount > totalDeposits - totalDebt`, vượt hạn mức, giá lỗi hoặc cũ |

| `repay(amount)` | owner | `totalDebt -= amount`, kéo USDC từ owner | `Repaid` | state không phải ACTIVE, `amount == 0`, `amount > totalDebt` |

| `payInterest(amount)` | owner | `interestPaidTotal`, `accInterestPerShare`, kéo USDC | `InterestPaid` | state không phải ACTIVE, `amount == 0`, `amount > interestDueTotal - interestPaidTotal` (sau khi chốt vòng) |

| `finalize()` | bất kỳ | state = COMPLETED, chụp `settled*` | `GroupCompleted` | state không phải ACTIVE, chu kỳ chưa hết, `totalDebt > 0`, lãi chưa trả đủ |

| `declareDefault()` | bất kỳ | state = DEFAULTED, tịch thu cọc | `GroupDefaulted(reason)` | state không phải ACTIVE; không quá hạn lãi và không quá hạn tất toán |

| `liquidate()` | bất kỳ | như `declareDefault` | `GroupDefaulted(reason = UNDERCOLLATERALIZED)` | state không phải ACTIVE; `collateralValue x 10000 / liquidationBps >= totalDebt + lãi đã chốt chưa trả`; giá lỗi hoặc cũ |

| `withdrawPrincipal()` | thành viên | `principalWithdrawn = true`, chuyển USDC (và CirBTC nếu DEFAULTED) | `PrincipalWithdrawn` | state không phải COMPLETED/DEFAULTED, không có `deposit`, đã rút |

Tất cả hàm có chuyển token đều `nonReentrant`.

### 10.6 Hàm đọc (view)

| Hàm | Trả về |

| --- | --- |

| `currentRoundIndex()` | 0 nếu chưa ACTIVE; 1..`totalRounds` trong chu kỳ; `totalRounds + 1` khi hết chu kỳ |

| `cycleEnded()` | `block.timestamp >= startTime + totalRounds x roundDuration` |

| `collateralValueUsdc()` | giá trị cọc theo USDC (6 decimals), revert nếu giá lỗi |

| `borrowLimit()` | `collateralValueUsdc x 10000 / safetyBps` |

| `interestOwed()` | `interestDueTotal - interestPaidTotal` (chỉ các vòng đã chốt, view tính cả vòng vừa kết thúc chưa chốt) |

| `exposure()` | `totalDebt + interestOwed + peakDebt[vòng hiện tại] x rate / 10000` |

| `healthBps()` | `collateralValueUsdc x 10000 / (totalDebt + interestOwed)`; max uint nếu không có nợ |

| `pendingInterest(addr)` | lãi thành viên có thể rút |

| `previewPrincipal(addr)` | (USDC, CirBTC) thành viên sẽ nhận khi kết thúc |

| `nextInterestDeadline()` | thời điểm hạn trả lãi gần nhất (cho giao diện) |

### 10.7 Logic nội bộ (pseudocode)

**Chốt vòng và đỉnh dư nợ** (gọi đầu mọi hàm ghi khi ACTIVE):

\`\`\`

function \_rollRounds():

    idx = currentRoundIndex()                     // 1..R, hoặc R+1 nếu hết chu kỳ

    for k = lastRolledRound + 1; k < idx and k <= R; k++:

        peakDebt\[k\] = max(peakDebt\[k\], totalDebt)   // vòng k đã kết thúc, nợ không đổi giữa các hàm

        interestDue\[k\] = peakDebt\[k\] \* rateBpsPerRound / 10000

        interestDueTotal += interestDue\[k\]

        lastRolledRound = k

    if idx <= R:

        peakDebt\[idx\] = max(peakDebt\[idx\], totalDebt)   // nợ mang từ vòng trước tính vào đỉnh

\`\`\`

Lý do dùng đỉnh dư nợ: owner không né được lãi bằng cách trả gốc ngay trước khi hết vòng, rồi vay lại ở vòng sau.

**Vay**:

\`\`\`

function borrow(amount):

    require state == ACTIVE; \_rollRounds(); idx = currentRoundIndex(); require idx <= R

    require amount > 0 and amount <= totalDeposits - totalDebt

    newDebt = totalDebt + amount

    newPeak = max(peakDebt\[idx\], newDebt)

    exposureAfter = newDebt + interestOwed() + newPeak \* rate / 10000

    require exposureAfter <= borrowLimit()          // đọc giá, revert nếu lỗi hoặc cũ

    totalDebt = newDebt; peakDebt\[idx\] = newPeak

    usdc.safeTransfer(owner, amount)

\`\`\`

**Lãi quá hạn**:

\`\`\`

function *interestOverdue() view -> bool:        // gọi sau* rollRounds()

    dueThrough = 0

    for k = 1; k <= lastRolledRound; k++:

        if startTime + k \* roundDuration + interestGrace > block.timestamp: break

        dueThrough += interestDue\[k\]

    return interestPaidTotal < dueThrough

\`\`\`

**Quá hạn tất toán**: `block.timestamp >= startTime + R x roundDuration + settlementGrace` và (`totalDebt > 0` hoặc `interestPaidTotal < interestDueTotal`).

**Trả lãi** (bộ tích lũy theo cổ phần, không lặp qua thành viên):

\`\`\`

function payInterest(amount):

    \_rollRounds(); require amount > 0 and amount <= interestDueTotal - interestPaidTotal

    usdc.safeTransferFrom(owner, this, amount)

    interestPaidTotal += amount

    accInterestPerShare += amount \* 1e18 / totalDeposits      // totalDeposits > 0 vì có nợ

\`\`\`

\`\`\`

function \_updateMember(m):

    accrued = deposit\[m\] \* accInterestPerShare / 1e18

    interestClaimable\[m\] += accrued - rewardDebt\[m\]

    rewardDebt\[m\] = accrued          // sau khi deposit\[m\] đổi thì tính lại: rewardDebt = deposit\[m\] \* acc / 1e18

\`\`\`

**Kết thúc / vỡ nợ**:

\`\`\`

function \_settle(bool defaulted):

    settledTotalDeposits = totalDeposits

    if defaulted and totalDeposits > 0:

        state = DEFAULTED

        settledRecoveredUsdc = totalDeposits - totalDebt     // USDC còn trong quỹ

        settledCollateral = collateral; collateral = 0       // tịch thu toàn bộ cọc

    else if defaulted:                                       // không có thành viên nào góp tiền

        state = DEFAULTED                                    // không tịch thu, owner rút lại cọc

    else:

        state = COMPLETED

        settledRecoveredUsdc = totalDeposits                 // nợ = 0

\`\`\`

\`\`\`

function withdrawPrincipal():

    require state in {COMPLETED, DEFAULTED} and deposit\[m\] > 0 and !principalWithdrawn\[m\]

    principalWithdrawn\[m\] = true

    usdcOut = deposit\[m\] \* settledRecoveredUsdc / settledTotalDeposits

    cirOut  = deposit\[m\] \* settledCollateral / settledTotalDeposits

    transfer usdcOut (và cirOut nếu > 0) cho m

\`\`\`

**Đọc giá**:

\`\`\`

function \_price() view -> uint256:

    (roundId, answer, , updatedAt, answeredInRound) = priceFeed.latestRoundData()

    require answer > 0, updatedAt != 0, updatedAt <= block.timestamp,

            block.timestamp - updatedAt <= maxPriceAge, answeredInRound >= roundId

    return uint256(answer)

function collateralValueUsdc() view:

    // collateral 8 decimals, giá `feedDecimals`, kết quả 6 decimals

    return Math.mulDiv(collateral, \_price(), 10 \*\* (feedDecimals + 2))

\`\`\`

### 10.8 Events

| Event | Tham số | Khi nào |

| --- | --- | --- |

| `CollateralDeposited` | owner, amount | nạp cọc |

| `CollateralWithdrawn` | owner, amount | rút cọc |

| `MemberJoined` | member (indexed) | vào nhóm |

| `MemberRemoved` | member (indexed) | owner gỡ khi OPEN |

| `RoundsStarted` | startTime, totalRounds | bắt đầu |

| `Contributed` | roundId (indexed), member (indexed), amount | góp |

| `Borrowed` | roundId (indexed), amount, totalDebt | vay |

| `Repaid` | amount, totalDebt | trả gốc |

| `InterestPaid` | amount, interestPaidTotal | trả lãi |

| `InterestClaimed` | member (indexed), amount | thành viên rút lãi |

| `GroupCompleted` | settledRecoveredUsdc | kết thúc bình thường |

| `GroupDefaulted` | reason (enum), totalDebt, collateralSeized | vỡ nợ |

| `GroupCancelled` | | hủy khi OPEN |

| `PrincipalWithdrawn` | member (indexed), usdcOut, cirBtcOut | rút gốc |

Lý do vỡ nợ (`reason`): INTEREST_OVERDUE, SETTLEMENT_OVERDUE, UNDERCOLLATERALIZED.

### 10.9 Custom errors

`WrongState`, `NotMember`, `AlreadyMember`, `GroupFull`, `AlreadyContributed`, `RoundNotActive`, `InvalidConfiguration`, `InvalidAmount`, `InsufficientLiquidity`, `ExceedsBorrowLimit`, `CollateralLocked`, `NothingToClaim`, `NotDefaultable`, `NotLiquidatable`, `NotFinalizable`, `BadPrice`, `StalePrice`, `OwnerCannotJoin`, `RenounceDisabled`, `TransferLockedAfterOpen`, `DefaultPending`.

### 10.10 `BondedTontineFactory` (bịt lỗ hổng "owner tự chọn feed")

**Vấn đề.** Nếu owner tự truyền địa chỉ feed vào constructor của club, owner có thể deploy một feed giả luôn trả giá rất cao. Khi đó hạn mức vay không còn bị chặn bởi cọc và mọi kiểm tra giá trong club vô nghĩa. Thành viên rất khó tự kiểm tra từng club.

**Giải pháp.** Một factory dùng chung cấp feed và token cho mọi club. Owner chỉ chọn các tham số kinh tế của nhóm.

\`\`\`solidity

contract BondedTontineFactory {

    address public immutable usdc;

    address public immutable cirBtc;

    address public immutable priceFeed;

    uint256 public immutable maxPriceAge;

    mapping(address => bool) public isClub;

    address\[\] private \_clubs;

    event ClubCreated(address indexed club, address indexed owner, string groupName);

    constructor(address usdc\_, address cirBtc\_, address priceFeed\_, uint256 maxPriceAge\_);

    // kiểm tra: khác 0; usdc != cirBtc; feed.decimals() <= 18; maxPriceAge trong \[1 giờ, 48 giờ\]

    function createClub(

        string calldata groupName,

        uint256 contributionAmount,

        uint256 maxMembers,

        uint256 roundDuration,

        uint256 rateBpsPerRound,

        uint256 safetyBps,

        uint256 liquidationBps,

        uint256 interestGrace,

        uint256 settlementGrace

    ) external returns (address club);

    function clubsLength() external view returns (uint256);

    function clubAt(uint256 i) external view returns (address);

}

\`\`\`

`createClub`: `club = address(new BondedTontine(msg.sender, usdc, cirBtc, priceFeed, maxPriceAge, groupName, ...))`, đặt `isClub[club] = true`, đẩy vào `_clubs`, emit `ClubCreated`. Các ràng buộc ở 10.1 vẫn kiểm tra trong constructor của club.

**Quy tắc**

- Factory không có owner và không có hàm admin. `usdc`, `cirBtc`, `priceFeed`, `maxPriceAge` là immutable. Muốn đổi feed thì deploy factory mới. Club cũ giữ feed cũ.

- Frontend giữ địa chỉ factory chính thức theo từng chain trong cấu hình (`CANONICAL_FACTORY`). Một club chỉ được gắn nhãn "đã xác minh" khi `factory.isClub(club) == true`. Club deploy trực tiếp ngoài factory phải gắn nhãn "chưa xác minh" và cảnh báo trước khi `joinGroup` hoặc `contribute`.

- Danh sách nhóm đọc từ `ClubCreated` hoặc `clubAt`, thay cho việc lưu thủ công địa chỉ.

- Kích thước: factory chứa bytecode của club để `new`. Chạy `forge build --sizes`. Nếu factory vượt 24576 byte thì chuyển sang clone EIP-1167 kèm hàm `initialize` (khi đó các giá trị immutable của club thành storage; cập nhật mục 10.3 và 13). Ghi vào Action Items nếu xảy ra.

## 11. Specification tables per feature area

N/A. Hợp đồng không triển khai chuẩn nền nào (USDC và CirBTC chỉ được gọi như ERC-20 client).

## 12. Deployment & Initialization

- Constructor nhận đủ tham số ở 10.1, không có `initialize`, không proxy.

- Thứ tự khởi tạo (mỗi nhóm một hợp đồng, deploy từ ví của owner qua frontend như `CreateClubModal` hiện tại):

  0. Một lần cho mỗi môi trường: project deploy `BondedTontineFactory(usdc, cirBtc, priceFeed, maxPriceAge)` (xem 12.1 cho nguồn giá theo môi trường).

  1. Owner gọi `factory.createClub(groupName, contributionAmount, maxMembers, roundDuration, rateBpsPerRound, safetyBps, liquidationBps, interestGrace, settlementGrace)`. Constructor của club nhận thêm `owner_, usdc, cirBtc, priceFeed, maxPriceAge` từ factory.

  2. Owner `approve` CirBTC rồi `depositCollateral`.

  3. Thành viên `joinGroup`. Owner có thể `removeMember` khi còn OPEN.

  4. Owner `startRounds`.

- Script deploy phải assert trước khi gửi giao dịch: đúng chain ID; `priceFeed.description()` đúng cặp BTC / USD; `latestRoundData()` trả giá dương và còn mới; `decimals()` <= 18.

- Địa chỉ feed truyền vào **factory** từ cấu hình, không hardcode trong contract và không do owner của club chọn. Testnet: dùng `MockAggregatorV3` (Phụ lục C). Không bao giờ deploy mock lên mainnet.

- Sau deploy: không còn số dư tối thiểu cần giữ. Key giữ quyền duy nhất: ví owner. Không cần địa chỉ deterministic (không có địa chỉ chung giữa các chain).

### 12.1 Nguồn giá theo môi trường

| Môi trường | Factory được deploy với | Điều kiện bắt buộc | Giao diện |

| --- | --- | --- | --- |

| `forge test` / local | `MockAggregatorV3` | Tự do chỉnh giá và thời gian | Không áp dụng |

| Arc Testnet (hiện tại) | `MockAggregatorV3` do project deploy, admin là ví project | `description()` bắt đầu bằng `MOCK`; script ghi địa chỉ mock vào cấu hình | Badge "Giá thử nghiệm, không phải giá thị trường" ở mọi màn hình có hạn mức và health factor |

| Arc Testnet khi có feed chính thức hoặc adapter | Feed thật | Script assert `description()`, giá dương và còn mới | Bỏ badge |

| Arc Mainnet | Feed Chainlink BTC/USD trong allowlist | Script từ chối nếu `description()` chứa `MOCK`, địa chỉ ngoài allowlist, `latestRoundData()` cũ hoặc <= 0, hoặc `maxPriceAge` < heartbeat của feed | Hiển thị địa chỉ feed, tuổi giá, link explorer |

**Quy tắc**

- Không có chế độ "giá cố định" và không có hàm override giá. Giá cố định làm hạn mức sai khi BTC đổi giá và không thể thanh lý (xem mục 19).

- Nhà phát triển testnet lưu ý: admin của mock có thể đặt giá bất kỳ. Điều này chỉ chấp nhận vì token testnet không có giá trị thật. Không dùng mock cho bất kỳ khoản tiền thật nào.

- Contract không phân biệt được mock với feed thật. Phòng vệ nằm ở ba lớp: factory immutable (10.10), script deploy (bảng trên), và nhãn trên giao diện.

- Khi Arc có feed Chainlink BTC/USD trên testnet: deploy factory mới với feed đó, giữ nguyên code club.

## 13. Upgradeability

Không upgradeable. Lý do: giữ tiền người dùng, mỗi nhóm có chu kỳ ngắn, quyền upgrade là quyền admin mà mục tiêu S7 loại bỏ. Migration: contract switch. Khi cần phiên bản mới, deploy hợp đồng mới (địa chỉ mới). Nhóm cũ chạy hết hoặc vỡ nợ theo luật cũ. Frontend giữ thêm trường `version` cho mỗi nhóm trong `savingsClubDirectory` và hiển thị đúng ABI theo version.

## 14. Key Management & Signing

- Một key quyền duy nhất: owner. Khuyến nghị owner dùng ví đa chữ ký hoặc smart account (ví dụ ví passkey của Circle) vì key này cầm cọc và nợ.

- `Ownable2Step` ở trạng thái OPEN. Sau đó chuyển owner bị khóa.

- Không có chữ ký off-chain, permit hay EIP-712 nên không có replay.

## 15. Security Considerations

| Vulnerability | Applicable? | Mitigation |

| --- | --- | --- |

| Reentrancy | Có | `nonReentrant` trên mọi hàm chuyển token; CEI |

| Access control | Có | Chỉ `onlyOwner` ở 10.5; hàm kích hoạt thì permissionless nhưng có điều kiện chặt |

| Integer overflow/underflow | Solidity >= 0.8 | Không dùng `unchecked`; dùng `Math.mulDiv` cho phép nhân chia lớn |

| Unchecked external call / return | Có | `SafeERC20` |

| Fee-on-transfer / rebasing | Không | USDC và CirBTC chuẩn, nhưng vẫn đo số nhận bằng chênh lệch `balanceOf` cho cọc và góp để chắc chắn |

| Signature replay | N/A | Không có chữ ký |

| Front-running / MEV | Có, nhẹ | Owner có thể vay ngay trước khi giá giảm. Giảm bằng hệ số an toàn 200% và ngưỡng thanh lý. Keeper có thể tranh gọi `liquidate`, không gây hại |

| Flash-loan / price manipulation | Không | Không dùng giá spot trên chain |

| Oracle manipulation / staleness | Có | Kiểm tra `answer > 0`, `updatedAt`, `maxPriceAge`, `answeredInRound`; không có giá override; feed do factory cấp, club không nhận feed từ owner |

| Owner tự chọn feed giả | Có (đã bịt) | Factory cấp feed immutable (10.10). Frontend chỉ coi club hợp lệ khi `factory.isClub(club)` với factory chính thức; club deploy trực tiếp bị gắn nhãn "chưa xác minh" |

| Mock oracle lọt lên mainnet | Có | Script deploy từ chối `MOCK` và feed ngoài allowlist (12.1); badge trên giao diện; kiểm toán độc lập trước mainnet |

| Oracle không phản ánh depeg CirBTC | Có | Dùng BTC/USD làm proxy (chưa có feed riêng cho CirBTC); hệ số dư để chịu lệch; ghi rõ cho người dùng |

| Denial of service | Có | Không lặp qua thành viên; vòng lặp tối đa 20; rút theo kiểu pull |

| Griefing lấp chỗ trong OPEN | Có | `removeMember` của owner khi OPEN |

| Delegatecall / proxy | N/A | Không proxy |

| Timestamp dependence | Có | Vòng tối thiểu 60 giây; sai số vài giây của block không đổi kết quả đáng kể |

| Approval persistence | Có | Frontend `approve` đúng số cần (cọc, trả gốc, trả lãi, góp); không `approve` lớn một lần |

| Centralization risk | Có | Không admin. Owner là người vay nên quyền bị chặn bởi hạn mức |

| Blocklist USDC / CirBTC | Có | Rút kiểu pull theo từng người nên một địa chỉ bị chặn không kẹt người khác. Nếu chính hợp đồng bị chặn thì tiền kẹt (rủi ro nhà phát hành) |

| Dust / làm tròn | Có | Làm tròn xuống; phần dư nhỏ ở lại hợp đồng; test bảo toàn tổng |

## 16. Trust Model & Threat Analysis

| Actor | Thiệt hại tối đa nếu bị kiểm soát hoặc xấu | Giảm thiểu | Phát hiện |

| --- | --- | --- | --- |

| Owner | Vay đủ hạn mức rồi bỏ đi. Thành viên mất phần chênh nếu cọc mất giá nhanh hơn thanh lý | Hạn mức = cọc / 200%, thanh lý tại 120%, tịch thu toàn bộ cọc | Sự kiện `Borrowed`, health factor trên giao diện |

| Oracle | Giá sai khiến thanh lý sớm hoặc cho vay quá | Kiểm tra giá cũ, dương; hệ số dư; dùng feed chính thức | Cảnh báo tuổi giá và lệch giữa nguồn |

| Circle (token issuer) | Chặn địa chỉ hoặc hợp đồng, làm kẹt rút | Không giảm thiểu được trong contract; công bố rõ rủi ro | Theo dõi thông báo của nhà phát hành |

| Thành viên | Chỉ gây phiền (lấp chỗ trong OPEN) | `removeMember` | `MemberJoined` bất thường |

| Người deploy factory | Chọn feed cho mọi club của factory đó. Feed xấu làm hạn mức hoặc thanh lý sai cho cả hệ thống | Factory immutable; địa chỉ factory và feed công bố; mainnet chỉ dùng feed Chainlink trong allowlist; kiểm toán | Giao diện hiển thị địa chỉ factory và feed, so khớp allowlist |

| Keeper | Không có quyền phá; chỉ kích hoạt khi điều kiện thật sự thỏa | Điều kiện kiểm tra on-chain | `GroupDefaulted` |

| Deployer | Không có quyền sau deploy trừ vai trò owner | Không có admin riêng | Không áp dụng |

## 17. Emergency Response & Circuit Breakers

- Không có pause. Lý do: pause do owner thì owner đóng băng được tiền thành viên; pause do bên thứ ba là quyền admin mà S7 loại bỏ.

- Thay thế: mọi quy tắc tự động. Quá hạn lãi, quá hạn tất toán, thiếu cọc đều cho phép ai cũng kích hoạt vỡ nợ.

- Oracle lỗi hoặc cũ: các hàm cần giá (`borrow`, `withdrawCollateral` khi có nợ, `liquidate`) revert. Trả nợ, trả lãi, góp, rút và hai đường vỡ nợ theo thời gian vẫn chạy được (không cần giá).

- Không có `Rescuable`: token gửi nhầm vào hợp đồng sẽ không lấy lại được, vì một rescuer là quyền admin có thể động đến tiền người dùng. Kế hoạch: frontend không cho gửi trực tiếp, cảnh báo rõ trong tài liệu.

- Playbook sự cố: (1) Oracle cũ: keeper chờ feed cập nhật; owner vẫn trả nợ được. (2) Giá giảm nhanh: ai cũng gọi `liquidate`. (3) Owner mất key: sau hạn lãi, ai cũng gọi `declareDefault`.

## 18. Failure Scenarios

| Tình huống | Điều gì xảy ra | Vì sao an toàn |

| --- | --- | --- |

| Oracle trả giá cũ khi owner vay | `borrow` revert `StalePrice` | S5 |

| Giá giảm mạnh, không keeper nào kịp gọi | Thành viên nhận cọc ở giá mới; có thể lỗ phần chênh | Chặn bởi hệ số 200% và ngưỡng 120%, nhưng không loại bỏ hết (rủi ro còn lại) |

| Owner trả lãi trễ nhưng trong ân hạn | Không vỡ nợ | `interestGrace` |

| Owner quên `payInterest` sau ân hạn | Ai cũng `declareDefault`, thành viên nhận cọc | Permissionless |

| USDC chuyển cho một thành viên bị blocklist | Chỉ giao dịch của người đó revert | Rút kiểu pull |

| `finalize` không ai gọi sau khi hết chu kỳ và nợ = 0 | Tiền thành viên chưa rút được | Ai cũng gọi được; frontend hiển thị nút "Kết thúc" cho mọi thành viên |

| Không thành viên nào góp tiền | Owner không vay được (không thanh khoản), `finalize` vẫn chạy khi hết chu kỳ | Hợp lệ, không ai bị thiệt |

| Một lần `borrow` revert giữa chừng | Toàn bộ giao dịch hoàn tác | Atomic |

## 19. Priorities & Tradeoffs

| Quyết định | Đánh đổi | Lý do / phương án bị loại |

| --- | --- | --- |

| Tịch thu toàn bộ cọc khi vỡ nợ | Có thể thưởng quá nhiều cho thành viên khi cọc lớn hơn nợ nhiều (ví dụ vỡ nợ vì quên trả lãi nhỏ) | Tịch thu theo giá trị nợ cần giá oracle đúng lúc vỡ nợ; oracle lỗi sẽ làm kẹt. Bị loại ở bản đầu, ghi vào Action Items |

| Lãi tính theo đỉnh dư nợ của vòng | Owner trả lãi cho cả vòng dù vay chỉ một phần vòng | Tính theo thời gian chính xác cần cập nhật liên tục và phức tạp hơn; đỉnh chặn việc né lãi |

| Lãi chia theo cổ phần tại lúc owner trả | Thành viên góp muộn có thể nhận một phần lãi của vòng trước | Chụp cổ phần theo từng vòng phức tạp hơn; chấp nhận sai lệch nhỏ |

| Thành viên không rút sớm | Tiền bị khóa đến hết chu kỳ | Rút sớm làm quỹ khó kiểm soát thanh khoản và nợ |

| Thành viên không có nghĩa vụ đóng | Không có kick/slash, không có hụi chết | Họ là người cho vay, bỏ đóng chỉ làm họ cho vay ít đi |

| Thanh lý bằng chia CirBTC, không bán | Thành viên nhận CirBTC thay vì USDC | Không phụ thuộc DEX, không có slippage hợp đồng phải xử lý |

| BTC/USD làm proxy cho CirBTC | Không bắt được depeg | Chưa có feed riêng; hệ số dư và công bố rủi ro |

| Không pause, không rescue | Không sửa được lỗi sau deploy | Tránh quyền admin; kiểm toán độc lập trước mainnet |

| Bị loại: giữ cơ chế bid xoay vòng | | Rủi ro bùng của người hốt sớm khó chặn với ví ẩn danh (đã phân tích ở các vòng thảo luận trước) |

| Bị loại: tích hợp Aave | | Lãi nhỏ so với dòng tiền, thêm rủi ro và độ phức tạp |

| Factory cấp feed, owner không chọn | Thêm một contract và phải kiểm tra kích thước bytecode | Bịt đường owner truyền feed giả. Bị loại: để owner truyền feed và nhờ thành viên tự kiểm tra (người dùng thường không làm) |

| Bị loại: chế độ giá cố định khi chưa có oracle | | Hạn mức sai khi BTC đổi giá, không thanh lý được, thành viên gánh rủi ro mà không biết |

| Testnet dùng mock oracle | Admin mock đặt được giá tùy ý | Token testnet không có giá trị; cho phép test mọi kịch bản giá. Rủi ro lên mainnet được chặn bằng script và allowlist |

| BTC/USD của Chainlink thay vì CBBTC/USD | Cả hai đều không phản ánh depeg CirBTC | CirBTC là Bitcoin được bọc; v2 có thể lấy giá thấp hơn của hai feed |

| Một feed cố định (immutable), không có fallback feed | Nếu feed ngừng cập nhật vĩnh viễn, không thể gọi `liquidate`, `borrow`, hay `withdrawCollateral` khi còn nợ | Các đường `repay`, `payInterest`, `declareDefault` (quá hạn lãi/tất toán), `finalize`, `claimInterest`, `withdrawPrincipal` không đọc giá nên quỹ không bao giờ bị khóa cứng; muốn đổi feed cho nhóm mới thì deploy factory mới |

| Cổng `DefaultPending` trong `contribute()` | Chặn thành viên nạp thêm tiền vào nhóm đã đủ điều kiện vỡ nợ / thanh lý (khi giá còn mới), nhưng vẫn có thể pha loãng tối đa 1 lần góp / thành viên / vòng trong lúc giá đang giảm từ `safetyBps` xuống `liquidationBps` hoặc trong thời gian ân hạn `interestGrace` | Giữ `contribute()` không phụ thuộc cứng vào oracle sống (nếu giá cũ, `_isDefaultOrLiquidationPending()` chỉ kiểm tra quá hạn thời gian để không khóa góp tiền khi oracle lag ngắn hạn) |

| Giới hạn `interestClaimedTotal <= interestPaidTotal` | Người rút lãi cuối cùng có thể nhận ít hơn 1–2 wei so với phép tính lý thuyết nếu các lần cộng dồn trước có sai số làm tròn | Đảm bảo rút lãi không bao giờ chạm vào tiền gốc `totalDeposits - totalDebt` của thành viên |

## 20. Testing Strategy

Lệnh chạy toàn bộ: `forge build && forge test -vv`. Phân tích tĩnh: `slither .`. Coverage: `forge coverage` (mục tiêu >= 95% branch cho `BondedTontine.sol`).

**Unit test (ví dụ tên)**

- Constructor: từng tham số sai biên đều revert `InvalidConfiguration`.

- OPEN: owner không join; không join hai lần; nhóm đầy; `removeMember`; `cancelOpen` trả cọc.

- `startRounds` cần >= 2 thành viên và cọc > 0.

- `contribute`: một lần mỗi vòng; ngoài thời gian revert; không phải thành viên revert.

- `borrow`: đúng hạn mức; vượt hạn mức; vượt thanh khoản; giá cũ, giá <= 0, `answeredInRound < roundId`.

- `repay` và `payInterest`: biên số; không trả vượt.

- Lãi: đỉnh dư nợ khi vay rồi trả cùng vòng; nợ mang qua nhiều vòng bỏ qua (không ai gọi hàm); lãi chia đúng theo cổ phần.

- `withdrawCollateral` khi ACTIVE: giữ đúng hạn mức; không có nợ thì rút được kể cả khi oracle lỗi.

- `declareDefault` theo lãi quá hạn và theo tất toán quá hạn; `liquidate` theo giá.

- `finalize`, `withdrawPrincipal` (COMPLETED và DEFAULTED), tịch thu cọc chia theo cổ phần.

- Một địa chỉ thành viên bị chặn (mock token revert) không kẹt người khác.

- Factory: constructor sai tham số revert; `createClub` đặt `isClub`, emit `ClubCreated`, truyền đúng `owner_ = msg.sender`, feed và `maxPriceAge` của factory; owner không có cách nào đổi feed của club.

- Oracle: `MockAggregatorV3` với giá giảm theo từng bước (kiểm tra `liquidate` đúng ngưỡng), giá cũ (`setUpdatedAt`), giá bằng 0 hoặc âm (`setBad`), feed có `decimals` 8 và 18.

- Khi oracle lỗi: `repay`, `payInterest`, `declareDefault` theo thời gian, `finalize`, `withdrawCollateral` khi không có nợ vẫn chạy; `borrow` và `liquidate` revert.

**Fuzz và invariant (Foundry)**

- `usdc.balanceOf(this) >= totalDeposits - totalDebt + lãi chưa rút` sau mọi chuỗi hành động.

- `totalDebt <= totalDeposits` và `totalDebt + interestOwed <= borrowLimit()` ngay sau mỗi `borrow` thành công.

- Tổng `withdrawPrincipal` (USDC) không vượt `settledRecoveredUsdc`; tổng CirBTC không vượt `settledCollateral`.

- Trạng thái chỉ đi tiến (S6).

- Fuzz giá oracle: chuỗi giá bất kỳ, kiểm tra không có đường rút USDC vượt hạn mức.

**Fork / integration**: sau khi chốt feed thật, đọc thử `latestRoundData()` trên Arc bằng `vm.createSelectFork` với block cố định.

**Merge gate**: toàn bộ test pass, Slither không còn mức cao chưa giải thích, kiểm toán độc lập trước mainnet.

## 21. Third-party libraries

| Lib | Phiên bản | Đã có trong dự án? | Lý do | Đã review? |

| --- | --- | --- | --- | --- |

| OpenZeppelin Contracts | phiên bản hiện có trong `node_modules` | Có | `Ownable2Step`, `ReentrancyGuard`, `SafeERC20`, `Math` | Có (thư viện được kiểm toán công khai) |

| forge-std | hiện có trong `lib/` | Có | Test | N/A |

| Chainlink `AggregatorV3Interface` | khai báo interface rút gọn | Không cần package | Chỉ cần `latestRoundData` và `decimals` | N/A |

## 22. Monitoring & Alerting

| Tín hiệu | Ngưỡng | Mức | Hành động |

| --- | --- | --- | --- |

| `healthBps()` | < 15000 | Warning | Báo owner nạp thêm cọc |

| `healthBps()` | < 13000 | Critical | Chuẩn bị `liquidate` |

| Tuổi giá oracle | > 12 giờ | Warning | Kiểm tra feed |

| Tuổi giá oracle | > `maxPriceAge` | Critical | Các hàm cần giá đang revert |

| Hạn trả lãi | còn < 6 giờ mà `interestOwed > 0` | Warning | Nhắc owner |

| `GroupDefaulted` | bất kỳ | Critical | Thông báo thành viên rút |

| `Borrowed` | mỗi sự kiện | Info | Hiển thị cho thành viên |

## 23. Cross-Functional Stakeholders

| Bên | Chịu trách nhiệm |

| --- | --- |

| Chủ dự án (bạn) | Duyệt thiết kế, tham số, nội dung cảnh báo rủi ro |

| Kiểm toán độc lập | Review bảo mật trước mainnet |

| Ops / vận hành | Giám sát oracle, chạy keeper tùy chọn |

| Pháp lý | Đánh giá mô hình huy động và cho vay cộng đồng theo luật nơi hoạt động |

## 24. Message Encoding

N/A. Không có cross-chain message.

## 25. Types & Enums

\`\`\`solidity

enum State { OPEN, ACTIVE, COMPLETED, DEFAULTED, CANCELLED }

enum DefaultReason { INTEREST_OVERDUE, SETTLEMENT_OVERDUE, UNDERCOLLATERALIZED }

\`\`\`

## 26. Common Patterns / Worked Examples

**Giả định minh họa** (không phải giá thật): 10 thành viên, 50 USDC mỗi vòng, 10 vòng, lãi 2% mỗi vòng, `safetyBps = 20000`, `liquidationBps = 12000`. Owner ký quỹ 0.11 CirBTC (11,000,000 đơn vị 8 decimals) khi 1 BTC = 60,000 USD, nên giá trị cọc 6,600 USDC và hạn mức vay 3,300 USDC.

**A. Chu kỳ bình thường**

Mỗi vòng quỹ nhận 500 USDC. Owner vay 500 mỗi vòng cho đến khi dư nợ 3,000 ở vòng 6 (exposure lúc vay vòng 6 = 3,000 + 60 lãi vòng 6 = 3,060, vẫn nằm trong hạn mức 3,300). Các vòng 7 đến 10 tiền góp nằm yên.

| Vòng | Đỉnh dư nợ | Lãi (2%) |

| --- | --- | --- |

| 1 | 500 | 10 |

| 2 | 1,000 | 20 |

| 3 | 1,500 | 30 |

| 4 | 2,000 | 40 |

| 5 | 2,500 | 50 |

| 6 đến 10 | 3,000 | 60 mỗi vòng (300) |

Tổng lãi 450 USDC, chia cho thành viên theo tiền đã góp. Cuối chu kỳ owner `repay(3000)` và trả nốt lãi, ai cũng `finalize`, thành viên `withdrawPrincipal` đủ 5,000 USDC gốc, owner `withdrawCollateral`.

**B. Vỡ nợ do giá giảm**

Sau vòng 6: `totalDebt = 3,000`, `totalDeposits = 3,000`. Giá BTC giảm xuống 30,000: giá trị cọc 3,300, `3,300 x 10000 / 12000 = 2,750 < 3,000`. Ai cũng gọi `liquidate()`. Thành viên không còn USDC trong quỹ (đã cho vay hết) nên nhận 0.11 CirBTC theo tỷ lệ tiền góp (trị giá 3,300, tức 110% gốc). Nếu giá rơi tiếp xuống 25,000 trước khi có người gọi, cọc chỉ còn 2,750 và thành viên lỗ 250 (8.3% gốc).

**C. Vỡ nợ do quên trả lãi**

Vòng 1 kết thúc, lãi 10 USDC. Sau `interestGrace`, owner chưa trả. Ai cũng `declareDefault()`. Thành viên nhận toàn bộ 0.11 CirBTC (trị giá 6,600) dù nợ chỉ 500. Đây là đánh đổi "tịch thu toàn bộ" ở mục 19.

---

## Phụ lục A: Nghiên cứu oracle (đọc ngày 4/11/2026)

| Nguồn | Nội dung |

| --- | --- |

| Blog Arc, "How Chainlink Unlocks New Design Capabilities on Arc" | Nói Chainlink Data Feeds có trên Arc testnet, không kèm địa chỉ feed |

| Issue `aprin-labs/archimedes#794` (bên thứ ba) | Báo cáo chưa có Chainlink Data Feeds trên Arc testnet; Stork có trên testnet (contract `0xacC0a0cF13571d30B4b8637996F5D6D774d4fd62`, mình chưa tự xác minh) và cần adapter |

| Đánh giá cirBTC trên Aave ([governance.aave.com](http://governance.aave.com)) | Arc có feed Chainlink BTC/USD và CBBTC/USD, heartbeat 24 giờ, ngưỡng lệch 0.5%; chưa có feed riêng cho cirBTC; Circle giữ một số quyền đặc quyền trên token |

| [data.chain.link](http://data.chain.link) | Có trang feed CBBTC/USD trên Arc Mainnet (địa chỉ cần copy từ trang gốc) |

| Squidlor (bên thứ ba) | Registry trên Arc Testnet `0x610cC0E643dF3DC452929cfD0A4ADCdDB406B587` |

**Mình tự đọc on-chain trên Arc Testnet ngày 4/11/2026:**

- Registry Squidlor `getAggregatorByName("BTC/USD")` trả về `0xE6727b1eE47e3056A29ECeDc82EDDd1161Ca6c21`.

- Contract này có `description()` = "BTC/USD (Squidlor aggregated, Arc Testnet)" và `decimals()` = 8.

- `latestRoundData()`, `latestAnswer()` và `latestTimestamp()` đều revert. Contract chưa được verify trên explorer.

**Kết luận:** Chưa có feed BTC/USD nào mình xác minh là dùng được trên Arc Testnet. Contract không hardcode feed. Khuyến nghị:

1. **Testnet:** triển khai `MockAggregatorV3` (Phụ lục C), giao diện ghi rõ "giá thử nghiệm".

2. **Mainnet:** dùng feed Chainlink BTC/USD (hoặc CBBTC/USD) lấy từ trang Price Feed Contract Addresses của Chainlink, chọn network Arc. Script deploy phải assert `description()` và độ mới của giá.

3. Hỏi trên forum Arc về địa chỉ feed trên testnet và lịch cập nhật. Quy tắc theo môi trường nằm ở mục 12.1; cơ chế factory ở 10.10.

## Phụ lục B: Ảnh hưởng tới frontend và migration

| Phần hiện có | Việc cần làm |

| --- | --- |

| `CreateClubModal` | Thêm các trường: lãi %/vòng, hệ số an toàn, ngưỡng thanh lý, ân hạn, địa chỉ feed. Bỏ ô chọn cọc theo preset. Hiển thị lãi quy ra %/năm và hạn mức vay dự kiến |

| `ActionPanel` / `PasskeyActionPanel` | Bỏ bid, hụi chết, kick, claimPayout. Thành viên: `joinGroup`, `contribute`, `claimInterest`, `finalize`, `withdrawPrincipal`. Owner: `depositCollateral`, `borrow`, `repay`, `payInterest`, `withdrawCollateral` |

| `ClubCard`, `ClubMembersRoster`, `RoundHistory` | Hiển thị dư nợ, hạn mức, health factor, tuổi giá oracle, lãi đã trả và chưa trả, hạn trả lãi kế tiếp |

| `useSavingsClub` | Đọc `state`, `totalDebt`, `totalDeposits`, `collateral`, `borrowLimit`, `healthBps`, `pendingInterest`, `previewPrincipal` |

| `savingsClubDirectory` | Thêm `version` cho mỗi nhóm; nhóm `RotatingSavings` cũ giữ ABI cũ |

| Bài viết và UI copy | Không còn "chủ hụi không giữ tiền". Thay bằng "chủ hụi chỉ vay trong hạn mức cọc, ai cũng kích hoạt được thanh lý" và nêu rủi ro còn lại ở mục 15 và 16 |

| Tạo nhóm (deploy) | Thay `useDeployContract` bằng `writeContract` gọi `factory.createClub`; lấy địa chỉ club từ log `ClubCreated` trong receipt. Địa chỉ factory đọc từ cấu hình theo chain |

| Danh sách nhóm | Đọc `factory.clubAt` hoặc log `ClubCreated`; mỗi club kiểm `factory.isClub`; club ngoài factory gắn nhãn "chưa xác minh" và chặn nút góp cho tới khi người dùng xác nhận |

| Badge oracle | Đọc `priceFeed.description()`; chứa `MOCK` thì hiện badge "Giá thử nghiệm" và không hiện câu quảng bá an toàn. Luôn hiện tuổi giá (`updatedAt`) và link explorer của feed |

| Test TypeScript hiện có | Nhiều test kiểm tra chuỗi UI cũ (bid, hụi chết); cần cập nhật hoặc thay |

## Phụ lục C: `MockAggregatorV3` (chỉ cho test và testnet)

Mục tiêu: cùng interface Chainlink để contract không phân biệt mock với feed thật, và cho phép mô phỏng mọi kịch bản giá.

\`\`\`solidity

// contracts/test/mocks/MockAggregatorV3.sol

// Không đưa vào build triển khai mainnet. description() luôn bắt đầu bằng "MOCK".

contract MockAggregatorV3 {

    uint8 public immutable decimals;      // 8 cho BTC/USD

    string public description;            // ví dụ: "MOCK BTC / USD"

    uint256 public constant version = 1;

    address public immutable admin;       // ví deployer, chỉ để test

    uint80 private \_roundId;

    int256 private \_answer;

    uint256 private \_updatedAt;

    constructor(uint8 decimals\_, int256 initialAnswer, string memory description\_);

    // *roundId = 1;* answer = initialAnswer; \_updatedAt = block.timestamp

    function setPrice(int256 answer) external;           // onlyAdmin: *roundId++,* answer = answer, \_updatedAt = now

    function setUpdatedAt(uint256 ts) external;          // onlyAdmin: mô phỏng giá cũ

    function setBad(int256 answer) external;             // onlyAdmin: đặt 0 hoặc âm mà không cập nhật thời gian

    function latestRoundData() external view returns (

        uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound

    ); // trả (\_roundId, *answer,* updatedAt, *updatedAt,* roundId)

}

\`\`\`

Quy ước deploy testnet: giá khởi tạo gần giá thị trường lúc deploy (ví dụ 60000e8 chỉ là số minh họa, tự cập nhật bằng giá bạn muốn). Ghi địa chỉ mock vào cấu hình testnet. Script deploy factory assert `description()` bắt đầu bằng `MOCK`.

## Phụ lục D: Adapter cho Pyth hoặc Stork (tùy chọn, ngoài phạm vi bản đầu)

Chỉ dùng nếu muốn có giá thật trên testnet trước khi Chainlink có feed. Các địa chỉ và hợp đồng dưới đây chưa được mình tự xác minh; phải kiểm tra lại trên tài liệu chính thức của từng nhà cung cấp.

- Mục tiêu: một contract `PythAggregatorAdapter` (hoặc `StorkAggregatorAdapter`) cài `latestRoundData()`, `decimals()` và `description()` giống `AggregatorV3Interface`, rồi đưa địa chỉ adapter vào factory như một feed bình thường.

- Pyth và Stork thường là mô hình kéo (pull): ai đó phải gửi dữ liệu giá đã ký lên chain kèm phí cập nhật trước khi đọc. Cần quyết định ai trả phí và ai cập nhật (keeper của project, hoặc ghép vào giao dịch của owner và keeper thanh lý).

- Adapter phải: đổi số mũ của nguồn về 8 decimals, từ chối giá có khoảng tin cậy (confidence) quá rộng, trả `updatedAt` đúng thời điểm công bố của nguồn, và revert nếu chưa có giá.

- Rủi ro mới: lệch giữa thời điểm cập nhật và thời điểm đọc; adapter là code mới cần test và kiểm toán như contract chính.

- Vì độ phức tạp, bản đầu dùng mock trên testnet và Chainlink trên mainnet; adapter chỉ làm khi có nhu cầu rõ.

