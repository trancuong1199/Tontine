# Task-044 — Leader nghiệm thu

Ngày: 2026-10-25. Leader: `/root`. Kết luận: **ACCEPTED cho phạm vi sửa code và kiểm thử local**.

Yêu cầu của Max: đọc hai tài liệu review Arc/Circle và tiếp tục phần Gemini đang làm dở. Đã giữ snapshot baseline, hoàn tất sửa implementation, tạo lại artifact và đối chiếu đầy đủ 12 findings theo [spec v1](ba/task-044/spec-v1.md).

- Gate 1: spec đủ điều kiện triển khai, owner source/test/BA được giao riêng.
- Gate 2: Developer freeze 19 file trong [manifest](manifests/task-044/manifest.json).
- Gate 3: [Tester độc lập PASS](qa/task-044/test-report.md): npm 404/404, Solidity 87/87, event assertion bổ sung 1/1 thuộc bộ Solidity; typecheck/build đạt, ABI và executable bytecode khớp bản biên dịch độc lập, SHA256 trước/sau 19/19 khớp.
- Gate 4: [BA APPROVED](ba/task-044/coverage-review.md), đủ bằng chứng cho 10/10 REQ.
- Gate 5: Leader đã đọc báo cáo, kiểm tra log cuối, artifact comparison, post-verify và `git diff --check` (exit 0); nghiệm thu phạm vi trên.

Các thay đổi chính: biểu quyết huỷ ACTIVE và hoàn contribution/bid vòng chưa quyết toán qua claimPayout; chờ chuyển mạng trước injected writes; routing passkey đúng ví; bigint money/facts/RPC; token thế chấp cố định qua constructor và đọc theo từng club; session credential metadata; history tối đa 50 vòng với ID thật và thông báo đúng phạm vi.

Không deploy, commit hay gửi giao dịch lên mạng công khai. Hợp đồng đã deploy giữ nguyên; hành vi Solidity mới cần deployment mới. Chưa kiểm chứng ví thật/WebAuthn thiết bị hoặc dịch vụ Circle/RPC trực tiếp. Các giới hạn và test oracle cũ được sửa đã ghi rõ trong báo cáo Tester.

Cache lỗi invariant phát sinh từ lần test đầu được chuyển khỏi workspace sang `/tmp/tontine-task-044-forge-failure-cache`; log bằng chứng vẫn nằm trong hồ sơ QA.
