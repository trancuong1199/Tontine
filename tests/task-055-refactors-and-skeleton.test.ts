import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildShareGroupUrl } from "../src/lib/savingsClubDirectory.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readSource(relPath: string): string {
  return fs.readFileSync(path.resolve(__dirname, "..", relPath), "utf-8");
}

// ============================================================================
// REQ-01: Domain-Agnostic Share URL Fallback
// ============================================================================

test("TC-SHARE-01 (AC-01.1): buildShareGroupUrl falls back to relative '/' when baseUrl is omitted", () => {
  const sampleAddr = "0x6afaa0825d2e05ef00d571d4a043ab5dcc03534b";
  const url = buildShareGroupUrl(sampleAddr);

  // In Node environment without window, must fall back safely to relative path
  assert.equal(url, `/?group=${sampleAddr.toLowerCase()}`);
  assert.ok(!url.includes("tontine-phi.vercel.app"), "Fallback must NOT hardcode Vercel domain");
});

test("TC-SHARE-02 (AC-01.2): buildShareGroupUrl supports custom domains and relative bases dynamically", () => {
  const sampleAddr = "0x6afaa0825d2e05ef00d571d4a043ab5dcc03534b";

  // Custom domain
  const custom = buildShareGroupUrl(sampleAddr, "https://my-custom-tontine.io");
  assert.equal(custom, `https://my-custom-tontine.io/?group=${sampleAddr.toLowerCase()}`);

  // Strips dirty view and tab params on custom domain
  const dirty = buildShareGroupUrl(sampleAddr, "https://my-custom-tontine.io/app?view=modal&tab=app&other=1");
  const parsed = new URL(dirty);
  assert.equal(parsed.searchParams.get("group"), sampleAddr.toLowerCase());
  assert.equal(parsed.searchParams.get("view"), null);
  assert.equal(parsed.searchParams.get("tab"), null);

  // Source code invariant: No hardcoded tontine-phi.vercel.app in buildShareGroupUrl
  const dirSrc = readSource("src/lib/savingsClubDirectory.ts");
  const fnBodyMatch = dirSrc.match(/export function buildShareGroupUrl[\s\S]*?\n\}/);
  assert.ok(fnBodyMatch, "buildShareGroupUrl function must exist");
  assert.ok(
    !fnBodyMatch[0].includes("https://tontine-phi.vercel.app/"),
    "buildShareGroupUrl must not hardcode https://tontine-phi.vercel.app/ fallback"
  );
});

// ============================================================================
// REQ-02: ActionPanel Decomposition (WaitingView & NonMemberActiveView)
// ============================================================================

test("TC-DECOMPOSE-01 (AC-02.1 & AC-02.3): WaitingView is extracted as dedicated component and integrated into ActionPanel", () => {
  const waitingViewPath = path.resolve(__dirname, "../src/components/savings/WaitingView.tsx");
  assert.ok(fs.existsSync(waitingViewPath), "src/components/savings/WaitingView.tsx must exist");

  const waitingSrc = readSource("src/components/savings/WaitingView.tsx");
  assert.ok(waitingSrc.includes("export function WaitingView"), "WaitingView component must be exported");
  assert.ok(waitingSrc.includes("CheckCircle2"), "WaitingView must render CheckCircle2 icon");
  assert.ok(waitingSrc.includes("t(\"actionPanel.whyNoContribTitle\""), "WaitingView must explain why contributions have not started");
  assert.ok(waitingSrc.includes("t(\"actionPanel.roadmapTitle\""), "WaitingView must render roadmap");
  assert.ok(waitingSrc.includes("onVoteCancelGroup"), "WaitingView must support consensus cancel vote");

  // ActionPanel imports and delegates to WaitingView
  const actionPanelSrc = readSource("src/components/savings/ActionPanel.tsx");
  assert.ok(actionPanelSrc.includes("import { WaitingView } from \"./WaitingView\";"), "ActionPanel must import WaitingView");
  assert.ok(actionPanelSrc.includes("<WaitingView"), "ActionPanel must render <WaitingView");
});

test("TC-DECOMPOSE-02 (AC-02.2 & AC-02.3): NonMemberActiveView is extracted as dedicated component and integrated into ActionPanel", () => {
  const nonMemberPath = path.resolve(__dirname, "../src/components/savings/NonMemberActiveView.tsx");
  assert.ok(fs.existsSync(nonMemberPath), "src/components/savings/NonMemberActiveView.tsx must exist");

  const nonMemberSrc = readSource("src/components/savings/NonMemberActiveView.tsx");
  assert.ok(nonMemberSrc.includes("export function NonMemberActiveView"), "NonMemberActiveView component must be exported");
  assert.ok(nonMemberSrc.includes("Lock"), "NonMemberActiveView must render Lock icon");
  assert.ok(
    nonMemberSrc.includes("The club is active and not accepting new members."),
    "NonMemberActiveView must render standard English message"
  );
  assert.ok(
    nonMemberSrc.includes("Nhóm đang diễn ra các vòng, không nhận thêm thành viên mới."),
    "NonMemberActiveView must render standard Vietnamese message"
  );

  // ActionPanel imports and delegates to NonMemberActiveView
  const actionPanelSrc = readSource("src/components/savings/ActionPanel.tsx");
  assert.ok(actionPanelSrc.includes("import { NonMemberActiveView } from \"./NonMemberActiveView\";"), "ActionPanel must import NonMemberActiveView");
  assert.ok(actionPanelSrc.includes("<NonMemberActiveView"), "ActionPanel must render <NonMemberActiveView");
});

// ============================================================================
// REQ-03: ClubCard Loading Skeleton & Stat Invariants
// ============================================================================

test("TC-SKELETON-01 (AC-03.1 & AC-03.2): ClubCard supports isLoading skeleton and replaces em-dash with localized pending status", () => {
  const clubCardSrc = readSource("src/components/savings/ClubCard.tsx");

  // Interface supports isLoading
  assert.ok(clubCardSrc.includes("isLoading?: boolean;"), "ClubCardProps must declare optional isLoading prop");
  assert.ok(clubCardSrc.includes("animate-pulse"), "ClubCard must render animate-pulse elements for skeleton loading");

  // Box 3 replaced raw em-dash with localized Pending text
  assert.ok(
    !clubCardSrc.includes("state === GROUP_STATE.ACTIVE ? countdown : \"—\""),
    "ClubCard Box 3 must not render raw em-dash"
  );
  assert.ok(
    clubCardSrc.includes("Pending") && clubCardSrc.includes("Chờ bắt đầu"),
    "ClubCard Box 3 must render Pending / Chờ bắt đầu when club is in OPEN state"
  );
});

// ============================================================================
// REQ-04: Frozen Manifest Verification
// ============================================================================

test("TC-MANIFEST-01 (AC-04.1): Frozen SHA256 manifest matches source files exactly", () => {
  const manifestRaw = readSource("docs/manifests/task-055/manifest.json");
  const manifest = JSON.parse(manifestRaw);

  assert.equal(manifest.taskId, "task-055");
  assert.ok(manifest.files["src/lib/savingsClubDirectory.ts"]);
  assert.ok(manifest.files["src/components/savings/WaitingView.tsx"]);
  assert.ok(manifest.files["src/components/savings/NonMemberActiveView.tsx"]);
  assert.ok(manifest.files["src/components/savings/ActionPanel.tsx"]);
  assert.ok(manifest.files["src/components/savings/ClubCard.tsx"]);
});
