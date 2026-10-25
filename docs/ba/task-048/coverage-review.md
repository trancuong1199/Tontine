# Task-048 — BA coverage review

Trạng thái **Gate4 APPROVED**, đủ4/4REQ và7/7AC sau [Tester PASS](../../qa/task-048/test-report.md) và pre/post7MATCH. Spec [v1](./spec-v1.md), [manifest7files](../../manifests/task-048/manifest.json) frozen `2026-10-25T15:06:25.378Z`; đã đọc handoff, baseline-relative diff, QA report/source-review/logs và test source.

| REQ / AC | Source coverage | Evidence/status |
| --- | --- | --- |
| REQ01 / 01a–b | Separate useCycleCapability read đúng Arc/address, retryfalse/placeholderundefined; classifier4states,0n valid, typed definite revert/empty-data khác generic transport; riêng với club/claim reads | PASS evidence: cycle-capability cases1/2 chạy installed viem wrapped errors và production hook arguments/status/refetch; App source mapping case5 |
| REQ02 / 02a–b | App truyền capability/refetch cả2panels; injected chỉ render restart khi supported và guard callback; distinct VI/EN notices/retry/create; passkey không thêm restart; claims và ACTIVE notice không thay | PASS evidence: case3 actual2panels x4states xVI/EN, restart/create/retry/payout/collateral callbacks; source unchanged ACTIVE/history + npm regressions |
| REQ03 / 03a–b | Hook chỉ restart simulate sau switch, đúng account/parameters/Arc; check account/chain trước/sau; lock xuyên preflight+wallet và release settled; failures clear pending/toast; other writes không thêm simulation | PASS evidence: case4 production hook switch→simulate→write, revert/transport/rejected-switch/context mismatch→0write, retry/duplicates/settledcallback and other4writes regression |
| REQ04 / 04a | Đúng7assignedfiles; Solidity/artifact không trong diff; không forcegas hoặc đổi RPCconfig | PASS: finalfocused5/5,npm427/427,typecheck/build0,pre/post7MATCH,3reviewdocsunchanged,contracts/artifactunchanged; formal Tester signoff PASS |

BA đã đọc `tests/cycle-capability.test.ts`, QA `source-review.md`, `new-runtime-run2.log/.json`5/5 và `npm-run2.log/.json`427/427,0fail/skip; targeted5 đã nằm trong427. `typecheck-run1.json` và `build-run1.log/.json`exit0; preverify và postverify7MATCH, postverify kết thúc `2026-10-25T15:08:00.526804+00:00`; `review-docs-sha256-after.json`3unchanged, `contracts-unchanged.json`2unchanged. Không cần Foundry rerun trong frontend-only scope.

Đã đọc raw `live-readonly-request.json` và `live-readonly-response.json`: cycleStartRound/startNewCycle eth_call/estimateGas đều code3executionreverted, existing getters hoạt động, members0/1 có data, members2revert; deployedCode9386bytes thiếu2selectors. Đây là live read-only diagnosis riêng, không có write request hoặc wallet confirmation.

Không phát hiện thiếu coverage hoặc blocker; Gate5 chờ Leader nghiệm thu. Tests dùng controlled React hooks/suppressed effects và RPC/wallet mocks; capability query kiểm arguments/status/placeholder, không phải full TanStack cache integration/browser. App propagation dùng source assertion/review.

First focused4/5/npm426/427 thất bại do fixture viem ESM/CJS class identity; Tester đổi cách import actual helper để cùng module identity, giữ expected outcomes và source hash, lưu firstfail logs. Hai existing harness cập nhật export mock simulateContract (throw nếu non-restart gọi nhầm) và explicit supported capability cho task045 collateral fixture; không bỏ assertion. BA chấp nhận đây là sửa harness phù hợp context mới, không sửa implementation để đạt test. Final427/427 là kết quả rerun thực trên cùng7hash; build warnings chỉ dependency annotation/chunk size.

Giới hạn chẩn đoán: raw RPC kiểm riêng legacy restart/getter không hỗ trợ; chưa capture calldata của wallet popup trong ảnh, chưa xác nhận action người dùng đã bấm. Fix này giải quyết lỗi restart đã chứng minh; không tuyên bố sửa mọi Unknown transaction của OKX. Simulation chỉ kiểm state tại thời điểm read, không bảo đảm state không thay trước mining; không live wallet write/deploy.
