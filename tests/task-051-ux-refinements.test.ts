import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildShareGroupUrl } from "../src/lib/savingsClubDirectory.ts";

function readSource(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf-8");
}

test("TC-UX-01 (AC-01.1): buildShareGroupUrl constructs clean share-safe URL without view or tab params", () => {
  const sampleAddr = "0x6afaa0825d2e05ef00d571d4a043ab5dcc03534b";
  
  // Test 1: From dirty base URL with view and tab params
  const dirtyUrl = "https://tontine-phi.vercel.app/?view=dashboard&tab=app&group=0x123";
  const safeUrl = buildShareGroupUrl(sampleAddr, dirtyUrl);
  
  const parsed = new URL(safeUrl);
  assert.equal(parsed.searchParams.get("group"), sampleAddr);
  assert.equal(parsed.searchParams.get("view"), null, "Must strip view parameter");
  assert.equal(parsed.searchParams.get("tab"), null, "Must strip tab parameter");

  // Test 2: Default fallback format
  const fallbackUrl = buildShareGroupUrl(sampleAddr, "https://tontine-phi.vercel.app");
  assert.equal(fallbackUrl, `https://tontine-phi.vercel.app/?group=${sampleAddr}`);
});

test("TC-UX-02 (AC-01.2): ActionPanel và PasskeyActionPanel dùng buildShareGroupUrl cho invite link", () => {
  const actionSrc = readSource("src/components/savings/ActionPanel.tsx");
  const passkeySrc = readSource("src/components/savings/PasskeyActionPanel.tsx");

  for (const [name, src] of [["ActionPanel.tsx", actionSrc], ["PasskeyActionPanel.tsx", passkeySrc]]) {
    assert.ok(
      src.includes("buildShareGroupUrl"),
      `${name} must import and use buildShareGroupUrl`
    );
    assert.ok(
      src.includes("buildShareGroupUrl(targetContract)"),
      `${name} must call buildShareGroupUrl(targetContract) in handleCopyInvite`
    );
  }
});

test("TC-UX-03 (AC-02.1): CollateralPreview có tooltip giải thích ký quỹ thân thiện với người dùng VN", () => {
  const collateralSrc = readSource("src/components/savings/CollateralPreview.tsx");

  assert.ok(
    collateralSrc.includes("Ký quỹ là khoản tiền cọc để bảo đảm"),
    "CollateralPreview must provide clear Vietnamese explanatory tooltip for collateral concept"
  );
  assert.ok(
    collateralSrc.includes("hoàn trả 100%"),
    "Tooltip must reassure users that collateral is 100% refundable upon completion"
  );
});

test("TC-UX-04 (AC-02.2): CollateralPreview ẩn hoàn toàn khi nhóm không dùng collateral (0 CirBTC)", () => {
  const collateralSrc = readSource("src/components/savings/CollateralPreview.tsx");

  assert.ok(
    collateralSrc.includes("isZeroCollateral"),
    "CollateralPreview must compute isZeroCollateral"
  );
  assert.ok(
    collateralSrc.includes("hidden"),
    "CollateralPreview must apply hidden CSS class when zero collateral is required"
  );
});

test("TC-UX-05 (AC-03.1): CreateClubModal có tùy chọn defaultCollateralMode và App.tsx để off by default", () => {
  const modalSrc = readSource("src/components/savings/CreateClubModal.tsx");
  const appSrc = readSource("src/App.tsx");

  assert.ok(
    modalSrc.includes("defaultCollateralMode?:"),
    "CreateClubModalProps must support defaultCollateralMode"
  );
  assert.ok(
    appSrc.includes('defaultCollateralMode="none"'),
    'App.tsx must pass defaultCollateralMode="none" to make collateral off by default'
  );
});

test("TC-UX-06 (AC-04.1): CreateClubModal có bước Xem lại & Xác nhận thông số (Review & Confirm)", () => {
  const modalSrc = readSource("src/components/savings/CreateClubModal.tsx");

  assert.ok(
    modalSrc.includes("Xem lại & Xác nhận thông số") || modalSrc.includes("Review & Confirm Details"),
    "CreateClubModal must render Review & Confirm summary panel before contract deployment"
  );
  assert.ok(
    modalSrc.includes("Bước 2/2"),
    "Review step must be clearly indicated to user"
  );
});

test("TC-UX-07 (AC-05.1): Bidding UI hiển thị preview row 'bạn sẽ nhận ~Y USDC nếu thắng'", () => {
  const actionSrc = readSource("src/components/savings/ActionPanel.tsx");
  const passkeySrc = readSource("src/components/savings/PasskeyActionPanel.tsx");

  for (const [name, src] of [["ActionPanel.tsx", actionSrc], ["PasskeyActionPanel.tsx", passkeySrc]]) {
    assert.ok(
      src.includes("bạn sẽ nhận ~") && src.includes("USDC nếu thắng"),
      `${name} must render live payout preview row with 'bạn sẽ nhận ~Y USDC nếu thắng'`
    );
    assert.ok(
      src.includes("estimatedPot"),
      `${name} must calculate estimatedPot based on member count and contribution`
    );
  }
});
