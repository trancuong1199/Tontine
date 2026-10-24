import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function readSource(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

// ============================================================================
// AC-01: Cải tiến trạng thái Đóng góp trong MemberStatus
// ============================================================================

test("TC-OPEN-01: MemberStatus renders 'Chờ mở vòng 1' with Clock icon in OPEN state (AC-01.1)", () => {
  const source = readSource("src/components/savings/MemberStatus.tsx");

  // Must import Clock from lucide-react
  assert.ok(source.includes("Clock"), "MemberStatus must import Clock icon");

  // In GROUP_STATE.OPEN, must render 'Chờ mở vòng 1' instead of warning
  assert.ok(
    source.includes("state === GROUP_STATE.OPEN"),
    "MemberStatus must check for GROUP_STATE.OPEN"
  );
  assert.ok(
    source.includes("Chờ mở vòng 1"),
    "MemberStatus must render 'Chờ mở vòng 1' when state is OPEN"
  );
  assert.ok(
    source.includes("<Clock size={16}"),
    "MemberStatus must render Clock icon for OPEN state contribution"
  );
});

test("TC-OPEN-02: MemberStatus conditionally displays 'Đã đóng' vs 'Chưa đóng' when state != OPEN (AC-01.2)", () => {
  const source = readSource("src/components/savings/MemberStatus.tsx");

  assert.ok(
    source.includes("{hasContributed ? \"Đã đóng\" : \"Chưa đóng\"}"),
    "MemberStatus must display 'Đã đóng' or 'Chưa đóng' outside of OPEN state"
  );
  assert.ok(
    source.includes("CheckCircle2") && source.includes("AlertCircle"),
    "MemberStatus must support both CheckCircle2 and AlertCircle"
  );
});

test("TC-OPEN-03: MemberStatusProps declares state prop and App.tsx passes it (AC-01.3)", () => {
  const memberStatusSrc = readSource("src/components/savings/MemberStatus.tsx");
  const appSrc = readSource("src/App.tsx");

  assert.ok(
    memberStatusSrc.includes("state?: number;"),
    "MemberStatusProps must include optional state property"
  );
  assert.ok(
    appSrc.includes("<MemberStatus") && appSrc.includes("state={clubInfo.state}"),
    "App.tsx must pass clubInfo.state to MemberStatus"
  );
});

// ============================================================================
// AC-02: Bảng giải thích & Lộ trình Vòng đời trong ActionPanel
// ============================================================================

test("TC-OPEN-04: ActionPanel renders clear member confirmation badge in OPEN state (AC-02.1)", () => {
  const source = readSource("src/components/savings/ActionPanel.tsx");

  assert.ok(
    source.includes("Bạn đã là thành viên của nhóm!"),
    "ActionPanel must confirm membership clearly"
  );
  assert.ok(
    source.includes("Giai đoạn đăng ký (OPEN)"),
    "ActionPanel must state current phase is OPEN"
  );
});

test("TC-OPEN-05: ActionPanel explains why contribution button is not yet present (AC-02.2)", () => {
  const source = readSource("src/components/savings/ActionPanel.tsx");

  assert.ok(
    source.includes("Vì sao chưa thấy chỗ đóng tiền?"),
    "ActionPanel must provide explanatory section for missing contribution button"
  );
  assert.ok(
    source.includes("Vòng 1 chính thức bắt đầu"),
    "ActionPanel must explain contributions start only when Round 1 begins"
  );
});

test("TC-OPEN-06: ActionPanel renders 3-step lifecycle progress roadmap (AC-02.3)", () => {
  const source = readSource("src/components/savings/ActionPanel.tsx");

  assert.ok(
    source.includes("Quy trình tiếp theo:"),
    "ActionPanel must outline next steps"
  );
  assert.ok(
    source.includes("tối thiểu <strong>2 thành viên</strong>"),
    "Step 1 mentions minimum 2 members"
  );
  assert.ok(
    source.includes("Chủ nhóm bấm <strong>\"Bắt đầu các vòng\"</strong>"),
    "Step 2 mentions Owner starting the rounds"
  );
  assert.ok(
    source.includes("Nút <strong>\"Đóng góp"),
    "Step 3 explains contribution button will appear"
  );
});

test("TC-OPEN-07: ActionPanel provides invite friends copy link button with feedback (AC-02.4)", () => {
  const source = readSource("src/components/savings/ActionPanel.tsx");

  assert.ok(
    source.includes("handleCopyInvite"),
    "ActionPanel must declare handleCopyInvite function"
  );
  assert.ok(
    source.includes("navigator.clipboard.writeText"),
    "handleCopyInvite must write to clipboard"
  );
  assert.ok(
    source.includes("Mời bạn bè gia nhập để nhóm đủ điều kiện"),
    "ActionPanel must render invite CTA button"
  );
});

// ============================================================================
// AC-03 & AC-04: Đồng bộ PasskeyActionPanel & Sức chứa ClubCard
// ============================================================================

test("TC-OPEN-08: PasskeyActionPanel provides matching explanation, stepper & invite (AC-03.1)", () => {
  const source = readSource("src/components/savings/PasskeyActionPanel.tsx");

  assert.ok(
    source.includes("Vì sao chưa thấy nút đóng tiền?"),
    "PasskeyActionPanel must explain why button is not yet present"
  );
  assert.ok(
    source.includes("Mời bạn bè để đủ điều kiện mở vòng"),
    "PasskeyActionPanel must render invite button"
  );
});

test("TC-OPEN-09: ClubCard displays capacity condition in OPEN state (AC-04.1)", () => {
  const source = readSource("src/components/savings/ClubCard.tsx");

  assert.ok(
    source.includes("Cần tối thiểu 2 để bắt đầu"),
    "ClubCard must display condition to start in capacity progress bar"
  );
  assert.ok(
    source.includes("Đủ điều kiện bắt đầu"),
    "ClubCard must display ready state when members >= 2"
  );
});
