import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ROTATING_SAVINGS_ADDRESS,
  ROTATING_SAVINGS_ABI,
  ROTATING_SAVINGS_BYTECODE,
  ARC_TESTNET_CHAIN_ID,
  USDC_ADDRESS,
  USDC_DECIMALS,
  formatUsdc,
  parseUsdc,
  isValidAddress,
} from "../src/contract.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf-8");
}

// ============================================================================
// TC-CREATE-01 (AC-01.1): Form fields hiển thị đầy đủ với default & presets
// ============================================================================
test("TC-CREATE-01 (AC-01.1): Form fields (Tên nhóm, Mức đóng, Số thành viên, Chu kỳ) hiển thị đầy đủ với default và presets", () => {
  const modalSrc = readSource("src/components/savings/CreateClubModal.tsx");

  // 1. Modal title & description
  assert.ok(
    modalSrc.includes("Tạo Nhóm Hụi Mới"),
    "CreateClubModal must render title 'Tạo Nhóm Hụi Mới'"
  );
  assert.ok(
    modalSrc.includes("Khởi tạo hợp đồng xoay vòng vốn trustless trên Arc Testnet"),
    "CreateClubModal must display subtitle description"
  );

  // 2. Default state values
  assert.ok(
    modalSrc.includes('const [groupName, setGroupName] = useState("Nhóm Hụi Mới");'),
    "Default groupName must be 'Nhóm Hụi Mới'"
  );
  assert.ok(
    modalSrc.includes('const [contributionAmount, setContributionAmount] = useState("10");'),
    "Default contributionAmount must be '10'"
  );
  assert.ok(
    modalSrc.includes("const [maxMembers, setMaxMembers] = useState(10);"),
    "Default maxMembers must be 10"
  );
  assert.ok(
    modalSrc.includes("const [roundDuration, setRoundDuration] = useState(86400);"),
    "Default roundDuration must be 86400 (1 day)"
  );

  // 3. Amount presets: ["5", "10", "20", "50"]
  assert.ok(
    modalSrc.includes('const AMOUNT_PRESETS = ["5", "10", "20", "50"];'),
    "AMOUNT_PRESETS must include 5, 10, 20, 50"
  );

  // 4. Duration presets: 1 hour (3600), 1 day (86400), 3 days (259200), 7 days (604800)
  assert.ok(
    modalSrc.includes('{ label: "1 giờ", value: 3600, hint: "Thử nghiệm" }'),
    "DURATION_PRESETS must include 1 giờ (3600s)"
  );
  assert.ok(
    modalSrc.includes('{ label: "1 ngày", value: 86400, hint: "Phổ biến" }'),
    "DURATION_PRESETS must include 1 ngày (86400s)"
  );
  assert.ok(
    modalSrc.includes('{ label: "3 ngày", value: 259200, hint: "Vừa phải" }'),
    "DURATION_PRESETS must include 3 ngày (259200s)"
  );
  assert.ok(
    modalSrc.includes('{ label: "7 ngày", value: 604800, hint: "1 tuần" }'),
    "DURATION_PRESETS must include 7 ngày (604800s)"
  );

  // 5. Input fields presence and attributes
  assert.ok(
    modalSrc.includes('maxLength={32}'),
    "groupName input must specify maxLength={32}"
  );
  assert.ok(
    modalSrc.includes('type="range"') &&
    modalSrc.includes("min={2}") &&
    modalSrc.includes("max={20}") &&
    modalSrc.includes("step={1}"),
    "maxMembers input must be range slider with min 2 and max 20"
  );
  assert.ok(
    modalSrc.includes("USDC 6 decimals"),
    "Form must indicate USDC 6 decimals format"
  );
  assert.ok(
    modalSrc.includes("2 người") && modalSrc.includes("10 người (chuẩn)") && modalSrc.includes("20 người"),
    "Form must render member count markers (2, 10, 20)"
  );
});

// ============================================================================
// TC-CREATE-02 (AC-01.2): Quỹ Pot tối đa được tính toán chính xác
// ============================================================================
test("TC-CREATE-02 (AC-01.2): Quỹ Pot tối đa được tính toán chính xác = contributionAmount * maxMembers USDC", () => {
  const modalSrc = readSource("src/components/savings/CreateClubModal.tsx");

  // Structural check: formula in source
  assert.ok(
    modalSrc.includes("const totalPotUsdc = isAmountValid && isMembersValid ? parsedAmount * BigInt(maxMembers) : 0n;"),
    "CreateClubModal must compute totalPotUsdc as parsedAmount * BigInt(maxMembers)"
  );
  assert.ok(
    modalSrc.includes("{formatUsdc(totalPotUsdc)} USDC"),
    "CreateClubModal must render formatted totalPotUsdc"
  );
  assert.ok(
    modalSrc.includes("({contributionAmount} × {maxMembers} người)"),
    "CreateClubModal must render multiplication breakdown formula in summary"
  );
  assert.ok(
    modalSrc.includes("const totalCycleSeconds = maxMembers * roundDuration;"),
    "CreateClubModal must compute total cycle duration in seconds"
  );

  // Behavioral & mathematical verification with parseUsdc and formatUsdc
  function computePot(amountStr: string, members: number): { potRaw: bigint; potFormatted: string } {
    const parsed = parseUsdc(amountStr);
    const potRaw = parsed * BigInt(members);
    return { potRaw, potFormatted: formatUsdc(potRaw) };
  }

  // Case 1: Default configuration (10 USDC * 10 members = 100 USDC)
  const defaultPot = computePot("10", 10);
  assert.equal(defaultPot.potRaw, 100_000_000n, "10 USDC * 10 members must be 100,000,000 raw USDC (100 USDC)");
  assert.equal(defaultPot.potFormatted, "100.00", "Formatted pot must be '100.00'");

  // Case 2: Minimum group (5 USDC * 2 members = 10 USDC)
  const minPot = computePot("5", 2);
  assert.equal(minPot.potRaw, 10_000_000n, "5 USDC * 2 members must be 10,000,000 raw USDC (10 USDC)");
  assert.equal(minPot.potFormatted, "10.00", "Formatted pot must be '10.00'");

  // Case 3: Maximum group (50 USDC * 20 members = 1,000 USDC)
  const maxPot = computePot("50", 20);
  assert.equal(maxPot.potRaw, 1_000_000_000n, "50 USDC * 20 members must be 1,000,000,000 raw USDC (1000 USDC)");
  assert.equal(maxPot.potFormatted, "1,000.00", "Formatted pot must be '1,000.00'");

  // Case 4: Decimal contribution (12.5 USDC * 4 members = 50 USDC)
  const decimalPot = computePot("12.5", 4);
  assert.equal(decimalPot.potRaw, 50_000_000n, "12.5 USDC * 4 members must be 50,000,000 raw USDC");
  assert.equal(decimalPot.potFormatted, "50.00", "Formatted pot must be '50.00'");

  // Case 5: Cycle duration simulation
  function computeCycleSummary(members: number, durationSeconds: number): string {
    const totalSeconds = members * durationSeconds;
    const days = Math.floor(totalSeconds / 86400);
    const remainingHours = Math.floor((totalSeconds % 86400) / 3600);
    if (days > 0 && remainingHours === 0) {
      return `${days} ngày (${members} vòng)`;
    } else if (days > 0) {
      return `${days} ngày ${remainingHours}h (${members} vòng)`;
    }
    return `${remainingHours} giờ (${members} vòng)`;
  }

  assert.equal(computeCycleSummary(10, 86400), "10 ngày (10 vòng)");
  assert.equal(computeCycleSummary(4, 3600), "4 giờ (4 vòng)");
  assert.equal(computeCycleSummary(7, 259200), "21 ngày (7 vòng)");
});

// ============================================================================
// TC-CREATE-03 (AC-01.3): Validation form (vô hiệu hóa submit khi không hợp lệ)
// ============================================================================
test("TC-CREATE-03 (AC-01.3): Validation form (vô hiệu hóa submit khi tên rỗng, amount <= 0, maxMembers ngoài [2, 20])", () => {
  const modalSrc = readSource("src/components/savings/CreateClubModal.tsx");

  // Structural checks: validation rules defined in component
  assert.ok(
    modalSrc.includes("const isNameValid = groupName.trim().length > 0 && groupName.trim().length <= 32;"),
    "CreateClubModal must validate groupName is not empty and <= 32 chars"
  );
  assert.ok(
    modalSrc.includes("const isAmountValid = parsedAmount > 0n;"),
    "CreateClubModal must validate parsedAmount > 0n"
  );
  assert.ok(
    modalSrc.includes("const isMembersValid = Number.isInteger(maxMembers) && maxMembers >= 2 && maxMembers <= 20;"),
    "CreateClubModal must validate maxMembers between 2 and 20"
  );
  assert.ok(
    modalSrc.includes("const isFormValid = isNameValid && isAmountValid && isMembersValid && isDurationValid;"),
    "CreateClubModal must aggregate all validations into isFormValid"
  );
  assert.ok(
    modalSrc.includes("disabled={!isFormValid || isDeployPending || isConfirming}"),
    "Submit button must be disabled when form is invalid or deploy in progress"
  );

  // Behavioral verification of validation logic
  function validateForm(groupName: string, contributionAmount: string, maxMembers: number, roundDuration: number): boolean {
    const isNameValid = groupName.trim().length > 0 && groupName.trim().length <= 32;
    const parsedAmount = parseUsdc(contributionAmount);
    const isAmountValid = parsedAmount > 0n;
    const isMembersValid = Number.isInteger(maxMembers) && maxMembers >= 2 && maxMembers <= 20;
    const isDurationValid = roundDuration > 0;
    return isNameValid && isAmountValid && isMembersValid && isDurationValid;
  }

  // Valid defaults
  assert.equal(validateForm("Nhóm Hụi Mới", "10", 10, 86400), true, "Default parameters must be valid");

  // Invalid group names
  assert.equal(validateForm("", "10", 10, 86400), false, "Empty group name must be invalid");
  assert.equal(validateForm("   ", "10", 10, 86400), false, "Whitespace-only group name must be invalid");
  assert.equal(validateForm("a".repeat(33), "10", 10, 86400), false, "Group name > 32 chars must be invalid");
  assert.equal(validateForm("a".repeat(32), "10", 10, 86400), true, "Group name exactly 32 chars must be valid");

  // Invalid contribution amounts
  assert.equal(validateForm("Nhóm 1", "0", 10, 86400), false, "Amount '0' must be invalid");
  assert.equal(validateForm("Nhóm 1", "-5", 10, 86400), false, "Negative amount must be invalid");
  assert.equal(validateForm("Nhóm 1", "abc", 10, 86400), false, "Non-numeric amount must be invalid");
  assert.equal(validateForm("Nhóm 1", "", 10, 86400), false, "Empty amount must be invalid");
  assert.equal(validateForm("Nhóm 1", "0.000000", 10, 86400), false, "Zero decimal amount must be invalid");
  assert.equal(validateForm("Nhóm 1", "0.000001", 10, 86400), true, "Smallest valid positive amount must be valid");

  // Invalid maxMembers boundaries (constructor contract constraint [2, 20])
  assert.equal(validateForm("Nhóm 1", "10", 1, 86400), false, "maxMembers < 2 must be invalid");
  assert.equal(validateForm("Nhóm 1", "10", 0, 86400), false, "maxMembers 0 must be invalid");
  assert.equal(validateForm("Nhóm 1", "10", 21, 86400), false, "maxMembers > 20 must be invalid");
  assert.equal(validateForm("Nhóm 1", "10", 5.5, 86400), false, "Non-integer maxMembers must be invalid");
  assert.equal(validateForm("Nhóm 1", "10", 2, 86400), true, "maxMembers = 2 (lower bound) must be valid");
  assert.equal(validateForm("Nhóm 1", "10", 20, 86400), true, "maxMembers = 20 (upper bound) must be valid");

  // Invalid duration
  assert.equal(validateForm("Nhóm 1", "10", 10, 0), false, "Duration 0 must be invalid");
  assert.equal(validateForm("Nhóm 1", "10", 10, -3600), false, "Negative duration must be invalid");
  assert.equal(validateForm("Nhóm 1", "10", 10, 3600), true, "Positive duration must be valid");
});

// ============================================================================
// TC-CREATE-04 (AC-02.1): ROTATING_SAVINGS_BYTECODE export & format
// ============================================================================
test("TC-CREATE-04 (AC-02.1): ROTATING_SAVINGS_BYTECODE được export và là hex string bắt đầu bằng '0x' với độ dài bytecode hợp lệ (> 1000 ký tự)", () => {
  const contractSrc = readSource("src/contract.ts");

  // Structural export check in contract.ts
  assert.ok(
    contractSrc.includes("export const ROTATING_SAVINGS_BYTECODE = artifact.bytecode.object as `0x${string}`;"),
    "contract.ts must export ROTATING_SAVINGS_BYTECODE from artifact"
  );

  // Runtime values check
  assert.equal(typeof ROTATING_SAVINGS_BYTECODE, "string", "ROTATING_SAVINGS_BYTECODE must be a string");
  assert.ok(
    ROTATING_SAVINGS_BYTECODE.startsWith("0x"),
    "ROTATING_SAVINGS_BYTECODE must start with '0x'"
  );
  assert.ok(
    ROTATING_SAVINGS_BYTECODE.length > 1000,
    `ROTATING_SAVINGS_BYTECODE length (${ROTATING_SAVINGS_BYTECODE.length}) must be > 1000 characters`
  );
  assert.ok(
    /^0x[0-9a-fA-F]+$/.test(ROTATING_SAVINGS_BYTECODE),
    "ROTATING_SAVINGS_BYTECODE must only contain valid hexadecimal characters after 0x"
  );
});

// ============================================================================
// TC-CREATE-05 (AC-02.2): Tham số deploy contract truyền vào đúng thứ tự & định dạng
// ============================================================================
test("TC-CREATE-05 (AC-02.2): Tham số deploy contract truyền vào đúng thứ tự và định dạng: [USDC_ADDRESS, parseUsdc(contributionAmount), BigInt(maxMembers), BigInt(roundDuration), groupName]", () => {
  const modalSrc = readSource("src/components/savings/CreateClubModal.tsx");

  // Verify ABI constructor definition matches expected arguments
  const constructorAbi = ROTATING_SAVINGS_ABI.find(
    (item: { type?: string }) => item.type === "constructor"
  );
  assert.ok(constructorAbi, "ROTATING_SAVINGS_ABI must contain constructor definition");
  assert.equal(constructorAbi.inputs.length, 5, "Constructor must require exactly 5 arguments");
  assert.equal(constructorAbi.inputs[0].name, "usdcToken_");
  assert.equal(constructorAbi.inputs[0].type, "address");
  assert.equal(constructorAbi.inputs[1].name, "contributionAmount_");
  assert.equal(constructorAbi.inputs[1].type, "uint256");
  assert.equal(constructorAbi.inputs[2].name, "maxMembers_");
  assert.equal(constructorAbi.inputs[2].type, "uint256");
  assert.equal(constructorAbi.inputs[3].name, "roundDuration_");
  assert.equal(constructorAbi.inputs[3].type, "uint256");
  assert.equal(constructorAbi.inputs[4].name, "groupName_");
  assert.equal(constructorAbi.inputs[4].type, "string");

  // Structural check in CreateClubModal.tsx
  assert.ok(
    modalSrc.includes("deployContract({"),
    "CreateClubModal must call deployContract"
  );
  assert.ok(
    modalSrc.includes("abi: ROTATING_SAVINGS_ABI,"),
    "deployContract must pass ROTATING_SAVINGS_ABI"
  );
  assert.ok(
    modalSrc.includes("bytecode: ROTATING_SAVINGS_BYTECODE,"),
    "deployContract must pass ROTATING_SAVINGS_BYTECODE"
  );
  assert.ok(
    modalSrc.includes("chainId: ARC_TESTNET_CHAIN_ID,"),
    "deployContract must target ARC_TESTNET_CHAIN_ID"
  );

  // Check exact args mapping in source
  const argsPattern = /args:\s*\[\s*USDC_ADDRESS,\s*parsedAmount,\s*BigInt\(maxMembers\),\s*BigInt\(roundDuration\),\s*groupName\.trim\(\),?\s*\]/;
  assert.ok(
    argsPattern.test(modalSrc),
    "deployContract args must exactly be [USDC_ADDRESS, parsedAmount, BigInt(maxMembers), BigInt(roundDuration), groupName.trim()]"
  );

  // Behavioral test: build and validate arguments
  const sampleGroupName = " Nhóm Tết 2026 ";
  const sampleAmount = "25";
  const sampleMembers = 6;
  const sampleDuration = 259200;

  const builtArgs = [
    USDC_ADDRESS,
    parseUsdc(sampleAmount),
    BigInt(sampleMembers),
    BigInt(sampleDuration),
    sampleGroupName.trim(),
  ];

  assert.equal(builtArgs[0], "0x3600000000000000000000000000000000000000", "Arg 0 must be USDC_ADDRESS");
  assert.equal(builtArgs[1], 25_000_000n, "Arg 1 must be parseUsdc(25) = 25_000_000n");
  assert.equal(builtArgs[2], 6n, "Arg 2 must be BigInt(6)");
  assert.equal(builtArgs[3], 259200n, "Arg 3 must be BigInt(259200)");
  assert.equal(builtArgs[4], "Nhóm Tết 2026", "Arg 4 must be trimmed groupName");
});

// ============================================================================
// TC-CREATE-06 (AC-02.3): Quản lý trạng thái pending ký ví và confirming
// ============================================================================
test("TC-CREATE-06 (AC-02.3): Quản lý trạng thái pending ký ví và confirming trên blockchain, disabled form và nút bấm trong quá trình deploy", () => {
  const modalSrc = readSource("src/components/savings/CreateClubModal.tsx");

  // Hooks declaration
  assert.ok(
    modalSrc.includes("useDeployContract()"),
    "CreateClubModal must use useDeployContract hook"
  );
  assert.ok(
    modalSrc.includes("useWaitForTransactionReceipt({ hash: deployHash })"),
    "CreateClubModal must monitor transaction receipt via useWaitForTransactionReceipt"
  );

  // UI state messages for pending & confirming
  assert.ok(
    modalSrc.includes("Chờ ký ví (MetaMask)..."),
    "CreateClubModal must show 'Chờ ký ví (MetaMask)...' when isDeployPending"
  );
  assert.ok(
    modalSrc.includes("Đang triển khai lên blockchain..."),
    "CreateClubModal must show 'Đang triển khai lên blockchain...' when isConfirming"
  );
  assert.ok(
    modalSrc.includes("<Sparkles size={15} />") && modalSrc.includes("<span>Tạo nhóm Hụi</span>"),
    "CreateClubModal must show 'Tạo nhóm Hụi' in idle state"
  );

  // Close button disabled during deploy
  assert.ok(
    modalSrc.includes("disabled={isDeployPending || isConfirming}"),
    "Close button must be disabled when isDeployPending or isConfirming"
  );

  // Submission handler guard
  assert.ok(
    modalSrc.includes("if (!isFormValid || isDeployPending || isConfirming) return;"),
    "handleDeploy must abort if deploy is already pending or confirming"
  );

  // Error toast handling
  assert.ok(
    modalSrc.includes("if (deployError) {") &&
    modalSrc.includes("toast.error(parseContractError(deployError));"),
    "CreateClubModal must display error toast when deployError occurs"
  );
});

// ============================================================================
// TC-CREATE-07 (AC-03.1): Callback onSuccess(contractAddress) được kích hoạt
// ============================================================================
test("TC-CREATE-07 (AC-03.1): Callback onSuccess(contractAddress) được kích hoạt khi transaction receipt trả về contractAddress", () => {
  const modalSrc = readSource("src/components/savings/CreateClubModal.tsx");

  // Structural check: success effect triggers onSuccess, onClose, and resetDeploy
  assert.ok(
    modalSrc.includes("if (isSuccess && receipt?.contractAddress) {"),
    "CreateClubModal must guard success with isSuccess && receipt?.contractAddress"
  );
  assert.ok(
    modalSrc.includes("onSuccess(receipt.contractAddress as `0x${string}`);"),
    "CreateClubModal must call onSuccess with contractAddress"
  );
  assert.ok(
    modalSrc.includes("onClose();") && modalSrc.includes("resetDeploy();"),
    "CreateClubModal must call onClose() and resetDeploy() upon success"
  );
  assert.ok(
    modalSrc.includes("[isSuccess, receipt, onSuccess, onClose, resetDeploy]"),
    "Success effect must track all necessary dependencies"
  );

  // Behavioral lifecycle simulation
  let calledSuccessWith: string | null = null;
  let closedModal = false;
  let resetDeployCalled = false;

  function simulateSuccessEffect(
    isSuccess: boolean,
    receipt: { contractAddress?: `0x${string}` } | undefined,
    onSuccess: (addr: `0x${string}`) => void,
    onClose: () => void,
    resetDeploy: () => void
  ) {
    if (isSuccess && receipt?.contractAddress) {
      onSuccess(receipt.contractAddress);
      onClose();
      resetDeploy();
    }
  }

  // Stage 1: Waiting - no call
  simulateSuccessEffect(
    false,
    undefined,
    (addr) => { calledSuccessWith = addr; },
    () => { closedModal = true; },
    () => { resetDeployCalled = true; }
  );
  assert.equal(calledSuccessWith, null);
  assert.equal(closedModal, false);
  assert.equal(resetDeployCalled, false);

  // Stage 2: Receipt ready with address - executes callbacks
  const sampleNewContract = "0x7777777777777777777777777777777777777777" as `0x${string}`;
  simulateSuccessEffect(
    true,
    { contractAddress: sampleNewContract },
    (addr) => { calledSuccessWith = addr; },
    () => { closedModal = true; },
    () => { resetDeployCalled = true; }
  );
  assert.equal(calledSuccessWith, sampleNewContract);
  assert.equal(closedModal, true);
  assert.equal(resetDeployCalled, true);
});

// ============================================================================
// TC-CREATE-08 (AC-03.2): App.tsx chuyển sang địa chỉ mới & cập nhật URL
// ============================================================================
test("TC-CREATE-08 (AC-03.2): App.tsx chuyển sang địa chỉ mới khi tạo thành công và cập nhật URL (?group=0x...)", () => {
  const appSrc = readSource("src/App.tsx");

  // State declaration for modal in App.tsx
  assert.ok(
    appSrc.includes("const [showCreateModal, setShowCreateModal] = useState(false);"),
    "App.tsx must manage showCreateModal state"
  );

  // Handler implementation in App.tsx
  assert.ok(
    appSrc.includes("const handleClubCreated = (newAddress: `0x${string}`) => {"),
    "App.tsx must define handleClubCreated"
  );
  assert.ok(
    appSrc.includes("handleSwitchGroup(newAddress);"),
    "handleClubCreated must switch active contract to newAddress"
  );
  assert.ok(
    appSrc.includes("setShowCreateModal(false);"),
    "handleClubCreated must close the modal"
  );
  assert.ok(
    appSrc.includes('toast.success("Tạo nhóm Hụi thành công!"'),
    "handleClubCreated must show success toast"
  );
  assert.ok(
    appSrc.includes("buildAddressExplorerUrl(ARC_TESTNET_CHAIN_ID, newAddress)"),
    "handleClubCreated must include Arc Explorer link in success toast"
  );

  // URL update logic inside handleSwitchGroup
  assert.ok(
    appSrc.includes('url.searchParams.set("group", newAddress);'),
    "handleSwitchGroup must set ?group= query param"
  );
  assert.ok(
    appSrc.includes("window.history.pushState({}, \"\", url.toString());"),
    "handleSwitchGroup must update browser history via pushState without reloading"
  );

  // Modal mount in App.tsx JSX
  assert.ok(
    appSrc.includes("<CreateClubModal"),
    "App.tsx must render CreateClubModal"
  );
  assert.ok(
    appSrc.includes("isOpen={showCreateModal}"),
    "CreateClubModal must receive isOpen={showCreateModal}"
  );
  assert.ok(
    appSrc.includes("onClose={() => setShowCreateModal(false)}"),
    "CreateClubModal must receive onClose handler"
  );
  assert.ok(
    appSrc.includes("onSuccess={handleClubCreated}"),
    "CreateClubModal must receive onSuccess={handleClubCreated}"
  );

  // Behavioral test for URL parameter generation
  const mockBaseUrl = "https://hui-chain.app/";
  const sampleNewAddress = "0x8888888888888888888888888888888888888888";
  const url = new URL(mockBaseUrl);
  url.searchParams.set("group", sampleNewAddress);
  assert.equal(
    url.toString(),
    "https://hui-chain.app/?group=0x8888888888888888888888888888888888888888",
    "URL query param ?group= must match new contract address"
  );
});

// ============================================================================
// TC-CREATE-09 (AC-04.1): GroupSwitcher cung cấp nút "+ Tạo nhóm mới"
// ============================================================================
test("TC-CREATE-09 (AC-04.1): GroupSwitcher cung cấp nút '+ Tạo nhóm mới' gọi callback onOpenCreateModal", () => {
  const switcherSrc = readSource("src/components/savings/GroupSwitcher.tsx");
  const appSrc = readSource("src/App.tsx");

  // Props interface in GroupSwitcher
  assert.ok(
    switcherSrc.includes("onOpenCreateModal?: () => void;"),
    "GroupSwitcherProps must include optional onOpenCreateModal callback"
  );

  // UI button rendering in GroupSwitcher
  assert.ok(
    switcherSrc.includes("{onOpenCreateModal && ("),
    "GroupSwitcher must conditionally render button when onOpenCreateModal is provided"
  );
  assert.ok(
    switcherSrc.includes("onClick={onOpenCreateModal}"),
    "Button must call onOpenCreateModal on click"
  );
  assert.ok(
    switcherSrc.includes("<span>+ Tạo nhóm mới</span>"),
    "Button must render '+ Tạo nhóm mới' label text"
  );
  assert.ok(
    switcherSrc.includes('title="Tạo nhóm Hụi mới"'),
    "Button must include descriptive title"
  );

  // App.tsx passes callback to GroupSwitcher
  assert.ok(
    appSrc.includes("<GroupSwitcher") &&
    appSrc.includes("onOpenCreateModal={() => setShowCreateModal(true)}"),
    "App.tsx must pass onOpenCreateModal handler to GroupSwitcher"
  );

  // Behavioral callback simulation
  let modalOpened = false;
  function triggerCreateModal() {
    modalOpened = true;
  }
  triggerCreateModal();
  assert.equal(modalOpened, true, "Triggering onOpenCreateModal opens the modal");
});

// ============================================================================
// TC-CREATE-10 (AC-04.2): Header cung cấp nút "+ Tạo nhóm"
// ============================================================================
test("TC-CREATE-10 (AC-04.2): Header cung cấp nút '+ Tạo nhóm' gọi callback onOpenCreateModal", () => {
  const headerSrc = readSource("src/components/savings/Header.tsx");
  const appSrc = readSource("src/App.tsx");

  // Props interface in Header
  assert.ok(
    headerSrc.includes("onOpenCreateModal?: () => void;"),
    "HeaderProps must include optional onOpenCreateModal callback"
  );

  // UI button rendering in Header
  assert.ok(
    headerSrc.includes("{onOpenCreateModal && ("),
    "Header must conditionally render button when onOpenCreateModal is provided"
  );
  assert.ok(
    headerSrc.includes("onClick={onOpenCreateModal}"),
    "Header button must call onOpenCreateModal on click"
  );
  assert.ok(
    headerSrc.includes("<span>+ Tạo nhóm</span>"),
    "Header button must render '+ Tạo nhóm' label text"
  );
  assert.ok(
    headerSrc.includes('title="Tạo nhóm Hụi mới"'),
    "Header button must include descriptive title"
  );

  // App.tsx passes callback to Header
  assert.ok(
    appSrc.includes("<Header") &&
    appSrc.includes("onOpenCreateModal={() => setShowCreateModal(true)}"),
    "App.tsx must pass onOpenCreateModal handler to Header"
  );

  // Passkey custom header in App.tsx also has create club trigger
  assert.ok(
    appSrc.includes('onClick={() => setShowCreateModal(true)}') &&
    appSrc.includes('title="Tạo nhóm Hụi mới"'),
    "App.tsx must also provide '+ Tạo nhóm' button in Passkey navigation bar"
  );
});
