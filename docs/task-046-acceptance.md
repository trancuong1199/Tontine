# Task-046 — Leader nghiệm thu review v3

Ngày: 2026-10-25. Leader `/root`: **ACCEPTED cho phạm vi sửa code và kiểm thử local**.

Đã đối chiếu đủ 10 findings theo [spec v1](ba/task-046/spec-v1.md), nhận [Tester PASS](qa/task-046/test-report.md) và [BA Gate 4 APPROVED, 6/6 REQ](ba/task-046/coverage-review.md).

- Findings 1/2/10: năm màn hình đọc USDC ERC-20 trên Arc qua reader chung, giữ bigint và phân biệt unavailable với số dư 0; Analytics chỉ tính một canonical USDC, dùng address để phân biệt token, giữ đúng decimals và không bịa phí cho local history. Biểu đồ/ước tính có nhãn phù hợp và không dùng làm nguồn tiền giao dịch.
- Findings 3/4/5: thống nhất chain/RPC/explorer/USDC theo registry; EURC/CirBTC giữ defaults dự án. WUSDC routing, vault/router addresses, các chain khác và deployment override/per-club token getter được giữ đúng.
- Findings 6/7: giữ thiết kế permissionless và payout hiện tại; bổ sung hướng dẫn VI/EN về điều kiện quyết toán/loại thành viên và comment loại prior winners khỏi bonus. Manual kick hiện không slash collateral; đây là giới hạn chính sách được mô tả rõ, không phải thay đổi kinh tế của contract.
- Findings 8/9: AlreadyWon mô tả đúng giới hạn trong chu kỳ hiện tại; dùng chung presets bất biến cho initial/raise bid ở cả hai wallet panels, giữ phép tính bigint.

Bằng chứng cuối: npm **418/418**, Foundry **91/91**, typecheck/build exit 0, ABI/creation/runtime bytecode khớp compiler độc lập, SHA256 trước/sau **18/18 MATCH**. Focused TS **9/9** và panel **5/5** đã nằm trong tổng npm. Lần npm đầu có một oracle cũ đòi thông báo Task-018; Tester sửa kỳ vọng theo AC04c sau Leader xác nhận, giữ log thất bại và chạy lại toàn bộ thành công trên cùng source freeze. Không bỏ hoặc skip test.

Source review và runtime component tests dùng production code với boundary mocks; không phải browser E2E, ví/WebAuthn thật hoặc bảo đảm RPC/explorer luôn hoạt động. Không deploy hoặc gửi giao dịch blockchain; hợp đồng đang triển khai giữ nguyên. Cảnh báo build về dependency annotations/chunk size được ghi trong báo cáo QA.

Ba tài liệu review gốc giữ nguyên local và ngoài commit/push:

- `docs/tontine-arc-review.md`: SHA256 `0639857e7bd4ae37d941e003cae3224223e834ab3abc93720f94c3af84fad487`.
- `docs/tontine-fix-recommendations.md`: SHA256 `ca69f432405287726d75810da7405556f961ca4dc790cc6e9cc17059d8af5843`.
- `docs/tontine-arc-review-v3.md`: SHA256 `83013a213b44063a1f0aa4a22eb584482a9c58c25d6e3187345ba0196fd0766a`.
