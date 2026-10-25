# Task-045 — Leader nghiệm thu

Ngày: 2026-10-25. Leader `/root`: **ACCEPTED cho phạm vi sửa code và kiểm thử local**.

Đã đối chiếu ba nhận xét trong ảnh re-review theo [spec v1](ba/task-045/spec-v1.md), nhận [Tester PASS](qa/task-045/test-report.md) và [BA Gate 4 APPROVED, 5/5 REQ](ba/task-045/coverage-review.md).

- `formatUsdc` chỉ còn một implementation shared; contract re-export cùng function. `formatUsdcExact` dùng cho dữ liệu nhập, giữ đủ precision.
- Cả hai panel tính preset tăng bid bằng bigint; sửa lỗi dấu phẩy từ 1.000 USDC và mất phần lẻ. Ký quỹ thực bằng 0 được hiển thị đúng.
- Thông báo VI/EN giải thích chu kỳ mới reset trạng thái thành viên, không tự phục hồi/nộp lại collateral đã slash/rút; không thay đổi chính sách hay tự chuyển token.
- Giữ `_refundRound(roundId, false)` cho no-winner settlement để bảo toàn lịch sử công khai. Comments và test runtime chứng minh claim chỉ một lần, không credit lại khi mở cycle/cancel tiếp; cancellation vòng chưa settle vẫn clear mappings.

Bằng chứng: npm **408/408**, Foundry **89/89**, runtime/component mới **4/4** (đã nằm trong tổng npm), typecheck/build exit 0, ABI/bytecode khớp compiler độc lập, SHA256 trước/sau **8/8 MATCH**. Leader đã đọc báo cáo và log cuối; không có test failure/oracle correction trong task này.

Không deploy/gửi giao dịch mạng thật; hợp đồng đã triển khai giữ nguyên. Component tests dùng production code với hook/wallet boundary mocks, không phải browser E2E.

Hai tài liệu review gốc giữ nguyên và nằm ngoài commit/push:

- `docs/tontine-arc-review.md`: SHA256 `0639857e7bd4ae37d941e003cae3224223e834ab3abc93720f94c3af84fad487`.
- `docs/tontine-fix-recommendations.md`: SHA256 `ca69f432405287726d75810da7405556f961ca4dc790cc6e9cc17059d8af5843`.
