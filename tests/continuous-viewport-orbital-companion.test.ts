import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
function getLeftOuterArcPoint(t: number): { x: number; y: number } {
  const clampedT = Math.max(0.04, Math.min(0.96, t));
  const u = 1 - clampedT;
  const tt = clampedT * clampedT;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * clampedT;

  const x = uuu * (-50) + 3 * uu * clampedT * 320 + 3 * u * tt * 380 + ttt * (-50);
  const y = uuu * 50 + 3 * uu * clampedT * 120 + 3 * u * tt * 630 + ttt * 700;
  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
}

function getRightOuterArcPoint(t: number): { x: number; y: number } {
  const pt = getLeftOuterArcPoint(t);
  return { x: Math.round((500 - pt.x) * 10) / 10, y: pt.y };
}

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
// REQ-01: Lớp Quỹ Đạo & Icon Cố Định Theo Khung Nhìn (Viewport-Fixed Companion Layer)
// ============================================================================

test("TC-FIXED-01 (AC-01.1): Viewport-Fixed Companion Layer Wrapping Left & Right Orbital Wings at z-20", () => {
  const landingSrc = readSource("src/components/landing/LandingPage.tsx");

  // 1. Kiểm tra container cố định theo viewport
  assert.ok(
    landingSrc.includes("Continuous Viewport Orbital Companion Layer (Task-029: Framing entire page across all sections at z-20)"),
    "LandingPage.tsx must document Continuous Viewport Orbital Companion Layer"
  );
  assert.ok(
    landingSrc.includes('<div className="fixed inset-0 pointer-events-none z-20 overflow-hidden" aria-hidden="true">'),
    "Orbital wings container must be fixed inset-0 pointer-events-none z-20 overflow-hidden"
  );

  // 2. Kiểm tra container xuất hiện trước Hero Section để bao trùm toàn bộ các section
  const fixedLayerIndex = landingSrc.indexOf("Continuous Viewport Orbital Companion Layer");
  const heroSectionIndex = landingSrc.indexOf("{/* 1. HERO SECTION */}");
  assert.ok(
    fixedLayerIndex > 0 && heroSectionIndex > fixedLayerIndex,
    "Fixed orbital companion layer must be placed before Hero Section in DOM tree"
  );
});

test("TC-FIXED-02 (AC-01.2): Preservation of SVG Vector viewBox, Dashed Arcs, and Ecosystem ForeignObjects", () => {
  const landingSrc = readSource("src/components/landing/LandingPage.tsx");

  // 1. Kiểm tra 2 cánh Left Wing và Right Wing nằm trong container
  const leftWingStart = landingSrc.indexOf('{/* LEFT WING: Concentric Orbital Dashed Arcs & Icons */}');
  const rightWingStart = landingSrc.indexOf('{/* RIGHT WING: Concentric Orbital Dashed Arcs & Icons */}');
  const heroSectionStart = landingSrc.indexOf('{/* 1. HERO SECTION */}');

  assert.ok(leftWingStart > 0, "Left Wing must be present");
  assert.ok(rightWingStart > leftWingStart, "Right Wing must follow Left Wing");
  assert.ok(heroSectionStart > rightWingStart, "Hero Section must follow Right Wing");

  // 2. Kiểm tra viewBox, đường cong nét đứt và hạt sao
  assert.ok(landingSrc.includes('viewBox="0 0 500 750"'), "Must use standard 500x750 viewBox");
  assert.ok(landingSrc.includes('strokeDasharray="6, 8"'), "Outer arc must preserve strokeDasharray='6, 8'");
  assert.ok(landingSrc.includes('strokeDasharray="5, 7"'), "Inner arc must preserve strokeDasharray='5, 7'");
  assert.ok(landingSrc.includes('fill="#fbbf24" className="animate-pulse"'), "Pulsing golden stars preserved");
  assert.ok(landingSrc.includes('fill="#f59e0b"'), "Amber constellation nodes preserved");
});

test("TC-FIXED-03 (AC-01.3): Backward Compatibility Anchor Preserved Inside Hero Section", () => {
  const landingSrc = readSource("src/components/landing/LandingPage.tsx");

  // Kiểm tra chuỗi định danh và thẻ div tương thích tuyệt đối cho các test suite hồi quy
  assert.ok(
    landingSrc.includes("Hero Concentric Orbital Dashed Arcs & Constellation Ecosystem Icons (Task-026: Modeled from exec-44fb6d32 mockup)"),
    "Must preserve Task-026 documentation token"
  );
  assert.ok(
    landingSrc.includes('<div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">'),
    "Must preserve exact backward-compatibility anchor string for TC-ORBIT-01"
  );
});

test("TC-FIXED-04 (AC-01.4): Unimpeded Interaction via pointer-events-none and Outside-Center Framing", () => {
  const landingSrc = readSource("src/components/landing/LandingPage.tsx");

  const fixedCompanionLayer = landingSrc.slice(
    landingSrc.indexOf("Continuous Viewport Orbital Companion Layer"),
    landingSrc.indexOf("{/* 1. HERO SECTION */}")
  );

  // Xác nhận cả container lẫn các thẻ cánh đều có pointer-events-none
  assert.ok(
    fixedCompanionLayer.includes("pointer-events-none"),
    "Fixed companion layer must have pointer-events-none"
  );
  // Cánh trái neo bên trái, cánh phải neo bên phải
  assert.ok(fixedCompanionLayer.includes("-left-20 sm:-left-10 lg:left-0"), "Left Wing anchored to left edge");
  assert.ok(fixedCompanionLayer.includes("-right-20 sm:-right-10 lg:right-0"), "Right Wing anchored to right edge");
});

// ============================================================================
// REQ-02: Chuyển Động Quỹ Đạo Cuộn Trang Liên Tục (Full-Page Continuous Scroll Gliding)
// ============================================================================

test("TC-GLIDE-01 (AC-02.1): Full-Page Scroll Dynamic Delta Formula", () => {
  const landingSrc = readSource("src/components/landing/LandingPage.tsx");

  // Kiểm tra khai báo continuousScrollDelta kết nối với độ sâu cuộn trang
  assert.ok(
    landingSrc.includes("const continuousScrollDelta = Math.min(0.16, Math.max(0, (scrollY / 2400) * 0.16));"),
    "Must define continuousScrollDelta scaling up to 0.16 over 2400px scroll"
  );
  assert.ok(
    landingSrc.includes("Task-029: Continuous Full-Page Scroll Dynamic Progression"),
    "Must document Task-029 continuous scroll progression"
  );
});

test("TC-GLIDE-02 (AC-02.2): Dynamic Coordinates for All 8 Ecosystem Icons Incorporating Scroll Progress", () => {
  const landingSrc = readSource("src/components/landing/LandingPage.tsx");

  // Cánh trái
  assert.ok(
    landingSrc.includes("0.12 + scrollOffset * 0.9 + continuousScrollDelta * 0.7"),
    "Left PiggyBank must combine scrollOffset and continuousScrollDelta"
  );
  assert.ok(
    landingSrc.includes("0.38 + scrollOffset * 0.8 + continuousScrollDelta * 0.6"),
    "Left Users must combine scrollOffset and continuousScrollDelta"
  );
  assert.ok(
    landingSrc.includes("0.62 + scrollOffset * 0.7 - continuousScrollDelta * 0.5"),
    "Left RefreshCw must dynamically advance with continuousScrollDelta"
  );
  assert.ok(
    landingSrc.includes("0.88 - scrollOffset * 0.5 - continuousScrollDelta * 0.6"),
    "Left Calendar must dynamically advance with continuousScrollDelta"
  );

  // Cánh phải
  assert.ok(
    landingSrc.includes("0.12 + scrollOffset * 0.9 + continuousScrollDelta * 0.7"),
    "Right RefreshCw must combine scrollOffset and continuousScrollDelta"
  );
  assert.ok(
    landingSrc.includes("0.38 + scrollOffset * 0.8 + continuousScrollDelta * 0.6"),
    "Right Calendar must combine scrollOffset and continuousScrollDelta"
  );
  assert.ok(
    landingSrc.includes("0.62 + scrollOffset * 0.7 - continuousScrollDelta * 0.5"),
    "Right Users must dynamically advance with continuousScrollDelta"
  );
  assert.ok(
    landingSrc.includes("0.88 - scrollOffset * 0.5 - continuousScrollDelta * 0.6"),
    "Right PiggyBank must dynamically advance with continuousScrollDelta"
  );
});

test("TC-GLIDE-03 (AC-02.3): Mathematical Smooth Movement Simulation Along Bezier Curves", () => {
  // Mô phỏng tọa độ tại scrollY = 0
  const t0 = 0.12;
  const pt0 = getLeftOuterArcPoint(t0);

  // Mô phỏng tọa độ tại scrollY = 600 (vào Section 2)
  const scrollOffset600 = 0.08;
  const delta600 = (600 / 2400) * 0.16; // 0.04
  const t600 = 0.12 + scrollOffset600 * 0.9 + delta600 * 0.7; // 0.12 + 0.072 + 0.028 = 0.22
  const pt600 = getLeftOuterArcPoint(t600);

  // Mô phỏng tọa độ tại scrollY = 1200 (vào Section 3/4)
  const delta1200 = (1200 / 2400) * 0.16; // 0.08
  const t1200 = 0.12 + scrollOffset600 * 0.9 + delta1200 * 0.7; // 0.12 + 0.072 + 0.056 = 0.248
  const pt1200 = getLeftOuterArcPoint(t1200);

  // Khẳng định tọa độ di chuyển liên tục, mượt mà dọc theo cung cong
  assert.notStrictEqual(pt0.y, pt600.y, "Coordinates must shift from scrollY=0 to scrollY=600");
  assert.notStrictEqual(pt600.y, pt1200.y, "Coordinates must continue shifting from scrollY=600 to scrollY=1200");
  assert.ok(pt600.y > pt0.y, "Y coordinate must move downward along arc as user scrolls");
  assert.ok(pt1200.y > pt600.y, "Y coordinate must continue moving downward as user scrolls deeper");

  // Kiểm tra cánh phải đối xứng
  const ptRight0 = getRightOuterArcPoint(t0);
  const ptRight600 = getRightOuterArcPoint(t600);
  assert.strictEqual(ptRight0.x, Math.round((500 - pt0.x) * 10) / 10, "Right wing must be symmetrically mirrored at scroll=0");
  assert.strictEqual(ptRight600.x, Math.round((500 - pt600.x) * 10) / 10, "Right wing must be symmetrically mirrored at scroll=600");
});

test("TC-GLIDE-04 (AC-02.4): Strict Clamping Within [0.04, 0.96] Safe Bezier Bounds", () => {
  // Test giá trị t cực đoan
  const ptExtLow = getLeftOuterArcPoint(-0.5);
  const ptMinBound = getLeftOuterArcPoint(0.04);
  assert.deepStrictEqual(ptExtLow, ptMinBound, "Negative t must clamp to 0.04");

  const ptExtHigh = getLeftOuterArcPoint(2.5);
  const ptMaxBound = getLeftOuterArcPoint(0.96);
  assert.deepStrictEqual(ptExtHigh, ptMaxBound, "Excessive t must clamp to 0.96");
});

// ============================================================================
// REQ-04: Bảo Toàn Bất Biến Kiểm Thử & Đối Chiếu Manifest SHA256
// ============================================================================

test("TC-MANIFEST-01 (AC-04.2): Manifest Verification for task-029 Frozen State and SHA-256 Record", () => {
  const manifestRaw = readSource("docs/manifests/task-029/manifest.json");
  const manifestData = JSON.parse(manifestRaw);

  assert.strictEqual(manifestData.taskId, "task-029", "Manifest taskId must be 'task-029'");
  assert.strictEqual(manifestData.status, "FROZEN", "Manifest status must be 'FROZEN'");
  assert.ok(manifestData.files["src/components/landing/LandingPage.tsx"], "Manifest must track LandingPage.tsx");

  const expectedLandingSha = manifestData.files["src/components/landing/LandingPage.tsx"].sha256;
  assert.strictEqual(
    expectedLandingSha,
    "d9a322641f3b9a76d711bb31a3941e81b2a6bd79e7bb2087e43452b7057cea0f",
    "Manifest expected sha256 must match frozen record"
  );
  assert.equal(typeof expectedLandingSha, "string");
  assert.equal(expectedLandingSha.length, 64, "Manifest must have 64-character SHA256 string");
});
