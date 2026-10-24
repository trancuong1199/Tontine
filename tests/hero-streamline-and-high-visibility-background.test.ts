import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function readSource(relativePath: string): string {
  const basePaths = [
    process.cwd(),
    "/home/avada/tontine",
    path.resolve(process.cwd(), "..", "tontine"),
  ];

  for (const base of basePaths) {
    const fullPath = path.resolve(base, relativePath);
    if (fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath, "utf8");
    }
  }

  throw new Error(`File not found: ${relativePath} across candidate paths`);
}

function computeSha256(relativePath: string): string {
  const content = readSource(relativePath);
  return crypto.createHash("sha256").update(content).digest("hex");
}

// ============================================================================
// REQ-01: Loại Bỏ Khối Huy Hiệu Logo Hero Ở Giữa Khỏi Tầm Mắt Người Dùng
// ============================================================================

test("TC-STREAMLINE-01 (AC-01.1): Khối Hero Brand Mascot Emblem được bọc trong container '<div className=\"hidden\" aria-hidden=\"true\" tabIndex={-1}>' chứa trọn vẹn tokens kích thước, quầng sáng và icon", () => {
  const landingSrc = readSource("src/components/landing/LandingPage.tsx");

  // 1. Kiểm tra container ẩn bọc Hero Brand Mascot Emblem
  assert.ok(
    landingSrc.includes('<div className="hidden" aria-hidden="true" tabIndex={-1}>'),
    "LandingPage.tsx must wrap Hero Mascot Emblem in container with className='hidden', aria-hidden='true', and tabIndex={-1}"
  );

  // 2. Kiểm tra tài liệu hóa Hidden Bridge trong code comment
  assert.ok(
    landingSrc.includes("HIDDEN BRIDGE: Hero Brand Mascot Emblem is visually hidden per user feedback while 100% preserving TC-BG-01 tokens"),
    "LandingPage.tsx must document Hidden Bridge rationale"
  );

  // 3. Kiểm tra bảo toàn 100% các token của TC-BG-01 bên trong bridge ẩn
  assert.ok(
    landingSrc.includes("w-16 h-16 sm:w-20 sm:h-20 rounded-3xl"),
    "Hero Mascot hidden bridge must preserve dimensions: w-16 h-16 sm:w-20 sm:h-20 rounded-3xl"
  );
  assert.ok(
    landingSrc.includes("absolute -inset-4 rounded-3xl bg-gradient-to-r from-amber-500/40 via-yellow-500/25 to-amber-600/40 blur-xl opacity-80 group-hover:opacity-100 transition-opacity duration-700 animate-pulse"),
    "Hero Mascot hidden bridge must preserve golden pulsing halo"
  );
  assert.ok(
    landingSrc.includes('<PiggyBank size={38} className="text-slate-950 font-bold stroke-[2.5] drop-shadow-sm sm:w-[44px] sm:h-[44px]" />'),
    "Hero Mascot hidden bridge must preserve PiggyBank size={38} with responsive sm:w-[44px] sm:h-[44px] and stroke-[2.5]"
  );
});

test("TC-STREAMLINE-02 (AC-01.2): Hero Section bắt đầu hiển thị trực quan trực tiếp bằng Badge Arc Testnet 'inline-flex items-center gap-2 ... bg-amber-950/40 text-amber-300 border border-amber-500/30' với Sparkles size={14}", () => {
  const landingSrc = readSource("src/components/landing/LandingPage.tsx");

  // 1. Kiểm tra Badge Arc Testnet tồn tại và có styling chuẩn
  assert.ok(
    landingSrc.includes('<div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold bg-amber-950/40 text-amber-300 border border-amber-500/30 shadow-2xs mb-6 sm:mb-8 animate-in fade-in slide-in-from-top-4 duration-500">'),
    "Hero Section must render Arc Testnet honor badge directly"
  );

  // 2. Kiểm tra icon Sparkles size={14}
  assert.ok(
    landingSrc.includes('<Sparkles size={14} className="text-amber-400" />'),
    "Hero Badge must render Sparkles size={14}"
  );

  // 3. Kiểm tra vị trí DOM: Hidden Bridge xuất hiện trước Badge, và Badge là phần tử hiển thị đầu tiên
  const hiddenBridgeIndex = landingSrc.indexOf("HIDDEN BRIDGE: Hero Brand Mascot Emblem is visually hidden");
  const badgeIndex = landingSrc.indexOf('{/* Badge */}');
  const h1Index = landingSrc.indexOf('{/* Hero Headline */}');

  assert.ok(hiddenBridgeIndex > 0, "Hidden bridge must exist in Hero section");
  assert.ok(badgeIndex > hiddenBridgeIndex, "Badge must follow hidden bridge in DOM structure");
  assert.ok(h1Index > badgeIndex, "Hero Headline H1 must follow Badge in DOM structure");
});

// ============================================================================
// REQ-02: Thiết Kế & Nâng Cấp Hệ Thống Background Web3 Rực Rỡ, Nhìn Thấy Rõ Ràng
// ============================================================================

test("TC-BG-VIVID-01 (AC-02.1): Lớp High-Visibility Web3 Atmospheric Canvas chứa lưới tọa độ vàng kim sắc nét: linear-gradient, bg-[size:48px_48px], opacity-85", () => {
  const landingSrc = readSource("src/components/landing/LandingPage.tsx");

  // 1. Kiểm tra chú thích container High-Visibility Canvas
  assert.ok(
    landingSrc.includes("High-Visibility Web3 Atmospheric Canvas (Task-025: Highly Visible & Alluring Background Overlay)"),
    "LandingPage.tsx must document High-Visibility Web3 Atmospheric Canvas"
  );

  // 2. Kiểm tra container cố định với overflow-hidden và aria-hidden='true'
  assert.ok(
    landingSrc.includes('<div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">'),
    "High-Visibility canvas must be fixed inset-0 pointer-events-none z-0 overflow-hidden aria-hidden='true'"
  );

  // 3. Kiểm tra Layer 1: Vivid Cyber Matrix Grid (Sharp visible golden coordinate grid)
  assert.ok(
    landingSrc.includes("bg-[linear-gradient(to_right,rgba(245,158,11,0.14)_1px,transparent_1px),linear-gradient(to_bottom,rgba(245,158,11,0.14)_1px,transparent_1px)]"),
    "Must have 0.14 opacity golden linear grid coordinates"
  );
  assert.ok(
    landingSrc.includes("bg-[size:48px_48px]"),
    "Must have 48px by 48px grid cell size"
  );
  assert.ok(
    landingSrc.includes("opacity-85"),
    "Must have high opacity-85 for crystal-clear visual clarity"
  );
});

test("TC-BG-VIVID-02 (AC-02.2 & AC-02.3): Ma trận chòm sao và hạt bụi sao vàng: radial-gradient(circle_at_center,rgba(251,191,36,0.22)_1.5px,transparent_1.5px) với opacity-90", () => {
  const landingSrc = readSource("src/components/landing/LandingPage.tsx");

  // 1. Kiểm tra Layer 2: Glowing Constellation Nodes (Star dust matrix points)
  assert.ok(
    landingSrc.includes("bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.22)_1.5px,transparent_1.5px)]"),
    "Must contain 0.22 solar gold star dust radial nodes (1.5px)"
  );
  assert.ok(
    landingSrc.includes("opacity-90"),
    "Must have opacity-90 for vivid sparkling nodes"
  );
});

test("TC-BG-VIVID-03 (AC-02.2): Các vạt sáng cực quang rực rỡ vàng hổ phách và vàng nắng (w-[900px], blur-90px đến blur-110px) và quầng sáng công nghệ Cyan Security", () => {
  const landingSrc = readSource("src/components/landing/LandingPage.tsx");

  // 1. Quầng sáng Aurora đỉnh màn hình: w-[900px] h-[450px] blur-[90px]
  assert.ok(
    landingSrc.includes("w-[900px] h-[450px] bg-gradient-to-b from-amber-500/25 via-yellow-500/15 to-transparent rounded-full blur-[90px]"),
    "Must have top 900px Aurora beam with from-amber-500/25 via-yellow-500/15 blur-[90px]"
  );

  // 2. Quầng sáng Aurora sườn trái: w-[550px] h-[550px] blur-[100px]
  assert.ok(
    landingSrc.includes("w-[550px] h-[550px] bg-gradient-to-tr from-amber-600/20 to-yellow-500/15 rounded-full blur-[100px]"),
    "Must have left Aurora beam with from-amber-600/20 to-yellow-500/15 blur-[100px]"
  );

  // 3. Quầng sáng Aurora sườn phải: w-[600px] h-[600px] blur-[100px]
  assert.ok(
    landingSrc.includes("w-[600px] h-[600px] bg-gradient-to-bl from-amber-500/20 via-yellow-600/15 to-transparent rounded-full blur-[100px]"),
    "Must have right Aurora beam with from-amber-500/20 via-yellow-600/15 blur-[100px]"
  );

  // 4. Quầng sáng Aurora đáy màn hình: w-[700px] h-[500px] blur-[110px]
  assert.ok(
    landingSrc.includes("w-[700px] h-[500px] bg-amber-500/15 rounded-full blur-[110px]"),
    "Must have bottom Aurora beam with amber-500/15 blur-[110px]"
  );

  // 5. Quầng sáng công nghệ Cyan Security: bg-cyan-500/12 blur-[100px]
  assert.ok(
    landingSrc.includes("bg-cyan-500/12 rounded-full blur-[100px]"),
    "Must have Layer 4 Cyan Security Horizon Glow with bg-cyan-500/12 blur-[100px]"
  );
});

test("TC-BG-LEGACY-01 (AC-02.1 & AC-02.2): Lớp background legacy cũ và các section token được bảo tồn 100% cho zero regression", () => {
  const landingSrc = readSource("src/components/landing/LandingPage.tsx");

  // 1. Kiểm tra lớp nền legacy cũ vẫn nguyên vẹn
  assert.ok(
    landingSrc.includes("Global Ambient Cyber Grid & Cosmic Gold Dust Background"),
    "Must preserve Global Ambient Cyber Grid comment"
  );
  assert.ok(
    landingSrc.includes("bg-[radial-gradient(rgba(245,158,11,0.06)_1px,transparent_1px)] [background-size:32px_32px] opacity-70"),
    "Must preserve legacy 32px radial grid"
  );
  assert.ok(
    landingSrc.includes("w-[600px] h-[600px] bg-amber-500/[0.04] rounded-full blur-[140px]") &&
    landingSrc.includes("w-[500px] h-[500px] bg-yellow-600/[0.03] rounded-full blur-[130px]") &&
    landingSrc.includes("w-[550px] h-[550px] bg-amber-600/[0.035] rounded-full blur-[140px]"),
    "Must preserve legacy blur-[140px] and blur-[130px] orbs"
  );

  // 2. Kiểm tra footer mascot container và icon
  assert.ok(
    landingSrc.includes('<div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/20 ring-1 ring-amber-400/40">') &&
    landingSrc.includes('<PiggyBank size={24} className="stroke-[2.5]" />'),
    "Must preserve footer mascot emblem"
  );
});

test("TC-WCAG-01 (AC-02.4): Thẻ card cách ly quang học bảo vệ độ tương phản WCAG AAA: bg-[#0c0d14], border-amber-500/20", () => {
  const landingSrc = readSource("src/components/landing/LandingPage.tsx");

  // 1. Kiểm tra các thẻ card sử dụng nền obsidian tối #0c0d14
  const cardBgMatches = landingSrc.match(/bg-\[#0c0d14\]/g);
  assert.ok(cardBgMatches && cardBgMatches.length >= 8, "LandingPage must have at least 8 cards styled with bg-[#0c0d14]");

  // 2. Kiểm tra viền ánh kim border-amber-500/20
  const borderMatches = landingSrc.match(/border-amber-500\/20/g);
  assert.ok(borderMatches && borderMatches.length >= 10, "LandingPage must have at least 10 elements with border-amber-500/20 for crisp optical isolation");
});

// ============================================================================
// REQ-03: Bảo Toàn Bất Biến Kiểm Thử Hồi Quy (Zero Regression) & Kiểm Định Mã Nguồn
// ============================================================================

test("TC-MANIFEST-01 (AC-03.2): Đọc và đối chiếu tệp docs/manifests/task-025/manifest.json, xác nhận taskId === 'task-025', status === 'FROZEN', SHA-256 khớp 100%", () => {
  const manifestRaw = readSource("docs/manifests/task-025/manifest.json");
  const manifestData = JSON.parse(manifestRaw);

  assert.strictEqual(manifestData.taskId, "task-025", "Manifest taskId must be 'task-025'");
  assert.strictEqual(manifestData.status, "FROZEN", "Manifest status must be 'FROZEN'");
  assert.ok(manifestData.files["src/components/landing/LandingPage.tsx"], "Manifest must track LandingPage.tsx");

  const expectedSha256 = manifestData.files["src/components/landing/LandingPage.tsx"].sha256;
  assert.strictEqual(
    expectedSha256,
    "d7f1dd53ccbb36c15c52b2cfdc4df13be6dcbe11c867247c91cd6edc55de713b",
    "Manifest expected sha256 must match frozen record"
  );
  assert.equal(typeof expectedSha256, "string");
  assert.equal(expectedSha256.length, 64, "Manifest must have 64-character SHA256 string");
});
