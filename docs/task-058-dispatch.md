# Task-058 — Fix Mobile Layout Overflow, Sluggish Scrolling & Passkey Mobile Diagnostics

- **Task ID**: task-058
- **Date**: 2026-11-01
- **Leader**: Leader Agent
- **Assigned BA**: BA Agent (`docs/ba/task-058/**`)
- **Assigned Developer**: Dev Agent (`src/components/savings/Header.tsx`, `src/App.tsx`, `src/components/landing/LandingPage.tsx`, `src/hooks/usePasskeyWallet.ts`, `src/components/savings/ArcAppKitModal.tsx`, `docs/manifests/task-058/**`)
- **Assigned Tester**: Independent QA Agent (`tests/mobile-layout-and-passkey.test.ts`, `docs/qa/task-058/**`)

---

## 1. Problem Statement

User feedback:
> "sao layout trên mobile lỗi hết vậy và rất đơ, ngoài ra passkey cũng không work khi vào bằng điện thoại. Layout trên mobile thì dùng thêm browserskill để check nhé"

### Diagnostics via Headless Chrome Mobile Emulation (390px Viewport):
1. **Header Layout Overflow (728px width in 390px viewport)**:
   - The right header group (`flex items-center gap-1.5 sm:gap-2.5 shrink-0`) has a combined width of 428px.
   - Together with the Brand Logo (~110px) and Navigation Tabs (~150px), the total header content is **728px wide**.
   - On mobile screens (360px - 414px), the language button, Arc AppKit button, Guide button, and **ConnectKitButton** are completely pushed off-screen to the right (x = 395px to 728px).
   - Mobile users cannot even see or tap the "Connect Wallet" button!
2. **Mobile GPU Sluggishness ("Rất đơ")**:
   - `src/App.tsx` and `LandingPage.tsx` render 7 fixed background glow spheres up to 900px in size with `blur-[140px]`, `blur-[110px]`, and `blur-[100px]`, without `overflow-hidden` on the outer fixed wrapper.
   - On mobile GPUs, rendering overlapping 140px blurs forces continuous software rasterization.
   - In `LandingPage.tsx`, `setScrollY` fired on every single scroll frame without throttling, triggering full-component re-renders of 943 lines of SVG and Bezier paths on every frame.
3. **Passkey Failures on Mobile Phones**:
   - `VITE_CLIENT_KEY` is not configured in `.env`.
   - When users tap "Đăng ký Ví Passkey", `ArcAppKitModal` immediately closed (`onClose()`), while errors in `usePasskeyWallet` were silent (never toasted or displayed).
   - In-app browsers (Telegram, Zalo, Facebook Messenger, WeChat) disable the WebAuthn API (`window.PublicKeyCredential` is undefined or blocked). Users need clear guidance to open in Safari (iOS) or Chrome (Android) or connect via standard Web3 wallets.

---

## 2. Requirements & Deliverables

1. **BA**:
   - Deliver `docs/ba/task-058/spec-v1.md`.
   - Gate 1: Ready for Development.
2. **Developer**:
   - Snapshot baseline of target files.
   - In `src/components/savings/Header.tsx`:
     - Make Arc AppKit and Guide buttons icon-only on mobile (`<span className="hidden sm:inline">...</span>`), reducing their width from ~190px to ~70px.
     - Optimize Language button padding on mobile.
     - Guarantee `ConnectKitButton` is always visible within the mobile viewport (no overflow, header width <= 390px).
   - In `src/App.tsx`:
     - Add `overflow-hidden` to fixed background glow wrappers.
     - Hide or simplify heavy 140px Gaussian blurs on mobile screens (`hidden sm:block`).
     - Display toast errors when passkey operations fail (`useEffect` on `pkState.status === "error"`).
   - In `src/components/landing/LandingPage.tsx`:
     - Throttle scroll state updates to only trigger when scroll delta exceeds threshold (e.g. >= 10px).
     - Add `overflow-hidden` on background containers.
   - In `src/hooks/usePasskeyWallet.ts`:
     - Detect in-app browsers and WebAuthn availability with user-friendly messages.
     - Export helper `isWebAuthnSupported()`.
   - In `src/components/savings/ArcAppKitModal.tsx`:
     - Don't silently close modal before registration initiates; show status feedback and clear advice for in-app browser users.
   - Freeze manifest `node scripts/manifest-tool.mjs freeze task-058 ...`.
3. **Tester**:
   - Verify frozen manifest.
   - Run browser CDP diagnostics script verifying:
     - `header.scrollWidth <= 390` in 390px mobile viewport.
     - ConnectKitButton is visible on mobile (`r <= 390`).
     - No horizontal overflow on mobile body.
   - Verify 471+ unit tests pass with zero regressions.
   - Run production build.
   - Deliver `docs/qa/task-058/test-report.md`.
4. **BA**:
   - Coverage review `docs/ba/task-058/coverage-review.md`.
5. **Leader**:
   - Acceptance in `docs/task-058-acceptance.md`.
