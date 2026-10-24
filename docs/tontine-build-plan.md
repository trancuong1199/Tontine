# HụiChain (Tontine) — Bản kế hoạch build app

> Rotating savings club trustless trên Arc Testnet.
> Mỗi nhóm là một smart contract. Contract giữ tiền, không ai tự ý rút được.

---

## 1. Tổng quan sản phẩm

### Vấn đề giải quyết
Hụi truyền thống (Việt Nam), Susu (Nigeria), Tanda (Mexico), Chit Fund (India) — mô hình tiết kiệm nhóm xoay vòng tồn tại ở 80+ quốc gia, quy mô ~$100B/năm — toàn bộ chạy trên **trust tay đôi**, không có cơ chế enforce. Chủ hụi có thể ôm tiền bỏ trốn bất kỳ lúc nào.

### Giải pháp
Smart contract thay thế chủ hụi:
- Contract giữ tiền, không ai (kể cả người tạo nhóm) tự ý rút
- Quy tắc rõ ràng, tự thực thi, không cần trọng tài
- Ai cũng có thể tham gia — không cần quen biết, không cần trust

### Differentiator trên Arc
- USDC là native gas → đóng $10 USDC tốn phí $0.001 (viable cho micropayment)
- Sub-second finality → confirm ngay lập tức
- Không chain nào khác cho phép nhóm $5/tháng chạy onchain với chi phí hợp lý

---

## 2. Cơ chế hoạt động

### Lifecycle một nhóm

```
[OPEN] → [ACTIVE] → [COMPLETED]
  ↓
[CANCELLED]  (chỉ khi còn OPEN, chủ nhóm huỷ)
```

**OPEN:** Chủ nhóm tạo group, mọi người join.
**ACTIVE:** Chủ nhóm gọi `startRounds()` khi đủ thành viên (≥2). Các vòng bắt đầu.
**COMPLETED:** Tất cả thành viên đã thắng một vòng.

### Flow một vòng (Round)

```
Round bắt đầu
    ↓
Mỗi thành viên gọi contribute() — đóng X USDC
    ↓
Ai muốn nhận pot sớm → gọi placeBid(amount) — đặt thêm tiền bid
    ↓
Hết thời gian (roundDuration) hoặc tất cả đã đóng + có bid
    ↓
Ai cũng gọi settleRound() → xác định winner = người bid cao nhất
    ↓
Winner nhận: toàn bộ pot + bid của mình trả lại
Người còn lại: nhận phần chia từ tổng bid (bonus nhỏ)
    ↓
Vòng tiếp theo bắt đầu
```

### Quy tắc quan trọng
- Mỗi thành viên chỉ thắng **đúng một vòng** (hasWon = true sau khi thắng)
- Không đóng góp đúng hạn → bị kick tự động khi vòng settle
- Thành viên bị kick: không tham gia các vòng tiếp theo
- Payout là **pull-based**: winner/người nhận bonus phải tự gọi `claimPayout()`
- Tổng số vòng = số thành viên ban đầu
- Nhóm kết thúc sớm nếu activeMembers = 0

---

## 3. Smart Contract đã deploy

| Thông tin | Giá trị |
|---|---|
| Contract | `RotatingSavings.sol` |
| Address (Arc Testnet) | `0x6afaa0825d2e05ef00d571d4a043ab5dcc03534b` |
| USDC token | `0x3600000000000000000000000000000000000000` |
| Chain ID | `5042002` |
| Explorer | https://explorer.testnet.arc.io/address/0x6afaa0825d2e05ef00d571d4a043ab5dcc03534b |

### Constructor params (khi deploy instance mới)
```solidity
constructor(
  address usdcToken,       // 0x3600...0000
  uint256 contributionAmount, // USDC 6 decimals, ví dụ: 10_000_000 = 10 USDC
  uint256 maxMembers,      // 2..20
  uint256 roundDuration,   // giây, ví dụ: 86400 = 1 ngày
  string  groupName        // tên nhóm hiển thị
)
```

### ABI — các function cần dùng

| Function | Caller | State | Params | Mô tả |
|---|---|---|---|---|
| `joinGroup()` | Bất kỳ | OPEN | — | Tham gia nhóm |
| `startRounds()` | Owner | OPEN | — | Bắt đầu, cần ≥2 member |
| `contribute(roundId)` | Member | ACTIVE | uint256 | Đóng X USDC vào vòng |
| `placeBid(roundId, amount)` | Member | ACTIVE | uint256, uint256 | Đặt bid (cần đã contribute) |
| `settleRound(roundId)` | Bất kỳ | ACTIVE | uint256 | Kết thúc vòng sau deadline |
| `kickDefaulter(roundId, addr)` | Bất kỳ | ACTIVE | uint256, address | Kick người không đóng |
| `claimPayout()` | Member | ANY | — | Rút tiền thắng/bonus |
| `cancelGroup()` | Owner | OPEN | — | Huỷ nhóm |

### Read functions quan trọng
```
groupName() → string
state() → uint8 (0=OPEN, 1=ACTIVE, 2=COMPLETED, 3=CANCELLED)
contributionAmount() → uint256
maxMembers() → uint256
activeMembers() → uint256
currentRound() → uint256
members(index) → address
isMember(address) → bool
hasWon(address) → bool
isKicked(address) → bool
claimable(address) → uint256
rounds(roundId) → (startTime, endTime, winner, totalPot, totalBids, settled)
```

### Events
```
MemberJoined(address member, uint256 index)
RoundsStarted(uint256 totalRounds, uint256 firstRoundEnd)
Contributed(uint256 roundId, address member, uint256 amount)
BidPlaced(uint256 roundId, address member, uint256 totalBid)
RoundSettled(uint256 roundId, address winner, uint256 pot, uint256 winnerBid)
MemberKicked(uint256 roundId, address member)
PayoutClaimed(address recipient, uint256 amount)
GroupCancelled()
```

---

## 4. Chain & Token Config

### Arc Testnet
```
Chain ID:    5042002
RPC:         https://rpc.testnet.arc.io
Explorer:    https://explorer.testnet.arc.io
Symbol:      USDC
Faucet:      https://faucet.circle.com
```

### USDC trên Arc
```
ERC-20 address:  0x3600000000000000000000000000000000000000
ERC-20 decimals: 6  (dùng cho approve/transfer)
Native decimals: 18 (dùng cho msg.value / gas)
```

**Quy tắc quan trọng:** Native USDC và ERC-20 USDC là CÙNG một pool.
- Chỉ hiển thị MỘT dòng balance (ERC-20 view, 6 decimals)
- Không gọi `decimals()` trên native sentinel address

---

## 5. Wallet Options

### A. Circle Modular Wallet (Passkey) — Recommended
Đăng nhập bằng Face ID / Fingerprint, không cần MetaMask, không cần seed phrase.

**Setup Circle Console:**
1. [console.circle.com](https://console.circle.com) → bật Testnet
2. Keys → Create a key → **Client Key**
   - Allowed Domain = hostname của app (exact match)
3. Wallets → Modular Wallets → **Passkeys** → Domain Name = hostname y chang bước 2
4. Copy `TEST_CLIENT_KEY:...` vào env: `VITE_CLIENT_KEY`

**Env vars cần:**
```
VITE_CLIENT_KEY=TEST_CLIENT_KEY:xxxxxxxx
VITE_CLIENT_URL=https://modular-sdk.circle.com/v1/rpc/w3s/buidl
```

**Install:**
```bash
bun add @circle-fin/modular-wallets-core
```

**Code flow:**
```ts
import {
  toPasskeyTransport, toModularTransport,
  toCircleSmartAccount, toWebAuthnCredential, WebAuthnMode
} from "@circle-fin/modular-wallets-core";
import { createPublicClient } from "viem";
import { createBundlerClient, toWebAuthnAccount } from "viem/account-abstraction";
import { arcTestnet } from "viem/chains";

// Tạo transports
const passkeyTransport = toPasskeyTransport(clientUrl, clientKey);
const modularTransport = toModularTransport(`${clientUrl}/arcTestnet`, clientKey);

// Đăng ký passkey mới
const credential = await toWebAuthnCredential({
  transport: passkeyTransport,
  mode: WebAuthnMode.Register,  // WebAuthnMode.Login để đăng nhập
  username: "ten-nguoi-dung",
});

// Tạo smart account
const publicClient = createPublicClient({ chain: arcTestnet, transport: modularTransport });
const account = await toCircleSmartAccount({
  client: publicClient,
  owner: toWebAuthnAccount({ credential }),
});

// Bundler client — gửi UserOperation
const bundler = createBundlerClient({ chain: arcTestnet, transport: modularTransport });

// Gửi transaction (gas sponsored)
const hash = await bundler.sendUserOperation({
  account,
  calls: [
    { to: USDC_ADDRESS, data: encodeApproveData(...) },
    { to: CONTRACT_ADDRESS, data: encodeJoinData() },
  ],
  paymaster: true, // Circle Gas Station tài trợ gas
});
const { receipt } = await bundler.waitForUserOperationReceipt({ hash });
```

### B. MetaMask / Injected Wallet (Fallback)
```ts
import { createConfig, http } from "wagmi";
import { arcTestnet } from "viem/chains";
import { getDefaultConfig } from "connectkit";

const config = createConfig(getDefaultConfig({
  chains: [arcTestnet],
  transports: { [arcTestnet.id]: http("https://rpc.testnet.arc.io") },
  walletConnectProjectId: "YOUR_PROJECT_ID",
  appName: "HụiChain",
}));
```

---

## 6. USDC Approve Flow

Trước khi `contribute` hoặc `placeBid`, contract cần được approve để transfer USDC.

**Approve một lần (nhiều vòng):**
```ts
import { erc20Abi, encodeFunctionData } from "viem";

// Approve đủ dùng 20 vòng
const approveData = encodeFunctionData({
  abi: erc20Abi,
  functionName: "approve",
  args: [ROTATING_SAVINGS_ADDRESS, contributionAmount * 20n],
});
```

**Với Modular Wallet:** batch approve + action trong 1 UserOperation:
```ts
await bundler.sendUserOperation({
  account,
  calls: [
    { to: USDC_ADDRESS, data: approveData },
    { to: CONTRACT_ADDRESS, data: joinData },
  ],
  paymaster: true,
});
```

---

## 7. Kế hoạch xây dựng UI

### Phase 1 — MVP (cần làm trước)

**Screen 1: Onboarding**
- Hero card: giải thích hụi trustless
- Nút: "Tạo ví bằng Face ID" (passkey register)
- Nút: "Đã có tài khoản" (passkey login)
- Fallback: "Kết nối MetaMask"

**Screen 2: Club View**
- Club card: tên nhóm, trạng thái, vòng hiện tại, đếm ngược
- Round info: tổng pot, tổng bid, winner (nếu đã settle)
- Member status: đã tham gia, đã đóng, bid hiện tại, số tiền có thể nhận
- Action panel: tự động hiển thị action đúng theo state

**Actions theo state:**
```
OPEN  → joinGroup (approve + join 1 bước)
ACTIVE + chưa contribute → contribute
ACTIVE + đã contribute → placeBid
ACTIVE → settleRound (ai cũng làm được)
ANY → claimPayout (nếu claimable > 0)
```

### Phase 2 — Full Product

**Tạo nhóm mới:**
- Form: tên nhóm, contribution amount, số thành viên tối đa, thời gian mỗi vòng
- Deploy contract mới (Factory pattern hoặc deploy trực tiếp)
- Copy link chia sẻ

**Danh sách nhóm:**
- Các nhóm user đang tham gia
- Search/join bằng địa chỉ contract
- Public group browser

**Owner controls:**
- Nút "Bắt đầu" (startRounds) khi đủ thành viên

**Lịch sử:**
- Các vòng đã settle: ai thắng, pot bao nhiêu
- Transaction history

**Phase 3 — Polish:**
- Mobile PWA, push notification
- Multi-group dashboard
- Share link `app.com/join/0x...`

---

## 8. Stack kỹ thuật

| Layer | Công nghệ |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS v4, framer-motion |
| Wallet (passkey) | @circle-fin/modular-wallets-core |
| Wallet (MetaMask) | wagmi v2, ConnectKit, viem v2 |
| Contract calls | viem encodeFunctionData, wagmi hooks |
| Notifications | sonner |
| Chain | Arc Testnet (viem built-in: `arcTestnet`) |

---

## 9. Env vars cần thiết

```env
# Circle Modular Wallet (passkey)
VITE_CLIENT_KEY=TEST_CLIENT_KEY:xxxxxxxxxxxxxxxxxx
VITE_CLIENT_URL=https://modular-sdk.circle.com/v1/rpc/w3s/buidl

# WalletConnect (MetaMask fallback)
VITE_WALLETCONNECT_PROJECT_ID=xxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 10. Links tham khảo

| Tài liệu | URL |
|---|---|
| Arc developer docs | https://docs.arc.io |
| Arc chain config | https://docs.arc.io/integrate/connect-to-arc |
| Circle Modular Wallets | https://developers.circle.com/wallets/modular |
| Modular Wallet Quickstart | https://developers.circle.com/wallets/modular/create-a-modular-wallet |
| Circle Console | https://console.circle.com |
| Arc Testnet Explorer | https://explorer.testnet.arc.io |
| Contract trên Explorer | https://explorer.testnet.arc.io/address/0x6afaa0825d2e05ef00d571d4a043ab5dcc03534b |
| Arc Testnet Faucet | https://faucet.circle.com |
| viem arcTestnet chain | https://viem.sh/op-stack |
| ERC-4337 UserOperation | https://eips.ethereum.org/EIPS/eip-4337 |
