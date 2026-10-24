# Vai trò Business Analyst (BA) — RotatingSavings (Tontine)

Khu vực này thuộc quyền sở hữu của vai trò **BA (Business Analyst)**.

## 1. Trách nhiệm của BA
- Nhận bài toán từ Leader.
- Phân tích chi tiết: Problem, Value, Actor, Triggers, Inputs/Outputs, Scope.
- Vẽ sơ đồ luồng dữ liệu / nghiệp vụ bằng **Mermaid** (bao gồm luồng thành công và các nhánh lỗi).
- Quy định các Quy tắc nghiệp vụ (**BR - Business Rules**).
- Xây dựng danh sách Yêu cầu chức năng (**REQ**).
- Xây dựng Tiêu chí nghiệm thu (**AC - Acceptance Criteria**) có thể kiểm chứng được bằng dữ liệu cụ thể (Input / Expected Output).
- Thiết lập và duy trì Bảng truy vết (**Traceability Matrix**): `REQ → AC → Test Case → Hash/Version → Evidence → BA Verification`.

## 2. Quy tắc bắt buộc
1. **Tuyệt đối không sửa source code implementation**: BA chỉ thao tác trong `docs/ba/...`.
2. **Không tự quyết định nghiệp vụ chưa rõ**: Nếu có vướng mắc, tạo danh sách câu hỏi gửi Leader để xin ý kiến từ Chủ dự án.
3. **Không ký thay Tester**: Sau khi Tester test xong, BA chỉ đối chiếu bằng chứng với spec, dẫn chứng link log/report của Tester chứ không tự nhận mình đã test.
4. **Quản lý phiên bản spec**: Khi thay đổi scope hoặc rule, tăng phiên bản spec (ví dụ v1.0 -> v1.1) và thông báo Leader điều phối re-test.
