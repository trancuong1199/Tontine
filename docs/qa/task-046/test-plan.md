# Task-046 — independent QA plan

Status: **ready for frozen-source execution**, spec-v1 Gate 1 approved; manifest pending. Không sửa implementation hoặc ký pass trước source freeze. Scope theo Leader: review-v3 10 findings; ba review docs giữ nguyên ngoài staging.

| Coverage | Expected evidence |
| --- | --- |
| Arc balance reads | Production helper/hook với mock RPC boundary: gọi USDC ERC20 balanceOf đúng address/wallet, Arc chain5042002 từ registry; ví đang chain khác vẫn đọc Arc; không fallback native getBalance. Raw bigint0,1 micro, fraction6dp và >2^53 giữ precision đến formatter. |
| Components | Actual production component/helper integration cho ArcAppKitModal, RightSidebar, ArcAppKit, Dashboard, Analytics; không parse grouped display lại thành Number; error/loading/unknown không hiện fake0; raw0 thành số0 thật; không giữ stale balance khi address đổi/fetch fail nếu spec quy định. |
| Analytics dedupe | Một USDC ERC20 row, loại native dual-view duplicate và duplicate cùng token address case-insensitive; cùng symbol nhưng khác address vẫn là token khác; wrapped token address khác không gộp nhầm. Pie/holdings count cùng canonical holdings; chart numeric boundary finite/approximate và không dùng để đưa tiền vào transaction. |
| Configuration | arc-constants RPC/USDC/chain/decimals bằng onchain-facts; arcChain/arcNetwork dùng nguồn chung; EURC/CIRBTC local configs giữ address/decimals hiện có vì registry không chứa. MerchantTreasury import token config, không inline duplicate USDC address. |
| Semantics | AlreadyWon message đúng current-cycle/bid; presets list canonical dùng ở cả2 panels; permissionless kick docs + outsider valid/too-early/nonmember/previous-winner guard runtime; bonus comments không đổi eligibility/payout. |
| Integrity/regression | SHA pre/post task046, npm/typecheck/build và Foundry actual logs; targeted mocks chỉ RPC/wallet/hooks boundaries, không copy implementation vào test oracle. Artifact compare nếu Solidity comment rebuild. |

Observed baseline: Analytics thực đưa cả `USDC (Native)` lẫn ERC20 USDC explorer row vào pie; Dashboard parse displayed balance lại thành float để tính portfolio; đây là consumer cần test thực. MerchantTreasury còn các amount float khác ngoài review token-config, không tự mở rộng task để sửa các luồng này.

Không gửi transaction, không deploy, không benchmark live RPC hay chạy hardware WebAuthn. Phân biệt source review/component runtime với browser E2E trong báo cáo.

Prepared suites: `tests/arc-review-v3.test.ts` (9 cases, including actual Dashboard/Analytics component lifecycle with mocked React hooks and RPC/explorer boundaries); new T046 case in `tests/review-followup.test.ts` (actual initial preset clicks and VI/EN permissionless notices in both wallet panels); `contracts/test/ReviewV3Semantics.t.sol` (2 cases permissionless manual-kick and prior-winner bid/kick/bonus). Existing task044/task045 regression suites remain enabled. Component tests execute production rendering/callbacks with state/effect dependency/ref semantics; they do not claim browser layout or real wallet integration coverage.
