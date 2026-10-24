import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { translations, t } from "../src/lib/i18n.ts";
import { ARC_ROUTER, executeArcSwap } from "../src/lib/arcSwap.ts";

function readSource(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

// ============================================================================
// REQ-01: Bộ Từ Điển Song Ngữ i18n Cho Arc AppKit
// ============================================================================

test("TC-KIT-01 (AC-01.1, AC-01.2): Từ điển song ngữ i18n cho arcAppKit với 100% key parity", () => {
  const requiredKeys = [
    "btnLabel",
    "modalTitle",
    "modalDesc",
    "tabSwap",
    "tabBridge",
    "tabPasskey",
    "tabFaucet",
    "badgeText",
  ];

  const viKeys = Object.keys(translations.vi.arcAppKit);
  const enKeys = Object.keys(translations.en.arcAppKit);

  for (const k of requiredKeys) {
    assert.ok(
      viKeys.includes(k),
      `translations.vi.arcAppKit missing key: ${k}`
    );
    assert.ok(
      enKeys.includes(k),
      `translations.en.arcAppKit missing key: ${k}`
    );
  }

  assert.deepEqual(
    viKeys.sort(),
    enKeys.sort(),
    "Key parity between vi and en must be 100%"
  );

  // Translation function t helper works seamlessly
  assert.equal(t("arcAppKit.btnLabel", "vi"), "Arc AppKit");
  assert.equal(t("arcAppKit.btnLabel", "en"), "Arc AppKit");
  assert.ok(t("arcAppKit.modalTitle", "vi").length > 0);
  assert.ok(t("arcAppKit.modalTitle", "en").length > 0);
});

// ============================================================================
// REQ-02: Cấu trúc ArcAppKitModal.tsx & Các Chức Năng Cốt Lõi
// ============================================================================

test("TC-KIT-02 (AC-02.1, AC-02.2): ArcAppKitModal.tsx cấu trúc 4 Tabs & On-chain Swap", () => {
  const modalSrc = readSource("src/components/savings/ArcAppKitModal.tsx");

  // Export check
  assert.ok(
    modalSrc.includes("export function ArcAppKitModal"),
    "Must export ArcAppKitModal"
  );

  // 4 Tabs check
  assert.ok(modalSrc.includes('activeTab === "swap"'), "Must have Swap tab");
  assert.ok(modalSrc.includes('activeTab === "passkey"'), "Must have Passkey tab");
  assert.ok(modalSrc.includes('activeTab === "bridge"'), "Must have Bridge tab");
  assert.ok(modalSrc.includes('activeTab === "faucet"'), "Must have Faucet tab");

  // Swap logic integration
  assert.ok(
    modalSrc.includes("executeArcSwap"),
    "Must integrate executeArcSwap from arcSwap"
  );
  assert.ok(
    modalSrc.includes("ARC_ROUTER"),
    "Must import ARC_ROUTER"
  );

  // Token pair switching
  assert.ok(modalSrc.includes("fromToken"), "Must support fromToken state");
  assert.ok(modalSrc.includes("USDC") && modalSrc.includes("EURC"), "Must support USDC and EURC tokens");

  // Router and pool constants
  assert.equal(ARC_ROUTER, "0x509cF58CdA08C7aee83a2BdBb4A1Eac907343D01");
  assert.ok(
    modalSrc.includes("0xe8f7fA2A412e98C537554643F83DA34DfdD50c23"),
    "ArcAppKitModal must reference verified Uniswap V3 Pool on Arc Testnet"
  );
});

test("TC-KIT-03 (AC-02.3, AC-02.4): Circle Passkey Smart Account, CCTP Bridge & Circle Faucet", () => {
  const modalSrc = readSource("src/components/savings/ArcAppKitModal.tsx");

  // Circle Passkey Account info
  assert.ok(
    modalSrc.includes("Circle Smart Account") || modalSrc.includes("Smart Account"),
    "Must display Circle Smart Account info"
  );
  assert.ok(
    modalSrc.includes("Paymaster") || modalSrc.includes("Tài trợ phí Gas") || modalSrc.includes("Gas Sponsorship"),
    "Must display Paymaster gas sponsorship feature"
  );
  assert.ok(
    modalSrc.includes("WebAuthn") || modalSrc.includes("Touch ID") || modalSrc.includes("Face ID"),
    "Must mention biometric authentication (WebAuthn / Touch ID / Face ID)"
  );

  // Circle CCTP Bridge integration
  assert.ok(
    modalSrc.includes("Circle CCTP") || modalSrc.includes("CCTP"),
    "Must reference Circle CCTP cross-chain bridge"
  );
  assert.ok(
    modalSrc.includes("https://bridge.circle.com/") || modalSrc.includes("cctp"),
    "Must link to Circle Bridge portal"
  );

  // Circle Faucet integration
  assert.ok(
    modalSrc.includes("https://faucet.circle.com/"),
    "Must link to official Circle Faucet"
  );
  assert.ok(
    modalSrc.includes("copyAddress") || modalSrc.includes("navigator.clipboard.writeText"),
    "Must support 1-click address copy for easy faucet funding"
  );
});

// ============================================================================
// REQ-03: Tích hợp Giao Diện Người Dùng (Header, Passkey Bar, GroupSwitcher, App.tsx)
// ============================================================================

test("TC-KIT-04 (AC-03.1, AC-03.2): Header & App.tsx tích hợp Arc AppKit Button và Modal", () => {
  const headerSrc = readSource("src/components/savings/Header.tsx");
  const appSrc = readSource("src/App.tsx");

  // Header has onOpenArcAppKit in props interface
  assert.ok(
    headerSrc.includes("onOpenArcAppKit?: () => void;"),
    "HeaderProps must declare onOpenArcAppKit optional callback"
  );
  assert.ok(
    headerSrc.includes("onOpenArcAppKit &&"),
    "Header must conditionally render Arc AppKit button when callback provided"
  );

  // App.tsx manages modal state
  assert.ok(
    appSrc.includes("const [showArcAppKitModal, setShowArcAppKitModal] = useState(false);"),
    "App.tsx must manage showArcAppKitModal state"
  );

  // App.tsx renders ArcAppKitModal
  assert.ok(
    appSrc.includes("<ArcAppKitModal"),
    "App.tsx must render ArcAppKitModal component"
  );
  assert.ok(
    appSrc.includes("isOpen={showArcAppKitModal}"),
    "App.tsx must pass isOpen bound to showArcAppKitModal"
  );
  assert.ok(
    appSrc.includes("onClose={() => setShowArcAppKitModal(false)}"),
    "App.tsx must pass onClose handler"
  );

  // Wagmi Header passes onOpenArcAppKit
  assert.ok(
    appSrc.includes("onOpenArcAppKit={() => setShowArcAppKitModal(true)}"),
    "App.tsx must wire onOpenArcAppKit to Header"
  );

  // Passkey Top Bar also has Arc AppKit button
  assert.ok(
    appSrc.includes("setShowArcAppKitModal(true)"),
    "Passkey header must provide shortcut to open Arc AppKit"
  );
});

test("TC-KIT-05 (AC-03.3): GroupSwitcher.tsx cung cấp Arc AppKit shortcut bar", () => {
  const switcherSrc = readSource("src/components/savings/GroupSwitcher.tsx");
  const appSrc = readSource("src/App.tsx");

  // GroupSwitcherProps has onOpenArcAppKit
  assert.ok(
    switcherSrc.includes("onOpenArcAppKit?: () => void;"),
    "GroupSwitcherProps must declare onOpenArcAppKit"
  );

  // GroupSwitcher renders shortcut bar
  assert.ok(
    switcherSrc.includes("Arc AppKit (Swap • Bridge • Faucet)"),
    "GroupSwitcher must display Arc AppKit shortcut bar"
  );

  // App.tsx supplies onOpenArcAppKit to GroupSwitcher
  assert.ok(
    appSrc.includes("<GroupSwitcher") &&
      appSrc.includes("onOpenArcAppKit={() => setShowArcAppKitModal(true)}"),
    "App.tsx must pass onOpenArcAppKit to GroupSwitcher"
  );
});

// ============================================================================
// REQ-04: Đảm Bảo Quy Chuẩn Thiết Kế & Không Gây Lỗi Hồi Quy (Zero Regression)
// ============================================================================

test("TC-REGRESSION-01 (AC-04.1..04.3): Không chứa cỡ chữ cấm sub-12px (text-[10px], text-[11px])", () => {
  const modalSrc = readSource("src/components/savings/ArcAppKitModal.tsx");
  const switcherSrc = readSource("src/components/savings/GroupSwitcher.tsx");
  const headerSrc = readSource("src/components/savings/Header.tsx");

  assert.equal(
    modalSrc.includes("text-[10px]"),
    false,
    "ArcAppKitModal must not contain text-[10px]"
  );
  assert.equal(
    modalSrc.includes("text-[11px]"),
    false,
    "ArcAppKitModal must not contain text-[11px]"
  );
  assert.equal(
    switcherSrc.includes("text-[10px]"),
    false,
    "GroupSwitcher must not contain text-[10px]"
  );
  assert.equal(
    switcherSrc.includes("text-[11px]"),
    false,
    "GroupSwitcher must not contain text-[11px]"
  );
  assert.equal(
    headerSrc.includes("text-[10px]"),
    false,
    "Header must not contain text-[10px]"
  );
  assert.equal(
    headerSrc.includes("text-[11px]"),
    false,
    "Header must not contain text-[11px]"
  );
});
