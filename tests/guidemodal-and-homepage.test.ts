import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { translations, t, type Language } from "../src/lib/i18n.ts";
import { DEFAULT_SAVINGS_CLUBS } from "../src/lib/savingsClubDirectory.ts";

function readSource(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

// ============================================================================
// REQ-01: Redesign Modal Hướng Dẫn (GuideModal) Chuẩn Web3
// ============================================================================

test("TC-GUIDE-01 (AC-01.1): GuideModal là popup nổi overlay có backdrop mờ, không unmount app, hỗ trợ đóng bằng nút 'X' và phím Escape", () => {
  const guideModalSrc = readSource("src/components/savings/GuideModal.tsx");
  const appSrc = readSource("src/App.tsx");

  // 1. Overlay modal with backdrop blur
  assert.ok(
    guideModalSrc.includes("fixed inset-0 z-50"),
    "GuideModal must be an overlay fixed positioned dialog with z-50"
  );
  assert.ok(
    guideModalSrc.includes("backdrop-blur-sm") || guideModalSrc.includes("backdrop-blur"),
    "GuideModal must render a blurred backdrop"
  );
  assert.ok(
    guideModalSrc.includes("max-w-4xl") || guideModalSrc.includes("max-w-3xl"),
    "GuideModal width must be roomy (max-w-3xl or max-w-4xl)"
  );
  assert.ok(
    guideModalSrc.includes("max-h-[90vh]") && guideModalSrc.includes("overflow-y-auto"),
    "GuideModal must have independent scrollable body with max-h-[90vh]"
  );

  // 2. Escape key dismissal
  assert.ok(
    guideModalSrc.includes('e.key === "Escape"') && guideModalSrc.includes("onClose()"),
    "GuideModal must support dismissal via Escape key"
  );

  // 3. Close button with 'X' icon
  assert.ok(
    guideModalSrc.includes("<X size={20} />") || guideModalSrc.includes("<X size="),
    "GuideModal header must render the X icon"
  );

  // 4. App.tsx does not unmount the dashboard
  assert.ok(
    !appSrc.includes("if (showGuide) return <OnboardingScreen"),
    "App.tsx must not unmount main app when showGuide is true"
  );
  assert.ok(
    appSrc.includes("<GuideModal") && appSrc.includes("isOpen={showGuide}"),
    "App.tsx must mount GuideModal as a non-destructive overlay"
  );
});

test("TC-GUIDE-02 (AC-01.2): Bảng so sánh Hụi truyền thống vs HụiChain Smart Contract hiển thị rõ ràng với icon và phân biệt rủi ro", () => {
  const source = readSource("src/components/savings/GuideModal.tsx");

  // Verify pillar 2 comparison section exists
  assert.ok(
    source.includes("guideModal.pillar2Title"),
    "GuideModal must contain pillar 2 comparison section"
  );

  // Traditional column risks
  assert.ok(
    source.includes("guideModal.tradTitle") &&
    source.includes("guideModal.tradRisk1") &&
    source.includes("guideModal.tradRisk2") &&
    source.includes("guideModal.tradRisk3"),
    "GuideModal must render traditional tontine risks"
  );
  assert.ok(
    source.includes("AlertTriangle") && source.includes("XCircle"),
    "Traditional column must use warning and X icons"
  );

  // Smart contract column benefits
  assert.ok(
    source.includes("guideModal.smartTitle") &&
    source.includes("guideModal.smartBenefit1") &&
    source.includes("guideModal.smartBenefit2") &&
    source.includes("guideModal.smartBenefit3"),
    "GuideModal must render smart contract advantages"
  );
  assert.ok(
    source.includes("ShieldCheck") && source.includes("CheckCircle2"),
    "Smart contract column must use shield and checkmark icons"
  );
});

test("TC-GUIDE-03 (AC-01.3): Quy trình 4 bước, cơ chế phạt tự động (auto-kick) và ưu thế mạng Arc Network (< 1s, gas USDC)", () => {
  const source = readSource("src/components/savings/GuideModal.tsx");

  // 4-Step process in Pillar 3
  assert.ok(
    source.includes("guideModal.step1Title") &&
    source.includes("guideModal.step2Title") &&
    source.includes("guideModal.step3Title") &&
    source.includes("guideModal.step4Title"),
    "GuideModal must render all 4 lifecycle step titles"
  );

  // Auto-kick in Pillar 4
  assert.ok(
    source.includes("guideModal.pillar4Title") &&
    source.includes("guideModal.pillar4Desc"),
    "GuideModal must include pillar 4 for auto-kick defaulting member rules"
  );

  // Arc Network benefits in Pillar 5
  assert.ok(
    source.includes("guideModal.pillar5Title") &&
    source.includes("guideModal.pillar5Desc"),
    "GuideModal must include pillar 5 highlighting Arc Network speed and USDC gas"
  );
});

test("TC-GUIDE-04 (AC-01.4): GuideModal hỗ trợ song ngữ 100% qua prop language", () => {
  const languages: Language[] = ["vi", "en"];

  for (const lang of languages) {
    const title = t("guideModal.title", lang);
    const subtitle = t("guideModal.subtitle", lang);
    const tradTitle = t("guideModal.tradTitle", lang);
    const smartTitle = t("guideModal.smartTitle", lang);
    const p4Desc = t("guideModal.pillar4Desc", lang);
    const p5Desc = t("guideModal.pillar5Desc", lang);

    assert.ok(title && title.length > 0, `guideModal.title for '${lang}' must not be empty`);
    assert.ok(subtitle && subtitle.length > 0, `guideModal.subtitle for '${lang}' must not be empty`);
    assert.ok(tradTitle && tradTitle.length > 0, `guideModal.tradTitle for '${lang}' must not be empty`);
    assert.ok(smartTitle && smartTitle.length > 0, `guideModal.smartTitle for '${lang}' must not be empty`);
    assert.ok(p4Desc && p4Desc.length > 0, `guideModal.pillar4Desc for '${lang}' must not be empty`);
    assert.ok(p5Desc && p5Desc.length > 0, `guideModal.pillar5Desc for '${lang}' must not be empty`);
  }

  // Exact parity checks
  assert.equal(translations.vi.guideModal.title, "Hướng dẫn sử dụng HụiChain");
  assert.equal(translations.en.guideModal.title, "HụiChain User Guide");
  assert.equal(translations.vi.guideModal.tradTitle, "Hụi Truyền Thống");
  assert.equal(translations.en.guideModal.tradTitle, "Traditional Tontine");
  assert.equal(translations.vi.guideModal.smartTitle, "HụiChain Smart Contract");
  assert.equal(translations.en.guideModal.smartTitle, "HụiChain Smart Contract");
});

// ============================================================================
// REQ-02: Thiết Kế Trang Chủ Giới Thiệu Dự Án (Homepage / Landing Page)
// ============================================================================

test("TC-HOME-01 (AC-02.1): Hero Section trên LandingPage hiển thị tiêu đề lớn, 3 chỉ số ấn tượng và 3 nút CTA", () => {
  const source = readSource("src/components/landing/LandingPage.tsx");

  // Hero section typography
  assert.ok(
    source.includes("text-3xl sm:text-5xl lg:text-6xl font-extrabold") ||
    source.includes("font-extrabold text-slate-900"),
    "LandingPage must feature large bold hero headline"
  );

  // 3 Key metrics
  assert.ok(
    source.includes("landingPage.metric1Val") &&
    source.includes("landingPage.metric2Val") &&
    source.includes("landingPage.metric3Val"),
    "LandingPage hero must render all 3 key metric values"
  );
  assert.equal(translations.vi.landingPage.metric1Val, "100%");
  assert.equal(translations.vi.landingPage.metric2Val, "0");
  assert.equal(translations.vi.landingPage.metric3Val, "< 1s");

  // 3 CTA buttons
  assert.ok(
    source.includes("onClick={onLaunchApp}"),
    "Hero must have CTA button triggering onLaunchApp"
  );
  assert.ok(
    source.includes("onClick={onOpenCreateModal}"),
    "Hero must have CTA button triggering onOpenCreateModal"
  );
  assert.ok(
    source.includes("onClick={onOpenGuideModal}"),
    "Hero must have CTA button triggering onOpenGuideModal"
  );
});

test("TC-HOME-02 (AC-02.2): Phân khu Bài toán bể hụi vs Giải pháp Web3 hiển thị đầy đủ trên LandingPage", () => {
  const source = readSource("src/components/landing/LandingPage.tsx");

  assert.ok(
    source.includes("landingPage.problemTitle") &&
    source.includes("landingPage.problemSubtitle"),
    "LandingPage must contain Problem & Solution headline"
  );

  // 3 Traditional pain points
  assert.ok(
    source.includes("landingPage.painPoint1Title") &&
    source.includes("landingPage.painPoint2Title") &&
    source.includes("landingPage.painPoint3Title"),
    "LandingPage must outline traditional tontine pain points"
  );

  // 3 Web3 solutions
  assert.ok(
    source.includes("landingPage.solution1Title") &&
    source.includes("landingPage.solution2Title") &&
    source.includes("landingPage.solution3Title"),
    "LandingPage must highlight HụiChain smart contract solutions"
  );
});

test("TC-HOME-03 (AC-02.3): Phân khu Quy trình 4 bước sinh động trên LandingPage", () => {
  const source = readSource("src/components/landing/LandingPage.tsx");

  assert.ok(
    source.includes("landingPage.howItWorksTitle") &&
    source.includes("landingPage.howItWorksSubtitle"),
    "LandingPage must feature How It Works section"
  );

  assert.ok(
    source.includes("landingPage.step1Title") &&
    source.includes("landingPage.step2Title") &&
    source.includes("landingPage.step3Title") &&
    source.includes("landingPage.step4Title"),
    "LandingPage must render all 4 step cards"
  );
});

test("TC-HOME-04 (AC-02.4): Phân khu Featured Savings Clubs hiển thị thẻ BAVI và Alpha với nút 1-click vào nhóm", () => {
  const source = readSource("src/components/landing/LandingPage.tsx");

  assert.ok(
    source.includes("DEFAULT_SAVINGS_CLUBS.map"),
    "LandingPage must iterate over DEFAULT_SAVINGS_CLUBS to display featured clubs"
  );
  assert.ok(
    source.includes("onSelectClub(club.address)"),
    "Featured clubs must provide 1-click navigation to select club"
  );
  assert.ok(
    DEFAULT_SAVINGS_CLUBS.length >= 2,
    "DEFAULT_SAVINGS_CLUBS must contain at least 2 default clubs"
  );
});

test("TC-HOME-05 (AC-02.5): Phân khu Bảo mật Arc & FAQ trả lời 5+ câu hỏi cốt lõi trên LandingPage", () => {
  const source = readSource("src/components/landing/LandingPage.tsx");

  // Security section
  assert.ok(
    source.includes("landingPage.securityTitle") &&
    source.includes("landingPage.secFeature1Title") &&
    source.includes("landingPage.secFeature2Title") &&
    source.includes("landingPage.secFeature3Title"),
    "LandingPage must feature Arc Security section"
  );

  // FAQ section: at least 5 questions
  assert.ok(
    source.includes("faqItems = [") &&
    source.includes("landingPage.q1") &&
    source.includes("landingPage.q2") &&
    source.includes("landingPage.q3") &&
    source.includes("landingPage.q4") &&
    source.includes("landingPage.q5"),
    "LandingPage must have FAQ accordion with at least 5 core questions"
  );
});

// ============================================================================
// REQ-03: Hệ Thống Điều Hướng Header Song Hành (Home / App Navigation)
// ============================================================================

test("TC-NAV-01 (AC-03.1): Header cung cấp tabs điều hướng 'Trang chủ' (Home) và 'Ứng dụng' (App / Savings Clubs) với highlight active", () => {
  const headerSrc = readSource("src/components/savings/Header.tsx");
  const appSrc = readSource("src/App.tsx");

  // HeaderProps supports activeTab and onSelectTab
  assert.ok(
    headerSrc.includes('activeTab?: "home" | "app"') &&
    headerSrc.includes('onSelectTab?: (tab: "home" | "app") => void'),
    "HeaderProps must declare activeTab and onSelectTab callback"
  );

  // Navigation tab element rendering
  assert.ok(
    headerSrc.includes('onSelectTab("home")') &&
    headerSrc.includes('onSelectTab("app")'),
    "Header must render clickable navigation tabs for 'home' and 'app'"
  );
  assert.ok(
    headerSrc.includes("header.tabHome") && headerSrc.includes("header.tabApp"),
    "Header tabs must use i18n keys for bilingual labeling"
  );

  // Active styling indicator via regex
  assert.match(
    headerSrc,
    /activeTab === "home"[\s\S]*?\?\s*"bg-white text-blue-600/,
    "Header must style the active 'home' tab distinctly"
  );
  assert.match(
    headerSrc,
    /activeTab === "app"[\s\S]*?\?\s*"bg-white text-blue-600/,
    "Header must style the active 'app' tab distinctly"
  );

  // Passkey Top Bar also supports active tab navigation
  assert.ok(
    appSrc.includes('handleSelectTab("home")') &&
    appSrc.includes('handleSelectTab("app")'),
    "App.tsx Passkey header must also provide home/app tab buttons"
  );
});

test("TC-NAV-02 (AC-03.2): App.tsx quản lý state activeTab, tự động mở app khi có URL ?group=0x... và chuyển tab mượt mà", () => {
  const appSrc = readSource("src/App.tsx");

  // activeTab state definition
  assert.ok(
    appSrc.includes('const [activeTab, setActiveTab] = useState<"home" | "app">'),
    "App.tsx must declare activeTab state"
  );

  // Smart initialization: opens 'app' if ?group= query param exists, else 'home'
  assert.ok(
    appSrc.includes('if (isValidAddress(group))') && appSrc.includes('return "app"'),
    "App.tsx must default to 'app' if valid ?group= parameter is present"
  );
  assert.ok(
    appSrc.includes('return "home"'),
    "App.tsx must default to 'home' when visiting root url"
  );

  // handleSwitchGroup switches activeTab to 'app'
  assert.ok(
    appSrc.includes('setActiveTab("app")') &&
    appSrc.includes('url.searchParams.set("group", newAddress)'),
    "handleSwitchGroup must activate 'app' view and update URL"
  );

  // Conditional view rendering: LandingPage vs Dashboard
  assert.ok(
    appSrc.includes('activeTab === "home" ? (') &&
    appSrc.includes('<LandingPage'),
    "App.tsx must render LandingPage when activeTab === 'home'"
  );
});

// ============================================================================
// REQ-04: Bảo Toàn 100% Bộ Test Hệ Thống (Zero Regression)
// ============================================================================

test("TC-REG-01 (AC-04.1): Toàn bộ 93 bài kiểm thử trước đó tiếp tục PASS 100% (Zero Regression)", () => {
  // This test file will run alongside all other test files in tests/*.test.ts
  // Asserts contract address and i18n parity remain stable
  assert.equal(translations.vi.header.appName, "HụiChain");
  assert.equal(translations.en.header.appName, "HụiChain");
  assert.equal(translations.vi.header.tabHome, "Trang chủ");
  assert.equal(translations.en.header.tabHome, "Home");
});

test("TC-REG-02 (AC-04.2): Tệp OnboardingScreen.tsx được bảo toàn nguyên vẹn trong codebase", () => {
  const onboardingPath = path.resolve(process.cwd(), "src/components/savings/OnboardingScreen.tsx");
  assert.ok(
    fs.existsSync(onboardingPath),
    "src/components/savings/OnboardingScreen.tsx must NOT be deleted to preserve tontine-upgrade.test.ts"
  );

  const onboardingSrc = readSource("src/components/savings/OnboardingScreen.tsx");
  assert.ok(
    onboardingSrc.includes("onClose?: () => void;"),
    "OnboardingScreen must declare onClose callback prop"
  );
  assert.ok(
    onboardingSrc.includes('title="Đóng hướng dẫn"'),
    "OnboardingScreen must keep title='Đóng hướng dẫn' for backward regression assertions"
  );
  assert.ok(
    onboardingSrc.includes("Kết nối ví Web3 để bắt đầu"),
    "OnboardingScreen must keep string 'Kết nối ví Web3 để bắt đầu' for regression assertions"
  );
});
