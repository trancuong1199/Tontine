#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const SCREENS_DIR = path.join(ROOT, "docs/preview-screens");
fs.mkdirSync(SCREENS_DIR, { recursive: true });

const TARGET_URL = "http://127.0.0.1:5173/?tab=app&group=0x3D35E830fe5BA48Ff5b36DbBA9ecEbD3A7BAD59b";

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
    } catch {}
  }
}

async function runTest() {
  console.log("=== Testing Empty Directory & Phantom Club Removal ===");
  const userDataDir = `/tmp/chrome-empty-guard-${Date.now()}`;
  const port = 9777;

  const chrome = spawn(
    "/usr/bin/google-chrome",
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userDataDir}`,
      "--window-size=1440,1000",
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
      } catch {}
      await sleep(200);
    }

    const pageTarget = targets.find((t) => t.type === "page") || targets[0];
    const cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");

    // Inject connected wallet AND set removed groups to simulate user having deleted the club
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
      source: `
        (function() {
          const addr = "0xdB773cD554870d351e06c1430FF5811b273ABaf0";
          const chainIdHex = "0x4cef52";
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
              return null;
            },
          };
          Object.defineProperty(window, "ethereum", { value: provider, configurable: true, writable: false });
          try {
            localStorage.setItem("wagmi.injected.connected", "true");
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
            // All clubs removed from directory
            localStorage.setItem("hui_known_groups", JSON.stringify([]));
            localStorage.setItem("hui_removed_groups", JSON.stringify([
              "0x3d35e830fe5ba48ff5b36dbba9ecebd3a7bad59b",
              "0x6afaa0825d2e05ef00d571d4a043ab5dcc03534b",
              "0xe536ab0afa098cb6841781d7aa95f7b0fab7095b",
              "0xb15241ca499008e06823e93ca297ff8a3149d2a3",
              "0xe74069717317dbb86d423439fb9c219a5c5bf812",
              "0xf9469568ebb287275009fce3db224a16273c5d05",
              "0xe9ccfe9f2d53a5479a17d795635e0795e84d9130"
            ]));
          } catch {}
        })();
      `,
    });

    await cdp.send("Page.navigate", { url: TARGET_URL });
    await sleep(2500);

    // 1. Verify that when club is removed, main page shows Empty State, NOT BondedClubWorkspace
    const mainEval = await cdp.send("Runtime.evaluate", {
      expression: `
        (() => {
          const body = document.body ? document.body.innerText : "";
          const hasEmptyState = body.includes("No Savings Clubs Available") || body.includes("Chưa có nhóm Hụi nào trong danh sách");
          const hasPhantomWorkspace = body.includes("BondedTontine Club") || body.includes("Saigon Bonded Club") || body.includes("Member Actions") || body.includes("Permissionless Keeper Actions") || body.includes("Join Club (joinGroup)");
          return {
            body,
            hasEmptyState,
            hasPhantomWorkspace
          };
        })()
      `,
      returnByValue: true,
    });

    const mainRes = mainEval?.result?.value;
    console.log("Main Page Body Text:\n---\n" + (mainEval?.result?.value?.body || "") + "\n---");
    console.log("Main Page Check (without modal):");
    console.log(" - hasEmptyState (must be true):", mainRes?.hasEmptyState);
    console.log(" - hasPhantomWorkspace (must be false):", mainRes?.hasPhantomWorkspace);

    const mainShot = await cdp.send("Page.captureScreenshot", { format: "png" });
    const mainShotPath = path.join(SCREENS_DIR, "no-active-club-empty-state-verified.png");
    fs.writeFileSync(mainShotPath, Buffer.from(mainShot.data, "base64"));
    console.log("Screenshot saved to:", mainShotPath);

    if (!mainRes?.hasEmptyState) {
      throw new Error("FAILED: 'No Savings Clubs Available' empty state is NOT rendered!");
    }
    if (mainRes?.hasPhantomWorkspace) {
      throw new Error("FAILED: Phantom workspace is still visible when club is removed!");
    }

    // 2. Open Directory Modal to match user's screenshot exactly
    console.log("\nOpening Directory Modal...");
    await cdp.send("Runtime.evaluate", {
      expression: `
        (() => {
          const btn = Array.from(document.querySelectorAll("button"))
            .find((b) => b.innerText.includes("Open Club Directory") || b.innerText.includes("Mở Danh sách nhóm"));
          if (btn) btn.click();
        })()
      `,
    });
    await sleep(1000);

    const modalEval = await cdp.send("Runtime.evaluate", {
      expression: `
        (() => {
          const body = document.body ? document.body.innerText : "";
          const hasZeroClubsInModal = body.includes("0 savings clubs available") || body.includes("No savings clubs found in directory");
          const hasPhantomWorkspace = body.includes("BondedTontine Club") || body.includes("Saigon Bonded Club") || body.includes("Member Actions") || body.includes("Permissionless Keeper Actions");
          return {
            body,
            hasZeroClubsInModal,
            hasPhantomWorkspace
          };
        })()
      `,
      returnByValue: true,
    });

    const modalRes = modalEval?.result?.value;
    console.log("Modal Body Text:\n---\n" + (modalRes?.body || "") + "\n---");
    console.log("Modal + Background Check (matching user screenshot):");
    console.log(" - hasZeroClubsInModal (must be true):", modalRes?.hasZeroClubsInModal);
    console.log(" - hasPhantomWorkspace (must be false):", modalRes?.hasPhantomWorkspace);

    const modalShot = await cdp.send("Page.captureScreenshot", { format: "png" });
    const modalShotPath = path.join(SCREENS_DIR, "modal-zero-clubs-background-empty-verified.png");
    fs.writeFileSync(modalShotPath, Buffer.from(modalShot.data, "base64"));
    console.log("Screenshot saved to:", modalShotPath);

    if (!modalRes?.hasZeroClubsInModal) {
      throw new Error("FAILED: Modal does not show 0 savings clubs available!");
    }
    if (modalRes?.hasPhantomWorkspace) {
      throw new Error("FAILED: Phantom workspace is visible behind the modal!");
    }

    console.log("\n SUCCESS: Verified that when 0 clubs remain in directory, NO phantom club is rendered anywhere!");
    cdp.close();
  } finally {
    chrome.kill("SIGKILL");
  }
}

runTest().catch((err) => {
  console.error("Test Error:", err);
  process.exit(1);
});
