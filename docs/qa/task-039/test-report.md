# Báo Cáo Kiểm Thử Độc Lập (QA Test Report) — Task-039

> **Mã task:** task-039  
> **Tính năng:** Chuẩn hóa hiển thị Quỹ Pot Hero giai đoạn đăng ký (OPEN Phase Pot Calculation & Explanatory Badge - Option A) & Nguyên tắc đóng tiền của Chủ nhóm  
> **Tester độc lập:** QA Specialist  
> **Thời gian thực hiện:** 2026-10-21  
> **Trạng thái:** **PASSED (100% Signoff)**  

---

## 1. Môi trường & Tính toàn vẹn SHA256

- **Workspace:** `/home/avada/tontine`
- **Mã nguồn đóng băng (Manifest):** `docs/manifests/task-039/manifest.json`

### Kết quả kiểm tra SHA256 Manifest:
```bash
$ node scripts/manifest-tool.mjs verify task-039
[Verify] Verifying manifest for Task: task-039 (Frozen at: 2026-10-21T07:36:14.581Z)
[MATCH] src/lib/i18n.ts (4dbd1eda48564c9f137a574a0a54ea125c3efe741caa524d23318b0449c30321)
[MATCH] src/components/savings/ClubCard.tsx (2472d0d6fb0a2d9cdca1c80bbd564d540c80679147b7f0699ddb14bb5d1c142c)

✓ All files verified successfully! Integrity confirmed.
```

---

## 2. Kết quả kiểm thử bộ Test Suite Độc Lập (`tests/open-phase-pot-display.test.ts`)

| Mã Test | Tiêu chí AC | Mô tả kiểm thử | Kết quả | Thời gian |
| :--- | :--- | :--- | :--- | :--- |
| **TC-POT-01** | AC-01.1 | `Translations.clubCard` chứa `heroPotEstimatedPrefix` và `contribStartsNotice` | **PASS** | 0.81ms |
| **TC-POT-02** | AC-01.2 | Bản dịch Tiếng Việt chuẩn: "Quỹ Pot ước tính" & "Sẽ đóng tiền khi Vòng 1 bắt đầu" | **PASS** | 0.42ms |
| **TC-POT-03** | AC-01.3 | Bản dịch Tiếng Anh chuẩn: "Estimated Pot" & "Contributions start in Round 1" | **PASS** | 0.35ms |
| **TC-POT-04** | AC-01.4 | Đối xứng 100% (key parity) giữa `translations.vi` và `translations.en` | **PASS** | 0.29ms |
| **TC-POT-05** | AC-02.1 | `ClubCard.tsx` tính `potSize = contributionAmount * effectiveTotalJoined` khi state OPEN | **PASS** | 0.74ms |
| **TC-POT-06** | AC-02.2 | Tính toán giá trị thực tế: 1 thành viên = 10 USDC, 2 thành viên = 20 USDC | **PASS** | 0.31ms |
| **TC-POT-07** | AC-02.3, AC-02.4 | Render nhãn "Quỹ Pot ước tính (N thành viên)" và badge trợ giúp màu Amber khi OPEN | **PASS** | 0.58ms |
| **TC-POT-08** | AC-02.5 | Trạng thái ACTIVE giữ nguyên cách tính pot theo số thành viên nộp quỹ | **PASS** | 0.28ms |
| **TC-POT-09** | BR-02 | Smart Contract `RotatingSavings.sol` bảo đảm chủ nhóm bình đẳng nghĩa vụ đóng tiền, không miễn phí và bị Kick nếu không nộp | **PASS** | 0.45ms |

---

## 3. Kiểm thử Toàn bộ Hệ thống & Hồi quy (Zero Regression)

```bash
$ npm test
✔ 379 tests passed (379 total)
✔ 0 suites failed
✔ Duration: ~2.2s
```

```bash
$ npm run build
> tsc --noEmit && vite build
✓ built in 17.40s
Exit code: 0
```

---

## 4. Kết luận & Ký duyệt (Signoff)

- Tất cả 9 test case nghiệp vụ mới trong `tests/open-phase-pot-display.test.ts` đều **PASS 100%**.
- Toàn bộ 379 test cases trong dự án đạt tỷ lệ đỗ **100%**, không có bất kỳ regression nào.
- Production build sạch, không cảnh báo TypeScript.
- **Ký nhận (QA Signoff):** ĐẠT CHUẨN NGHIỆM THU (Gate 3 Passed).
