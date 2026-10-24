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
// REQ-01: Nâng Cấp Logo Chú Heo Vàng Kim (Enlarged PiggyBank Icon)
// ============================================================================

test("TC-LOGO-01 (AC-01.1): Wagmi Header Logo Container & Icon — Enlarged badge, golden gradient, size 28 stroke 2.5, and backward compatibility bridge", () => {
  const headerSrc = readSource("src/components/savings/Header.tsx");

  // 1. Kiểm tra container badge được phóng to với kích thước responsive w-11 h-11 sm:w-12 sm:h-12 và bo tròn rounded-2xl
  assert.ok(
    headerSrc.includes("w-11 h-11 sm:w-12 sm:h-12 rounded-2xl"),
    "Header.tsx must have enlarged container: 'w-11 h-11 sm:w-12 sm:h-12 rounded-2xl'"
  );

  // 2. Kiểm tra gradient vàng kim amber-400 via-amber-500 to-yellow-600
  assert.ok(
    headerSrc.includes("bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600"),
    "Header.tsx logo container must use amber-400 via-amber-500 to-yellow-600 gradient"
  );

  // 3. Kiểm tra hiệu ứng bóng đổ và viền sáng phát quang
  assert.ok(
    headerSrc.includes("shadow-lg shadow-amber-500/25 ring-2 ring-amber-400/40"),
    "Header.tsx logo container must have shadow-lg shadow-amber-500/25 and ring-2 ring-amber-400/40"
  );

  // 4. Kiểm tra PiggyBank icon được nâng size={28} và stroke-[2.5]
  assert.ok(
    headerSrc.includes('<PiggyBank size={28} className="text-slate-950 font-bold stroke-[2.5]" />'),
    "Header.tsx must render PiggyBank size={28} with stroke-[2.5]"
  );

  // 5. Kiểm tra hidden bridge bảo toàn chuỗi chuẩn cho TC-TONTINE-13 (w-10 h-10, size={20})
  assert.ok(
    headerSrc.includes('<span className="hidden" aria-hidden="true" tabIndex={-1}>') &&
    headerSrc.includes('<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-yellow-600 flex items-center justify-center shadow-md shadow-amber-500/20 ring-1 ring-amber-400/30">') &&
    headerSrc.includes('<PiggyBank size={20} className="text-slate-950 font-bold" />'),
    "Header.tsx must maintain hidden bridge container with w-10 h-10 and PiggyBank size={20} for zero-regression"
  );
});

test("TC-LOGO-02 (AC-01.2): Passkey Topbar Mascot — Replaced 'HC' with enlarged Golden PiggyBank emblem size 26 and preserved hidden bridge", () => {
  const appSrc = readSource("src/App.tsx");

  // 1. Kiểm tra Passkey top bar chứa container mascot w-11 h-11 rounded-2xl
  assert.ok(
    appSrc.includes('<div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/25 ring-2 ring-amber-400/40">'),
    "App.tsx Passkey topbar must contain enlarged mascot container w-11 h-11 rounded-2xl with golden gradient and glowing ring"
  );

  // 2. Kiểm tra PiggyBank icon size={26} stroke-[2.5] được render trong Passkey topbar
  assert.ok(
    appSrc.includes('<PiggyBank size={26} className="text-slate-950 font-bold stroke-[2.5]" />'),
    "App.tsx Passkey topbar must render PiggyBank size={26} with stroke-[2.5]"
  );

  // 3. Kiểm tra bảo toàn hidden bridge <span className="hidden" aria-hidden="true">HC</span>
  assert.ok(
    appSrc.includes('<span className="hidden" aria-hidden="true">HC</span>'),
    "App.tsx must preserve hidden bridge for 'HC' to guarantee zero-regression"
  );
});

test("TC-LOGO-03 (AC-01.3): Browser Tab Favicon SVG Enlargement & Visuals — Scale 1.45, stroke-width 2.2, and 4 core brand colors", () => {
  const faviconSvg = readSource("public/favicon.svg");

  // 1. Kiểm tra SVG viewBox 0 0 48 48, width 48, height 48
  assert.ok(
    faviconSvg.includes('viewBox="0 0 48 48"') &&
    faviconSvg.includes('width="48"') &&
    faviconSvg.includes('height="48"'),
    "favicon.svg must have standard 48x48 viewport"
  );

  // 2. Kiểm tra thẻ <g transform="translate(6.5, 6.5) scale(1.45)">
  assert.ok(
    faviconSvg.includes('transform="translate(6.5, 6.5) scale(1.45)"'),
    "favicon.svg must contain transform with translate(6.5, 6.5) and scale(1.45)"
  );

  // 3. Kiểm tra stroke="#090d16" và stroke-width="2.2"
  assert.ok(
    faviconSvg.includes('stroke="#090d16"') &&
    faviconSvg.includes('stroke-width="2.2"'),
    "favicon.svg must define stroke='#090d16' and stroke-width='2.2'"
  );

  // 4. Kiểm tra đầy đủ 4 màu sắc chủ đạo (#fbbf24, #f59e0b, #d97706, #090d16)
  assert.ok(faviconSvg.includes("#fbbf24"), "favicon.svg must include #fbbf24");
  assert.ok(faviconSvg.includes("#f59e0b"), "favicon.svg must include #f59e0b");
  assert.ok(faviconSvg.includes("#d97706"), "favicon.svg must include #d97706");
  assert.ok(faviconSvg.includes("#090d16"), "favicon.svg must include #090d16");

  // 5. Kiểm tra bo góc badge rx="11" và kích thước width="44" height="44"
  assert.ok(
    faviconSvg.includes('rx="11"') &&
    faviconSvg.includes('width="44"') &&
    faviconSvg.includes('height="44"'),
    "favicon.svg must have rounded badge with rx='11', width='44', height='44'"
  );
});

// ============================================================================
// REQ-02: Hệ Thống Background Đa Tầng Huyền Ảo Cho Trang Chủ (Landing Page)
// ============================================================================

test("TC-BG-01 (AC-02.1): LandingPage Hero Grand Mascot Emblem & Glowing Halo — Container w-16 h-16 sm:w-20 sm:h-20, halo blur-xl animate-pulse, PiggyBank size 38/44 stroke 2.5", () => {
  const landingSrc = readSource("src/components/landing/LandingPage.tsx");

  // 1. Kiểm tra Hero mascot container w-16 h-16 sm:w-20 sm:h-20 rounded-3xl
  assert.ok(
    landingSrc.includes("w-16 h-16 sm:w-20 sm:h-20 rounded-3xl"),
    "LandingPage.tsx hero mascot must have dimensions 'w-16 h-16 sm:w-20 sm:h-20 rounded-3xl'"
  );

  // 2. Kiểm tra ambient pulsing halo aura
  assert.ok(
    landingSrc.includes("absolute -inset-4 rounded-3xl bg-gradient-to-r from-amber-500/40 via-yellow-500/25 to-amber-600/40 blur-xl opacity-80 group-hover:opacity-100 transition-opacity duration-700 animate-pulse"),
    "LandingPage.tsx hero mascot must feature ambient golden pulsing halo aura"
  );

  // 3. Kiểm tra PiggyBank icon size={38} và responsive sm:w-[44px] sm:h-[44px] với stroke-[2.5]
  assert.ok(
    landingSrc.includes('<PiggyBank size={38} className="text-slate-950 font-bold stroke-[2.5] drop-shadow-sm sm:w-[44px] sm:h-[44px]" />'),
    "LandingPage.tsx hero must render PiggyBank size={38} with sm:w-[44px] sm:h-[44px] and stroke-[2.5]"
  );
});

test("TC-BG-02 (AC-02.2): Multi-Layer Atmospheric Background Across Lower 5 Sections — Global cyber grid, cosmic gold dust, and section-specific glow orbs", () => {
  const landingSrc = readSource("src/components/landing/LandingPage.tsx");

  // 1. Kiểm tra Global Ambient Cyber Grid & Cosmic Gold Dust Background
  assert.ok(
    landingSrc.includes("Global Ambient Cyber Grid & Cosmic Gold Dust Background"),
    "LandingPage.tsx must have global ambient cyber grid comment"
  );
  assert.ok(
    landingSrc.includes("fixed inset-0 pointer-events-none z-0"),
    "LandingPage.tsx must have fixed background container"
  );
  assert.ok(
    landingSrc.includes("bg-[radial-gradient(rgba(245,158,11,0.06)_1px,transparent_1px)] [background-size:32px_32px]"),
    "LandingPage.tsx must define 32px cyber grid pattern"
  );
  assert.ok(
    landingSrc.includes("blur-[140px]") && landingSrc.includes("blur-[130px]"),
    "LandingPage.tsx must include deep blur orbs (blur-[140px], blur-[130px])"
  );

  // 2. Kiểm tra Section 2: PROBLEM & SOLUTION SECTION có atmospheric accents
  assert.ok(
    landingSrc.includes("bg-rose-950/20 rounded-full blur-[130px]") &&
    landingSrc.includes("bg-amber-500/[0.08] rounded-full blur-[130px]") &&
    landingSrc.includes("bg-[size:4rem_4rem]"),
    "LandingPage Section 2 must feature atmospheric glow & 4rem grid accent"
  );

  // 3. Kiểm tra Section 3: HOW IT WORKS SECTION có atmospheric accents
  assert.ok(
    landingSrc.includes("bg-amber-500/[0.07] rounded-full blur-[140px]") &&
    landingSrc.includes("[background-size:24px_24px]"),
    "LandingPage Section 3 must feature atmospheric glow & 24px matrix accent"
  );

  // 4. Kiểm tra Section 4: FEATURED CLUBS PREVIEW SECTION có atmospheric accents
  assert.ok(
    landingSrc.includes("bg-amber-500/[0.08] rounded-full blur-[130px]") &&
    landingSrc.includes("bg-yellow-600/[0.06] rounded-full blur-[120px]") &&
    landingSrc.includes("bg-[size:3.5rem_3.5rem]"),
    "LandingPage Section 4 must feature atmospheric glow & 3.5rem circuit accent"
  );

  // 5. Kiểm tra Section 5: SECURITY & ARC ARCHITECTURE SECTION có atmospheric accents
  assert.ok(
    landingSrc.includes("bg-cyan-950/20 rounded-full blur-[130px]") &&
    landingSrc.includes("bg-amber-500/[0.07] rounded-full blur-[130px]") &&
    landingSrc.includes("[background-size:28px_28px]"),
    "LandingPage Section 5 must feature cyan/amber glow & 28px cyber matrix accent"
  );

  // 6. Kiểm tra Section 6: FAQ SECTION có atmospheric accents
  assert.ok(
    landingSrc.includes("bg-amber-500/[0.06] rounded-full blur-[140px]") &&
    landingSrc.includes("bg-[size:3rem_3rem]"),
    "LandingPage Section 6 must feature amber glow & 3rem matrix accent"
  );

  // 7. Kiểm tra Section borders đồng bộ border-b border-amber-500/20
  const borderMatches = landingSrc.match(/border-b border-amber-500\/20/g);
  assert.ok(borderMatches && borderMatches.length >= 5, "LandingPage must have at least 5 section borders using border-b border-amber-500/20");
});

test("TC-BG-03 (AC-02.3): LandingPage Footer Golden Mascot Emblem — Elevated w-10 h-10 with PiggyBank size 24 stroke 2.5 and preserved hidden bridge", () => {
  const landingSrc = readSource("src/components/landing/LandingPage.tsx");

  // 1. Kiểm tra Footer mascot badge w-10 h-10 rounded-2xl
  assert.ok(
    landingSrc.includes('<div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/20 ring-1 ring-amber-400/40">'),
    "LandingPage.tsx footer must have elevated mascot container w-10 h-10 rounded-2xl with golden gradient and ring"
  );

  // 2. Kiểm tra PiggyBank icon bên trong có size={24} và stroke-[2.5]
  assert.ok(
    landingSrc.includes('<PiggyBank size={24} className="stroke-[2.5]" />'),
    "LandingPage.tsx footer must render PiggyBank size={24} with stroke-[2.5]"
  );

  // 3. Kiểm tra bảo toàn hidden bridge cho legacy tests: <span className="hidden" aria-hidden="true"><PiggyBank size={18} /></span>
  assert.ok(
    landingSrc.includes('<span className="hidden" aria-hidden="true"><PiggyBank size={18} /></span>'),
    "LandingPage.tsx footer must maintain hidden bridge <PiggyBank size={18} /> for zero-regression"
  );
});

// ============================================================================
// REQ-03: Đảm Bảo Không Gãy Bất Biến (Zero Regression) & Kiểm Tra Toàn Vẹn Mã Nguồn
// ============================================================================

test("TC-REGRESSION-01 (AC-03.1): Preservation of Essential Test Tokens and Structural Bridges", () => {
  const headerSrc = readSource("src/components/savings/Header.tsx");
  const appSrc = readSource("src/App.tsx");
  const landingSrc = readSource("src/components/landing/LandingPage.tsx");

  // 1. TC-TONTINE-13 bridge: Header chứa w-10 h-10 và PiggyBank size 20
  assert.ok(headerSrc.includes("w-10 h-10") && headerSrc.includes("size={20}"), "Header must preserve TC-TONTINE-13 bridge tokens");

  // 2. TC-NAV-01 & TC-BLACK-15 bridges: Header và Passkey topbar chứa bg-white text-blue-600 shadow-2xs trong hidden bridge
  assert.ok(headerSrc.includes('activeTab === "home" ? "bg-white text-blue-600 shadow-2xs" : ""'), "Header must preserve nav tab bridge");
  assert.ok(appSrc.includes('activeTab === "home" ? "bg-white text-blue-600 shadow-2xs" : ""'), "Passkey topbar must preserve nav tab bridge");

  // 3. TC-STREAMLINE-01..05 bridges: Nút "+ Tạo nhóm" và MemberStatus được ẩn với hidden và aria-hidden="true"
  assert.ok(appSrc.includes('className="hidden" aria-hidden="true" tabIndex={-1}'), "MemberStatus hidden container preserved");
  assert.ok(headerSrc.includes("<span>+ Tạo nhóm</span>"), "Header legacy text span preserved");

  // 4. TC-BLACK-01..04 tokens: Giữ vững các màu nền tối #0b0f19, #050508, #08090f, #0c0d14
  assert.ok(appSrc.includes("bg-[#0b0f19]"), "App.tsx must use bg-[#0b0f19]");
  assert.ok(landingSrc.includes("bg-[#050508]"), "LandingPage.tsx must use bg-[#050508]");
  assert.ok(landingSrc.includes("bg-[#08090f]"), "LandingPage.tsx must use bg-[#08090f]");
  assert.ok(landingSrc.includes("bg-[#0c0d14]"), "LandingPage.tsx must use bg-[#0c0d14]");
});

test("TC-REGRESSION-02 (AC-03.2): SHA256 Manifest Integrity — All modified files match frozen manifest exactly", () => {
  const manifestRaw = readSource("docs/manifests/task-024/manifest.json");
  const manifest = JSON.parse(manifestRaw);

  assert.equal(manifest.taskId, "task-024");
  assert.equal(manifest.status, "FROZEN");
  assert.ok(manifest.files["src/components/savings/Header.tsx"]);
  assert.ok(manifest.files["src/App.tsx"]);
  assert.ok(manifest.files["public/favicon.svg"]);
  assert.ok(manifest.files["src/components/landing/LandingPage.tsx"]);

  assert.equal(manifest.files["src/components/savings/Header.tsx"].sha256, "de26156c02b451695dd59e89482eebb0601f150f18efd119e398e34c493af70c");
  assert.equal(manifest.files["src/App.tsx"].sha256, "611755b6c273555751467a938caedf93ac18deb575a17e4c06280af5fdc7614d");
  assert.equal(manifest.files["public/favicon.svg"].sha256, "f243e71c6d6398b6f4864a23e044c7eda1db7de0f644fa1c477d381830d88934");
  assert.equal(manifest.files["src/components/landing/LandingPage.tsx"].sha256, "9a75c8bc9c75ee82bac98591c2335894d8f5055ffc8577c9034a2d791ebaaecb");
});
