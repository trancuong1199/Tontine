# Leader Acceptance Decision: Task-056 (Revision v2)

- **Task ID**: task-056
- **Role**: Team Leader
- **Date**: 2026-11-01
- **Decision**: ACCEPTED

---

## 1. Summary of Scope & Refinements

Addressing the user request:
> "thêm điều kiện nữa là, khi mới tạo club mà chưa đóng hụi và chưa có thành viên nào thì cũng xóa đc"

The team refined the directory deletion logic as follows:

1. **State & Member Count Detection**:
   - `ClubDirectoryModal.tsx` queries both `state()` and `members(0n)` for every savings club in the user's directory.
2. **Refined Deletion Rules**:
   - **Đang chạy (`ACTIVE`)**: Đang có các vòng đóng hụi/đấu giá -> **CẤM XÓA**.
   - **Mở tham gia (`OPEN`) có thành viên (`members.length >= 1`)**: Đã có người nộp cọc/tham gia -> **CẤM XÓA**.
   - **Mới tạo (`OPEN`) chưa có thành viên (`members.length === 0`)**: Chưa ai nộp cọc, chưa có đóng hụi -> **ĐƯỢC PHÉP XÓA** (giúp người tạo dọn dẹp các nhóm thử nghiệm/tạo nhầm).
   - **Đã hoàn thành (`COMPLETED`) hoặc Đã hủy (`CANCELLED`)**: **ĐƯỢC PHÉP XÓA**.
3. **Status Badges**:
   - Phân biệt rõ rệt trên giao diện:
     - Nhóm mới tạo: Badge `Mở tham gia (0 tv)` / `Open (0 members)` kèm nút Xóa màu đỏ mở sẵn.
     - Nhóm đang mở nhận người: Badge `Mở tham gia` kèm nút Xóa bị vô hiệu hóa (`disabled={true}`, mờ, tooltip cấm).
     - Nhóm đang chạy: Badge `Đang chạy` kèm nút Xóa bị vô hiệu hóa.
4. **Bảo toàn chất lượng**:
   - 466/466 tests passed (100%).
   - SHA256 manifest verified.

Gate 5 approved.
