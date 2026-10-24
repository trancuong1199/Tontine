import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function readSource(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

// Pure Bezier calculation helper for mathematical verification
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

// ============================================================================
// REQ-01: Bộ Đếm Cuộn & Tính Toán Tọa Độ Động Trong App.tsx
// ============================================================================

test("TC-MOTION-01 (AC-01.1): src/App.tsx khai báo scrollY state và đăng ký scroll listener an toàn với requestAnimationFrame", () => {
  const appSrc = readSource("src/App.tsx");

  assert.ok(
    appSrc.includes("const [scrollY, setScrollY] = useState(0);"),
    "App.tsx must declare scrollY state"
  );
  assert.ok(
    appSrc.includes("window.requestAnimationFrame(() => {") &&
    appSrc.includes("setScrollY(window.scrollY);"),
    "App.tsx must batch scroll updates using requestAnimationFrame"
  );
  assert.ok(
    appSrc.includes('window.addEventListener("scroll", handleScroll, { passive: true });'),
    "App.tsx must register scroll listener with passive: true for smooth 60fps"
  );
  assert.ok(
    appSrc.includes('window.removeEventListener("scroll", handleScroll);'),
    "App.tsx must clean up scroll listener on unmount"
  );
});

test("TC-MOTION-02 (AC-01.2 & AC-01.3): src/App.tsx tính toán scrollOffset, continuousScrollDelta và 8 tọa độ động khóa đường cong Bezier", () => {
  const appSrc = readSource("src/App.tsx");

  assert.ok(
    appSrc.includes("const scrollOffset = Math.min(0.08, Math.max(0, (scrollY / 600) * 0.08));"),
    "App.tsx must compute scrollOffset factor"
  );
  assert.ok(
    appSrc.includes("const continuousScrollDelta = Math.min(0.16, Math.max(0, (scrollY / 2400) * 0.16));"),
    "App.tsx must compute continuousScrollDelta progression"
  );

  // Left Wing dynamic points
  assert.ok(
    appSrc.includes("const ptAppLeftPiggy = getLeftOuterArcPoint(0.12 + scrollOffset * 0.9 + continuousScrollDelta * 0.7);"),
    "App.tsx must calculate ptAppLeftPiggy"
  );
  assert.ok(
    appSrc.includes("const ptAppLeftUsers = getLeftOuterArcPoint(0.38 + scrollOffset * 0.8 + continuousScrollDelta * 0.6);"),
    "App.tsx must calculate ptAppLeftUsers"
  );
  assert.ok(
    appSrc.includes("const ptAppLeftRefresh = getLeftOuterArcPoint(0.62 + scrollOffset * 0.7 - continuousScrollDelta * 0.5);"),
    "App.tsx must calculate ptAppLeftRefresh"
  );
  assert.ok(
    appSrc.includes("const ptAppLeftCalendar = getLeftOuterArcPoint(0.88 - scrollOffset * 0.5 - continuousScrollDelta * 0.6);"),
    "App.tsx must calculate ptAppLeftCalendar"
  );

  // Right Wing dynamic points
  assert.ok(
    appSrc.includes("const ptAppRightRefresh = getRightOuterArcPoint(0.12 + scrollOffset * 0.9 + continuousScrollDelta * 0.7);"),
    "App.tsx must calculate ptAppRightRefresh"
  );
  assert.ok(
    appSrc.includes("const ptAppRightCalendar = getRightOuterArcPoint(0.38 + scrollOffset * 0.8 + continuousScrollDelta * 0.6);"),
    "App.tsx must calculate ptAppRightCalendar"
  );
  assert.ok(
    appSrc.includes("const ptAppRightUsers = getRightOuterArcPoint(0.62 + scrollOffset * 0.7 - continuousScrollDelta * 0.5);"),
    "App.tsx must calculate ptAppRightUsers"
  );
  assert.ok(
    appSrc.includes("const ptAppRightPiggy = getRightOuterArcPoint(0.88 - scrollOffset * 0.5 - continuousScrollDelta * 0.6);"),
    "App.tsx must calculate ptAppRightPiggy"
  );
});

// ============================================================================
// REQ-02: Gắn Chuyển Động Vào Các Icon Hệ Sinh Thái Của Saving Clubs
// ============================================================================

test("TC-MOTION-03 (AC-02.1 & AC-02.2): Các thẻ foreignObject trong App.tsx sử dụng tọa độ động và class transition-all duration-75 ease-out", () => {
  const appSrc = readSource("src/App.tsx");

  // Left Wing dynamic bindings
  assert.ok(
    appSrc.includes("x={ptAppLeftPiggy.x - 14}") && appSrc.includes("y={ptAppLeftPiggy.y - 14}"),
    "Left PiggyBank must bind to ptAppLeftPiggy"
  );
  assert.ok(
    appSrc.includes("x={ptAppLeftUsers.x - 14}") && appSrc.includes("y={ptAppLeftUsers.y - 14}"),
    "Left Users must bind to ptAppLeftUsers"
  );
  assert.ok(
    appSrc.includes("x={ptAppLeftRefresh.x - 13}") && appSrc.includes("y={ptAppLeftRefresh.y - 13}"),
    "Left RefreshCw must bind to ptAppLeftRefresh"
  );
  assert.ok(
    appSrc.includes("x={ptAppLeftCalendar.x - 14}") && appSrc.includes("y={ptAppLeftCalendar.y - 14}"),
    "Left Calendar must bind to ptAppLeftCalendar"
  );

  // Right Wing dynamic bindings
  assert.ok(
    appSrc.includes("x={ptAppRightRefresh.x - 13}") && appSrc.includes("y={ptAppRightRefresh.y - 13}"),
    "Right RefreshCw must bind to ptAppRightRefresh"
  );
  assert.ok(
    appSrc.includes("x={ptAppRightCalendar.x - 14}") && appSrc.includes("y={ptAppRightCalendar.y - 14}"),
    "Right Calendar must bind to ptAppRightCalendar"
  );
  assert.ok(
    appSrc.includes("x={ptAppRightUsers.x - 14}") && appSrc.includes("y={ptAppRightUsers.y - 14}"),
    "Right Users must bind to ptAppRightUsers"
  );
  assert.ok(
    appSrc.includes("x={ptAppRightPiggy.x - 14}") && appSrc.includes("y={ptAppRightPiggy.y - 14}"),
    "Right PiggyBank must bind to ptAppRightPiggy"
  );

  // Smooth CSS Transition
  const transitionMatches = appSrc.match(/className="overflow-visible transition-all duration-75 ease-out"/g);
  assert.ok(
    transitionMatches && transitionMatches.length >= 8,
    "App.tsx must include transition-all duration-75 ease-out on all 8 foreignObjects"
  );
});

test("TC-MOTION-04 (AC-02.3): Cấu trúc cánh trang trí duy trì pointer-events-none và animate-pulse", () => {
  const appSrc = readSource("src/App.tsx");

  assert.ok(
    appSrc.includes("pointer-events-none"),
    "Wings container must have pointer-events-none to prevent blocking UI"
  );
  assert.ok(
    appSrc.includes('className="animate-pulse"'),
    "Star nodes must include animate-pulse for ambient twinkling"
  );
});

test("TC-MOTION-05 (AC-04.1): Toán học chuyển động Bezier: Tọa độ di chuyển mượt mà khi scrollY thay đổi", () => {
  // At scrollY = 0
  const pt0 = getLeftOuterArcPoint(0.12);
  // At scrollY = 600: scrollOffset = 0.08, continuousScrollDelta = 0.04
  const scrollOffset = 0.08;
  const continuousScrollDelta = 0.04;
  const pt600 = getLeftOuterArcPoint(0.12 + scrollOffset * 0.9 + continuousScrollDelta * 0.7);

  // Assert points are different and glide along the curve
  assert.notDeepEqual(pt0, pt600, "Coordinates must shift as user scrolls");
  assert.ok(pt600.y > pt0.y, "Y coordinate must glide downwards as user scrolls down");
  assert.ok(pt600.x !== pt0.x, "X coordinate must follow Bezier curvature");
});

test("TC-MANIFEST-01: File manifest docs/manifests/task-031/manifest.json tồn tại và chứa mã băm hợp lệ", () => {
  const manifestPath = path.resolve(process.cwd(), "docs/manifests/task-031/manifest.json");
  assert.ok(fs.existsSync(manifestPath), "Manifest file docs/manifests/task-031/manifest.json must exist");

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert.equal(manifest.taskId, "task-031", "Manifest taskId must be task-031");
  assert.ok(manifest.files["src/App.tsx"], "src/App.tsx must be recorded in manifest");
  assert.equal(typeof manifest.files["src/App.tsx"].sha256, "string", "SHA256 must be a string");
  assert.equal(manifest.files["src/App.tsx"].sha256.length, 64, "SHA256 must be exactly 64 hex characters");
});
