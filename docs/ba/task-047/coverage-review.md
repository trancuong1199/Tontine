# Task-047 — BA coverage review

Spec: [v1](./spec-v1.md). Source: [frozen manifest](../../manifests/task-047/manifest.json), đúng5files frozen `2026-10-25T14:32:39.399Z`.

Trạng thái: Gate 4 **APPROVED**, đủ3/3REQ và7/7AC sau [Tester signoff PASS](../../qa/task-047/test-report.md) và [source review](../../qa/task-047/source-review.md). BA đã đọc diff, test source, runtime logs/exit metadata và pre/post verification; không ký thay Tester.

| REQ / AC | Source đối chiếu | Runtime evidence / BA kết luận |
| --- | --- | --- |
| REQ-01 / 01a–b | arc-constants chỉ thêm comment nêu missing facts, fixed legacy bindings và deployment-only override; không sửa address/decimals/env logic | PASS: QA source review + task044 deployment/per-club và task046 config trong npm422 |
| REQ-02 / 02a–c | isPositiveAmount gọi nguyên parseSwapAmount trong try/catch; modal dùng18/6/8 và giữ busy/connection; treasury dùng TOKEN_CONFIGS6/6/8 và giữ loading; handlers không đổi | PASS: `tests/guard-followup.test.ts` cases1/3/4 chạy parser và production component render/input/select callbacks; invalid, >2^53, smallest units, overprecision, trailing zero, loading/connection; zero wallet calls |
| REQ-03 / 03a–b | arcAnalytics chỉ thay comment mô tả scale18 nội bộ để cộng USDC6/native18, không thay algorithm | PASS: test case2 cộng mixed6/18 đúng2234567000000000001n, giữ raw input và loại non-USDC/failed/incoming; reused9 analytics/balance runtime |

Diff nằm đúng5source được giao; không thay Solidity, token routing, simulation arithmetic hoặc transaction validation. Precision dư toàn zero vẫn theo parser hiện hữu. Không thiếu AC hoặc blocker còn mở.

Bằng chứng đã đọc trong `docs/qa/task-047/`: `new-runtime-run1.log/.json`4/4; `analytics-runtime-run1.log/.json`9/9; `npm-run1.log/.json`422/422,0fail/skip; `typecheck-run1.json` và `build-run1.log/.json`exit0. Các targeted cases đã nằm trong422, không cộng hai lần. `pre-verify-run1.log` và `post-verify.log/.json` xác nhận5MATCH, postverify kết thúc `2026-10-25T14:34:07.947724+00:00`; `review-docs-sha256-after.json` ghi3reviewdocs unchanged. `contracts-unchanged.json` xác nhận Solidity/artifact unchanged, không chạy lại Foundry và không dùng kết quả91 cũ như test mới.

Giới hạn giữ nguyên: component tests dùng controlled hook state/suppressed effects và inject malformed vault state, không chứng minh native HTML validation/browser layout/live RPC/wallet; simulation deposit vẫn có parseFloat ngoài scope; global env token override không được thêm vì có thể lệch fixed deployments. Build có dependency annotation/chunk-size warnings, không có lỗi. Gate5 chờ Leader nghiệm thu.
