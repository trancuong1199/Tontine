import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function readSource(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf-8");
}

test("TC-TAB-01 (AC-01.1, AC-01.2): handleSelectTab('app') thiết lập duy nhất tab=app và xóa bỏ group để URL luôn ngắn gọn", () => {
  const appSrc = readSource("src/App.tsx");

  // Locate handleSelectTab block
  const handleSelectTabMatch = appSrc.match(/const handleSelectTab = \(tab: "home" \| "app"\) => \{[\s\S]*?\n  \};/);
  assert.ok(handleSelectTabMatch, "handleSelectTab must be defined in App.tsx");
  const fnBody = handleSelectTabMatch[0];

  assert.ok(
    fnBody.includes('url.searchParams.set("tab", "app");'),
    "handleSelectTab must set tab=app"
  );
  assert.ok(
    fnBody.includes('url.searchParams.delete("group");'),
    "handleSelectTab must delete group param so switching tabs never appends contract address"
  );
  assert.ok(
    fnBody.includes('url.searchParams.delete("view");'),
    "handleSelectTab must delete view param"
  );
  assert.ok(
    fnBody.includes('const cleanPath = url.pathname + (url.search ? url.search : "");'),
    "handleSelectTab must push cleanPath with concise tab=app parameter"
  );
});

test("TC-TAB-02 (AC-02.1, AC-02.2): URL cleaner tự động chuẩn hóa URL về ?tab=app khi chưa có ví", () => {
  const appSrc = readSource("src/App.tsx");

  assert.ok(
    appSrc.includes('cleanUrl.searchParams.delete("group");') &&
    appSrc.includes('cleanUrl.searchParams.set("tab", "app");'),
    "Must clean group and preserve concise tab=app when unauthenticated"
  );
  assert.ok(
    appSrc.includes('if (activeTab === "home")') &&
    appSrc.includes('window.history.replaceState({}, "", window.location.pathname);'),
    "Must preserve clean pathname on home tab"
  );
});
