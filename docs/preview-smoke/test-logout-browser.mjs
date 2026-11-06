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
  console.log("=== Starting Browser Test for Logout / Unauthenticated Guard ===");
  const userDataDir = `/tmp/chrome-unauth-test-${Date.now()}`;
  const port = 9444;

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

    // Clear any local storage so the session starts strictly unauthenticated
    await cdp.send("Page.navigate", { url: TARGET_URL });
    await sleep(2000);

    // Evaluate unauthenticated state
    const evalRes = await cdp.send("Runtime.evaluate", {
      expression: `
        (() => {
          const body = document.body ? document.body.innerText : "";
          const hasConnectCard = body.includes("Connect Wallet to Join BondedTontine V2") || body.includes("Connect Wallet to Join");
          const hasWorkspace = body.includes("Saigon Bonded Club V2") || body.includes("Member Actions") || body.includes("Permissionless Keeper Actions") || body.includes("Join Club (joinGroup)");
          return {
            bodyText: body,
            hasConnectCard,
            hasWorkspace
          };
        })()
      `,
      returnByValue: true,
    });

    const result = evalRes?.result?.value;
    console.log("Unauthenticated Check:");
    console.log(" - hasConnectCard:", result?.hasConnectCard);
    console.log(" - hasWorkspace (must be false):", result?.hasWorkspace);

    // Capture screenshot
    const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
    const shotPath = path.join(SCREENS_DIR, "logout-state-verified.png");
    fs.writeFileSync(shotPath, Buffer.from(shot.data, "base64"));
    console.log("Screenshot saved to:", shotPath);

    if (!result?.hasConnectCard) {
      throw new Error("FAILED: Connect Wallet card is NOT visible when logged out!");
    }
    if (result?.hasWorkspace) {
      throw new Error("FAILED: BondedClubWorkspace is still visible when logged out!");
    }
    console.log(" PASS: Unauthenticated view correctly shows only Connect Wallet card.");

    // Now test with connected wallet
    console.log("\nTesting Connected State...");
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
          } catch {}
        })();
      `,
    });

    await cdp.send("Page.navigate", { url: TARGET_URL });
    await sleep(2500);

    const connectedEval = await cdp.send("Runtime.evaluate", {
      expression: `
        (() => {
          const body = document.body ? document.body.innerText : "";
          const hasConnectCard = body.includes("Connect Wallet to Join BondedTontine V2");
          const hasWorkspace = body.includes("Saigon Bonded Club V2") || body.includes("Member Actions");
          return {
            hasConnectCard,
            hasWorkspace
          };
        })()
      `,
      returnByValue: true,
    });

    const connRes = connectedEval?.result?.value;
    console.log("Connected Check:");
    console.log(" - hasConnectCard (must be false):", connRes?.hasConnectCard);
    console.log(" - hasWorkspace (must be true):", connRes?.hasWorkspace);

    const shotConn = await cdp.send("Page.captureScreenshot", { format: "png" });
    const shotConnPath = path.join(SCREENS_DIR, "login-state-verified.png");
    fs.writeFileSync(shotConnPath, Buffer.from(shotConn.data, "base64"));
    console.log("Screenshot saved to:", shotConnPath);

    if (connRes?.hasConnectCard) {
      throw new Error("FAILED: Connect card still visible when authenticated!");
    }
    if (!connRes?.hasWorkspace) {
      throw new Error("FAILED: BondedClubWorkspace NOT visible when authenticated!");
    }

    console.log("\n SUCCESS: Both unauthenticated (logged out) and authenticated (logged in) states verified perfectly via browser!");
    cdp.close();
  } finally {
    chrome.kill("SIGKILL");
  }
}

runTest().catch((err) => {
  console.error("Test Error:", err);
  process.exit(1);
});
