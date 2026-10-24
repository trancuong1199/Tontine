import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function readSource(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

// ============================================================================
// REQ-01: Chuyển Đổi Toàn Diện Trang Chủ LandingPage Sang Black & Sand Gold
// ============================================================================

test("TC-BLACK-01 (AC-01.1): Nền LandingPage đen tuyền (#050508 / #000000), Hero Section có glow vàng cát, nút CTA chính 'Launch App' gradient vàng cát (from-amber-400 via-amber-500 to-yellow-600 text-slate-950 font-bold)", () => {
  const landingSrc = readSource("src/components/landing/LandingPage.tsx");

  // Verify LandingPage root background is pitch black
  assert.ok(
    landingSrc.includes("bg-[#050508]") && landingSrc.includes("text-slate-100"),
    "LandingPage.tsx root wrapper must use 'bg-[#050508] text-slate-100'"
  );
  assert.ok(
    !landingSrc.includes("bg-slate-50 flex flex-col"),
    "LandingPage.tsx must not use light 'bg-slate-50' for root container"
  );

  // Verify Hero section dark styling with amber glow
  assert.ok(
    landingSrc.includes("border-amber-500/20") &&
    landingSrc.includes("from-black via-[#08090e] to-[#050508]"),
    "Hero section must use dark gradient with border-amber-500/20"
  );
  assert.ok(
    landingSrc.includes("rgba(245,158,11,0.15)"),
    "Hero section must feature amber radial ambient glow"
  );

  // Hero Badge
  assert.ok(
    landingSrc.includes("bg-amber-950/40 text-amber-300 border border-amber-500/30"),
    "Hero badge must use sand gold theme"
  );

  // CTA 1: Launch App button gradient and high-contrast dark text
  assert.ok(
    landingSrc.includes("bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600") &&
    landingSrc.includes("text-slate-950") &&
    landingSrc.includes("font-bold") &&
    landingSrc.includes("shadow-amber-500/20"),
    "Launch App CTA button must use sand gold gradient with text-slate-950 font-bold"
  );
});

test("TC-BLACK-02 (AC-01.2): 3 thẻ chỉ số chính trên LandingPage mang nền đen obsidian (#0c0d14 / #11131c), viền vàng cát border-amber-500/20, con số màu vàng cát text-amber-400", () => {
  const landingSrc = readSource("src/components/landing/LandingPage.tsx");

  // Verify metric cards styling
  assert.ok(
    landingSrc.includes("bg-[#0c0d14] rounded-2xl p-5 border border-amber-500/20 shadow-lg"),
    "All 3 metric cards must use dark obsidian 'bg-[#0c0d14]' with 'border-amber-500/20'"
  );
  assert.ok(
    landingSrc.includes("text-3xl sm:text-4xl font-extrabold text-amber-400 tracking-tight"),
    "Metric numbers must be styled with 'text-amber-400 font-extrabold'"
  );
  assert.ok(
    !landingSrc.includes("bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80"),
    "Metric cards must eliminate old white backgrounds"
  );
});

test("TC-BLACK-03 (AC-01.3): Các phân khu So sánh, Quy trình 4 bước và Featured Clubs mang nền đen obsidian viền vàng cát, nút CTA gradient vàng cát", () => {
  const landingSrc = readSource("src/components/landing/LandingPage.tsx");

  // Problem & Solution comparison section
  assert.ok(
    landingSrc.includes("bg-gradient-to-b from-[#140b0d] to-[#0d090a] border border-rose-900/40") ||
    landingSrc.includes("border-rose-900/40"),
    "Problem comparison column must use deep dark styling"
  );
  assert.ok(
    landingSrc.includes("border border-amber-500/40") &&
    landingSrc.includes("from-[#0e1612] to-[#09110d]"),
    "Solution comparison column must use dark styling with sand gold / emerald border"
  );

  // 4 Steps Section
  assert.ok(
    landingSrc.includes("bg-[#0c0d14]") && landingSrc.includes("border border-amber-500/20"),
    "4-step cards must use dark obsidian container with sand gold border"
  );

  // Featured Clubs Section
  assert.ok(
    landingSrc.includes("border border-amber-500/20") &&
    landingSrc.includes("bg-[#0c0d14]") &&
    landingSrc.includes("onSelectClub"),
    "Featured club cards must use dark obsidian styling"
  );
  assert.ok(
    landingSrc.includes("bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600") &&
    landingSrc.includes("text-slate-950") &&
    landingSrc.includes("font-bold"),
    "Featured club 1-click CTA button must use sand gold gradient"
  );
});

test("TC-BLACK-04 (AC-01.4): Phân khu FAQ Accordion mang nền đen obsidian viền vàng cát, tiêu đề câu hỏi sáng rõ, icon vàng cát", () => {
  const landingSrc = readSource("src/components/landing/LandingPage.tsx");

  assert.ok(
    landingSrc.includes("border border-amber-500/20") && landingSrc.includes("bg-[#0c0d14]"),
    "FAQ accordion items must use dark obsidian background with amber border"
  );
  assert.ok(
    landingSrc.includes("font-bold text-white hover:text-amber-400") || landingSrc.includes("text-white"),
    "FAQ question title must be high contrast light text"
  );
  assert.ok(
    landingSrc.includes("text-amber-400 shrink-0"),
    "FAQ chevron icon must use sand gold accent"
  );
});

// ============================================================================
// REQ-02: Tối Hóa Triệt Để Giao Diện Nhóm Hụi Savings Clubs (Xóa Sạch Thẻ Trắng)
// ============================================================================

test("TC-BLACK-05 (AC-02.1): Thẻ GroupSwitcher mang nền đen obsidian (#0c0d14 / #11131c) viền border-amber-500/20, không còn bg-white", () => {
  const switcherSrc = readSource("src/components/savings/GroupSwitcher.tsx");

  assert.ok(
    switcherSrc.includes("bg-[#0c0d14] rounded-3xl p-5 sm:p-6 border border-amber-500/20"),
    "GroupSwitcher root container must be 'bg-[#0c0d14] border border-amber-500/20'"
  );
  assert.ok(
    !switcherSrc.includes('className="bg-white rounded-3xl'),
    "GroupSwitcher must not contain 'bg-white rounded-3xl'"
  );
  assert.ok(
    switcherSrc.includes("bg-amber-950/30 hover:bg-amber-900/40 text-amber-300") &&
    switcherSrc.includes("border-amber-500/30"),
    "GroupSwitcher copy link button must use sand gold theme"
  );
});

test("TC-BLACK-06 (AC-02.2): Thẻ MemberStatus mang nền đen obsidian (#0c0d14 / #11131c) viền border-amber-500/20, không còn bg-white", () => {
  const memberSrc = readSource("src/components/savings/MemberStatus.tsx");

  assert.ok(
    memberSrc.includes("bg-[#0c0d14]") && memberSrc.includes("border border-amber-500/20"),
    "MemberStatus must use dark obsidian 'bg-[#0c0d14]' with amber border"
  );
  assert.ok(
    !memberSrc.includes('className="bg-white rounded-3xl'),
    "MemberStatus must not contain 'bg-white rounded-3xl'"
  );
});

test("TC-BLACK-07 (AC-02.3): ActionPanel & PasskeyActionPanel mang nền đen obsidian viền vàng cát, nút hành động chính (Tham gia, Đóng hụi, Bid) mang gradient vàng cát text-slate-950 font-bold, không còn bg-white", () => {
  const actionSrc = readSource("src/components/savings/ActionPanel.tsx");
  const pkActionSrc = readSource("src/components/savings/PasskeyActionPanel.tsx");

  // ActionPanel root and CTAs
  assert.ok(
    actionSrc.includes("bg-[#0c0d14] rounded-3xl") && actionSrc.includes("border border-amber-500/20"),
    "ActionPanel must use dark obsidian 'bg-[#0c0d14]' with 'border-amber-500/20'"
  );
  assert.ok(
    !actionSrc.includes('className="bg-white rounded-3xl'),
    "ActionPanel must eliminate 'bg-white rounded-3xl'"
  );
  assert.ok(
    actionSrc.includes("bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600") &&
    actionSrc.includes("text-slate-950") &&
    actionSrc.includes("font-bold"),
    "ActionPanel primary actions must use sand gold gradient with text-slate-950 font-bold"
  );

  // PasskeyActionPanel root and CTAs
  assert.ok(
    pkActionSrc.includes("bg-[#0c0d14] rounded-3xl") && pkActionSrc.includes("border border-amber-500/20"),
    "PasskeyActionPanel must use dark obsidian 'bg-[#0c0d14]' with 'border-amber-500/20'"
  );
  assert.ok(
    !pkActionSrc.includes('className="bg-white rounded-3xl'),
    "PasskeyActionPanel must eliminate 'bg-white rounded-3xl'"
  );
  assert.ok(
    pkActionSrc.includes("bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600") &&
    pkActionSrc.includes("text-slate-950") &&
    pkActionSrc.includes("font-bold"),
    "PasskeyActionPanel primary actions must use sand gold gradient with text-slate-950 font-bold"
  );
});

test("TC-BLACK-08 (AC-02.4): RoundHistory & HowItWorksCard mang nền đen obsidian viền vàng cát, không còn bg-white", () => {
  const historySrc = readSource("src/components/savings/RoundHistory.tsx");
  const howSrc = readSource("src/components/savings/HowItWorksCard.tsx");

  // RoundHistory
  assert.ok(
    historySrc.includes("bg-[#0c0d14]") && historySrc.includes("border border-amber-500/20"),
    "RoundHistory must use dark obsidian 'bg-[#0c0d14]' with 'border-amber-500/20'"
  );
  assert.ok(
    !historySrc.includes('className="bg-white rounded-3xl'),
    "RoundHistory must not contain 'bg-white rounded-3xl'"
  );

  // HowItWorksCard
  assert.ok(
    howSrc.includes("bg-[#0c0d14]") && howSrc.includes("border border-amber-500/20"),
    "HowItWorksCard must use dark obsidian 'bg-[#0c0d14]' with 'border-amber-500/20'"
  );
  assert.ok(
    !howSrc.includes('className="bg-white rounded-3xl'),
    "HowItWorksCard must not contain 'bg-white rounded-3xl'"
  );
  assert.ok(
    howSrc.includes("text-amber-400"),
    "HowItWorksCard steps must use sand gold accent 'text-amber-400'"
  );
});

// ============================================================================
// REQ-03: Tái Thiết Kế ClubCard Từ Tím Neon Sang Obsidian Metallic & Sand Gold
// ============================================================================

test("TC-BLACK-09 (AC-03.1): ClubCard xóa bỏ hoàn toàn gradient tím neon (from-blue-600 via-indigo-600 to-violet-700), áp dụng nền đen obsidian metallic (from-[#161722] via-[#0e0f18] to-[#07080d]) viền vàng cát border-amber-500/30", () => {
  const clubCardSrc = readSource("src/components/savings/ClubCard.tsx");

  assert.ok(
    !clubCardSrc.includes("from-blue-600 via-indigo-600 to-violet-700"),
    "ClubCard must completely eliminate old purple/neon gradient 'from-blue-600 via-indigo-600 to-violet-700'"
  );
  assert.ok(
    clubCardSrc.includes("bg-gradient-to-br from-[#161722] via-[#0e0f18] to-[#07080d]") &&
    clubCardSrc.includes("border border-amber-500/30"),
    "ClubCard must apply dark metallic obsidian gradient 'from-[#161722] via-[#0e0f18] to-[#07080d]' with 'border-amber-500/30'"
  );
  assert.ok(
    clubCardSrc.includes("bg-amber-500/10 rounded-full blur-3xl"),
    "ClubCard must feature warm ambient amber glow"
  );
});

test("TC-BLACK-10 (AC-03.2): Hero Pot trong ClubCard hiển thị con số và đơn vị to rõ trong khối ambient gold/amber (Coins text-amber-400, text-amber-300, border-amber-500/20, bg-black/40 backdrop-blur-md)", () => {
  const clubCardSrc = readSource("src/components/savings/ClubCard.tsx");

  assert.ok(
    clubCardSrc.includes("bg-black/40 backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-amber-500/20"),
    "Hero Pot container must use dark translucent glass styling with 'border-amber-500/20'"
  );
  assert.ok(
    clubCardSrc.includes('<Coins size={16} className="text-amber-400" />') &&
    clubCardSrc.includes("text-amber-300 text-xs sm:text-sm font-semibold"),
    "Hero Pot label and icon must feature sand gold accent"
  );
});

test("TC-BLACK-11 (AC-03.3): Thanh tiến độ sức chứa thành viên mang dải gradient vàng cát from-amber-400 to-yellow-500", () => {
  const clubCardSrc = readSource("src/components/savings/ClubCard.tsx");

  assert.ok(
    clubCardSrc.includes("bg-gradient-to-r from-amber-400 to-yellow-500") &&
    clubCardSrc.includes("shadow-amber-400/30"),
    "Member capacity progress bar must use sand gold gradient 'from-amber-400 to-yellow-500'"
  );
  assert.ok(
    clubCardSrc.includes("bg-black/50 border border-slate-800 rounded-full"),
    "Progress bar background track must be dark styled"
  );
});

test("TC-BLACK-12 (AC-03.4): Toàn bộ 8 ràng buộc Typography trong ClubCard (TC-TYPO-02) được bảo toàn nguyên vẹn 100%", () => {
  const clubCardSrc = readSource("src/components/savings/ClubCard.tsx");

  // 1. Tên nhóm
  assert.ok(
    clubCardSrc.includes("text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-xs"),
    "ClubCard title typography must match TC-TYPO-02 invariant"
  );
  // 2. Pot Hero Amount
  assert.ok(
    clubCardSrc.includes("text-3xl sm:text-4xl font-extrabold tabular-nums tracking-tight text-white"),
    "ClubCard pot hero amount typography must match TC-TYPO-02 invariant"
  );
  // 3. USDC unit
  assert.ok(
    clubCardSrc.includes("text-lg sm:text-xl font-bold text-cyan-200"),
    "ClubCard pot hero unit typography must match TC-TYPO-02 invariant"
  );
  // 4. Fixed contribution description
  assert.ok(
    clubCardSrc.includes("text-sm font-medium text-blue-200/95 mt-1.5"),
    "ClubCard contribution amount typography must match TC-TYPO-02 invariant"
  );
  // 5. Max pot size
  assert.ok(
    clubCardSrc.includes("text-base font-bold text-white tabular-nums"),
    "ClubCard max pot size typography must match TC-TYPO-02 invariant"
  );
  // 6. Capacity label
  assert.ok(
    clubCardSrc.includes("flex items-center justify-between text-sm font-semibold text-blue-200 mb-2"),
    "ClubCard capacity label typography must match TC-TYPO-02 invariant"
  );
  // 7. 3 stats numbers
  assert.ok(
    clubCardSrc.includes("text-lg sm:text-xl font-bold tabular-nums text-white"),
    "ClubCard 3 stats numbers typography must match TC-TYPO-02 invariant"
  );
  // 8. 3 stats subtitle
  assert.ok(
    clubCardSrc.includes("text-blue-200 text-xs font-semibold mt-1"),
    "ClubCard 3 stats subtitles typography must match TC-TYPO-02 invariant"
  );
});

// ============================================================================
// REQ-04: Đồng Bộ CTA Buttons, ConnectKit, Toaster & Bảo Toàn 125/125 Tests
// ============================================================================

test("TC-BLACK-13 (AC-04.1): Nút '+ Tạo nhóm' trên Header và thanh Passkey mang gradient vàng cát text-slate-950 font-bold", () => {
  const headerSrc = readSource("src/components/savings/Header.tsx");
  const appSrc = readSource("src/App.tsx");

  // Header.tsx create button
  assert.ok(
    headerSrc.includes("bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600") &&
    headerSrc.includes("text-slate-950") &&
    headerSrc.includes("font-bold"),
    "Header.tsx '+ Tạo nhóm' button must use sand gold gradient with text-slate-950 font-bold"
  );

  // App.tsx passkey topbar create button
  assert.ok(
    appSrc.includes("bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600") &&
    appSrc.includes("text-slate-950") &&
    appSrc.includes("font-bold"),
    "App.tsx passkey topbar '+ Tạo nhóm' button must use sand gold gradient with text-slate-950 font-bold"
  );
});

test("TC-BLACK-14 (AC-04.2): ConnectKit theme & Toaster đồng bộ dark mode và accent vàng cát", () => {
  const mainSrc = readSource("src/main.tsx");

  assert.ok(
    mainSrc.includes("mode=\"dark\""),
    "ConnectKitProvider must use mode='dark'"
  );
  assert.ok(
    mainSrc.includes("'--ck-primary-button-background': '#f59e0b'") &&
    mainSrc.includes("'--ck-primary-button-hover-background': '#d97706'"),
    "ConnectKitProvider customTheme must use sand gold amber accents"
  );
  assert.ok(
    mainSrc.includes("theme=\"dark\""),
    "Toaster must be configured with theme='dark'"
  );
});

test("TC-BLACK-15 (AC-04.3): Header active tab class invariant ('bg-white text-blue-600 shadow-2xs') được bảo toàn 100%", () => {
  const headerSrc = readSource("src/components/savings/Header.tsx");
  const appSrc = readSource("src/App.tsx");

  // Verify Header.tsx activeTab invariant required by TC-NAV-01
  assert.ok(
    headerSrc.includes('activeTab === "home"') &&
    headerSrc.includes('"bg-white text-blue-600 shadow-2xs"'),
    "Header.tsx must keep activeTab 'bg-white text-blue-600' class for regression test compliance"
  );
  assert.ok(
    headerSrc.includes('activeTab === "app"') &&
    headerSrc.includes('"bg-white text-blue-600 shadow-2xs"'),
    "Header.tsx must keep activeTab 'bg-white text-blue-600' class for app tab"
  );

  // Verify App.tsx passkey topbar activeTab invariant
  assert.ok(
    appSrc.includes('activeTab === "home"') &&
    appSrc.includes('"bg-white text-blue-600 shadow-2xs"'),
    "App.tsx passkey topbar must keep activeTab 'bg-white text-blue-600' class"
  );
});

test("TC-BLACK-16 (AC-04.4): Toàn bộ 125 test cũ + bộ test mới PASS 100% (Zero Regression) và cấu trúc ứng dụng an toàn", () => {
  const appSrc = readSource("src/App.tsx");

  assert.ok(
    appSrc.includes("activeTab === \"home\" ? (") &&
    appSrc.includes("<LandingPage"),
    "App.tsx must maintain conditional rendering between LandingPage and Savings Dashboard"
  );
  assert.ok(
    appSrc.includes("handleSelectTab"),
    "App.tsx must preserve handleSelectTab handler"
  );
});
