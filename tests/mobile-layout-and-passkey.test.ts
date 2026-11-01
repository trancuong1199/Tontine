import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const headerSrc = fs.readFileSync(path.resolve("src/components/savings/Header.tsx"), "utf8");
const appSrc = fs.readFileSync(path.resolve("src/App.tsx"), "utf8");
const landingSrc = fs.readFileSync(path.resolve("src/components/landing/LandingPage.tsx"), "utf8");
const passkeyHookSrc = fs.readFileSync(path.resolve("src/hooks/usePasskeyWallet.ts"), "utf8");
const arcModalSrc = fs.readFileSync(path.resolve("src/components/savings/ArcAppKitModal.tsx"), "utf8");

test("TC-MOB-01 (AC-01.1): Header.tsx responsive trên mobile 390px — ẩn text phụ trên < md và dùng ConnectKitButton.Custom nhỏ gọn trên < sm", () => {
  assert.match(
    headerSrc,
    /<div className="hidden md:block">/,
    "Khối chữ Tontine & mô tả trên Header phải ẩn trên màn hình nhỏ (< md)"
  );
  assert.match(
    headerSrc,
    /<span className="hidden md:inline">\{t\("arcAppKit\.btnLabel", language\)\}<\/span>/,
    "Nhãn chữ Arc AppKit trên Header phải ẩn trên mobile (< md) chỉ giữ icon tia sét"
  );
  assert.match(
    headerSrc,
    /ConnectKitButton\.Custom/,
    "Header.tsx phải dùng ConnectKitButton.Custom trên mobile (< sm) để nút Connect không tràn ngang"
  );
});

test("TC-MOB-02 (AC-02.1): App.tsx và LandingPage.tsx tắt cập nhật state scrollY trên mobile (< 640px) và throttle trên desktop", () => {
  assert.match(
    appSrc,
    /if \(window\.innerWidth < 640\) return;/,
    "App.tsx phải bỏ qua cập nhật state scrollY trên mobile (< 640px) để chống giật lag"
  );
  assert.match(
    landingSrc,
    /if \(window\.innerWidth < 640\) return;/,
    "LandingPage.tsx phải bỏ qua cập nhật state scrollY trên mobile (< 640px) để chống giật lag"
  );
});

test("TC-MOB-03 (AC-02.2): Ẩn các khối blur GPU nặng và cánh quỹ đạo hai bên trên mobile (< 640px)", () => {
  assert.match(
    appSrc,
    /className="fixed inset-0 pointer-events-none z-0 overflow-hidden"/,
    "Container nền cố định trong App.tsx phải có overflow-hidden"
  );
  assert.match(
    landingSrc,
    /className="fixed inset-0 pointer-events-none z-0 overflow-hidden"/,
    "Container nền cố định trong LandingPage.tsx phải có overflow-hidden"
  );
  assert.match(
    appSrc,
    /hidden sm:block absolute top-1\/2 -translate-y-1\/2 -left-20/,
    "Cánh quỹ đạo trái trong App.tsx phải ẩn trên mobile (hidden sm:block)"
  );
  assert.match(
    appSrc,
    /hidden sm:block absolute top-1\/2 -translate-y-1\/2 -right-20/,
    "Cánh quỹ đạo phải trong App.tsx phải ẩn trên mobile (hidden sm:block)"
  );
});

test("TC-MOB-04 (AC-03.1): usePasskeyWallet.ts hỗ trợ tạo Passkey trực tiếp qua WebAuthn chuẩn (createWebAuthnCredential) khi thiếu VITE_CLIENT_KEY", () => {
  assert.match(
    passkeyHookSrc,
    /createWebAuthnCredential/,
    "usePasskeyWallet.ts phải import và sử dụng createWebAuthnCredential từ viem/account-abstraction làm fallback"
  );
  assert.match(
    passkeyHookSrc,
    /buildFallbackPublicClient/,
    "usePasskeyWallet.ts phải có buildFallbackPublicClient kết nối trực tiếp Arc Testnet RPC"
  );
});

test("TC-MOB-05 (AC-03.2): usePasskeyWallet.ts kiểm tra môi trường WebAuthn trên điện thoại và cảnh báo trình duyệt nhúng (Zalo/Telegram/Messenger)", () => {
  assert.match(
    passkeyHookSrc,
    /checkWebAuthnAvailable/,
    "usePasskeyWallet.ts phải có hàm kiểm tra checkWebAuthnAvailable()"
  );
  assert.match(
    passkeyHookSrc,
    /Safari \(iOS\) hoặc Chrome \(Android\)/,
    "usePasskeyWallet.ts phải hướng dẫn mở bằng Safari (iOS) hoặc Chrome (Android) khi trình duyệt nhúng chặn Passkey"
  );
});

test("TC-MOB-06 (AC-03.3): ArcAppKitModal.tsx không tự đóng modal ngay khi bấm Đăng ký Ví Passkey và hiển thị trạng thái đang xác thực", () => {
  const passkeyTabIdx = arcModalSrc.indexOf("onOpenPasskeyRegister &&");
  assert.ok(passkeyTabIdx !== -1, "Phải có nút onOpenPasskeyRegister trong ArcAppKitModal.tsx");
  const buttonSection = arcModalSrc.slice(passkeyTabIdx, passkeyTabIdx + 600);
  assert.ok(
    !buttonSection.includes("onClose()"),
    "Nút Đăng ký Ví Passkey trong ArcAppKitModal.tsx không được gọi onClose() ngay lập tức"
  );
  assert.match(
    buttonSection,
    /passkeyStatus === "loading"/,
    "Nút Đăng ký Ví Passkey phải hiển thị trạng thái loading khi đang xác thực"
  );
});

test("TC-MOB-07 (AC-03.4): App.tsx hiển thị toast.error khi pkState.status === 'error'", () => {
  assert.match(
    appSrc,
    /if \(pkState\.status === "error" && pkState\.message\)\s*\{\s*toast\.error\(pkState\.message\);/,
    "App.tsx phải hiển thị thông báo toast.error khi đăng ký/đăng nhập Passkey gặp lỗi"
  );
});

test("TC-MOB-08 (AC-01.2): Thanh Header khi đã đăng nhập (cả Passkey Topbar và Wagmi Header) gọn gàng trên mobile 375px — không xuống dòng nút Savings Clubs và rút gọn địa chỉ ví", () => {
  assert.match(
    appSrc,
    /passkeyAddress\.slice\(0, 4\)\}\.\.\$\{passkeyAddress\.slice\(-2\)/,
    "Passkey Topbar trong App.tsx phải rút gọn địa chỉ ví trên màn hình nhỏ (< sm)"
  );
  assert.match(
    headerSrc,
    /address\.slice\(0, 4\)\}\.\.\$\{address\.slice\(-2\)/,
    "Header.tsx phải rút gọn địa chỉ ví đã kết nối trên màn hình nhỏ (< sm)"
  );
});

test("TC-MOB-09 (AC-01.3): Click vào nút địa chỉ ví trên Header (cả Passkey và Wagmi) và trong ArcAppKitModal đều có menu Đăng xuất Ví (Disconnect Wallet)", () => {
  assert.match(
    appSrc,
    /setIsPasskeyWalletOpen/,
    "App.tsx phải mở menu ví khi click vào địa chỉ ví Passkey trên Header"
  );
  assert.match(
    appSrc,
    /handleDisconnectAll/,
    "App.tsx phải có hàm handleDisconnectAll để đăng xuất cả ví Passkey và ví Wagmi"
  );
  assert.match(
    headerSrc,
    /onDisconnectWallet/,
    "Header.tsx phải hỗ trợ nút Đăng xuất Ví (onDisconnectWallet) trong menu ví trên mobile"
  );
  assert.match(
    arcModalSrc,
    /onLogoutPasskey/,
    "ArcAppKitModal.tsx phải có nút Đăng xuất Ví Passkey trong tab Passkey"
  );
});


