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
// REQ-01: Khóa Tâm Icon & Hạt Sao Trên Cung Quỹ Đạo Hero Bằng <foreignObject>
// ============================================================================

test("TC-ALIGN-01 (AC-01.1): Embedding Ecosystem Icons Directly Inside SVG Using <foreignObject>", () => {
  const landingSrc = readSource("src/components/landing/LandingPage.tsx");

  // 1. Cả 2 cánh trái và phải phải chứa foreignObject bên trong SVG viewBox="0 0 500 750"
  const leftWingStart = landingSrc.indexOf('{/* LEFT WING: Concentric Orbital Dashed Arcs & Icons */}');
  const rightWingStart = landingSrc.indexOf('{/* RIGHT WING: Concentric Orbital Dashed Arcs & Icons */}');
  const heroFloorStart = landingSrc.indexOf('{/* Hero 3D Perspective Cyber Grid Floor');

  assert.ok(leftWingStart > 0 && rightWingStart > leftWingStart, "Must clearly identify Left and Right Wings");
  assert.ok(heroFloorStart > rightWingStart, "Hero Floor must follow Right Wing");

  const leftWingSection = landingSrc.slice(leftWingStart, rightWingStart);
  const rightWingSection = landingSrc.slice(rightWingStart, heroFloorStart);

  // 2. Kiểm tra Left Wing chứa 4 foreignObject
  const leftForeignMatches = leftWingSection.match(/<foreignObject[\s\S]*?<\/foreignObject>/g);
  assert.ok(leftForeignMatches && leftForeignMatches.length === 4, "Left Wing must contain exactly 4 <foreignObject> elements");

  // 3. Kiểm tra Right Wing chứa 4 foreignObject
  const rightForeignMatches = rightWingSection.match(/<foreignObject[\s\S]*?<\/foreignObject>/g);
  assert.ok(rightForeignMatches && rightForeignMatches.length === 4, "Right Wing must contain exactly 4 <foreignObject> elements");

  // 4. Tuyệt đối không còn thẻ div độc lập định vị bằng phần trăm CSS top-[8%], top-[35%], v.v.
  assert.ok(
    !leftWingSection.includes('top-[8%] left-[18%]'),
    "Left wing must not use legacy CSS percentage positioning div"
  );
  assert.ok(
    !rightWingSection.includes('top-[8%] right-[18%]'),
    "Right wing must not use legacy CSS percentage positioning div"
  );
});

test("TC-ALIGN-02 (AC-01.2): Parametric Center Lock for ForeignObjects & Star Nodes on Dashed Arcs", () => {
  const landingSrc = readSource("src/components/landing/LandingPage.tsx");

  // 1. Kiểm tra sự hiện diện của hàm toán học Bezier getLeftOuterArcPoint và getRightOuterArcPoint
  assert.ok(
    landingSrc.includes("export function getLeftOuterArcPoint(t: number)"),
    "LandingPage.tsx must export getLeftOuterArcPoint"
  );
  assert.ok(
    landingSrc.includes("export function getRightOuterArcPoint(t: number)"),
    "LandingPage.tsx must export getRightOuterArcPoint"
  );

  // 2. Kiểm tra các icon cánh trái sử dụng tọa độ căn tâm toán học ptLeft*
  assert.ok(
    landingSrc.includes("x={ptLeftPiggy.x - 14}") && landingSrc.includes("y={ptLeftPiggy.y - 14}"),
    "Left PiggyBank must use parametric ptLeftPiggy"
  );
  assert.ok(
    landingSrc.includes("x={ptLeftUsers.x - 14}") && landingSrc.includes("y={ptLeftUsers.y - 14}"),
    "Left Users must use parametric ptLeftUsers"
  );
  assert.ok(
    landingSrc.includes("x={ptLeftRefresh.x - 13}") && landingSrc.includes("y={ptLeftRefresh.y - 13}"),
    "Left RefreshCw must use parametric ptLeftRefresh"
  );
  assert.ok(
    landingSrc.includes("x={ptLeftCalendar.x - 14}") && landingSrc.includes("y={ptLeftCalendar.y - 14}"),
    "Left Calendar must use parametric ptLeftCalendar"
  );

  // 3. Kiểm tra các icon cánh phải sử dụng tọa độ căn tâm toán học ptRight*
  assert.ok(
    landingSrc.includes("x={ptRightRefresh.x - 13}") && landingSrc.includes("y={ptRightRefresh.y - 13}"),
    "Right RefreshCw must use parametric ptRightRefresh"
  );
  assert.ok(
    landingSrc.includes("x={ptRightCalendar.x - 14}") && landingSrc.includes("y={ptRightCalendar.y - 14}"),
    "Right Calendar must use parametric ptRightCalendar"
  );
  assert.ok(
    landingSrc.includes("x={ptRightUsers.x - 14}") && landingSrc.includes("y={ptRightUsers.y - 14}"),
    "Right Users must use parametric ptRightUsers"
  );
  assert.ok(
    landingSrc.includes("x={ptRightPiggy.x - 14}") && landingSrc.includes("y={ptRightPiggy.y - 14}"),
    "Right PiggyBank must use parametric ptRightPiggy"
  );

  // 4. Kiểm tra các hạt sao vàng phát sáng
  assert.ok(landingSrc.includes('circle cx="160" cy="110"'), "Left orbit must contain star node at (160, 110)");
  assert.ok(landingSrc.includes('circle cx="340" cy="110"'), "Right orbit must contain star node at (340, 110)");
});

test("TC-ALIGN-03 (AC-01.3): Icon Sequence & Visual Token Integrity", () => {
  const landingSrc = readSource("src/components/landing/LandingPage.tsx");

  const leftWingStart = landingSrc.indexOf('{/* LEFT WING: Concentric Orbital Dashed Arcs & Icons */}');
  const rightWingStart = landingSrc.indexOf('{/* RIGHT WING: Concentric Orbital Dashed Arcs & Icons */}');
  const leftWing = landingSrc.slice(leftWingStart, rightWingStart);
  const rightWing = landingSrc.slice(rightWingStart);

  // Trật tự cánh trái: PiggyBank -> Users -> RefreshCw -> Calendar
  const idxL1 = leftWing.indexOf("PiggyBank");
  const idxL2 = leftWing.indexOf("Users");
  const idxL3 = leftWing.indexOf("RefreshCw");
  const idxL4 = leftWing.indexOf("Calendar");
  assert.ok(idxL1 > 0 && idxL2 > idxL1 && idxL3 > idxL2 && idxL4 > idxL3, "Left Wing order must be PiggyBank -> Users -> RefreshCw -> Calendar");

  // Trật tự cánh phải: RefreshCw -> Calendar -> Users -> PiggyBank
  const idxR1 = rightWing.indexOf("RefreshCw");
  const idxR2 = rightWing.indexOf("Calendar");
  const idxR3 = rightWing.indexOf("Users");
  const idxR4 = rightWing.indexOf("PiggyBank");
  assert.ok(idxR1 > 0 && idxR2 > idxR1 && idxR3 > idxR2 && idxR4 > idxR3, "Right Wing order must be RefreshCw -> Calendar -> Users -> PiggyBank");

  // Styling tokens
  assert.ok(
    landingSrc.includes('text-amber-400/80 drop-shadow-[0_0_10px_rgba(245,158,11,0.35)]'),
    "Icons must maintain amber-400/80 color with glowing drop shadow"
  );
  assert.ok(
    landingSrc.includes('className="stroke-[1.5]"'),
    "Icons must maintain stroke-[1.5]"
  );
});

// ============================================================================
// REQ-02: Mở Rộng Khí Quyển Web3 & Quỹ Đạo Cuộn Trang Liên Tục (Continuous Full-Page Canvas)
// ============================================================================

test("TC-SCROLL-01 (AC-02.1): Continuous Full-Page Side Orbital Arcs Layer in LandingPage.tsx", () => {
  const landingSrc = readSource("src/components/landing/LandingPage.tsx");

  assert.ok(
    landingSrc.includes("Continuous Full-Page Atmospheric Side Orbital Arcs (Task-027: Seamless Vertical Continuity)"),
    "LandingPage.tsx must document Continuous Full-Page Atmospheric Side Orbital Arcs"
  );
  assert.ok(
    landingSrc.includes("Left Continuous Side Wave Arc"),
    "Must document Left Continuous Side Wave Arc"
  );
  assert.ok(
    landingSrc.includes("Right Continuous Side Wave Arc"),
    "Must document Right Continuous Side Wave Arc"
  );
  assert.ok(
    landingSrc.includes('stroke="rgba(245, 158, 11, 0.18)"'),
    "Continuous side wave arcs must use rgba(245, 158, 11, 0.18)"
  );
  assert.ok(
    landingSrc.includes('strokeDasharray="6, 8"'),
    "Continuous side wave arcs must use strokeDasharray='6, 8'"
  );
});

test("TC-SCROLL-02 (AC-02.2): Full-Page Ambient Aurora Beams & Cyber Matrix Grid Coverage", () => {
  const landingSrc = readSource("src/components/landing/LandingPage.tsx");

  // Kiểm tra hệ thống aurora trải dài tới phân khu dưới
  assert.ok(
    landingSrc.includes('bg-cyan-500/12 rounded-full blur-[100px]'),
    "Must contain Cyan security glow at top-[68%]"
  );
  assert.ok(
    landingSrc.includes('bg-amber-500/15 rounded-full blur-[110px]'),
    "Must contain Amber glow at bottom-10"
  );
});

test("TC-SCROLL-03 (AC-02.3): Optical Isolation & WCAG AAA Contrast for Lower Section Cards", () => {
  const landingSrc = readSource("src/components/landing/LandingPage.tsx");

  // Kiểm tra các thẻ card phân khu dưới duy trì nền obsidian tối #0c0d14
  const cardBgMatches = landingSrc.match(/bg-\[#0c0d14\]/g);
  assert.ok(cardBgMatches && cardBgMatches.length >= 8, "LandingPage must have at least 8 cards with bg-[#0c0d14]");

  // Viền ánh kim border-amber-500/20
  const borderMatches = landingSrc.match(/border-amber-500\/20/g);
  assert.ok(borderMatches && borderMatches.length >= 10, "LandingPage must have at least 10 elements with border-amber-500/20");
});

// ============================================================================
// REQ-03: Đồng Bộ Khí Quyển Web3 Cho Trang Savings Clubs DApp trong App.tsx
// ============================================================================

test("TC-DAPP-SYNC-01 (AC-03.1): DApp Web3 Atmospheric Canvas Layer in src/App.tsx", () => {
  const appSrc = readSource("src/App.tsx");

  assert.ok(
    appSrc.includes("DApp Ambient Web3 Atmospheric Canvas (Task-027: Unified Aesthetics for Savings Clubs Page)"),
    "src/App.tsx must document DApp Ambient Web3 Atmospheric Canvas"
  );
  assert.ok(
    appSrc.includes("Layer 1: Subtle Cyber Matrix Grid"),
    "DApp canvas must include Cyber Matrix Grid"
  );
  assert.ok(
    appSrc.includes("Layer 2: Ambient Aurora Glow Orbs"),
    "DApp canvas must include Ambient Aurora Glow Orbs"
  );
  assert.ok(
    appSrc.includes("bg-[linear-gradient(to_right,rgba(245,158,11,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(245,158,11,0.06)_1px,transparent_1px)]"),
    "DApp canvas must use amber subtle cyber matrix grid lines"
  );
  assert.ok(
    appSrc.includes("from-amber-500/12 via-yellow-600/08 to-transparent"),
    "DApp canvas must include amber aurora orb"
  );
});

test("TC-DAPP-SYNC-02 (AC-03.2): DApp Subtle Side Orbital Arcs in src/App.tsx", () => {
  const appSrc = readSource("src/App.tsx");

  assert.ok(
    appSrc.includes("Layer 3: DApp Subtle Side Orbital Arcs"),
    "src/App.tsx must document DApp Subtle Side Orbital Arcs"
  );
  assert.ok(
    appSrc.includes('stroke="rgba(245, 158, 11, 0.22)"') && appSrc.includes('strokeDasharray="5, 7"'),
    "DApp side orbital arcs must use dashed stroke pattern strokeDasharray='5, 7'"
  );
});

test("TC-DAPP-SYNC-03 (AC-03.3): Non-Interference Safety Attributes pointer-events-none & aria-hidden", () => {
  const appSrc = readSource("src/App.tsx");

  assert.ok(
    appSrc.includes('<div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">'),
    "DApp canvas container must have pointer-events-none, z-0, overflow-hidden, and aria-hidden='true'"
  );
  assert.ok(
    appSrc.includes('main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 relative z-10"'),
    "Main container in App.tsx must have relative z-10 for clean stacking context"
  );
});

// ============================================================================
// REQ-04: Bảo Toàn Bất Biến Zero-Regression & Đối Chiếu Manifest SHA256
// ============================================================================

test("TC-MANIFEST-01 (AC-04.2): Manifest Verification for task-027 Frozen State and SHA-256 Records", () => {
  const manifestRaw = readSource("docs/manifests/task-027/manifest.json");
  const manifestData = JSON.parse(manifestRaw);

  assert.strictEqual(manifestData.taskId, "task-027", "Manifest taskId must be 'task-027'");
  assert.strictEqual(manifestData.status, "FROZEN", "Manifest status must be 'FROZEN'");
  assert.ok(manifestData.files["src/components/landing/LandingPage.tsx"], "Manifest must track LandingPage.tsx");
  assert.ok(manifestData.files["src/App.tsx"], "Manifest must track App.tsx");

  // Đối chiếu LandingPage.tsx
  const expectedLandingSha = manifestData.files["src/components/landing/LandingPage.tsx"].sha256;
  assert.strictEqual(
    expectedLandingSha,
    "d7b7e103af77fcbc196fa5fcefea9d6c3daae3c0bae44daf9336da4f7f8eae43",
    "Manifest expected sha256 must match frozen record"
  );
  assert.equal(typeof expectedLandingSha, "string");
  assert.equal(expectedLandingSha.length, 64, "LandingPage must have 64-character SHA256 string");

  // Đối chiếu App.tsx
  const expectedAppSha = manifestData.files["src/App.tsx"].sha256;
  assert.strictEqual(
    expectedAppSha,
    "4c2f8673a5def46780ad89b7520f9798b956fb1523bc27da7e80ead9b6033bb1",
    "Manifest expected sha256 must match frozen record"
  );
  assert.equal(typeof expectedAppSha, "string");
  assert.equal(expectedAppSha.length, 64, "App.tsx must have 64-character SHA256 string");
});
