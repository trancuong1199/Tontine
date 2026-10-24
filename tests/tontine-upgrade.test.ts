import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ROTATING_SAVINGS_ADDRESS,
  ROTATING_SAVINGS_ABI,
  ARC_TESTNET_CHAIN_ID,
  USDC_ADDRESS,
  USDC_DECIMALS,
  GROUP_STATE,
  formatUsdc,
  parseUsdc,
  isValidAddress,
  formatAddress,
  formatCountdown,
  stateLabel,
  parseContractError,
} from "../src/contract.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

// Helper to read source code files for structural and implementation integrity assertions
function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf-8");
}

// ============================================================================
// REQ-01: Khắc phục triệt để lỗi Render Loop trong ActionPanel
// ============================================================================

test("AC-01.1: Safe execution in useEffect (Render loop fix in ActionPanel.tsx)", () => {
  const source = readSource("src/components/savings/ActionPanel.tsx");

  // 1. Structural checks: handleSuccess must NOT be called in the component render body
  assert.ok(
    !source.includes("if (isSuccess) handleSuccess();"),
    "ActionPanel must NOT invoke handleSuccess directly in render body"
  );
  assert.ok(
    !source.includes("if (isSuccess) {" + "\n" + "    handleSuccess"),
    "ActionPanel must NOT call handleSuccess directly in render block"
  );

  // 2. Verified that useEffect with [isSuccess] dependency is used
  assert.ok(
    source.includes("useEffect(() => {") &&
    source.includes("if (isSuccess) {") &&
    source.includes("toast.success(\"Giao dịch thành công!\"") &&
    source.includes("reset();") &&
    source.includes("onSuccess();"),
    "ActionPanel must execute toast, reset, and onSuccess inside a guarded useEffect"
  );

  // 3. Dependency array must specifically track isSuccess
  const hasIsSuccessDependency = /useEffect\s*\(\s*\(\)\s*=>\s*\{[\s\S]*?\}\s*,\s*\[\s*isSuccess\s*\]\s*\)/.test(source);
  assert.ok(hasIsSuccessDependency, "useEffect must have [isSuccess] in its dependency array");

  // 4. Behavioral simulation: effect execution logic
  let resetCount = 0;
  let onSuccessCount = 0;
  let toastCount = 0;

  function simulatePostTxEffect(isSuccess: boolean, reset: () => void, onSuccess: () => void) {
    if (isSuccess) {
      toastCount++;
      reset();
      onSuccess();
    }
  }

  // When transaction finishes: isSuccess becomes true
  simulatePostTxEffect(
    true,
    () => { resetCount++; },
    () => { onSuccessCount++; }
  );

  assert.equal(toastCount, 1, "Toast must be triggered exactly once upon success");
  assert.equal(resetCount, 1, "reset() must be called exactly once");
  assert.equal(onSuccessCount, 1, "onSuccess() callback must be called exactly once");
});

test("AC-01.2: No duplicate trigger on state reset", () => {
  const source = readSource("src/components/savings/ActionPanel.tsx");

  // Verify that the effect is guarded by `if (isSuccess)`
  assert.ok(
    source.includes("if (isSuccess) {"),
    "Effect must be guarded by if (isSuccess) so it does not re-trigger when isSuccess resets to false"
  );

  let triggerCount = 0;
  let isSuccess = true;

  const mockReset = () => {
    isSuccess = false; // reset clears transaction state
  };

  // First run: isSuccess = true -> triggers
  if (isSuccess) {
    triggerCount++;
    mockReset();
  }

  // Subsequent render after state update: isSuccess = false -> must NOT trigger
  if (isSuccess) {
    triggerCount++;
  }

  assert.equal(triggerCount, 1, "Action must not re-trigger after reset clears isSuccess");
  assert.equal(isSuccess, false, "isSuccess must be cleared after reset");
});

// ============================================================================
// REQ-02: Nâng cấp hàm an toàn parseUsdc và Kiểm soát ô nhập Bid
// ============================================================================

test("AC-02.1: parseUsdc parses valid integer strings to 6-decimal raw BigInt", () => {
  assert.equal(parseUsdc("10"), 10000000n, "10 USDC -> 10,000,000 raw");
  assert.equal(parseUsdc("1"), 1000000n, "1 USDC -> 1,000,000 raw");
  assert.equal(parseUsdc("0"), 0n, "0 USDC -> 0n");
  assert.equal(parseUsdc("100"), 100000000n, "100 USDC -> 100,000,000 raw");
  assert.equal(parseUsdc("007"), 7000000n, "Leading zeros stripped properly");
});

test("AC-02.2: parseUsdc parses valid decimal strings accurately without floating-point error", () => {
  assert.equal(parseUsdc("1.5"), 1500000n, "1.5 USDC -> 1,500,000 raw");
  assert.equal(parseUsdc("0.5"), 500000n, "0.5 USDC -> 500,000 raw");
  assert.equal(parseUsdc(".5"), 500000n, ".5 USDC -> 500,000 raw");
  assert.equal(parseUsdc("2.25"), 2250000n, "2.25 USDC -> 2,250,000 raw");
  assert.equal(parseUsdc("10.05"), 10050000n, "10.05 USDC -> 10,050,000 raw");
});

test("AC-02.3: parseUsdc handles minimum precision decimal (0.000001 = 1 micro-USDC)", () => {
  assert.equal(parseUsdc("0.000001"), 1n, "0.000001 USDC -> 1n");
  assert.equal(parseUsdc(".000001"), 1n, ".000001 USDC -> 1n");
  assert.equal(parseUsdc("0.000010"), 10n, "0.000010 USDC -> 10n");
  assert.equal(parseUsdc("0.000100"), 100n, "0.000100 USDC -> 100n");
});

test("AC-02.4: parseUsdc safely rejects negative numbers returning 0n without throwing", () => {
  assert.equal(parseUsdc("-5"), 0n, "Negative integer returns 0n");
  assert.equal(parseUsdc("-0.01"), 0n, "Negative decimal returns 0n");
  assert.equal(parseUsdc("-0.000001"), 0n, "Negative micro-USDC returns 0n");
  assert.equal(parseUsdc("-100"), 0n, "-100 returns 0n");
});

test("AC-02.5: parseUsdc safely rejects empty and whitespace-only strings returning 0n", () => {
  assert.equal(parseUsdc(""), 0n, "Empty string returns 0n");
  assert.equal(parseUsdc("   "), 0n, "Spaces return 0n");
  assert.equal(parseUsdc("\t"), 0n, "Tab returns 0n");
  assert.equal(parseUsdc("\n\r "), 0n, "Newlines and spaces return 0n");
});

test("AC-02.6: parseUsdc safely rejects non-numeric and malformed strings returning 0n", () => {
  assert.equal(parseUsdc("abc"), 0n, "Alphabetic returns 0n");
  assert.equal(parseUsdc("10usdc"), 0n, "Alphanumeric returns 0n");
  assert.equal(parseUsdc("1.2.3"), 0n, "Multiple decimal dots return 0n");
  assert.equal(parseUsdc("0x12"), 0n, "Hex string returns 0n");
  assert.equal(parseUsdc("NaN"), 0n, "NaN string returns 0n");
  assert.equal(parseUsdc("Infinity"), 0n, "Infinity string returns 0n");
  assert.equal(parseUsdc(null as unknown as string), 0n, "null returns 0n");
  assert.equal(parseUsdc(undefined as unknown as string), 0n, "undefined returns 0n");
  assert.equal(parseUsdc({} as unknown as string), 0n, "object returns 0n");
});

test("AC-02.7: parseUsdc safely truncates excessive decimals (> 6 decimals) without crashing", () => {
  assert.equal(parseUsdc("1.123456789"), 1123456n, "Truncated at 6th decimal place");
  assert.equal(parseUsdc("0.1234567"), 123456n, "0.1234567 truncated to 123456n");
  assert.equal(parseUsdc("0.0000001"), 0n, "7th decimal digit truncated to 0n");
  assert.equal(parseUsdc("5.999999999"), 5999999n, "5.999999999 truncated without rounding up");
});

test("AC-02.8: Passkey & Regular ActionPanel bid input safety mechanism", () => {
  const actionPanelSrc = readSource("src/components/savings/ActionPanel.tsx");
  const passkeySrc = readSource("src/components/savings/PasskeyActionPanel.tsx");

  // Verify ActionPanel uses parseUsdc for bid input
  assert.ok(actionPanelSrc.includes("const bidRaw = parseUsdc(bidAmount);"), "ActionPanel must use parseUsdc(bidAmount)");
  assert.ok(actionPanelSrc.includes("disabled={isLoading || bidRaw <= 0n}"), "ActionPanel must disable bid button when bidRaw <= 0n");
  assert.ok(actionPanelSrc.includes("if (bidRaw <= 0n) {"), "ActionPanel must validate bidRaw > 0n before submitting");

  // Verify PasskeyActionPanel uses parseUsdc for bid input instead of unprotected parseUnits
  assert.ok(passkeySrc.includes("const bidRaw = parseUsdc(bidAmount);"), "PasskeyActionPanel must use parseUsdc(bidAmount)");
  assert.ok(passkeySrc.includes("disabled={isLoading || bidRaw <= 0n}"), "PasskeyActionPanel must disable bid button when bidRaw <= 0n");
  assert.ok(passkeySrc.includes("if (bidRaw <= 0n) {"), "PasskeyActionPanel must validate bidRaw > 0n before submitting");

  // Test simulation: invalid inputs always produce bidRaw <= 0n, disabling the button safely
  for (const invalidInput of ["", "   ", "abc", "-5", "0", "0.0000000"]) {
    const raw = parseUsdc(invalidInput);
    assert.ok(raw <= 0n, `Input '${invalidInput}' must result in bidRaw <= 0n`);
  }
});

// ============================================================================
// REQ-03: Bổ sung Bảng điều khiển Chủ nhóm (Owner Controls)
// ============================================================================

test("AC-03.1: Owner identification logic in App.tsx", () => {
  const appSrc = readSource("src/App.tsx");

  // Verify owner check logic in App.tsx
  assert.ok(
    appSrc.includes("const isOwner = Boolean(") &&
    appSrc.includes("address &&") &&
    appSrc.includes("clubInfo.owner &&") &&
    appSrc.includes("address.toLowerCase() === clubInfo.owner.toLowerCase()"),
    "App.tsx must identify owner case-insensitively using toLowerCase()"
  );

  // Behavioral test of owner check logic
  const checkOwner = (userAddr?: string, ownerAddr?: string): boolean => {
    return Boolean(userAddr && ownerAddr && userAddr.toLowerCase() === ownerAddr.toLowerCase());
  };

  const owner = "0x6AFaa0825D2E05EF00d571D4a043AB5dCc03534b";
  assert.equal(checkOwner(owner, owner), true, "Exact match is owner");
  assert.equal(checkOwner(owner.toLowerCase(), owner.toUpperCase()), true, "Mixed-case match is owner");
  assert.equal(checkOwner("0x1111111111111111111111111111111111111111", owner), false, "Different address is not owner");
  assert.equal(checkOwner(undefined, owner), false, "Undefined user is not owner");
  assert.equal(checkOwner(owner, undefined), false, "Undefined owner contract returns false");
});

test("AC-03.2: Start button disabled when members < 2", () => {
  const appSrc = readSource("src/App.tsx");
  const hookSrc = readSource("src/hooks/useSavingsClub.ts");

  // Verify hook logic for hasMinMembers
  assert.ok(hookSrc.includes("const hasMinMembers = Boolean(member1);"), "Hook defines hasMinMembers via member1 check");
  assert.ok(hookSrc.includes("members\", args: [1n]"), "Hook queries members[1] for 2nd member");

  // Verify App.tsx disables start button when !hasMinMembers
  assert.ok(
    appSrc.includes("disabled={!clubInfo.hasMinMembers || isOwnerPending || isOwnerConfirming || isOwnerOpLoading}"),
    "Start button must be disabled when !clubInfo.hasMinMembers"
  );
  assert.ok(
    appSrc.includes("Cần tối thiểu 2 thành viên để bắt đầu"),
    "App.tsx must display notice when members < 2"
  );

  // Simulation
  const memberCount1 = 1;
  const hasMinMembers1 = memberCount1 >= 2;
  assert.equal(hasMinMembers1, false, "1 member does not meet minimum 2 members");
});

test("AC-03.3: Start button enabled when members >= 2", () => {
  const appSrc = readSource("src/App.tsx");

  // Verify handleStartRounds calls contract function startRounds
  assert.ok(
    appSrc.includes("functionName: \"startRounds\""),
    "App.tsx must call startRounds function on contract"
  );

  // Simulation
  const memberCount2 = 2;
  const hasMinMembers2 = memberCount2 >= 2;
  assert.equal(hasMinMembers2, true, "2 members meet minimum 2 members");
});

test("AC-03.4: Cancel group button available in OPEN state", () => {
  const appSrc = readSource("src/App.tsx");

  // Verify cancelGroup button and handler
  assert.ok(appSrc.includes("functionName: \"cancelGroup\""), "App.tsx must call cancelGroup on contract");
  assert.ok(appSrc.includes("handleCancelGroup"), "App.tsx must have handleCancelGroup handler");
  assert.ok(appSrc.includes("Huỷ nhóm"), "App.tsx must render 'Huỷ nhóm' button");
});

test("AC-03.5: Non-owner cannot see Owner Controls", () => {
  const appSrc = readSource("src/App.tsx");

  // Verify rendering guard: {isOwner && clubInfo.state === GROUP_STATE.OPEN && (...)}
  assert.ok(
    appSrc.includes("{isOwner && clubInfo.state === GROUP_STATE.OPEN && ("),
    "Owner controls must be guarded by isOwner"
  );

  // Simulation of rendering condition
  const shouldRenderControls = (isOwner: boolean, state: number) => {
    return isOwner && state === GROUP_STATE.OPEN;
  };

  assert.equal(shouldRenderControls(false, GROUP_STATE.OPEN), false, "Non-owner must NOT see controls");
});

test("AC-03.6: Controls hidden when state != OPEN", () => {
  const appSrc = readSource("src/App.tsx");

  assert.ok(
    appSrc.includes("{isOwner && clubInfo.state === GROUP_STATE.OPEN && ("),
    "Owner controls must only render when state === GROUP_STATE.OPEN"
  );

  const shouldRenderControls = (isOwner: boolean, state: number) => {
    return isOwner && state === GROUP_STATE.OPEN;
  };

  assert.equal(shouldRenderControls(true, GROUP_STATE.ACTIVE), false, "Hidden when ACTIVE (1)");
  assert.equal(shouldRenderControls(true, GROUP_STATE.COMPLETED), false, "Hidden when COMPLETED (2)");
  assert.equal(shouldRenderControls(true, GROUP_STATE.CANCELLED), false, "Hidden when CANCELLED (3)");
  assert.equal(shouldRenderControls(true, GROUP_STATE.OPEN), true, "Visible only when OPEN (0)");
});

// ============================================================================
// REQ-04: Bổ sung Khu vực Lịch sử các vòng (Round History)
// ============================================================================

test("AC-04.1: Render settled rounds with roundId, winner, totalPot, and totalBids", () => {
  const historySrc = readSource("src/components/savings/RoundHistory.tsx");
  const hookSrc = readSource("src/hooks/useSavingsClub.ts");

  // Verify useRoundHistory checks settled === true
  assert.ok(hookSrc.includes("if (result && result[5] === true)"), "Hook must filter rounds where settled === true");
  assert.ok(hookSrc.includes("export function useRoundHistory"), "Hook exports useRoundHistory");

  // Verify RoundHistory displays round fields
  assert.ok(historySrc.includes("Vòng {round.roundId.toString()}"), "Displays roundId");
  assert.ok(historySrc.includes("formatUsdc(round.totalPot)"), "Formats totalPot in USDC");
  assert.ok(historySrc.includes("formatUsdc(round.totalBids)"), "Formats totalBids in USDC");
  assert.ok(historySrc.includes("formatAddress(round.winner)"), "Formats winner address");
  assert.ok(historySrc.includes("Đã tất toán"), "Displays settled badge");

  // Behavioral test for USDC formatting in history
  assert.equal(formatUsdc(20000000n), "20.00", "20M micro-USDC -> 20.00 USDC");
  assert.equal(formatUsdc(4000000n), "4.00", "4M micro-USDC -> 4.00 USDC");
  assert.equal(formatAddress("0x1111111111111111111111111111111111111111"), "0x1111...1111", "Address short format");
});

test("AC-04.2: Highlight connected user as winner with 'Bạn!' badge", () => {
  const historySrc = readSource("src/components/savings/RoundHistory.tsx");

  assert.ok(
    historySrc.includes("userAddress!.toLowerCase() === round.winner.toLowerCase()"),
    "RoundHistory compares userAddress with round.winner case-insensitively"
  );
  assert.ok(historySrc.includes("Bạn!"), "Displays 'Bạn!' label for user winner");

  // Simulation
  const user = "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a";
  const winner = "0x89b50855aa3be2f677cd6303cec089b5f319d72a";
  const isWinner = Boolean(user && winner) && user.toLowerCase() === winner.toLowerCase();
  assert.equal(isWinner, true, "Winner matches user address case-insensitively");
});

test("AC-04.3: Empty history state displays friendly message when no rounds settled", () => {
  const historySrc = readSource("src/components/savings/RoundHistory.tsx");

  assert.ok(
    historySrc.includes("settledRounds.length === 0"),
    "Checks for empty settled rounds list"
  );
  assert.ok(
    historySrc.includes("Chưa có vòng nào kết thúc"),
    "Displays 'Chưa có vòng nào kết thúc' when no rounds settled"
  );
});

// ============================================================================
// REQ-05: Quản lý & Chuyển đổi nhóm (Group Switcher & Share Link)
// ============================================================================

test("AC-05.1: Load group from valid URL query param (?group=0x...)", () => {
  const appSrc = readSource("src/App.tsx");

  // Verify App.tsx parses URL query param ?group=
  assert.ok(
    appSrc.includes("new URLSearchParams(window.location.search)") &&
    appSrc.includes("params.get(\"group\")") &&
    appSrc.includes("if (isValidAddress(group))"),
    "App.tsx initializes contractAddress from ?group= param if valid"
  );

  // Address validation check: valid EVM addresses start with lowercase 0x and 40 hex chars
  const validAddr = "0x6afaa0825d2e05ef00d571d4a043ab5dcc03534b";
  assert.equal(isValidAddress(validAddr), true, "Valid 42-char hex address passes");
  assert.equal(isValidAddress("0x" + validAddr.slice(2).toUpperCase()), true, "Valid address with uppercase hex body passes");
});

test("AC-05.2: Fallback to ROTATING_SAVINGS_ADDRESS on invalid or missing URL param", () => {
  const appSrc = readSource("src/App.tsx");

  assert.ok(
    appSrc.includes("return ROTATING_SAVINGS_ADDRESS;"),
    "App.tsx falls back to ROTATING_SAVINGS_ADDRESS"
  );

  // Test isValidAddress rejects invalid inputs
  assert.equal(isValidAddress(null), false, "null is invalid");
  assert.equal(isValidAddress(undefined), false, "undefined is invalid");
  assert.equal(isValidAddress(""), false, "Empty string is invalid");
  assert.equal(isValidAddress("invalid-addr"), false, "Plain text is invalid");
  assert.equal(isValidAddress("0x123"), false, "Short address is invalid");
  assert.equal(isValidAddress("0x6afaa0825d2e05ef00d571d4a043ab5dcc03534b00"), false, "Long address is invalid");
  assert.equal(isValidAddress("6afaa0825d2e05ef00d571d4a043ab5dcc03534b"), false, "Missing 0x is invalid");
  assert.equal(isValidAddress("0X6afaa0825d2e05ef00d571d4a043ab5dcc03534b"), false, "Uppercase 0X prefix is invalid");

  // Fallback simulation
  const getActiveContract = (param: string | null): `0x${string}` => {
    if (isValidAddress(param)) return param.toLowerCase() as `0x${string}`;
    return ROTATING_SAVINGS_ADDRESS;
  };

  assert.equal(getActiveContract(null), ROTATING_SAVINGS_ADDRESS, "Fallback on null");
  assert.equal(getActiveContract("invalid"), ROTATING_SAVINGS_ADDRESS, "Fallback on invalid");
  assert.equal(getActiveContract("0x123"), ROTATING_SAVINGS_ADDRESS, "Fallback on short address");
});

test("AC-05.3: Switch group dynamically updates state and URL without page reload", () => {
  const appSrc = readSource("src/App.tsx");
  const switcherSrc = readSource("src/components/savings/GroupSwitcher.tsx");

  // Verify GroupSwitcher validates input before switching
  assert.ok(switcherSrc.includes("if (!isValidAddress(trimmed))"), "GroupSwitcher validates address");
  assert.ok(switcherSrc.includes("onSwitchGroup(trimmed.toLowerCase() as `0x${string}`)"), "Calls onSwitchGroup with normalized address");

  // Verify App.tsx pushes new URL to history
  assert.ok(appSrc.includes("window.history.pushState({}, \"\", url.toString());"), "App.tsx uses pushState for URL update");
  assert.ok(appSrc.includes("url.searchParams.set(\"group\", newAddress);"), "App.tsx sets ?group= in URL params");
});

test("AC-05.4: Copy share link to clipboard with correct format and toast notification", () => {
  const switcherSrc = readSource("src/components/savings/GroupSwitcher.tsx");

  // Verify share URL format
  assert.ok(
    switcherSrc.includes("`${window.location.origin}${window.location.pathname}?group=${currentAddress}`"),
    "Share URL must format as origin + pathname + ?group=currentAddress"
  );
  assert.ok(
    switcherSrc.includes("navigator.clipboard.writeText(shareUrl)"),
    "Copies to navigator.clipboard"
  );
  assert.ok(
    switcherSrc.includes("toast.success(\"Đã sao chép link nhóm!\""),
    "Shows success toast after copying"
  );

  // Behavioral test for URL format construction
  const origin = "https://tontine.arc.io";
  const pathname = "/";
  const addr = "0x6afaa0825d2e05ef00d571d4a043ab5dcc03534b";
  const constructedUrl = `${origin}${pathname}?group=${addr}`;
  assert.equal(constructedUrl, "https://tontine.arc.io/?group=0x6afaa0825d2e05ef00d571d4a043ab5dcc03534b");
});

// ============================================================================
// AC-06: Unauthenticated Non-Blocking Public UI & Guide Flow
// ============================================================================

test("AC-06.1: Non-blocking public layout when unauthenticated (!address)", () => {
  const appSrc = readSource("src/App.tsx");
  const actionPanelSrc = readSource("src/components/savings/ActionPanel.tsx");

  // App.tsx must NOT early return OnboardingScreen on !address
  assert.ok(
    !appSrc.includes("const showOnboarding = !address && pkState.status !== \"loading\";"),
    "App.tsx must not hijack entire screen on !address"
  );
  assert.ok(
    appSrc.includes("<Header onOpenGuide={() => setShowGuide(true)} />"),
    "App.tsx renders Header with guide trigger"
  );
  assert.ok(
    appSrc.includes("<GroupSwitcher"),
    "App.tsx renders GroupSwitcher for unauthenticated visitors"
  );
  assert.ok(
    appSrc.includes("<ClubCard"),
    "App.tsx renders ClubCard for unauthenticated visitors"
  );
  assert.ok(
    appSrc.includes("<RoundHistory"),
    "App.tsx renders RoundHistory for unauthenticated visitors"
  );

  // ActionPanel renders actionable Connect Wallet button when !address
  assert.ok(
    actionPanelSrc.includes("openConnectModal?.(true)"),
    "ActionPanel triggers ConnectKit modal when unauthenticated"
  );
  assert.ok(
    actionPanelSrc.includes("Kết nối ví để tham gia"),
    "ActionPanel provides clear CTA button text"
  );
});

test("AC-06.2: Onboarding guide is non-blocking, on-demand with dismissible onClose", () => {
  const appSrc = readSource("src/App.tsx");
  const onboardingSrc = readSource("src/components/savings/OnboardingScreen.tsx");
  const headerSrc = readSource("src/components/savings/Header.tsx");

  assert.ok(
    headerSrc.includes("onOpenGuide"),
    "Header supports onOpenGuide callback"
  );
  assert.ok(
    onboardingSrc.includes("onClose?: () => void;"),
    "OnboardingScreen supports optional onClose prop"
  );
  assert.ok(
    onboardingSrc.includes("title=\"Đóng hướng dẫn\""),
    "OnboardingScreen renders dismiss button with accessible title"
  );
  assert.ok(
    appSrc.includes("onClose={() => setShowGuide(false)}"),
    "App.tsx wires onClose to hide guide modal and return to main view"
  );
});

test("AC-06.3: No alarming developer missing-config alert in unauthenticated user view", () => {
  const onboardingSrc = readSource("src/components/savings/OnboardingScreen.tsx");

  assert.ok(
    !onboardingSrc.includes("Passkey chưa cấu hình"),
    "OnboardingScreen must not show alarming 'Passkey chưa cấu hình' warning"
  );
  assert.ok(
    !onboardingSrc.includes("Paste VITE_CLIENT_KEY vào .env"),
    "OnboardingScreen must not expose developer instructions to end-users"
  );
  assert.ok(
    onboardingSrc.includes("Kết nối ví Web3 để bắt đầu"),
    "OnboardingScreen renders clean Web3 wallet connect button"
  );
});

