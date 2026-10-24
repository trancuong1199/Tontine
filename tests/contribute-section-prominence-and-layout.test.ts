import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { t, type Language } from "../src/lib/i18n.ts";

function readSource(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

test("TC-CONTRIB-01 (AC-01.1): Action-First layout in App.tsx places ActionPanel before MemberStatus and Round Details", () => {
  const appSrc = readSource("src/App.tsx");

  // Verify ActionPanel is positioned before MemberStatus in right column
  const passkeyIndex = appSrc.indexOf("<PasskeyActionPanel");
  const actionPanelIndex = appSrc.indexOf("<ActionPanel");
  const memberStatusIndex = appSrc.indexOf("<MemberStatus");
  const roundInfoIndex = appSrc.indexOf("Round Info if ACTIVE");

  assert.ok(passkeyIndex > 0, "PasskeyActionPanel should exist in App.tsx");
  assert.ok(actionPanelIndex > 0, "ActionPanel should exist in App.tsx");
  assert.ok(memberStatusIndex > 0, "MemberStatus should exist in App.tsx");
  assert.ok(roundInfoIndex > 0, "Round Info should exist in App.tsx");

  // Both action panels appear before MemberStatus
  assert.ok(
    passkeyIndex < memberStatusIndex,
    "PasskeyActionPanel must be rendered before MemberStatus"
  );
  assert.ok(
    actionPanelIndex < memberStatusIndex,
    "ActionPanel must be rendered before MemberStatus"
  );

  // MemberStatus appears before Round Info
  assert.ok(
    memberStatusIndex < roundInfoIndex,
    "MemberStatus must be rendered before Round Info"
  );
});

test("TC-CONTRIB-02 (AC-01.2, AC-01.3): App.tsx right column contains sticky container and Action-First hierarchy", () => {
  const appSrc = readSource("src/App.tsx");

  // Right column container with sticky top behavior
  assert.ok(
    appSrc.includes("lg:sticky lg:top-20"),
    "Right column should be sticky on desktop viewports"
  );

  // Action-First descriptive comment
  assert.ok(
    appSrc.includes("Action-First: Primary user actions positioned at top eye-level"),
    "App.tsx should document Action-First layout ordering rationale"
  );
});

test("TC-CONTRIB-03 (AC-02.1): ActionPanel.tsx prominent Contribute card styling with Royal Sand Gold theme", () => {
  const actionSrc = readSource("src/components/savings/ActionPanel.tsx");

  // Card container when !hasContributed
  assert.ok(
    actionSrc.includes("border-2 border-amber-500/50"),
    "Contribute card should have prominent amber border"
  );
  assert.ok(
    actionSrc.includes("bg-gradient-to-br from-amber-500/20 via-[#13141f] to-amber-950/40"),
    "Contribute card should have royal sand gold gradient"
  );
  assert.ok(
    actionSrc.includes("shadow-xl shadow-amber-500/15"),
    "Contribute card should have golden shadow glow"
  );

  // Glow blur accents
  assert.ok(
    actionSrc.includes("bg-amber-500/15 rounded-full blur-2xl"),
    "Contribute card should include atmospheric glow accents"
  );
});

test("TC-CONTRIB-04 (AC-02.2, AC-02.3): ActionPanel.tsx priority badge and fixed amount typography", () => {
  const actionSrc = readSource("src/components/savings/ActionPanel.tsx");

  // Priority badge with animate-pulse and Coins icon
  assert.ok(
    actionSrc.includes("animate-pulse"),
    "Priority badge should animate pulse for visual urgency"
  );
  assert.ok(
    actionSrc.includes("contributeActionRequired"),
    "Priority badge should use contributeActionRequired i18n translation key"
  );

  // Fixed amount display
  assert.ok(
    actionSrc.includes("font-black text-amber-300"),
    "Contribution amount should be styled with high-contrast font-black amber text"
  );
  assert.ok(
    actionSrc.includes("contributeFixedAmount"),
    "Contribution label should use contributeFixedAmount i18n translation key"
  );
});

test("TC-CONTRIB-05 (AC-02.4, AC-02.5): ActionPanel.tsx prominent CTA button and confirmed emerald state", () => {
  const actionSrc = readSource("src/components/savings/ActionPanel.tsx");

  // Golden CTA button
  assert.ok(
    actionSrc.includes("bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600"),
    "CTA button should use prominent sand gold gradient"
  );
  assert.ok(
    actionSrc.includes("py-3.5 sm:py-4"),
    "CTA button should have generous touch target padding (py-3.5 sm:py-4)"
  );
  assert.ok(
    actionSrc.includes("shadow-lg shadow-amber-500/25"),
    "CTA button should feature golden shadow elevation"
  );

  // Emerald confirmed state when hasContributed === true
  assert.ok(
    actionSrc.includes("bg-emerald-950/40 border border-emerald-500/30"),
    "Confirmed state should render elegant dark emerald card"
  );
  assert.ok(
    actionSrc.includes("CheckCircle2"),
    "Confirmed state should display CheckCircle2 icon"
  );
});

test("TC-CONTRIB-06 (AC-03.1): PasskeyActionPanel.tsx synchronized prominent Contribute card", () => {
  const passkeySrc = readSource("src/components/savings/PasskeyActionPanel.tsx");

  // Prominent card container
  assert.ok(
    passkeySrc.includes("border-2 border-amber-500/50"),
    "Passkey Contribute card should match amber border styling"
  );
  assert.ok(
    passkeySrc.includes("bg-gradient-to-br from-amber-500/20 via-[#13141f] to-amber-950/40"),
    "Passkey Contribute card should match royal gold gradient"
  );

  // Badge & typography
  assert.ok(
    passkeySrc.includes("animate-pulse"),
    "Passkey priority badge should match animate-pulse"
  );
  assert.ok(
    passkeySrc.includes("font-black text-amber-300"),
    "Passkey contribution amount should match font-black amber typography"
  );

  // CTA button
  assert.ok(
    passkeySrc.includes("py-3.5 sm:py-4 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600"),
    "Passkey CTA button should match golden gradient styling"
  );

  // Confirmed state
  assert.ok(
    passkeySrc.includes("bg-emerald-950/40 border border-emerald-500/30"),
    "Passkey confirmed state should match emerald card styling"
  );
});

test("TC-CONTRIB-07 (AC-03.2): Dictionary coverage in src/lib/i18n.ts for contribute prominence keys", () => {
  const languages: Language[] = ["vi", "en"];

  for (const lang of languages) {
    // Action required badge
    const actionRequired = t("actionPanel.contributeActionRequired", lang);
    assert.ok(typeof actionRequired === "string" && actionRequired.length > 0);

    // Fixed amount label
    const fixedAmount = t("actionPanel.contributeFixedAmount", lang);
    assert.ok(typeof fixedAmount === "string" && fixedAmount.length > 0);

    // Card description
    const cardDesc = t("actionPanel.contributeCardDesc", lang);
    assert.ok(typeof cardDesc === "string" && cardDesc.length > 0);

    // Confirmed labels
    const confirmed = t("actionPanel.contributedConfirmed", lang);
    assert.ok(typeof confirmed === "string" && confirmed.length > 0);
  }

  // Specific language assertions
  assert.equal(t("actionPanel.contributeActionRequired", "vi"), "Cần đóng tiền");
  assert.equal(t("actionPanel.contributeActionRequired", "en"), "Action Required");
  assert.equal(t("actionPanel.contributeFixedAmount", "vi"), "Mức đóng cố định");
  assert.equal(t("actionPanel.contributeFixedAmount", "en"), "Fixed amount");
});

test("TC-CONTRIB-08 (AC-03.3): Verification of imports and components compile-readiness", () => {
  const actionSrc = readSource("src/components/savings/ActionPanel.tsx");
  const passkeySrc = readSource("src/components/savings/PasskeyActionPanel.tsx");

  // Both components import Coins
  assert.ok(actionSrc.includes("Coins"), "ActionPanel must import Coins icon");
  assert.ok(passkeySrc.includes("Coins"), "PasskeyActionPanel must import Coins icon");

  // Both components import CheckCircle2
  assert.ok(actionSrc.includes("CheckCircle2"), "ActionPanel must import CheckCircle2 icon");
  assert.ok(passkeySrc.includes("CheckCircle2"), "PasskeyActionPanel must import CheckCircle2 icon");
});
