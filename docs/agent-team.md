# Hướng dẫn Phối hợp Nhóm Multi-Agent — RotatingSavings (Tontine)

Tài liệu hướng dẫn chi tiết cách thức vận hành, các mẫu prompt và quy trình dispatch giữa **Leader**, **BA**, **Developer**, và **Tester** trong dự án RotatingSavings (Hụi/Tontine trên Arc Testnet).

---

## 1. Cấu trúc thư mục quy chuẩn

```text
/home/avada/tontine/
├── AGENTS.md                          # Quy tắc chung luôn được agent tự động nạp
├── MULTI_AGENT_GUIDE_FOR_GEMINI.md    # Tài liệu gốc của Max AI Agent
├── docs/
│   ├── tontine-build-plan.md          # Kế hoạch build ứng dụng HụiChain
│   ├── agent-team.md                  # Tài liệu điều phối chi tiết (file này)
│   ├── ba/                            # Khu vực làm việc của BA
│   │   ├── README.md                  # Hướng dẫn vai trò BA
│   │   ├── task-template.md           # Mẫu Business Spec chuẩn
│   │   └── <task-id>/                 # Spec cho từng task (ví dụ: task-001/spec-v1.0.md)
│   ├── qa/                            # Khu vực làm việc của Tester độc lập
│   │   ├── README.md                  # Hướng dẫn vai trò Tester
│   │   ├── test-template.md           # Mẫu Test Report chuẩn
│   │   └── <task-id>/                 # Báo cáo kiểm thử cho từng task
│   └── manifests/                     # Thư mục lưu mã băm SHA256 và snapshot
│       └── <task-id>/                 # Manifests và snapshots của task
├── scripts/
│   └── manifest-tool.mjs              # Công cụ hỗ trợ tạo baseline, hash SHA256 & verify
```

---

## 2. Chu trình một Task qua 5 Dispatch

Mỗi vòng lặp phát triển gồm 5 Dispatch rõ ràng do **Leader** điều phối:

### Dispatch 1: Leader → BA
- **Nhiệm vụ**: Phân tích nghiệp vụ, vẽ luồng Mermaid, đặc tả REQ/BR/AC, lập bảng Traceability.
- **Artifact đầu ra**: `docs/ba/<task-id>/spec-v1.0.md`.
- **Gate kiểm tra**: Spec đầy đủ, AC rõ ràng đầu vào/đầu ra mong đợi, không còn câu hỏi chặn.

### Dispatch 2: Leader → Developer
- **Nhiệm vụ**: Đọc spec v1.0, chạy `node scripts/manifest-tool.mjs baseline` để ghi nhận hash ban đầu, sửa code trong phạm vi cho phép, chạy unit test xác nhận, chạy `node scripts/manifest-tool.mjs freeze` để đóng băng mã nguồn.
- **Artifact đầu ra**: `docs/manifests/<task-id>/manifest.json`, file diffs, kết quả kiểm tra cục bộ.
- **Gate kiểm tra**: Code pass kiểm tra nội bộ, manifest SHA256 đã tạo, ngừng sửa đổi.

### Dispatch 3: Leader → Tester độc lập
- **Nhiệm vụ**: Chạy `node scripts/manifest-tool.mjs verify` để đối chiếu source hash với manifest bàn giao. Thiết kế và chạy test độc lập, thu thập log và exit code thực tế.
- **Artifact đầu ra**: `docs/qa/<task-id>/test-report.md`, test files nếu có.
- **Gate kiểm tra**: 100% test pass, log thực tế, SHA256 trước và sau test không bị sai lệch.

### Dispatch 4: Leader → BA (Đối chiếu)
- **Nhiệm vụ**: Đọc kết quả test từ Tester, cập nhật bảng Traceability (`REQ → AC → Test → Evidence`), xác nhận toàn bộ AC đã được kiểm chứng.
- **Artifact đầu ra**: Bảng đối chiếu hoàn chỉnh trong `docs/ba/<task-id>/spec-v1.0.md`.
- **Gate kiểm tra**: Mọi REQ/AC đều có bằng chứng pass thật, không có case nào pending/skip không rõ lý do.

### Dispatch 5: Leader nghiệm thu
- **Nhiệm vụ**: Rà soát 3 chứng cứ độc lập (Spec BA 100% coverage, Source code freeze khớp hash, Tester signoff pass với log thực tế).
- **Kết luận**: Nghiệm thu và đóng task (Done).
