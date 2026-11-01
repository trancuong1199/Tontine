# Báo Cáo Kiểm Thử Độc Lập — Task-058 (Mobile Layout, Anti-Lag & Passkey WebAuthn)

- **Task ID**: `task-058`
- **Tester**: Independent QA Agent
- **Trạng thái**: **PASS (478/478 tests, 0 fail)**

## 1. Kiểm tra tính toàn vẹn SHA256 Manifest (Before & After Test)
- Lệnh: `node scripts/manifest-tool.mjs verify task-058`
- Kết quả:
  - `src/components/savings/Header.tsx`: `[MATCH]`
  - `src/App.tsx`: `[MATCH]`
  - `src/components/landing/LandingPage.tsx`: `[MATCH]`
  - `src/hooks/usePasskeyWallet.ts`: `[MATCH]`
  - `src/components/savings/ArcAppKitModal.tsx`: `[MATCH]`

## 2. Kiểm tra trên Trình duyệt Giả lập Điện thoại (Headless Chrome 390x844 iPhone 14 Viewport)
- `windowWidth`: `390px`
- `headerScrollWidth`: `390px` (đã khắc phục hoàn toàn lỗi tràn ngang `728px`)
- `mainScrollWidth`: `390px`
- Toàn bộ các nút trên Header (`Logo`, `Home | Savings Clubs`, `EN`, `⚡ Arc AppKit`, `Connect`) đều có `visible: true`, nằm gọn trên 1 hàng ngang trong khung 390px.

## 3. Kết quả thực thi bộ Test Độc lập (`tests/mobile-layout-and-passkey.test.ts`)
- `TC-MOB-01 (AC-01.1)`: PASS — Header.tsx responsive trên mobile 390px, ẩn text phụ trên `< md` và dùng `ConnectKitButton.Custom` nhỏ gọn trên `< sm`.
- `TC-MOB-02 (AC-02.1)`: PASS — `App.tsx` và `LandingPage.tsx` tắt cập nhật state `scrollY` trên mobile (`< 640px`) và throttle trên desktop.
- `TC-MOB-03 (AC-02.2)`: PASS — Ẩn các khối blur GPU nặng (`blur-[90px..140px]`) và cánh quỹ đạo hai bên trên mobile (`hidden sm:block`).
- `TC-MOB-04 (AC-03.1)`: PASS — `usePasskeyWallet.ts` hỗ trợ tạo Passkey trực tiếp qua WebAuthn chuẩn (`createWebAuthnCredential`) + `toCircleSmartAccount` khi thiếu `VITE_CLIENT_KEY`.
- `TC-MOB-05 (AC-03.2)`: PASS — `usePasskeyWallet.ts` kiểm tra môi trường WebAuthn trên điện thoại và cảnh báo trình duyệt nhúng (Zalo/Telegram/Messenger).
- `TC-MOB-06 (AC-03.3)`: PASS — `ArcAppKitModal.tsx` không tự đóng modal ngay khi bấm Đăng ký Ví Passkey và hiển thị trạng thái đang xác thực.
- `TC-MOB-07 (AC-03.4)`: PASS — `App.tsx` hiển thị `toast.error` khi `pkState.status === "error"`.
- Toàn bộ hồi quy dự án: **478/478 PASS**, exit code `0`.
