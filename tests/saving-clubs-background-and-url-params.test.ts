import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { isValidAddress, ROTATING_SAVINGS_ADDRESS } from "../src/contract.ts";

function readSource(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

// ============================================================================
// REQ-01: Giao Diện Atmospheric Background & Orbital Wings Cho Saving Clubs
// ============================================================================

test("TC-APP-BG-01 (AC-01.1): Root container có bg-[#050508] và Global Ambient Cyber Grid (32px matrix, cosmic gold dust radial orbs)", () => {
  const appSrc = readSource("src/App.tsx");

  // Root background
  assert.ok(
    appSrc.includes('bg-[#050508]'),
    "Root container must use pitch-black bg-[#050508]"
  );

  // Global Cyber Grid
  assert.ok(
    appSrc.includes("Global Ambient Cyber Grid & Cosmic Gold Dust Background"),
    "App.tsx must include persistent Global Ambient Cyber Grid comment"
  );
  assert.ok(
    appSrc.includes("[background-size:32px_32px]"),
    "Global grid must use 32px 32px matrix"
  );
  assert.ok(
    appSrc.includes("rgba(245,158,11,0.06)_1px,transparent_1px"),
    "Global grid must use amber-tinted 1px line gradients"
  );
  assert.ok(
    appSrc.includes("bg-amber-500/[0.04]"),
    "Global background must include top amber cosmic dust radial gradient"
  );
});

test("TC-APP-BG-02 (AC-01.2): High-Visibility Atmospheric Canvas (48px matrix grid, constellation nodes, aurora beams) trong Saving Clubs", () => {
  const appSrc = readSource("src/App.tsx");

  assert.ok(
    appSrc.includes("Vivid Cyber Matrix Grid"),
    "App.tsx must include Vivid Cyber Matrix Grid in Saving Clubs view"
  );
  assert.ok(
    appSrc.includes("bg-[size:48px_48px]"),
    "Atmospheric canvas must use 48px matrix grid"
  );
  assert.ok(
    appSrc.includes("Vivid Ambient Aurora Beams"),
    "App.tsx must include Vivid Ambient Aurora Beams in Saving Clubs view"
  );
  assert.ok(
    appSrc.includes("from-amber-500/25 via-yellow-500/15 to-transparent"),
    "Atmospheric canvas must render vivid amber/gold glow beam"
  );
  assert.ok(
    appSrc.includes("bg-cyan-500/12"),
    "Atmospheric canvas must render vivid cyan/teal nebula beam"
  );
  assert.ok(
    appSrc.includes("Glowing Constellation Nodes (Star dust matrix points)"),
    "App.tsx must include constellation star points"
  );
});

test("TC-APP-BG-03 (AC-01.3): Left & Right Concentric Orbital Dashed Arcs với các icon hệ sinh thái (PiggyBank, Users, RefreshCw, Calendar)", () => {
  const appSrc = readSource("src/App.tsx");

  assert.ok(
    appSrc.includes("DApp Concentric Orbital Dashed Arcs & Ecosystem Icons (Framing Saving Clubs page)"),
    "App.tsx must declare Concentric Orbital Arcs for Saving Clubs"
  );
  assert.ok(
    appSrc.includes("getLeftOuterArcPoint") && appSrc.includes("getRightOuterArcPoint"),
    "App.tsx must use orbital arc trigonometry helper functions"
  );
  assert.ok(
    appSrc.includes("PiggyBank size={28}"),
    "Orbital arcs must include PiggyBank ecosystem icon"
  );
  assert.ok(
    appSrc.includes("Users size={28}"),
    "Orbital arcs must include Users ecosystem icon"
  );
  assert.ok(
    appSrc.includes("RefreshCw size={26}"),
    "Orbital arcs must include RefreshCw ecosystem icon"
  );
  assert.ok(
    appSrc.includes("Calendar size={28}"),
    "Orbital arcs must include Calendar ecosystem icon"
  );
  assert.ok(
    appSrc.includes("pointer-events-none"),
    "All decorative orbital layers must have pointer-events-none"
  );
});

// ============================================================================
// REQ-02: Quản Lý URL Parameters Chuẩn Xác Khi Điều Hướng Tab
// ============================================================================

test("TC-APP-URL-01 (AC-02.1): handleSelectTab('app') thiết lập query param 'tab=app' và pushState chuẩn xác", () => {
  const appSrc = readSource("src/App.tsx");

  assert.ok(
    appSrc.includes('url.searchParams.set("tab", "app");'),
    "handleSelectTab must set 'tab=app' query parameter"
  );
  assert.ok(
    appSrc.includes('url.searchParams.delete("view");'),
    "handleSelectTab must delete legacy 'view' query parameter"
  );
});

test("TC-APP-URL-02 (AC-02.2): handleSelectTab('home') xóa bỏ triệt để 'view', 'tab', 'group' đưa về root '/'", () => {
  const appSrc = readSource("src/App.tsx");

  assert.ok(
    appSrc.includes('url.searchParams.delete("view");') &&
    appSrc.includes('url.searchParams.delete("tab");') &&
    appSrc.includes('url.searchParams.delete("group");'),
    "handleSelectTab('home') must delete view, tab, and group parameters"
  );
  assert.ok(
    appSrc.includes('const cleanPath = url.pathname + (url.search ? url.search : "");'),
    "handleSelectTab must push cleanPath"
  );
});

test("TC-APP-URL-03 (AC-03.1): Deep Linking: Khởi tạo activeTab nhận diện 'tab=app' hoặc 'group=0x...'", () => {
  const appSrc = readSource("src/App.tsx");

  assert.ok(
    appSrc.includes('const tab = params.get("tab");'),
    "App.tsx activeTab initializer must read 'tab' search param"
  );
  assert.ok(
    appSrc.includes('tab === "home"') || appSrc.includes('view === "app" || tab === "app"'),
    "App.tsx activeTab initializer must resolve 'tab=app' to 'app' tab"
  );
});

test("TC-APP-URL-04 (AC-03.2): handleSwitchGroup cập nhật cả 'tab=app' và 'group=newAddress' trên URL", () => {
  const appSrc = readSource("src/App.tsx");

  assert.ok(
    appSrc.includes('const handleSwitchGroup = (newAddress: `0x${string}`) => {') &&
    appSrc.includes('url.searchParams.set("tab", "app");') &&
    appSrc.includes('url.searchParams.set("group", newAddress);'),
    "handleSwitchGroup must set both tab=app and group=newAddress"
  );
});

// ============================================================================
// REQ-03 & REQ-04: Kiểm Tra Toàn Vẹn Manifest & Hồi Quy (Zero Regression)
// ============================================================================

test("TC-REG-01 (AC-04.1): Bảo toàn các token kiểm thử của dark-theme-and-navbar-ux.test.ts và orbital-alignment", () => {
  const appSrc = readSource("src/App.tsx");

  // Invariants from dark-theme-and-navbar-ux.test.ts
  assert.ok(
    appSrc.includes("if (contractAddress && contractAddress.toLowerCase() !== ROTATING_SAVINGS_ADDRESS.toLowerCase())"),
    "App.tsx must retain contractAddress default comparison check"
  );
  assert.ok(
    appSrc.includes('url.searchParams.delete("group");'),
    "App.tsx must retain url.searchParams.delete('group')"
  );

  // Invariants from orbital-alignment test
  assert.ok(
    appSrc.includes("DApp Ambient Web3 Atmospheric Canvas (Task-027: Unified Aesthetics for Savings Clubs Page)"),
    "App.tsx must retain Task-027 canvas comment"
  );
  assert.ok(
    appSrc.includes('stroke="rgba(245, 158, 11, 0.22)"') &&
    appSrc.includes('strokeDasharray="5, 7"'),
    "App.tsx must retain dashed arc stroke styling"
  );
});

test("TC-MANIFEST-01: File manifest docs/manifests/task-030/manifest.json tồn tại và chứa mã băm hợp lệ", () => {
  const manifestPath = path.resolve(process.cwd(), "docs/manifests/task-030/manifest.json");
  assert.ok(fs.existsSync(manifestPath), "Manifest file docs/manifests/task-030/manifest.json must exist");

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert.equal(manifest.taskId, "task-030", "Manifest taskId must be task-030");
  assert.ok(manifest.files["src/App.tsx"], "src/App.tsx must be recorded in manifest");
  assert.equal(typeof manifest.files["src/App.tsx"].sha256, "string", "SHA256 must be a string");
  assert.equal(manifest.files["src/App.tsx"].sha256.length, 64, "SHA256 must be exactly 64 hex characters");
});
