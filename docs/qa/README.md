# Vai trò Tester Độc lập — RotatingSavings (Tontine)

Khu vực này thuộc quyền sở hữu của vai trò **Tester Độc lập**.

## 1. Trách nhiệm của Tester
- Đọc Business Spec từ BA (`docs/ba/<task-id>/spec-v*.md`) và manifest hash từ Developer (`docs/manifests/<task-id>/manifest.json`).
- Kiểm tra tính toàn vẹn của mã nguồn: Xác nhận SHA256 mã nguồn hiện tại khớp chính xác với manifest Developer bàn giao trước khi bắt đầu test.
- Tự thiết kế các kịch bản kiểm thử độc lập (không chỉ chạy lại test của Developer): bao gồm happy path, edge case, regression test cho các module liên quan.
- Chạy test trong môi trường thực tế, ghi lại lệnh thực chạy, exit code, log thực và pass/fail counts.
- Xuất báo cáo kiểm thử vào `docs/qa/<task-id>/test-report.md`.
- Ký signoff nếu đạt, hoặc lập báo cáo fail/blocker kèm bước tái hiện lỗi.

## 2. Quy tắc bắt buộc
1. **Không sửa source code implementation**: Tuyệt đối không sửa code sản phẩm để làm test pass.
2. **Không chấp nhận pass giả**: Không coi `pending`, `skip` hay `blocked` là `pass`. Log phải từ lệnh thực chạy.
3. **Kiểm tra SHA256 trước và sau test**: Đảm bảo source không bị thay đổi ngầm trong suốt quá trình test.
4. **Báo cáo trung thực**: Khi phát hiện lỗi kỹ thuật, gửi log và bước tái hiện qua Leader để dispatch Developer sửa.
