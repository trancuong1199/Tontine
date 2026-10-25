# Task-044 — BA coverage review

Spec: [spec-v1.md](./spec-v1.md). BA reviewer: `/root/ba`. Status: **Gate 4 APPROVED — 10/10 REQ đủ bằng chứng trong phạm vi local**, ngày 2026-10-25.

BA đã đọc source được bàn giao, [Developer handoff](../../manifests/task-044/developer-handoff.md), [manifest](../../manifests/task-044/manifest.json) gồm 19 file, các test TypeScript/Solidity, [Tester final report](../../qa/task-044/test-report.md) và [source integration review](../../qa/task-044/source-review.md). Manifest đóng băng lúc `2026-10-25T12:06:02.711Z`; không sửa implementation trong lần đối chiếu này. BA dẫn lại kết quả do Tester thực chạy và đã đọc log/exit evidence; không nhận mình đã chạy các test đó hay ký thay Tester.

## Mapping đã đối chiếu sau Tester signoff

| REQ / AC | Test và bằng chứng Tester | Đối chiếu BA |
| --- | --- | --- |
| 01 / 01a–01c | `ArcReviewFixes.t.sol`: OpenMajorityOwnerCannotUnilaterallyCancel, VoterGuards, ActiveRefundBidDeltaOnlyOnce, ActiveOwnerFinalVoteRefunds, PreservesPreviousPayoutAndCreditsCurrentRound, DoesNotReclaimAlreadyWithdrawnPayout, TerminalStateGuardsPreventDuplicateRefund, EligibleCollateralRewardsRemainClaimable, fuzz conservation; [Foundry log](../../qa/task-044/forge-test-run2.log) | PASS: đủ luồng owner/member, ngưỡng/duplicate/terminal, cộng đúng một lần, bảo toàn tiền cũ/collateral/slash. |
| 02 / 02a–02b | [Source review AC02](../../qa/task-044/source-review.md), cancellation/bilingual/payout regressions trong [npm log](../../qa/task-044/npm-test-run3.log) | PASS source integration + tests: ACTIVE vote cả hai ví, owner nonmember qua App, giải thích đúng refunds/payout cũ, claim sau CANCELLED, toast không báo đã hủy khi mới vote; không tính là browser E2E. |
| 03 / 03a–03c | `T044-MONEY`, `T044-ERROR-FACTS`, `T044-INTEGRATION` trong [runtime log](../../qa/task-044/new-runtime-tests-run3.log); source review AC03c | PASS: bigint giữ integer lớn, USDC half-up, parser compatibility; facts có guard; useUsdcBalance chỉ đọc ERC-20. |
| 04 / 04a–04b | `T044-INTEGRATION` trong runtime log và source review RPC | PASS: config lấy URL từ facts cho registration/chain/http, Circle bundler vẫn modular; không hứa proxy hoặc rate-limit đã được giải quyết. |
| 05 / 05a–05b | `T044-CHAIN`, `T044-GUARDED-HOOK` trong runtime log; source review AC05 inventory | PASS runtime + integration: current chain được đọc lại, switch chờ đúng thứ tự, reject chặn write, approval follow-up dùng wrapper, deploy await switch, passkey đi bundler. |
| 06 / 06a–06c | Foundry custom token A/B/zero tests; `T044-DEPLOY`, `T044-EXISTING-CLUB` trong runtime log; [artifact comparison](../../qa/task-044/artifact-comparison.json), source review AC06 | PASS: constructor 6 args/zero guard, token selected club thực dùng trong hook allowance/balance, approve truyền token đó, invalid override throws; deployment lịch sử không thay đổi. |
| 07 / 07a–07b | `T044-SESSION` trong runtime log; source review AC07b logout | PASS runtime + integration: chỉ id/publicKey trong session, legacy purge, storage-failure fallback memory, logout clear cache/account/bundler. |
| 08 / 08a–08b | Foundry ExactEndAcceptedThenExpiredErrors, ResetsOwnerNonmemberVoteAndKicksWithoutRestoringSlash; `T044-ERROR-FACTS`; [targeted event log](../../qa/task-044/cycle-event-run3.log) | PASS: endTime boundary, permissionless settlement, distinct errors, owner nonmember vote reset, không phục hồi slash; event NewCycleStarted ID/endTime được assert trên EVM thật. |
| 09 / 09a–09b | `T044-HISTORY` trong runtime log; source review AC09b | PASS runtime + integration: tối đa 50 bigint IDs, sparse results giữ ID; UI nêu window cho totals; onchain hasWon và latest matching win, unknown/outside-window thay vì round 1 giả. |
| 10 / 10a–10b | [Pre-verify](../../qa/task-044/pre-verify-run1.log), [post-verify](../../qa/task-044/post-verify.log), full npm/Foundry, [typecheck exit](../../qa/task-044/typecheck-run1.json), [build exit](../../qa/task-044/build-run1.json), artifact comparison, [test hashes](../../qa/task-044/test-sha256.json) | PASS: 19/19 source hashes giữ nguyên; npm 404/404, Foundry 87/87, typecheck/build exit 0; artifact ABI và bytecode khớp independent compiler; obsolete test updates có rationale trong report. |

Số test runtime mới 9 đã nằm trong tổng npm 404, không cộng trùng; targeted event run 1 nằm trong bộ Foundry 87, không tính thành 88. Bộ Foundry có 14 test mới (gồm fuzz) và 4 invariant, mỗi invariant 256 runs/128000 calls theo log Tester. Các lỗi của run cũ còn được giữ trong hồ sơ; final verdict dựa trên rerun đúng hash, không dựa baseline 395 test của phiên trước.

## Những khẳng định không thuộc bằng chứng local

- Không có deployment/giao dịch mạng công khai; source mới không thay bytecode của club đã deploy.
- Không kiểm chứng MetaMask/WebAuthn device ceremony thật, paymaster/bundler online hoặc mức rate-limit RPC bằng test local.
- Không có bảo đảm chống XSS từ sessionStorage, không có bằng chứng credential chứa private key.
- Consensus cancellation bảo toàn kế toán trong phạm vi các khoản đang giữ; không đảo ngược payout đã settle và không chứng minh mọi thành viên có lợi ích kinh tế bằng nhau khi dừng giữa cycle.

## Kết luận gate

Tester final report: **PASS**, nguồn `docs/qa/task-044/test-report.md`. Hash trước/sau: **19/19 MATCH**, cùng freeze `2026-10-25T12:06:02.711Z`. BA coverage: **10/10 REQ, toàn bộ AC và BR liên quan được đối chiếu**, kết hợp runtime tests với source integration review được ghi rõ theo loại bằng chứng; không có blocker còn lại trong scope local.

Gate 4: **APPROVED**. Gate 5 Leader nghiệm thu: **pending Leader quyết định**; BA không tự nghiệm thu toàn task.
