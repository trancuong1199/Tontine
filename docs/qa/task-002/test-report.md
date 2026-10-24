# Báo cáo Kiểm thử Độc lập: Nâng cấp Toàn diện & Sửa lỗi HụiChain (RotatingSavings)
**Task ID**: `task-002`  
**Dispatch ID**: `dispatch-002-qa`  
**Tester**: `qa-agent` (Tester độc lập)  
**Spec Version kiểm tra**: `docs/ba/task-002/spec-v1.1.md` (`v1.1`)  
**Thời điểm kiểm tra**: `2026-10-09 08:17:00`  
**Trạng thái**: `PASS`  

---

## 1. Kiểm tra Tính Toàn Vẹn Mã Nguồn (SHA256 Integrity)
- **Manifest bàn giao từ Developer**: `docs/manifests/task-002/manifest.json` (Thời điểm đóng băng: `2026-10-09T01:34:24.748Z`)
- **Lệnh kiểm tra trước và sau khi test**: `node scripts/manifest-tool.mjs verify task-002`
- **Kết quả so sánh SHA256**: `MATCH` (100% khớp)
- **Chi tiết hash 12 files bàn giao**:
  - `src/contract.ts`: `70fe09ccf4d1aaf4f62acd198d791b3ebc9af617e9232dd3180a0e7799d990bf` (Khớp bàn giao)
  - `src/hooks/useSavingsClub.ts`: `837e5ed37bf9c920c0f7c0ce6ed45488eae3da04cad1366c432c5236ef78080c` (Khớp bàn giao)
  - `src/components/savings/OnboardingScreen.tsx`: `78c9a038eb23b467744fadb798437fefe9ff117d162c42bda8b10326c310579e` (Khớp bàn giao)
  - `src/components/savings/PasskeyActionPanel.tsx`: `bcd3fda6704e9d645b04a47ee015563d25f5b6983b6f90b7608629794faef21c` (Khớp bàn giao)
  - `src/index.css`: `74a042e6f3739c103927ca1ef86513c1abdead240854cf34a946223900b12e70` (Khớp bàn giao)
  - `src/App.tsx`: `7f06f09b668e6b2b832817ca9735acac6d20c5be0d43182d6c90d6b029319523` (Khớp bàn giao)
  - `src/components/savings/Header.tsx`: `f0fcd4ae9d1880138555a906b113047902dd876808f27051fe5279fa196e932e` (Khớp bàn giao)
  - `src/components/savings/ClubCard.tsx`: `df028f1c94cdbccf197412fa881e2d0945dd2dc84a0534aa1e0c4e5ceecb69b5` (Khớp bàn giao)
  - `src/components/savings/GroupSwitcher.tsx`: `d42e23ccea54aba3d25e402d7d1ca9a7bc6e0e804d7f4bcb4fa4bb8e6da565e9` (Khớp bàn giao)
  - `src/components/savings/ActionPanel.tsx`: `9ab0d9ca13b4d15b13e1d0be8037e47f41422ae39717808f987afd207b96e2df` (Khớp bàn giao)
  - `src/components/savings/RoundHistory.tsx`: `3605cde67734e1f9269d690b504d759d2249bde69fde27394f002203567bb7e1` (Khớp bàn giao)
  - `src/components/savings/HowItWorksCard.tsx`: `c3641e4b35094478f533aaa38404f1353537884f5778150b0af6ff03e891b35e` (Khớp bàn giao)

---

## 2. Kịch bản Kiểm thử & Kết quả Thực thi

Bộ kiểm thử độc lập được thiết kế và thực thi tại [tests/tontine-upgrade.test.ts](file:///home/avada/tontine/tests/tontine-upgrade.test.ts), bao phủ toàn bộ 26 tiêu chí nghiệm thu (AC-01.1 đến AC-06.3) và kiểm thử hồi quy build hệ thống:

| Mã Test | Mô tả Kịch bản | AC Liên quan | Lệnh thực chạy | Exit Code | Kết quả | Ghi chú |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-01 | Kiểm tra giải quyết lỗi render loop: `handleSuccess` không gọi trong render body; nằm trong `useEffect` với dependency `[isSuccess]` | AC-01.1 | `npm test` | 0 | PASS | Chấm dứt loop, toast và reset an toàn |
| TC-02 | Kiểm tra sau khi gọi `reset()`, cờ `isSuccess` trở về `false`, không gây trigger lặp | AC-01.2 | `npm test` | 0 | PASS | Khớp mong đợi |
| TC-03 | Kiểm tra `parseUsdc` chuyển đổi số nguyên sang 6 decimals (`"10"` -> `10000000n`, `"1"` -> `1000000n`) | AC-02.1 | `npm test` | 0 | PASS | Khớp chuẩn USDC raw unit |
| TC-04 | Kiểm tra `parseUsdc` chuyển đổi số thập phân chính xác không sai số floating-point (`"1.5"` -> `1500000n`, `".5"` -> `500000n`) | AC-02.2 | `npm test` | 0 | PASS | Khớp mong đợi |
| TC-05 | Kiểm tra `parseUsdc` xử lý độ chính xác tối thiểu 1 micro-USDC (`"0.000001"` -> `1n`) | AC-02.3 | `npm test` | 0 | PASS | Khớp mong đợi |
| TC-06 | Kiểm tra `parseUsdc` chặn số âm an toàn, trả về `0n` không ném ngoại lệ (`"-5"`, `"-0.01"`) | AC-02.4 | `npm test` | 0 | PASS | Khớp mong đợi |
| TC-07 | Kiểm tra `parseUsdc` chặn chuỗi rỗng và khoảng trắng, trả về `0n` (`""`, `"   "`, `"\t"`, `"\n"`) | AC-02.5 | `npm test` | 0 | PASS | Khớp mong đợi |
| TC-08 | Kiểm tra `parseUsdc` chặn ký tự chữ/rác, trả về `0n` (`"abc"`, `"10usdc"`, `"1.2.3"`, `null`, `undefined`) | AC-02.6 | `npm test` | 0 | PASS | Khớp mong đợi |
| TC-09 | Kiểm tra `parseUsdc` cắt tỉa an toàn khi số thập phân > 6 chữ số (`"1.123456789"` -> `1123456n`) | AC-02.7 | `npm test` | 0 | PASS | Không làm sập ứng dụng |
| TC-10 | Kiểm tra ô nhập Bid trong `ActionPanel` và `PasskeyActionPanel`: dùng `parseUsdc`, vô hiệu nút khi `bidRaw <= 0n` | AC-02.8 | `npm test` | 0 | PASS | Không crash khi nhập ký tự lạ |
| TC-11 | Kiểm tra logic nhận diện Chủ nhóm: so sánh `address.toLowerCase() === owner.toLowerCase()` | AC-03.1 | `npm test` | 0 | PASS | Khớp case-insensitive |
| TC-12 | Kiểm tra nút "Bắt đầu các vòng" bị disabled khi số thành viên < 2 và hiển thị thông báo ghi chú | AC-03.2 | `npm test` | 0 | PASS | Khớp mong đợi |
| TC-13 | Kiểm tra nút "Bắt đầu các vòng" được kích hoạt khi số thành viên $\ge 2$, gọi `startRounds()` | AC-03.3 | `npm test` | 0 | PASS | Khớp mong đợi |
| TC-14 | Kiểm tra nút "Huỷ nhóm" hiển thị khi `state === OPEN`, gọi `cancelGroup()` | AC-03.4 | `npm test` | 0 | PASS | Khớp mong đợi |
| TC-15 | Kiểm tra ví không phải chủ nhóm không thể thấy cụm Owner Controls | AC-03.5 | `npm test` | 0 | PASS | Khớp mong đợi |
| TC-16 | Kiểm tra cụm Owner Controls tự động ẩn khi trạng thái khác `OPEN` (`ACTIVE`, `COMPLETED`, `CANCELLED`) | AC-03.6 | `npm test` | 0 | PASS | Khớp mong đợi |
| TC-17 | Kiểm tra Round History đọc và hiển thị các vòng đã tất toán (`settled = true`), format USDC và địa chỉ | AC-04.1 | `npm test` | 0 | PASS | Khớp mong đợi |
| TC-18 | Kiểm tra gắn nhãn `"Bạn!"` nổi bật khi địa chỉ ví người dùng trùng với người thắng | AC-04.2 | `npm test` | 0 | PASS | Khớp mong đợi |
| TC-19 | Kiểm tra trạng thái trống hiển thị thông báo `"Chưa có vòng nào kết thúc"` khi chưa có vòng settled | AC-04.3 | `npm test` | 0 | PASS | Khớp mong đợi |
| TC-20 | Kiểm tra nạp địa chỉ nhóm từ tham số URL `?group=0x...` hợp lệ | AC-05.1 | `npm test` | 0 | PASS | Khớp mong đợi |
| TC-21 | Kiểm tra fallback về địa chỉ mặc định `0x6afaa0825d2e05ef00d571d4a043ab5dcc03534b` khi URL param thiếu hoặc sai | AC-05.2 | `npm test` | 0 | PASS | Khớp mong đợi |
| TC-22 | Kiểm tra chuyển đổi nhóm động qua `GroupSwitcher`, xác thực địa chỉ và đẩy URL qua `history.pushState` | AC-05.3 | `npm test` | 0 | PASS | Không reload trang |
| TC-23 | Kiểm tra sao chép liên kết chia sẻ nhóm vào clipboard theo định dạng chuẩn kèm thông báo Toast | AC-05.4 | `npm test` | 0 | PASS | Khớp mong đợi |
| TC-24 | Kiểm tra hiển thị công khai không bị chặn khi chưa kết nối ví (`!address`): Header, GroupSwitcher, ClubCard, ActionPanel prompt, RoundHistory, Footer | AC-06.1 | `npm test` | 0 | PASS | Layout hiển thị đầy đủ, nút kết nối ví hoạt động |
| TC-25 | Kiểm tra Hướng dẫn Onboarding mở theo yêu cầu (on-demand) và có nút đóng `onClose` quay lại trang chủ | AC-06.2 | `npm test` | 0 | PASS | Người dùng tự do đóng/mở hướng dẫn |
| TC-26 | Kiểm tra loại bỏ cảnh báo `.env` kỹ thuật gây hoang mang, hiển thị nút kết nối ví Web3 chuẩn | AC-06.3 | `npm test` | 0 | PASS | Giao diện thân thiện người dùng phổ thông |
| TC-27 | Kiểm tra toàn bộ test suite độc lập bằng lệnh `npm test` | Regression | `npm test` | 0 | PASS | 26/26 tests PASS |
| TC-28 | Kiểm tra quy trình build dự án Vite + TypeScript production | Build | `npm run build` | 0 | PASS | Build thành công không lỗi cú pháp/type |

---

## 3. Bằng chứng Thiết kế Giao diện Mới & Kiểm thử Trình duyệt Thực tế

### 3.1. Nguyên nhân lỗi hiển thị mộc ban đầu (Root Cause)
- File `src/index.css` ban đầu bị thiếu các chỉ thị biên dịch cốt lõi của Tailwind v3: `@tailwind base; @tailwind components; @tailwind utilities;`.
- Hệ quả là Tailwind không xuất mã CSS ra bộ bundle, khiến trình duyệt dựng toàn bộ trang web ở chế độ HTML mộc không style (nút xám viền nổi mặc định của trình duyệt, phông chữ serif, khối nội dung co cụm ở góc trái như phản ánh).

### 3.2. Các cải tiến thiết kế và bố cục đã hoàn thành
1. **Khôi phục hệ thống phong cách Tailwind & Typography**:
   - Khôi phục `@tailwind base; @tailwind components; @tailwind utilities;` trong `src/index.css`.
   - Bổ sung phông sans hiện đại và Space Grotesk chuyên dụng cho số liệu tiền tệ/USDC.
2. **Thiết kế lại bố cục tổng thể chuẩn Web3 Dashboard**:
   - Nâng cấp từ khung nhỏ hẹp di động (`max-w-md`) sang bố cục 2 cột rộng rãi trên màn hình lớn (`max-w-7xl mx-auto`, `lg:grid lg:grid-cols-12 lg:gap-8`).
   - Cột trái: Thẻ chính Hero `ClubCard` với nền gradient xanh tím đậm, thanh trạng thái tiến độ thành viên `Member Capacity Progress Bar`, 3 thẻ chỉ số frosted glass, bảng `RoundHistory` và khối hướng dẫn 4 bước trực quan `HowItWorksCard`.
   - Cột phải: Quản lý địa chỉ hợp đồng `GroupSwitcher` (rút gọn địa chỉ kèm nút sao chép link / đổi nhóm), Thanh ví, Bảng điều khiển chủ nhóm `OwnerControls`, và Khối tương tác `ActionPanel` với nút bấm lớn rực rỡ kèm các mốc bid nhanh (+1, +2, +5, +10 USDC).
3. **Responsive Mobile 100%**: Tự động xếp tầng thẻ dọc mượt mà trên màn hình di động (đã kiểm tra chuẩn 390px).

### 3.3. Bằng chứng Ảnh chụp Màn hình Headless Chrome (Visual Evidence)
Đã chụp và xác thực trực quan bằng Google Chrome Headless:
- **Desktop (1440x1080)**: Chụp lưu tại `/tmp/tontine_desktop.png` (277.5 KB) — Giao diện Web3 dApp bóng bẩy, màu sắc chuẩn xác, typography sắc nét, không lệch layout.
- **Mobile (390x844)**: Chụp lưu tại `/tmp/tontine_mobile.png` (141.6 KB) — Bố cục tự co giãn xếp tầng liền mạch, các nút bấm to rõ phù hợp cảm ứng.
- **Lỗi Javascript (Uncaught Exceptions)**: `0` lỗi.

---

## 4. Xác nhận SHA256 sau khi Test
- **Lệnh thực thi**: `node scripts/manifest-tool.mjs verify task-002`
- **Kết quả so sánh SHA256 sau khi test**: `MATCH`
```text
[Verify] Verifying manifest for Task: task-002 (Frozen at: 2026-10-09T01:34:24.748Z)
[MATCH] src/contract.ts (70fe09ccf4d1aaf4...)
[MATCH] src/hooks/useSavingsClub.ts (837e5ed37bf9c920...)
[MATCH] src/components/savings/OnboardingScreen.tsx (78c9a038eb23b467...)
[MATCH] src/components/savings/PasskeyActionPanel.tsx (bcd3fda6704e9d64...)
[MATCH] src/index.css (74a042e6f3739c10...)
[MATCH] src/App.tsx (7f06f09b668e6b2b...)
[MATCH] src/components/savings/Header.tsx (f0fcd4ae9d188013...)
[MATCH] src/components/savings/ClubCard.tsx (df028f1c94cdbccf...)
[MATCH] src/components/savings/GroupSwitcher.tsx (d42e23ccea54aba3...)
[MATCH] src/components/savings/ActionPanel.tsx (9ab0d9ca13b4d15b...)
[MATCH] src/components/savings/RoundHistory.tsx (3605cde67734e1f9...)
[MATCH] src/components/savings/HowItWorksCard.tsx (c3641e4b35094478...)

 All files verified successfully! Integrity confirmed.
```
- **Cam kết tính toàn vẹn**: Toàn bộ 12 files mã nguồn triển khai trong manifest hoàn toàn giữ nguyên giá trị SHA256 đóng băng, Tester không làm sai lệch tính toàn vẹn của mã nguồn.

---

## 5. Kết luận & Signoff
- **Tổng số test độc lập**: `26` | **Pass**: `26` | **Fail**: `0` | **Skip**: `0`
- **Kiểm tra biên dịch sản phẩm (npm run build)**: `PASS` (Exit code 0)
- **Kiểm tra giao diện trình duyệt thực tế**: `PASS` (Hiển thị đẳng cấp dApp Web3, hỗ trợ cả desktop 1440px và di động 390px)
- **Tỷ lệ Pass**: `100%` (Không có pending, skipped hay blocked)
- **Ý kiến Tester**: `ĐẠT CHUẨN TOÀN DIỆN (Signoff)`
- **Chuyển giao**: Bàn giao kết quả kiểm thử cho BA đối chiếu độ phủ nghiệp vụ và Leader nghiệm thu.
