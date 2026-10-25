# Task-047 — Leader nghiệm thu ba ghi chú bổ sung

Ngày 2026-10-25. Leader `/root`: **ACCEPTED cho phạm vi local** sau [Tester PASS](qa/task-047/test-report.md) và [BA Gate 4 APPROVED, 3 REQ/7 AC](ba/task-047/coverage-review.md), theo [spec v1](ba/task-047/spec-v1.md).

- Giữ EURC/CirBTC defaults vì swap/payment/router/vault hiện gắn với địa chỉ cụ thể; comment giải thích vì sao không thêm global env override một phần. Biến deployment-only `VITE_CIRBTC_ADDRESS_TESTNET` hiện có và getter của club cũ giữ nguyên.
- Hai nút swap và withdraw dùng `isPositiveAmount` qua parser bigint hiện có, bắt dữ liệu lỗi thành false. Giữ grammar, trailing-zero semantics, loading/connection guards và decimals đúng ngữ cảnh: swap18/6/8, vault6/6/8. Không thay transaction handlers hoặc phép tính simulation.
- Comment `usdcVolumeByDay` nói rõ scale18 là đơn vị nội bộ cộng volume USDC6/native18, không phải ERC-20 transfer units; thuật toán giữ nguyên.

Bằng chứng thực: npm **422/422**, targeted mới **4/4**, regression Analytics **9/9** (đều nằm trong tổng npm), typecheck/build exit0, source pre/post **5/5 MATCH**. Không failure, skip hoặc sửa oracle. Contract và artifact không đổi; không chạy lại Foundry và không dùng kết quả cũ làm kết quả mới.

Kiểm thử component dùng production render/callback với hook state có kiểm soát, không phải browser E2E hoặc giao dịch ví thật. Không deploy, gửi giao dịch blockchain hoặc thay địa chỉ đang dùng. Ba review docs gốc giữ nguyên hash theo [QA evidence](qa/task-047/review-docs-sha256-after.json) và ngoài commit/push.
