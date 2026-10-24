# Báo Cáo Kiểm Thử Độc Lập (QA Test Report) — Task-040

> **Mã task:** task-040  
> **Tính năng:** Bảo toàn quy mô Quỹ Pot qua mọi vòng đấu (Pot Size Preservation across All Active Rounds under ROSCA / Hụi Chết Rules)  
> **Tester độc lập:** QA Specialist  
> **Thời gian thực hiện:** 2026-10-21  
> **Trạng thái:** **PASSED (100% Signoff)**  

---

## 1. Môi trường & Tính Toàn Vẹn SHA256

- **Workspace:** `/home/avada/tontine`
- **Mã nguồn đóng băng (Manifest):** `docs/manifests/task-040/manifest.json`

### Kết quả kiểm tra SHA256 Manifest:
```bash
$ node scripts/manifest-tool.mjs verify task-040
[Verify] Verifying manifest for Task: task-040 (Frozen at: 2026-10-21T09:02:09.488Z)
[MATCH] src/components/savings/ClubCard.tsx (7178ec1b005dcaaf8934c151bf3d254bbb0900aef73a0ba16b03fe49c549e83b)

✓ All files verified successfully! Integrity confirmed.
```

---

## 2. Kết quả kiểm thử bộ Test Suite Độc Lập (`tests/active-round-pot-preservation.test.ts`)

| Mã Test | Tiêu chí AC | Mô tả kiểm thử | Kết quả | Thời gian |
| :--- | :--- | :--- | :--- | :--- |
| **TC-PRESERVE-01** | AC-01.1 | `ClubCard.tsx` tính `potSize = contributionAmount * effectiveTotalJoined`, không dùng `activeMembers` cho pot | **PASS** | 1.18ms |
| **TC-PRESERVE-02** | AC-01.2 | Nhóm 2 thành viên ở Vòng 1 có `potSize` = `20.00 USDC` | **PASS** | 29.6ms |
| **TC-PRESERVE-03** | AC-01.3 | **Khắc phục lỗi người dùng báo (R7c516ywmKML):** Vòng 2 sau khi claim pot hiển thị đủ `20.00 USDC` (thay vì 10.00 USDC) | **PASS** | 0.72ms |
| **TC-PRESERVE-04** | AC-01.4 | Nhóm 10 thành viên tại Vòng 5 (4 người thắng nộp hụi chết, 6 người chờ hốt) hiển thị đủ `100.00 USDC` | **PASS** | 1.21ms |
| **TC-PRESERVE-05** | AC-02.1 | Smart Contract `RotatingSavings.sol` bảo đảm vòng 2 thu đủ 100% pot từ mọi thành viên (kể cả người đóng hụi chết) | **PASS** | 0.81ms |

---

## 3. Kiểm thử Toàn bộ Hệ thống & Hồi quy (Zero Regression)

```bash
$ npm test
✔ 384 tests passed (384 total)
✔ 0 suites failed
✔ Duration: ~2.06s
```

```bash
$ npm run build
> tsc --noEmit && vite build
✓ built in 20.06s
Exit code: 0
```

---

## 4. Kết luận & Ký duyệt (Signoff)

- Lỗi hiển thị 10.00 USDC tại Vòng 2 trong thẻ `ClubCard` đã được giải quyết triệt để.
- Quy mô Quỹ Pot luôn giữ vững 20.00 USDC ở mọi vòng đối với nhóm 2 người, và 100.00 USDC ở mọi vòng đối với nhóm 10 người.
- **Ký nhận (QA Signoff):** ĐẠT CHUẨN NGHIỆM THU (Gate 3 Passed).
