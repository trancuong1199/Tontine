# Task-048 — Leader nghiệm thu tương thích chu kỳ của club cũ

Ngày 2026-10-25. Leader `/root`: **ACCEPTED cho phạm vi sửa frontend và kiểm thử local**, sau [Tester PASS](qa/task-048/test-report.md), [BA Gate 4 APPROVED 4REQ/7AC](ba/task-048/coverage-review.md), theo [spec v1](ba/task-048/spec-v1.md).

Đã xác minh bằng RPC chỉ đọc rằng club `0xc5064f3963761eef64ece72f853e90871ff1e1e9` không hỗ trợ API chu kỳ đang được frontend gọi: getter `cycleStartRound`, simulation và estimate của `startNewCycle` đều revert; bytecode thiếu hai selector. Caller là owner/member, club completed và có hai members; native balance dương, nonce latest/pending bằng nhau. [Evidence độc lập](qa/task-048/live-readonly-response.json) được ghi thực tế. Ảnh không cung cấp calldata của yêu cầu OKX đang treo và người dùng chưa xác nhận nút vừa bấm, nên kết luận cụ thể là lỗi restart của club này, không phải chẩn đoán mọi thao tác ví.

- Capability đọc riêng theo address/Arc chain, phân biệt supported/checking/unsupported/error. Getter trả 0n hợp lệ; generic RPC error không bị gán thành legacy; có retry và không dùng dữ liệu placeholder của club trước.
- Hai panels có nội dung VI/EN đúng capability, đường tạo club mới và giữ nhận tiền/rút ký quỹ đủ điều kiện. Injected restart chỉ hiện/chạy khi supported; passkey không được thêm action restart mới.
- Injected restart được simulate sau chain guard, trước yêu cầu ví; kiểm sender/chain thay đổi, chặn duplicate và giải phóng pending khi lỗi. Other writes giữ luồng hiện có, không ép gas để bỏ qua revert.

Bằng chứng: npm **427/427**, focused **5/5** đã nằm trong tổng npm, typecheck/build exit0, source trước/sau **7/7 MATCH**. Lần đầu fail một fixture vì viem ESM/CJS khác class identity; Tester sửa boundary import, giữ assertions, logs lỗi và chạy lại toàn bộ trên source không đổi. Các fixture cũ được bổ sung mock export/capability để giữ phạm vi regression.

Solidity/artifact không đổi, không chạy lại Foundry và không dùng kết quả cũ làm kết quả mới. Không deploy, ký hoặc broadcast giao dịch; không sửa hợp đồng cũ. Component/hook tests dùng boundary mocks, không phải kiểm thử OKX/browser hoặc giao dịch mined thật. Server localhost5173 vẫn phản hồi HTTP200 trong kiểm tra của Leader; người dùng cần huỷ prompt cũ và tải lại trang để dùng hướng dẫn mới.

Ba review docs gốc giữ nguyên hash, ngoài commit/push. Việc chơi tiếp ở club không hỗ trợ restart cần người dùng tạo club mới qua flow hiện có; tiền/claim tại club cũ không được tự di chuyển.
