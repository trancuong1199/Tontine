# Đối Chiếu Độ Phủ Nghiệp Vụ (BA Coverage Review) — Task-058

| REQ / AC | Mô tả yêu cầu | Test Case | Bằng chứng (Evidence) | Trạng thái |
| :--- | :--- | :--- | :--- | :--- |
| **REQ-01 / AC-01.1** | Header & Layout trên mobile 390px không tràn ngang (`scrollWidth <= 390`), hiển thị đầy đủ nút Connect | `TC-MOB-01` + Chrome Mobile Emulation (`390x844`) | `src/components/savings/Header.tsx`, `iphone_home_fixed.png`, `iphone_app_fixed.png` | **100% Đạt** |
| **REQ-02 / AC-02.1** | Tắt re-render `scrollY` trên mobile (`< 640px`) và throttle trên desktop | `TC-MOB-02` | `src/App.tsx`, `src/components/landing/LandingPage.tsx` | **100% Đạt** |
| **REQ-02 / AC-02.2** | Ẩn các lớp blur nặng (`blur-[90px..140px]`) và cánh quỹ đạo hai bên trên mobile (`hidden sm:block`) | `TC-MOB-03` | `src/App.tsx`, `src/components/landing/LandingPage.tsx` | **100% Đạt** |
| **REQ-03 / AC-03.1** | Hỗ trợ đăng ký & đăng nhập Passkey bằng WebAuthn gốc (`createWebAuthnCredential`) + `toCircleSmartAccount` khi không có `VITE_CLIENT_KEY` | `TC-MOB-04` | `src/hooks/usePasskeyWallet.ts` | **100% Đạt** |
| **REQ-03 / AC-03.2–03.4** | Kiểm tra trình duyệt nhúng (Zalo/Telegram/Messenger), giữ modal mở khi xác thực và báo lỗi qua `toast.error` | `TC-MOB-05`, `TC-MOB-06`, `TC-MOB-07` | `src/hooks/usePasskeyWallet.ts`, `src/components/savings/ArcAppKitModal.tsx`, `src/App.tsx` | **100% Đạt** |

**Kết luận của BA**: Đạt **100%** độ phủ nghiệp vụ và kỹ thuật, sẵn sàng cho Gate 5 (Leader nghiệm thu & Deploy).
