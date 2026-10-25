# Task-045 — kế hoạch kiểm thử độc lập

Trạng thái: **tests prepared** theo `docs/ba/task-045/spec-v1.md` đã qua Gate1; chờ manifest freeze, chưa chạy/signoff. Owner Tester: `docs/qa/task-045/**`, tests; không sửa implementation.

Suite: `tests/review-followup.test.ts` (REQ01/02/03) và `contracts/test/ReviewFollowup.t.sol` (REQ03/04), cùng regression npm/Foundry hiện có. UI test bundle component thật, chỉ mock hooks/wallet boundary, thực gọi onClick preset rồi kiểm input value; không sao chép logic formatter/preset. Đây không phải thao tác browser/MetaMask thật.

| Nhóm | Kiểm tra dự kiến |
| --- | --- |
| Canonical formatter | Runtime import API canonical và facade thực; machine format giữ đủ 6 decimals, không grouping/làm tròn; display giữ grouping + half-up 2 decimals; số lớn >2^53, zero và decimal biên. Không dùng display string làm input tính tiền. |
| Raise-bid presets | Gọi helper implementation thật với 999.999999, 1000, số lớn >2^53 và số có phần lẻ 6 decimals, cộng 1/2/5/10 USDC chính xác bằng bigint. Kiểm hai panel đều dùng helper đó; xác nhận không còn Number(formatUsdc(...)), NaN hoặc exponential notation. |
| Fresh-cycle collateral | Foundry local: hoàn tất cycle có người slash; startNewCycle reset trạng thái tham gia nhưng không phục hồi collateral đã slash, không tự transfer/approve/khấu trừ thêm từ member; deposits chưa slash và các khoản claimable giữ nguyên theo spec. Đối chiếu comment/UI nếu spec yêu cầu. |
| No-winner history | Foundry local: vòng chỉ prior winner contribute dẫn đến không winner; contribution/bid historical mappings giữ nguyên, claimable được credit đúng một lần; claim chuyển đúng số tiền, claim lại/re-settle không nhận thêm; vòng sau/cycle sau không credit lại vòng cũ. Phân biệt ACTIVE cancellation có thể clear current unprocessed balances. |
| Regression/integrity | Verify task-045 SHA trước/sau; log lệnh, exit/pass/fail/skip. Chạy targeted tests + npm/typecheck cần thiết, Foundry targeted; broaden chỉ nếu thay đổi source ảnh hưởng phạm vi rộng hơn. Không dùng logs task044 làm signoff bản mới. |

Baseline bối cảnh do Leader cung cấp: task044 npm404/404 và Forge87/87 pass; hiện worktree source sạch. Scope này không live-deploy, không gửi giao dịch mạng công khai và không test WebAuthn/MetaMask thiết bị thật.
