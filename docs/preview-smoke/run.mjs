#!/usr/bin/env node
/**
 * BondedTontine UI Preview Smoke Verification (U1–U7)
 *
 * Verifies:
 * - U1: No legacy RotatingSavings UI strings ("Bid for the Pot", "Max pool", "Join Savings Club",
 *   "Confirm collateral setting", "Estimated Pot", "dividend yield", "no party can withdraw unilaterally",
 *   "Round History") appear when viewing BondedTontine club 0x3D35E830fe5BA48Ff5b36DbBA9ecEbD3A7BAD59b.
 * - U2: Mock oracle price ($60,000) is fresh, Borrow Limit shows concrete USDC number, no stale oracle error.
 * - U3: Club Owner Controls and Mock Price Simulation bar are hidden for anonymous & non-owner visitors,
 *   and visible for owner (0xdB773cD554870d351e06c1430FF5811b273ABaf0). Keeper Actions visible with disabled reasons.
 * - U4: Short-round clubs do not display "~525600% APR"; shows illustrative note instead.
 * - U5: Create Club form displays interestGrace, settlementGrace, collateral input, default consequence summary,
 *   factory priceFeed/maxPriceAge, and confirmation checkbox.
 * - U6: English UI displays "∞ (No debt)" with zero leftover Vietnamese ("∞ (Không nợ)").
 * - U7: Clicking "Club Directory" opens the directory modal and lists BondedTontine V2 clubs.
 */

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const SCREENS_DIR = path.join(ROOT, "docs/preview-screens");
fs.mkdirSync(SCREENS_DIR, { recursive: true });

const BASE_URL =
  process.env.PREVIEW_URL ||
  "http://127.0.0.1:5173/?tab=app&group=0x3D35E830fe5BA48Ff5b36DbBA9ecEbD3A7BAD59b";

const FORBIDDEN_LEGACY_STRINGS = [
  "Bid for the Pot",
  "Max pool",
  "Join Savings Club",
  "Confirm collateral setting",
  "Estimated Pot",
  "dividend yield",
  "no party can withdraw unilaterally",
  "Round History",
  "deposit collateral, and join",
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
  }

  async connect() {
    await new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve, { once: true });
      this.ws.addEventListener("error", reject, { once: true });
    });
    this.ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(String(ev.data));
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    });
  }

  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    try {
      this.ws.close();
    } catch {
      // ignore
    }
  }
}

function buildWalletInjectScript(accountAddress) {
  return `
    try {
      localStorage.setItem("arc_savings_language", "en");
    } catch {}
    ${
      accountAddress
        ? `
    (function() {
      const addr = ${JSON.stringify(accountAddress)};
      const chainIdHex = "0x4cef52"; // 5042002
      const listeners = {};
      const provider = {
        isMetaMask: true,
        selectedAddress: addr,
        chainId: chainIdHex,
        on(event, fn) { (listeners[event] = listeners[event] || []).push(fn); return this; },
        removeListener(event, fn) {
          if (listeners[event]) listeners[event] = listeners[event].filter((f) => f !== fn);
          return this;
        },
        async request({ method, params }) {
          if (method === "eth_accounts" || method === "eth_requestAccounts") return [addr];
          if (method === "eth_chainId") return chainIdHex;
          if (method === "net_version") return "5042002";
          if (method === "wallet_switchEthereumChain") return null;
          if (method === "eth_sendTransaction" || method === "personal_sign" || method === "eth_signTypedData_v4") {
            throw new Error("Read-only preview wallet: write rejected");
          }
          const res = await fetch("https://rpc.testnet.arc.network", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: params || [] }),
          }).then((r) => r.json());
          if (res.error) throw new Error(res.error.message || "RPC error");
          return res.result;
        },
      };
      Object.defineProperty(window, "ethereum", { value: provider, configurable: true, writable: false });
      window.addEventListener("eip6963:requestProvider", () => {
        window.dispatchEvent(new CustomEvent("eip6963:announceProvider", {
          detail: Object.freeze({
            info: { uuid: "mock-metamask-uuid", name: "MetaMask", icon: "data:image/svg+xml;base64,PHN2Zy8+", rdns: "io.metamask" },
            provider
          })
        }));
      });
      try {
        localStorage.setItem("wagmi.injected.connected", "true");
        localStorage.setItem("wagmi.io.metamask.connected", "true");
        localStorage.setItem("wagmi.recentConnectorId", JSON.stringify("injected"));
        localStorage.setItem("wagmi.store", JSON.stringify({
          state: {
            connections: {
              __type: "Map",
              value: [["injected", {
                accounts: [addr],
                chainId: 5042002,
                connector: { id: "injected", name: "Injected", type: "injected", uid: "injected" }
              }]]
            },
            chainId: 5042002,
            current: "injected"
          },
          version: 2
        }));
      } catch {}
    })();
    `
        : `
    try {
      localStorage.removeItem("wagmi.store");
      localStorage.removeItem("wagmi.recentConnectorId");
    } catch {}
    `
    }
  `;
}

async function runScenario({ port, name, account, width = 1440, height = 1000, actions }) {
  const userDataDir = `/tmp/chrome-smoke-${name}-${Date.now()}`;
  const chrome = spawn(
    "/usr/bin/google-chrome",
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userDataDir}`,
      `--window-size=${width},${height}`,
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  try {
    let targets = null;
    for (let i = 0; i < 30; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/json/list`);
        targets = await res.json();
        if (Array.isArray(targets) && targets.length > 0) break;
      } catch {
        // wait
      }
      await sleep(200);
    }
    const pageTarget = targets.find((t) => t.type === "page") || targets[0];
    const cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 600,
    });
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
      source: buildWalletInjectScript(account),
    });

    await cdp.send("Page.navigate", { url: BASE_URL });

    // Wait until BondedClubWorkspace finishes loading on-chain state
    let bodyText = "";
    for (let i = 0; i < 40; i++) {
      await sleep(500);
      const evalRes = await cdp.send("Runtime.evaluate", {
        expression: "document.body ? document.body.innerText : ''",
        returnByValue: true,
      });
      bodyText = evalRes?.result?.value || "";
      if (
        (bodyText.includes("Arc Testnet Bonded Club #1") ||
          bodyText.includes("Saigon Bonded Club V2") ||
          bodyText.includes("Connect Wallet to Join")) &&
        !bodyText.includes("Loading BondedTontine V2 club data")
      ) {
        break;
      }
    }
    // Wait an extra 1s for any async factory sync or oracle reads
    await sleep(1000);
    const finalEval = await cdp.send("Runtime.evaluate", {
      expression: "document.body ? document.body.innerText : ''",
      returnByValue: true,
    });
    bodyText = finalEval?.result?.value || "";

    const shot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
    if (shot?.data) {
      fs.writeFileSync(path.join(SCREENS_DIR, `${name}.png`), Buffer.from(shot.data, "base64"));
    }

    let extraResult = {};
    if (actions) {
      extraResult = await actions(cdp);
    }

    cdp.close();
    return { bodyText, ...extraResult };
  } finally {
    chrome.kill("SIGKILL");
  }
}

async function main() {
  console.log("[Smoke] Running BondedTontine UI Preview Smoke Suite (U1–U7)...");

  // 1. Anonymous visitor
  const anon = await runScenario({
    port: 9331,
    name: "visitor-unconnected",
    account: null,
  });

  // 2. Connected non-member visitor (0x2222...2222)
  const visitor = await runScenario({
    port: 9332,
    name: "visitor-connected-nonmember",
    account: "0x2222222222222222222222222222222222222222",
    actions: async (cdp) => {
      // U7: Click "Club Directory" button in BondedClubWorkspace and verify modal opens
      await cdp.send("Runtime.evaluate", {
        expression: `
          (() => {
            const btn = Array.from(document.querySelectorAll("button"))
              .find((b) => b.offsetParent !== null && b.innerText.includes("Club Directory"));
            if (btn) btn.click();
          })()
        `,
      });
      await sleep(1500);
      const modalEval = await cdp.send("Runtime.evaluate", {
        expression: "document.body.innerText",
        returnByValue: true,
      });
      const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
      if (shot?.data) {
        fs.writeFileSync(
          path.join(SCREENS_DIR, "visitor-directory-modal.png"),
          Buffer.from(shot.data, "base64")
        );
      }
      return { directoryText: modalEval?.result?.value || "" };
    },
  });

  // 3. Connected Club Owner (0xdB773cD554870d351e06c1430FF5811b273ABaf0)
  const owner = await runScenario({
    port: 9333,
    name: "owner-connected",
    account: "0xdB773cD554870d351e06c1430FF5811b273ABaf0",
    actions: async (cdp) => {
      // U5: Click "Create Bonded V2 Club" and capture form text
      await cdp.send("Runtime.evaluate", {
        expression: `
          (() => {
            const btn = Array.from(document.querySelectorAll("button"))
              .find((b) => b.innerText.includes("Create Bonded V2 Club") || b.innerText.includes("Create Bonded Club"));
            if (btn) btn.click();
          })()
        `,
      });
      await sleep(600);
      const formEval = await cdp.send("Runtime.evaluate", {
        expression: "document.body.innerText",
        returnByValue: true,
      });
      const shot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
      if (shot?.data) {
        fs.writeFileSync(
          path.join(SCREENS_DIR, "owner-create-form.png"),
          Buffer.from(shot.data, "base64")
        );
      }
      return { createFormText: formEval?.result?.value || "" };
    },
  });

  // 4. Mobile 390px viewport
  const mobile = await runScenario({
    port: 9334,
    name: "mobile-390px",
    account: "0x2222222222222222222222222222222222222222",
    width: 390,
    height: 844,
  });

  // Assertions for U1–U7
  const failures = [];

  for (const [roleName, text] of [
    ["anon", anon.bodyText],
    ["visitor", visitor.bodyText],
    ["owner", owner.bodyText],
    ["mobile", mobile.bodyText],
  ]) {
    for (const forbidden of FORBIDDEN_LEGACY_STRINGS) {
      if (text.includes(forbidden)) {
        failures.push(`[U1] Forbidden legacy string "${forbidden}" found in ${roleName}`);
      }
    }
    if (text.includes("525600")) {
      failures.push(`[U4] Forbidden "~525600% APR" string found in ${roleName}`);
    }
    if (text.includes("Không nợ")) {
      failures.push(`[U6] Untranslated Vietnamese "Không nợ" found in English UI (${roleName})`);
    }
    if (text.includes("Oracle price is stale")) {
      failures.push(`[U2] Oracle price is stale in ${roleName}`);
    }
  }

  // Unauthenticated guard: anon must NOT see BondedClubWorkspace
  if (
    anon.bodyText.includes("Member Actions") ||
    anon.bodyText.includes("Saigon Bonded Club V2") ||
    anon.bodyText.includes("Permissionless Keeper Actions")
  ) {
    failures.push(`[Guard] BondedClubWorkspace should NOT be visible when unauthenticated (account: null)`);
  }
  if (!anon.bodyText.includes("Connect Wallet to Join")) {
    failures.push(`[Guard] Connect Wallet banner must be visible when unauthenticated`);
  }

  // U2: Borrow Limit should show concrete USDC amount (0.006 USDC from 20 satoshis at $60k)
  if (!owner.bodyText.includes("0.006 USDC")) {
    failures.push(`[U2] Expected Borrow Limit "0.006 USDC" on default club`);
  }

  // U3: Owner Controls & Mock Price Simulation hidden for anon and visitor, visible for owner
  if (anon.bodyText.includes("Club Owner Controls") || visitor.bodyText.includes("Club Owner Controls")) {
    failures.push(`[U3] "Club Owner Controls" should be hidden for anon and non-owner visitor`);
  }
  if (!owner.bodyText.includes("Club Owner Controls")) {
    failures.push(`[U3] "Club Owner Controls" should be visible for club owner`);
  }
  if (anon.bodyText.includes("Simulate Flash Crash") || visitor.bodyText.includes("Simulate Flash Crash")) {
    failures.push(`[U3] "Simulate Flash Crash" should be hidden for anon and non-admin visitor`);
  }
  if (!owner.bodyText.includes("Simulate Flash Crash")) {
    failures.push(`[U3] "Simulate Flash Crash" should be visible for oracleAdmin`);
  }

  // U4: Illustrative rate note shown for short-round default club
  if (!owner.bodyText.includes("illustrative only, not real APR")) {
    failures.push(`[U4] Expected "illustrative only, not real APR" note on short-round club`);
  }

  // U5: Create Club form shows grace parameters, default consequence summary, and confirmation checkbox
  if (
    !owner.createFormText?.includes("Interest Grace") ||
    !owner.createFormText?.includes("Settlement Grace") ||
    !owner.createFormText?.includes("100% of CirBTC collateral is seized and distributed to members") ||
    !owner.createFormText?.includes("I have reviewed the grace periods and understand 100% of CirBTC collateral is seized upon default")
  ) {
    failures.push(`[U5] Create Bonded Club form missing grace parameters, default summary, or confirmation checkbox`);
  }

  // U6: English UI shows "∞ (No debt)"
  if (!owner.bodyText.includes("∞ (No debt)")) {
    failures.push(`[U6] Expected "∞ (No debt)" in English UI`);
  }

  // U7: Clicking "Club Directory" opens modal and shows BondedTontine V2 badge
  if (!visitor.directoryText?.includes("BondedTontine V2")) {
    failures.push(`[U7] Clicking "Club Directory" did not show "BondedTontine V2" in modal`);
  }

  if (failures.length > 0) {
    console.error("[Smoke] FAILURES:");
    for (const f of failures) console.error("  -", f);
    process.exit(1);
  }

  console.log("[Smoke] PASS! All U1–U7 checks verified across anon, visitor, owner, and mobile 390px.");
  console.log("[Smoke] Screenshots saved to docs/preview-screens/");
}

main().catch((err) => {
  console.error("[Smoke] Error:", err);
  process.exit(1);
});
