# Task-044 — báo cáo Tester độc lập

**Kết luận: PASS / signoff cho phạm vi local của spec-v1.** Tester `/root/tester`; ngày 2026-10-25. Không sửa implementation để test pass.

Spec: `docs/ba/task-044/spec-v1.md`. Source manifest: `docs/manifests/task-044/manifest.json`, frozen lúc `2026-10-25T12:06:02.711Z`, gồm 19 file. `pre-verify-run1.log` và `post-verify.log`: **19/19 MATCH, exit 0**. Hash các test đã bàn giao nằm trong `test-sha256.json`.

## Kết quả thực chạy

| Lệnh / bằng chứng | Exit | Kết quả |
| --- | --- | --- |
| `npm test` — `npm-test-run3.log`, `npm-test-run3.json` | 0 | **404 test cases pass, 0 fail, 0 skip**; đây là số test TAP, không phải số file. Chạy ngoài sandbox vì CLI regression dùng execSync bị EPERM trong sandbox. |
| `node --experimental-strip-types tests/arc-review-fixes.test.ts` — `new-runtime-tests-run3.log` | 0 | **9/9 pass** runtime/targeted checks mới; cùng các test này đã nằm trong tổng npm 404, không cộng trùng. |
| `npm run typecheck` — `typecheck-run1.log/json` | 0 | TypeScript pass. |
| `npm run build` — `build-run1.log/json` | 0 | Production build pass; Vite có cảnh báo bundle size, không phải build failure. |
| `forge test --use /tmp/tontine-task-044-toolchain/solc-0.8.28 --out /tmp/task044-qa-out --cache-path /tmp/task044-qa-cache -vv` — `forge-test-run2.log/json` | 0 | **87/87 pass, 0 fail, 0 skip**, gồm suite mới 14 tests (có fuzz), existing unit/fuzz và 4 invariants. Invariants chạy 256 runs, 128000 calls mỗi invariant. |
| Targeted Foundry test `test_Cycle_ResetsOwnerNonmemberVoteAndKicksWithoutRestoringSlash` sau khi thêm event assertion — `cycle-event-run3.log` | 0 | **1/1 pass**, xác nhận NewCycleStarted ID/endTime thật. Đây là test thuộc bộ 87, không cộng thành test thứ 88. |
| So independent compiled artifact — `artifact-comparison.json` | 0 | ABI, creation bytecode, runtime bytecode, link references và immutable references khớp tuyệt đối. SourceMap source IDs khác khi compilation input gồm tests; executable bytecode không khác. |

## Traceability

| REQ / AC | Test và bằng chứng | Kết quả |
| --- | --- | --- |
| 01 / 01a–c | `ArcReviewFixesTest` cancel majority, voter guards, both final-vote entry points, bid delta/refund, additive old claim, already-withdrawn payout, terminal guards, collateral reward, fuzz conservation; `forge-test-run2.log` | PASS runtime |
| 02 / 02a–b | `source-review.md` AC02 rows; bilingual/cancelled/payout regressions trong npm run3; contract refunds runtime ở REQ01 | PASS source integration + tests; không browser E2E |
| 03 / 03a–c | T044-MONEY, T044-ERROR-FACTS, T044-INTEGRATION; `new-runtime-tests-run3.log` | PASS |
| 04 / 04a–b | T044-INTEGRATION; `source-review.md` RPC row | PASS source integration |
| 05 / 05a–b | T044-CHAIN, T044-GUARDED-HOOK execute actual helper/hook with wallet boundary mocks; source-review inventory includes deploy and receipt continuations | PASS runtime + source integration |
| 06 / 06a–c | Foundry custom token A/B, zero rejection/deposit/claim; T044-DEPLOY six-arg encoding, malformed env; T044-EXISTING-CLUB actual useMemberStatus hook; artifact-comparison | PASS runtime + source integration |
| 07 / 07a–b | T044-SESSION fresh restore, legacy purge, no persistent writes, malformed/cache/storage failures, clear; logout source review | PASS runtime + source integration |
| 08 / 08a–b | Foundry exact endTime/expired errors/outsider settle/reset owner nonmember vote/no collateral restore; targeted event assertion; T044-ERROR-FACTS | PASS runtime |
| 09 / 09a–b | T044-HISTORY actual hook with sparse failed/unsettled results, ID offset, <=50 calls and bigint boundary; source review window notice/onchain winner status | PASS runtime + source integration |
| 10 / 10a–b | pre/post SHA, build/typecheck/npm/Foundry logs, artifact comparison, test hashes | PASS |

## Những lỗi test phát hiện và cách xử lý

Giữ nguyên log fail để không che lịch sử. Không có implementation change sau freeze.

- `forge-test-run1.log`: 84 pass/3 fail. Suite Foundry cũ vẫn cấm winner contribute, full-cycle fixture bỏ contribution của các winner trước, và invariant cấm won+kicked. Những oracle này trái Task-018 hiện có (winner vẫn phải đóng và có thể bị kick nếu bỏ đóng). Đã thay bằng assertion winner đóng được, thêm mandatory contributions trong full run và invariant hasWon phải có winning round settled; Handler.contribute bỏ skip winner nhưng placeBid vẫn skip. Rerun 87/87 pass.
- Npm run1 sandbox trả 9 file failures, detail logs giữ lỗi thực. Nhiều source-string tests cũ đòi thông điệp sai `RoundStillOpen`, huỷ OPEN-only/no locked assets, constructor 5 args/hardcoded CirBTC, refund loop inline, receipt không có chainId và pending state không gồm passkey. Đã cập nhật các assertion theo spec-v1; no-winner refund vẫn được Foundry runtime kiểm chứng, bỏ mathematical simulator không kiểm implementation.
- Harness mới ban đầu thiếu React useEffect mock sau Developer hoàn thiện hook; đã bổ sung boundary stub và truyền chainId Arc như tất cả production call sites, giữ kiểm delayed switch/rejection/chain recheck. Các runtime tests gọi production code thật; không copy thuật toán implementation để tính pass.
- `npm-test-run2.log`: 402 pass/1 fail do còn một literal isClaiming cũ tại TC-10MEM-10; đã bao gồm isOwnerOpLoading theo UI thực. `npm-test-run3.log`: 404 pass sau cập nhật và thêm một case selected-club collateral token.
- Lệnh test CLI trong sandbox gặp `spawnSync /bin/sh EPERM`; rerun `npm test` ngoài sandbox bằng quyền được duyệt chạy CLI `--help`/`--dry-run` thành công, không gửi blockchain transaction.

## Giới hạn signoff

Source integration review được ghi rõ riêng trong `source-review.md`; không xem nó là browser E2E. Không test ví MetaMask/WebAuthn thiết bị thật, Circle remote transaction, live deployment hoặc rate-limit. Contract hiện deploy không tự nhận code mới; metadata/address cũ được giữ nguyên. Signoff này xác nhận scope local của spec, không khẳng định mô hình hụi bảo đảm mọi thành viên nhận giá trị bằng nhau khi huỷ giữa cycle hoặc khắc phục mọi chính sách slashing có từ trước.

Tester signoff: **PASS**, bàn giao BA coverage check và Leader nghiệm thu; toàn task chưa tự coi Done trước hai gate đó.
