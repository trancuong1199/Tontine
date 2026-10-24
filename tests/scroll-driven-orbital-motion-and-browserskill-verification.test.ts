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
// REQ-01: Khóa Tâm Toán Học Bezier Chuẩn Tuyệt Đối Trên Cung Quỹ Đạo
// ============================================================================

test("TC-LOCK-01 (AC-01.1): Exported Bezier Calculation Functions in LandingPage.tsx", () => {
  const landingSrc = readSource("src/components/landing/LandingPage.tsx");

  // Kiểm tra hàm getLeftOuterArcPoint và getRightOuterArcPoint
  assert.ok(
    landingSrc.includes("export function getLeftOuterArcPoint(t: number): { x: number; y: number }"),
    "LandingPage.tsx must export getLeftOuterArcPoint"
  );
  assert.ok(
    landingSrc.includes("export function getRightOuterArcPoint(t: number): { x: number; y: number }"),
    "LandingPage.tsx must export getRightOuterArcPoint"
  );

  // Kiểm tra công thức Bezier Cubic bậc 3 chính xác với các điểm kiểm soát M -50,50 C 320,120 380,630 -50,700
  assert.ok(
    landingSrc.includes("uuu * (-50) + 3 * uu * clampedT * 320 + 3 * u * tt * 380 + ttt * (-50)"),
    "Must calculate cubic Bezier X using control points -50, 320, 380, -50"
  );
  assert.ok(
    landingSrc.includes("uuu * 50 + 3 * uu * clampedT * 120 + 3 * u * tt * 630 + ttt * 700"),
    "Must calculate cubic Bezier Y using control points 50, 120, 630, 700"
  );
  assert.ok(
    landingSrc.includes("(500 - pt.x)"),
    "Right outer arc must be symmetrically mirrored around X = 250 (500 - pt.x)"
  );
});

test("TC-LOCK-02 (AC-01.2): Dynamic Parametric Coordinates Bound to All 8 Ecosystem Icons", () => {
  const landingSrc = readSource("src/components/landing/LandingPage.tsx");

  // Cánh trái: 4 icon dùng ptLeft*
  assert.ok(
    landingSrc.includes("const ptLeftPiggy = getLeftOuterArcPoint"),
    "Must define ptLeftPiggy"
  );
  assert.ok(
    landingSrc.includes("const ptLeftUsers = getLeftOuterArcPoint"),
    "Must define ptLeftUsers"
  );
  assert.ok(
    landingSrc.includes("const ptLeftRefresh = getLeftOuterArcPoint"),
    "Must define ptLeftRefresh"
  );
  assert.ok(
    landingSrc.includes("const ptLeftCalendar = getLeftOuterArcPoint"),
    "Must define ptLeftCalendar"
  );

  // Cánh phải: 4 icon dùng ptRight*
  assert.ok(
    landingSrc.includes("const ptRightRefresh = getRightOuterArcPoint"),
    "Must define ptRightRefresh"
  );
  assert.ok(
    landingSrc.includes("const ptRightCalendar = getRightOuterArcPoint"),
    "Must define ptRightCalendar"
  );
  assert.ok(
    landingSrc.includes("const ptRightUsers = getRightOuterArcPoint"),
    "Must define ptRightUsers"
  );
  assert.ok(
    landingSrc.includes("const ptRightPiggy = getRightOuterArcPoint"),
    "Must define ptRightPiggy"
  );

  // Kiểm tra foreignObject được gán x, y theo ptLeft* và ptRight*
  assert.ok(
    landingSrc.includes("x={ptLeftPiggy.x - 14}") && landingSrc.includes("y={ptLeftPiggy.y - 14}"),
    "Left PiggyBank must use ptLeftPiggy"
  );
  assert.ok(
    landingSrc.includes("x={ptRightRefresh.x - 13}") && landingSrc.includes("y={ptRightRefresh.y - 13}"),
    "Right RefreshCw must use ptRightRefresh"
  );
});

// ============================================================================
// REQ-02: Hiệu Ứng Chuyển Động Dọc Quỹ Đạo Theo Cuộn Trang (Scroll-Driven Motion)
// ============================================================================

test("TC-SCROLL-MOTION-01 (AC-02.1): Scroll Listener and Dynamic Scroll Offset Calculation", () => {
  const landingSrc = readSource("src/components/landing/LandingPage.tsx");

  // Kiểm tra state scrollY và listener
  assert.ok(
    landingSrc.includes("const [scrollY, setScrollY] = useState(0);"),
    "Must maintain scrollY state in LandingPage"
  );
  assert.ok(
    landingSrc.includes('window.addEventListener("scroll", handleScroll, { passive: true });'),
    "Must attach passive scroll event listener"
  );
  assert.ok(
    landingSrc.includes("window.requestAnimationFrame"),
    "Must throttle scroll updates with requestAnimationFrame"
  );
});

test("TC-SCROLL-MOTION-02 (AC-02.2): Parametric t Offset Along Bezier Trajectory During Scroll", () => {
  const landingSrc = readSource("src/components/landing/LandingPage.tsx");

  assert.ok(
    landingSrc.includes("const scrollOffset = Math.min(0.08, Math.max(0, (scrollY / 600) * 0.08));"),
    "Must compute smooth scroll offset factor"
  );
  assert.ok(
    landingSrc.includes("0.12 + scrollOffset * 0.9"),
    "PiggyBank t parameter must advance along curve on scroll"
  );
  assert.ok(
    landingSrc.includes("0.38 + scrollOffset * 0.8"),
    "Users t parameter must advance along curve on scroll"
  );
});

test("TC-SCROLL-MOTION-03 (AC-02.3): Visual Transition Class for Smooth Gliding", () => {
  const landingSrc = readSource("src/components/landing/LandingPage.tsx");

  // Kiểm tra foreignObject chứa transition để icon lướt mượt mà
  assert.ok(
    landingSrc.includes("transition-all duration-75 ease-out"),
    "foreignObject elements must feature smooth easing transition"
  );
});

// ============================================================================
// REQ-03 & REQ-04: Bảo Toàn Bất Biến Kiểm Thử & Đối Chiếu Manifest SHA256
// ============================================================================

test("TC-MANIFEST-01 (AC-04.2): Manifest Verification for task-028 Frozen State and SHA-256 Record", () => {
  const manifestRaw = readSource("docs/manifests/task-028/manifest.json");
  const manifestData = JSON.parse(manifestRaw);

  assert.strictEqual(manifestData.taskId, "task-028", "Manifest taskId must be 'task-028'");
  assert.strictEqual(manifestData.status, "FROZEN", "Manifest status must be 'FROZEN'");
  assert.ok(manifestData.files["src/components/landing/LandingPage.tsx"], "Manifest must track LandingPage.tsx");

  const expectedLandingSha = manifestData.files["src/components/landing/LandingPage.tsx"].sha256;
  assert.strictEqual(
    expectedLandingSha,
    "0db8f5dd0fb67b857309efe8236ea405a8d8cb4ff633f0f3be693a44d161e0e9",
    "Manifest expected sha256 must match frozen record"
  );
  assert.equal(typeof expectedLandingSha, "string");
  assert.equal(expectedLandingSha.length, 64, "Manifest must have 64-character SHA256 string");
});
