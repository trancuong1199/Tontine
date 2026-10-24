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
// REQ-01: Hai Dải Quỹ Đạo Đồng Tâm Nét Đứt (Concentric Orbital Dashed Arcs)
// ============================================================================

test("TC-ORBIT-01 (AC-01.1): SVG Vector Elements for Left & Right Concentric Orbital Arcs with Dashed Pattern", () => {
  const landingSrc = readSource("src/components/landing/LandingPage.tsx");

  // 1. Kiểm tra container quỹ đạo có thuộc tính an toàn không che khuất tương tác
  assert.ok(
    landingSrc.includes("Hero Concentric Orbital Dashed Arcs & Constellation Ecosystem Icons (Task-026: Modeled from exec-44fb6d32 mockup)"),
    "LandingPage.tsx must document Hero Concentric Orbital Arcs"
  );
  assert.ok(
    landingSrc.includes('<div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">'),
    "Hero orbits container must use pointer-events-none, overflow-hidden, and aria-hidden='true'"
  );

  // 2. Kiểm tra Left Wing và Right Wing SVG definitions
  assert.ok(
    landingSrc.includes('{/* LEFT WING: Concentric Orbital Dashed Arcs & Icons */}'),
    "Must define Left Wing orbital section"
  );
  assert.ok(
    landingSrc.includes('{/* RIGHT WING: Concentric Orbital Dashed Arcs & Icons */}'),
    "Must define Right Wing orbital section"
  );

  // 3. Kiểm tra các cung quỹ đạo nét đứt đồng tâm với strokeDasharray
  assert.ok(
    landingSrc.includes('strokeDasharray="6, 8"'),
    "Must contain outer dashed orbital arc with strokeDasharray='6, 8'"
  );
  assert.ok(
    landingSrc.includes('strokeDasharray="5, 7"'),
    "Must contain inner dashed orbital arc with strokeDasharray='5, 7'"
  );
});

test("TC-ORBIT-02 (AC-01.2): Orbital Stroke Colors, Width, and Responsive Adaptation", () => {
  const landingSrc = readSource("src/components/landing/LandingPage.tsx");

  // 1. Kiểm tra màu sắc đường nét vàng hổ phách tinh xảo
  assert.ok(
    landingSrc.includes('stroke="rgba(245, 158, 11, 0.28)"'),
    "Outer orbital arc must use rgba(245, 158, 11, 0.28)"
  );
  assert.ok(
    landingSrc.includes('stroke="rgba(245, 158, 11, 0.22)"'),
    "Inner orbital arc must use rgba(245, 158, 11, 0.22)"
  );
  assert.ok(
    landingSrc.includes('strokeWidth="1.5"'),
    "Orbital arcs must have strokeWidth='1.5'"
  );

  // 2. Kiểm tra responsive adaptation classes
  assert.ok(
    landingSrc.includes("w-[340px] sm:w-[420px] lg:w-[500px] h-[650px] lg:h-[750px]"),
    "Orbital wings must scale responsively across screen sizes"
  );
  assert.ok(
    landingSrc.includes("opacity-75 sm:opacity-85 lg:opacity-100"),
    "Orbital wings must maintain subtle opacity on mobile and full opacity on desktop"
  );
});

// ============================================================================
// REQ-02: Bộ 4 Biểu Tượng Hệ Sinh Thái & Hạt Bụi Sao (Constellation Ecosystem Icons & Star Dust)
// ============================================================================

test("TC-CONSTELLATION-01 (AC-02.1): Left Wing Displays 4 Ecosystem Icons in Strict Order: PiggyBank -> Users -> RefreshCw -> Calendar", () => {
  const landingSrc = readSource("src/components/landing/LandingPage.tsx");

  const leftWingStart = landingSrc.indexOf('{/* LEFT WING: Concentric Orbital Dashed Arcs & Icons */}');
  const rightWingStart = landingSrc.indexOf('{/* RIGHT WING: Concentric Orbital Dashed Arcs & Icons */}');
  assert.ok(leftWingStart > 0 && rightWingStart > leftWingStart, "Must clearly separate Left Wing and Right Wing sections");

  const leftWingSection = landingSrc.slice(leftWingStart, rightWingStart);

  // 1. Kiểm tra 4 icon xuất hiện đầy đủ trong cánh trái
  const idxPiggy = leftWingSection.indexOf('{/* Left Icon 1: PiggyBank (Top Left) */}');
  const idxUsers = leftWingSection.indexOf('{/* Left Icon 2: Users (Middle Left - near headline) */}');
  const idxRefresh = leftWingSection.indexOf('{/* Left Icon 3: RefreshCw (Lower Middle Left - near CTA) */}');
  const idxCalendar = leftWingSection.indexOf('{/* Left Icon 4: Calendar (Bottom Left - near Metric 1) */}');

  assert.ok(idxPiggy > 0, "Left Wing must contain PiggyBank");
  assert.ok(idxUsers > idxPiggy, "Left Wing Users must come after PiggyBank");
  assert.ok(idxRefresh > idxUsers, "Left Wing RefreshCw must come after Users");
  assert.ok(idxCalendar > idxRefresh, "Left Wing Calendar must come after RefreshCw");

  // 2. Kiểm tra styling icon: text-amber-400/80 và stroke-[1.5]
  assert.ok(
    leftWingSection.includes('text-amber-400/80 drop-shadow-[0_0_10px_rgba(245,158,11,0.35)]'),
    "Left wing icons must have amber-400/80 color with glowing drop shadow"
  );
  assert.ok(
    leftWingSection.includes('className="stroke-[1.5]"'),
    "Left wing icons must use slender stroke-[1.5]"
  );
});

test("TC-CONSTELLATION-02 (AC-02.2): Right Wing Displays 4 Ecosystem Icons in Strict Order: RefreshCw -> Calendar -> Users -> PiggyBank", () => {
  const landingSrc = readSource("src/components/landing/LandingPage.tsx");

  const rightWingStart = landingSrc.indexOf('{/* RIGHT WING: Concentric Orbital Dashed Arcs & Icons */}');
  const rightWingEnd = landingSrc.indexOf('{/* Hero 3D Perspective Cyber Grid Floor');
  assert.ok(rightWingStart > 0 && rightWingEnd > rightWingStart, "Must clearly identify Right Wing section");

  const rightWingSection = landingSrc.slice(rightWingStart, rightWingEnd);

  // 1. Kiểm tra 4 icon xuất hiện đầy đủ trong cánh phải
  const idxRefresh = rightWingSection.indexOf('{/* Right Icon 1: RefreshCw (Top Right) */}');
  const idxCalendar = rightWingSection.indexOf('{/* Right Icon 2: Calendar (Middle Right - near headline) */}');
  const idxUsers = rightWingSection.indexOf('{/* Right Icon 3: Users (Lower Middle Right - near CTA) */}');
  const idxPiggy = rightWingSection.indexOf('{/* Right Icon 4: PiggyBank (Bottom Right - near Metric 3) */}');

  assert.ok(idxRefresh > 0, "Right Wing must contain RefreshCw");
  assert.ok(idxCalendar > idxRefresh, "Right Wing Calendar must come after RefreshCw");
  assert.ok(idxUsers > idxCalendar, "Right Wing Users must come after Calendar");
  assert.ok(idxPiggy > idxUsers, "Right Wing PiggyBank must come after Users");

  // 2. Kiểm tra styling icon
  assert.ok(
    rightWingSection.includes('text-amber-400/80 drop-shadow-[0_0_10px_rgba(245,158,11,0.35)]'),
    "Right wing icons must have amber-400/80 color with glowing drop shadow"
  );
  assert.ok(
    rightWingSection.includes('className="stroke-[1.5]"'),
    "Right wing icons must use slender stroke-[1.5]"
  );
});

test("TC-CONSTELLATION-03 (AC-02.3): Glowing Star Nodes along Orbital Curves", () => {
  const landingSrc = readSource("src/components/landing/LandingPage.tsx");

  // Kiểm tra sự hiện diện của các điểm sao vàng phát sáng trên cung quỹ đạo
  assert.ok(
    landingSrc.includes('fill="#fbbf24" className="animate-pulse"'),
    "Orbital arcs must include pulsing #fbbf24 glowing star nodes"
  );
  assert.ok(
    landingSrc.includes('fill="#f59e0b"'),
    "Orbital arcs must include golden #f59e0b nodes"
  );
});

// ============================================================================
// REQ-03: Sàn Lưới Viễn Cận 3D Tại Chân Hero Section (3D Perspective Cyber Grid Floor)
// ============================================================================

test("TC-FLOOR-01 (AC-03.1): 3D Perspective Cyber Grid Floor Position & 3D Transform Projection", () => {
  const landingSrc = readSource("src/components/landing/LandingPage.tsx");

  // 1. Kiểm tra vị trí sàn nằm ở đáy Hero Section
  assert.ok(
    landingSrc.includes("Hero 3D Perspective Cyber Grid Floor (Task-026: Futuristic Horizon Base Plane)"),
    "LandingPage.tsx must document 3D Perspective Cyber Grid Floor"
  );
  assert.ok(
    landingSrc.includes('className="absolute bottom-0 left-0 right-0 h-44 sm:h-56 pointer-events-none overflow-hidden z-0"'),
    "Floor container must be placed at absolute bottom-0 left-0 right-0 h-44 sm:h-56"
  );

  // 2. Kiểm tra phép biến đổi không gian 3 chiều [transform:perspective(500px)_rotateX(62deg)]
  assert.ok(
    landingSrc.includes("[transform:perspective(500px)_rotateX(62deg)]"),
    "Floor grid plane must apply 3D perspective projection with rotateX(62deg)"
  );
  assert.ok(
    landingSrc.includes("origin-bottom"),
    "Floor grid plane must use origin-bottom for horizon projection"
  );
});

test("TC-FLOOR-02 (AC-03.2): Floor Grid Styling, Amber Grid Lines, and Smooth Horizon Fadeout Mask", () => {
  const landingSrc = readSource("src/components/landing/LandingPage.tsx");

  // 1. Kiểm tra đường lưới màu vàng hổ phách mờ ảo
  assert.ok(
    landingSrc.includes("linear-gradient(to right, rgba(245, 158, 11, 0.16) 1px, transparent 1px)"),
    "Floor grid must have amber vertical perspective lines"
  );
  assert.ok(
    landingSrc.includes("linear-gradient(to bottom, rgba(245, 158, 11, 0.16) 1px, transparent 1px)"),
    "Floor grid must have amber horizontal perspective lines"
  );
  assert.ok(
    landingSrc.includes('backgroundSize: "40px 40px"'),
    "Floor grid cell size must be 40px by 40px"
  );

  // 2. Kiểm tra mặt nạ chuyển mờ dần lên trên (Fadeout mask)
  assert.ok(
    landingSrc.includes('maskImage: "linear-gradient(to top, rgba(0, 0, 0, 1) 15%, transparent 95%)"'),
    "Floor grid must include smooth upward fadeout maskImage"
  );
});

// ============================================================================
// REQ-04: Bảo Toàn Bất Biến Zero-Regression & Đảm Bảo Khả Năng Vận Hành
// ============================================================================

test("TC-MANIFEST-01 (AC-04.2): Manifest Verification for task-026 Frozen State and SHA-256 Record", () => {
  const manifestRaw = readSource("docs/manifests/task-026/manifest.json");
  const manifestData = JSON.parse(manifestRaw);

  assert.strictEqual(manifestData.taskId, "task-026", "Manifest taskId must be 'task-026'");
  assert.strictEqual(manifestData.status, "FROZEN", "Manifest status must be 'FROZEN'");
  assert.ok(manifestData.files["src/components/landing/LandingPage.tsx"], "Manifest must track LandingPage.tsx");

  const expectedSha256 = manifestData.files["src/components/landing/LandingPage.tsx"].sha256;
  assert.strictEqual(
    expectedSha256,
    "28a6638c45caceb11b97c1dc71039d267f14e0deada091d9868935d4facb8204",
    "Manifest expected sha256 must match frozen record"
  );
  assert.equal(typeof expectedSha256, "string");
  assert.equal(expectedSha256.length, 64, "Manifest must have 64-character SHA256 string");
});
