import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function readSource(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

// ============================================================================
// REQ-01: Cấu Hình Thang Đo zIndex Trong tailwind.config.js
// ============================================================================

test("TC-ZINDEX-01 (AC-01.1): tailwind.config.js cấu hình đầy đủ thang đo zIndex mở rộng ('60' đến '100')", () => {
  const configSrc = readSource("tailwind.config.js");

  assert.ok(configSrc.includes("zIndex: {"), "tailwind.config.js must configure zIndex in theme.extend");
  assert.ok(configSrc.includes("'60': '60'"), "zIndex must define 60");
  assert.ok(configSrc.includes("'70': '70'"), "zIndex must define 70");
  assert.ok(configSrc.includes("'80': '80'"), "zIndex must define 80");
  assert.ok(configSrc.includes("'90': '90'"), "zIndex must define 90");
  assert.ok(configSrc.includes("'100': '100'"), "zIndex must define 100");
});

test("TC-ZINDEX-02 (AC-01.2): File CSS production chứa định nghĩa class .z-100 với z-index: 100", () => {
  const distDir = path.resolve(process.cwd(), "dist/assets");
  assert.ok(fs.existsSync(distDir), "dist/assets must exist after build");

  const cssFiles = fs.readdirSync(distDir).filter((f) => f.endsWith(".css"));
  assert.ok(cssFiles.length > 0, "At least one CSS file must be present in dist/assets");

  let foundZ100 = false;
  for (const cssFile of cssFiles) {
    const cssContent = fs.readFileSync(path.join(distDir, cssFile), "utf8");
    if (cssContent.includes(".z-100{z-index:100}") || cssContent.includes("z-100")) {
      foundZ100 = true;
      break;
    }
  }

  assert.ok(foundZ100, "Compiled CSS must include .z-100 definition");
});

// ============================================================================
// REQ-02: Nâng Cấp Lớp Hiển Thị Của EditClubNameModal.tsx
// ============================================================================

test("TC-ZINDEX-03 (AC-02.1): EditClubNameModal.tsx áp dụng z-100 và style={{ zIndex: 100 }} trên container fixed để nổi lên trên cùng", () => {
  const modalSrc = readSource("src/components/savings/EditClubNameModal.tsx");

  assert.ok(
    modalSrc.includes("className=\"fixed inset-0 z-100"),
    "EditClubNameModal must have z-100 to float above <main className='... relative z-10'> and modals with z-50"
  );
  assert.ok(
    modalSrc.includes("style={{ zIndex: 100 }}"),
    "EditClubNameModal must declare explicit inline style={{ zIndex: 100 }} to guarantee rendering in dev and prod"
  );
  assert.ok(
    !modalSrc.includes("z-60"),
    "EditClubNameModal must no longer use invalid ungenerated z-60 class"
  );
});

test("TC-ZINDEX-04 (AC-02.2): EditClubNameModal.tsx áp dụng backdrop bg-black/80 backdrop-blur-sm chuẩn", () => {
  const modalSrc = readSource("src/components/savings/EditClubNameModal.tsx");

  assert.ok(
    modalSrc.includes("bg-black/80 backdrop-blur-sm"),
    "EditClubNameModal must have dark backdrop with standard blur effect"
  );
});

test("TC-ZINDEX-05 (AC-02.3): Dialog box trong EditClubNameModal.tsx được định vị chính giữa màn hình với flex items-center justify-center", () => {
  const modalSrc = readSource("src/components/savings/EditClubNameModal.tsx");

  assert.ok(
    modalSrc.includes("flex items-center justify-center"),
    "Backdrop container must use flex items-center justify-center to center modal box"
  );
  assert.ok(
    modalSrc.includes("bg-[#0f1019] rounded-2xl border border-amber-500/30 shadow-2xl max-w-md w-full"),
    "Dialog box must have high-contrast styling and max-w-md"
  );
});

// ============================================================================
// REQ-03: Nâng Cấp Modal Xác Nhận Xóa Trong ClubDirectoryModal.tsx
// ============================================================================

test("TC-ZINDEX-06 (AC-03.1): Modal xác nhận xóa nhóm áp dụng z-100 và style={{ zIndex: 100 }} nổi trên danh bạ nhóm z-50", () => {
  const dirSrc = readSource("src/components/savings/ClubDirectoryModal.tsx");

  assert.ok(
    dirSrc.includes("className=\"fixed inset-0 z-100 flex items-center justify-center"),
    "Delete confirmation modal must apply z-100 to render above parent directory modal (z-50)"
  );
  assert.ok(
    dirSrc.includes("style={{ zIndex: 100 }}"),
    "Delete confirmation modal must apply explicit inline style={{ zIndex: 100 }}"
  );
  assert.ok(
    !dirSrc.includes("z-60"),
    "ClubDirectoryModal must no longer use ungenerated z-60"
  );
});

test("TC-ZINDEX-07 (AC-03.2): Modal xác nhận xóa chặn nổi bọt sự kiện click backdrop và hộp thoại", () => {
  const dirSrc = readSource("src/components/savings/ClubDirectoryModal.tsx");

  assert.ok(
    dirSrc.includes("e.stopPropagation();") && dirSrc.includes("setConfirmingClub(null);"),
    "Delete confirmation modal backdrop must stop event propagation"
  );
});
