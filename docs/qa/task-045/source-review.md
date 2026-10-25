# Task-045 — source integration review

Spec-v1; frozen8 files lúc `2026-10-25T12:30:21.792Z`; reviewer `/root/tester`.

- **REQ01:** `contract.ts` re-export `formatUsdc` trực tiếp; shared module dùng bigint half-up/grouping cho display, `formatUsdcExact`/`formatUnitsExact` giữ machine conversion. Test kiểm function identity và kết quả thật, không chỉ so source string.
- **REQ02:** Hai panel cùng gọi `getRaisedBidInput(userBid, preset)`, giữ danh sách preset 1/2/5/10. Runtime test thực mở toggle, click từng nút và đọc input render lại trên component production, gồm tiền >=1000, 6-decimal fraction và >2^53. Fractional delta0.5/0.1 được kiểm trực tiếp qua helper cùng API.
- **REQ03:** Injected COMPLETED có cycleEndNotice/cycleRestartNotice ngay trước Start New Cycle; passkey COMPLETED có cùng notice, không hướng dẫn bấm nút start/deposit không tồn tại. Notice VI/EN nói reset kicked/winner, không tự khôi phục/nộp collateral và có thể kết thúc sớm. ACTIVE warning chỉ cho isMember && !isKicked && lockedCollateral===0n. Runtime render cả hai panel/cả hai ngôn ngữ kiểm warning và explicit0 không bị thay thành configured collateral target; vault hiển thị0.0000 với target100000. Solidity diff chỉ comment, không thêm transfer/approve hay đổi quyền; Foundry thực chứng minh balance/allowance, retained collateral/reward không đổi sau cycle reset.
- **REQ04:** No-winner `_refundRound(roundId,false)` được giải thích bằng settled history vs claimable; ACTIVE cancel vẫn true. Foundry kiểm historical contribution sau settle/claim, NoPayout khi claim lần2, chặn settle lại, mở cycle sau rồi cancel không re-credit round cũ, đồng thời clear current unsettled mapping. Kịch bản hợp lệ no-winner dùng contribution của previous winner; bid của member này bằng0 vì previous winner không được bid.
- **REQ05:** Output compiler/checks nằm trong `/tmp/task045-qa-out` và QA logs, không ghi đè tracked artifact sau freeze. Hai review docs cũ vẫn untracked và không bị Tester sửa; staging/commit thuộc Leader.

Runtime component tests dùng hook/wallet boundary mocks, không browser E2E hoặc MetaMask/WebAuthn thật. Không gửi live transaction hay deploy.
