import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function readSource(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf-8");
}

test("TC-GUARD-01 (AC-01.1): App.tsx bắt buộc Boolean(address) trước khi render Main Content", () => {
  const appSrc = readSource("src/App.tsx");

  assert.ok(
    appSrc.includes("!isLoading && !hasNoActiveClub && Boolean(address) && (hasExplicitGroup || isUserAffiliated)"),
    "Main Content must strictly require Boolean(address) so clubs are never exposed without wallet"
  );
});

test("TC-GUARD-02 (AC-01.2): App.tsx luôn render Unauthenticated View khi !address bất kể URL có group hay không", () => {
  const appSrc = readSource("src/App.tsx");

  assert.ok(
    appSrc.includes("{!isLoading && !hasNoActiveClub && !address && ("),
    "Unauthenticated View must trigger strictly on !address"
  );
  assert.ok(
    !appSrc.includes("{!isLoading && !hasNoActiveClub && !address && !hasExplicitGroup && ("),
    "Unauthenticated View must not be bypassed by hasExplicitGroup when wallet is not connected"
  );
});

test("TC-CLEAN-01 (AC-02.1): App.tsx tự động dọn sạch query param về pathname khi chưa kết nối ví", () => {
  const appSrc = readSource("src/App.tsx");

  assert.ok(
    appSrc.includes("if (!address) {") &&
    appSrc.includes("window.history.replaceState({}, \"\", window.location.pathname);"),
    "App.tsx must replaceState to clean window.location.pathname when !address"
  );
});

test("TC-CLEAN-02 (AC-02.2): App.tsx tự động loại bỏ param thừa để giữ URL luôn sạch gọn", () => {
  const appSrc = readSource("src/App.tsx");

  assert.ok(
    appSrc.includes('url.searchParams.delete("tab");') &&
    appSrc.includes('cleanUrl.searchParams.delete("view");'),
    "App.tsx must strip tab and view params appropriately"
  );
});
