import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function readSource(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf-8");
}

test("TC-INVITE-01 (AC-01, BR-01.1): activeTab khởi tạo ưu tiên 'app' khi URL có tham số group hợp lệ", () => {
  const appSrc = readSource("src/App.tsx");

  // Locate activeTab useState initializer
  const activeTabMatch = appSrc.match(/const \[activeTab, setActiveTab\] = useState<"home" \| "app">\(\(\) => \{([\s\S]*?)\n  \}\);/);
  assert.ok(activeTabMatch, "activeTab initializer must be defined in App.tsx");
  const initBody = activeTabMatch[1];

  // Must check isValidAddress(group) before home fallback
  assert.ok(
    initBody.includes("const group = params.get(\"group\");") &&
    initBody.includes("if (isValidAddress(group)) {\n        return \"app\";\n      }"),
    "activeTab must prioritize valid group address and return 'app'"
  );
});

test("TC-INVITE-02 (AC-02, BR-02.1): URL cleaner bảo lưu tham số group hợp lệ khi chưa kết nối ví (!address)", () => {
  const appSrc = readSource("src/App.tsx");

  // Locate URL cleaner useEffect
  const urlCleanerMatch = appSrc.match(/\/\/ Auto-clean legacy dirty URLs[\s\S]*?if \(!address\) \{([\s\S]*?)\n      \} else if/);
  assert.ok(urlCleanerMatch, "URL cleaner for unauthenticated state must be defined");
  const cleanerBody = urlCleanerMatch[1];

  assert.ok(
    cleanerBody.includes("else if (isValidAddress(group)) {\n          // Valid invite link: preserve group query and maintain explicit group flag\n          setHasExplicitGroup(true);\n        }"),
    "URL cleaner must preserve group when valid address and set hasExplicitGroup to true"
  );
  assert.ok(
    cleanerBody.includes("cleanUrl.searchParams.delete(\"group\");") &&
    cleanerBody.includes("cleanUrl.searchParams.set(\"tab\", \"app\");"),
    "URL cleaner retains concise tab cleaning for invalid groups (TC-TAB-02 invariant)"
  );
});

test("TC-INVITE-03 (AC-03, BR-03.1): Giao diện Unauthenticated hiển thị thông điệp mời tham gia cụ thể khi có hasExplicitGroup", () => {
  const appSrc = readSource("src/App.tsx");

  // Check Unauthenticated View block
  const unauthMatch = appSrc.match(/\{!\isLoading && !hasNoActiveClub && !address && \(([\s\S]*?)\n        \)\}/);
  assert.ok(unauthMatch, "Unauthenticated card block must be defined in App.tsx");
  const unauthBody = unauthMatch[1];

  assert.ok(
    unauthBody.includes("hasExplicitGroup"),
    "Unauthenticated view must conditionally check hasExplicitGroup"
  );
  assert.ok(
    unauthBody.includes("Bạn được mời tham gia: ") &&
    unauthBody.includes("You're invited to join: "),
    "Unauthenticated view must display personalized invite title"
  );
  assert.ok(
    unauthBody.includes("Kết nối ví để tham gia ngay") &&
    unauthBody.includes("Connect Wallet to Join"),
    "Unauthenticated view button must invite user to connect and join"
  );
});

test("TC-INVITE-04 (AC-04, BR-04.1): Điều kiện hiển thị Main Content hiển thị nhóm ngay khi kết nối ví với hasExplicitGroup", () => {
  const appSrc = readSource("src/App.tsx");

  assert.ok(
    appSrc.includes("!isLoading && !hasNoActiveClub && Boolean(address) && (hasExplicitGroup || isUserAffiliated)"),
    "Main content must show ClubCard and ActionPanel when wallet connected and hasExplicitGroup is true"
  );
});

test("TC-INVITE-05 (AC-01, BR-01.2): onPopState ưu tiên activeTab='app' và contractAddress khi URL chứa group hợp lệ", () => {
  const appSrc = readSource("src/App.tsx");

  const popStateMatch = appSrc.match(/const onPopState = \(\) => \{([\s\S]*?)\n    \};/);
  assert.ok(popStateMatch, "onPopState must be defined");
  const popBody = popStateMatch[1];

  assert.ok(
    popBody.includes("else if (isValidAddress(group)) {") &&
    popBody.includes('setContractAddress(group.toLowerCase() as `0x${string}`);') &&
    popBody.includes('setActiveTab("app");'),
    "onPopState must route to app and update contractAddress when group is valid"
  );
});
