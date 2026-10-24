# Business Specification: Nâng cấp Toàn diện & Fix lỗi HụiChain (RotatingSavings)
**Task ID**: `task-002`  
**Spec Version**: `v1.1`  
**Tác giả (BA)**: `ba-agent`  
**Trạng thái**: `Verified`  

---

## 1. Tổng quan & Giá trị (Problem & Value)

### 1.1. Vấn đề cần giải quyết (Problem Statement)
Ứng dụng **HụiChain (RotatingSavings)** là nền tảng tiết kiệm xoay vòng không cần tín nhiệm (Trustless Tontine) xây dựng trên mạng Arc Testnet. Qua rà soát vận hành thực tế và đối chiếu theo kế hoạch phát triển [docs/tontine-build-plan.md](file:///home/avada/tontine/docs/tontine-build-plan.md), ứng dụng đã và đang xử lý 6 vấn đề cốt lõi:
1. **Lỗi Render Loop sau Giao dịch**: Trong `ActionPanel.tsx`, hàm xử lý thành công `handleSuccess()` được kích hoạt trực tiếp trong thân hàm render của component mỗi khi `isSuccess` là `true`, làm sập/treo giao diện (`Too many re-renders`).
2. **Sai số dấu phẩy động & Rủi ro Crash ô nhập Bid**:
   - Hàm `parseUsdc` dùng `parseFloat` và `Math.round`, gây sai lệch độ chính xác và không chặn số âm, chuỗi chữ hoặc ký tự rác.
   - Trong `PasskeyActionPanel.tsx`, hàm `parseUnits(bidAmount, 6)` bị gọi khi render mà không bọc lỗi an toàn.
3. **Thiếu Bảng điều khiển Chủ nhóm (Owner Controls)**: Hợp đồng `RotatingSavings.sol` quy định chỉ Chủ nhóm (`onlyGroupOwner`) mới có quyền gọi `startRounds()` và `cancelGroup()`.
4. **Thiếu Lịch sử các vòng (Round History)**: Giao diện thiếu danh sách kết quả các vòng trước (ai thắng, số pot, tổng bid).
5. **Cố định Địa chỉ Hợp đồng (Hardcoded Contract Address)**: Không thể chuyển đổi hoặc chia sẻ nhóm động qua `?group=0x...`.
6. **Màn hình chặn khi chưa kết nối ví (Early Return Blocker)**: Trước đây, khi người dùng chưa kết nối ví (`!address`), component `App.tsx` return sớm `<OnboardingScreen>` chiếm toàn bộ màn hình kèm cảnh báo vàng `Passkey chưa cấu hình: Paste VITE_CLIENT_KEY vào .env...`. Điều này che khuất toàn bộ giao diện nhóm hụi, thẻ câu lạc bộ, bảng điều khiển, khiến người dùng cảm giác như ứng dụng bị lỗi.

### 1.2. Giá trị mang lại (Value Proposition)
- **Độ tin cậy & Ổn định giao diện**: Chấm dứt triệt để lỗi render loop và crash component.
- **An toàn tài chính (Safety First)**: Quy đổi chuẩn xác 6 chữ số thập phân của USDC, chặn đứng số âm và input không hợp lệ.
- **Khép kín Vòng đời Hụi (Lifecycle Completeness)**: Cung cấp đầy đủ quyền điều phối cho Chủ nhóm.
- **Minh bạch & Trải nghiệm xã hội**: Hiển thị lịch sử tất toán và liên kết chia sẻ nhóm 1-click.
- **Giao diện công khai không bị chặn (Public Trustless Accessibility)**: Cho phép bất kỳ ai truy cập xem thông tin nhóm hụi on-chain minh bạch ngay từ lần đầu mở trang; có nút kết nối ví rõ ràng và hướng dẫn on-demand có thể đóng/mở linh hoạt.

### 1.3. Đối tượng sử dụng (Actors)
- **Thành viên nhóm (Club Member)**: Người tham gia đóng tiền hụi, đặt bid, xem lịch sử vòng và rút tiền thắng.
- **Chủ nhóm (Group Owner)**: Người tạo nhóm, có quyền độc quyền bắt đầu các vòng hụi (`startRounds`) hoặc huỷ nhóm (`cancelGroup`).
- **Khách / Người mới (Guest / Invitee)**: Người dùng xem thông tin nhóm hụi công khai trước khi quyết định kết nối ví.
- **Hệ thống (Web3 Infrastructure)**: Smart Contract `RotatingSavings.sol`, RPC Arc Testnet.

### 1.4. Phạm vi (Scope)
- **Trong phạm vi (In-Scope)**:
  - Tái cấu trúc luồng xử lý hậu giao dịch trong `ActionPanel.tsx`: chuyển `handleSuccess()` vào `useEffect` lắng nghe `isSuccess`.
  - Nâng cấp hàm `parseUsdc` an toàn trong `src/contract.ts`.
  - Tăng cường kiểm soát ô nhập `bidAmount` trong `ActionPanel.tsx` và `PasskeyActionPanel.tsx`.
  - Xây dựng cụm điều khiển dành riêng cho Chủ nhóm (Owner Controls) khi `state === OPEN`.
  - Xây dựng component Lịch sử vòng (`Round History`).
  - Xây dựng tính năng Quản lý & Chuyển đổi nhóm (`Group Switcher & Share Link`).
  - Tái cấu trúc luồng hiển thị cho khách (`Unauthenticated Non-Blocking UI`): Giữ nguyên layout chính (Header, GroupSwitcher, ClubCard, ActionPanel prompt, RoundHistory, Footer); loại bỏ cảnh báo lỗi `.env`; cho phép mở và đóng Hướng dẫn (`OnboardingScreen`) theo yêu cầu.
- **Ngoài phạm vi (Out-of-Scope)**:
  - Sửa đổi source code hợp đồng Solidity đã triển khai (`contracts/RotatingSavings.sol`).

---

## 2. Quy tắc nghiệp vụ (Business Rules - BR)

- **BR-01 (Render Loop Prevention)**: Mọi thao tác cập nhật state sau khi giao dịch thành công bắt buộc phải thực thi bên trong `useEffect`, không được thực thi trong thân render.
- **BR-02 (USDC Parsing & Bid Safety)**: Hàm `parseUsdc` quy đổi chuỗi số sang số nguyên BigInt 6 số thập phân. Chuỗi rỗng, số âm, ký tự lạ phải trả về `0n`.
- **BR-03 (Owner Controls)**: Bảng điều khiển Chủ nhóm chỉ hiển thị khi ví đang kết nối trùng với `owner` của nhóm và trạng thái nhóm là `OPEN`. Nút "Bắt đầu các vòng" chỉ kích hoạt khi nhóm có tối thiểu 2 thành viên.
- **BR-04 (Round History)**: Lịch sử vòng hiển thị danh sách các vòng có `settled === true`.
- **BR-05 (Dynamic Group Routing)**: Ứng dụng đọc địa chỉ hợp đồng từ tham số `?group=`. Nếu thiếu hoặc không hợp lệ, fallback về `0x6afaa0825d2e05ef00d571d4a043ab5dcc03534b`.
- **BR-06 (Non-blocking Public Browsing)**: Khi chưa kết nối ví (`!address`), người dùng vẫn xem được toàn bộ thông tin công khai của nhóm hụi. ActionPanel hiển thị nút kêu gọi kết nối ví. Màn hình Hướng dẫn có nút đóng `(X)` quay lại màn hình chính.

---

## 3. Yêu cầu nghiệp vụ & Tiêu chí nghiệm thu (REQ & AC)

### REQ-01: Chấm dứt Lỗi Render Loop trong ActionPanel
- **AC-01.1**: Sau khi giao dịch hoàn tất, `handleSuccess` kích hoạt trong `useEffect([isSuccess])`.
- **AC-01.2**: Sau khi gọi `reset()`, cờ `isSuccess` trở về `false`, không gây trigger lặp.

### REQ-02: Chuẩn hóa parseUsdc & Bảo vệ ô nhập Bid
- **AC-02.1**: `"10"` -> `10000000n`, `"1"` -> `1000000n`.
- **AC-02.2**: `"1.5"` -> `1500000n`, `".5"` -> `500000n`.
- **AC-02.3**: `"0.000001"` -> `1n`.
- **AC-02.4**: Số âm (`"-5"`, `"-0.01"`) trả về `0n`.
- **AC-02.5**: Chuỗi rỗng và khoảng trắng trả về `0n`.
- **AC-02.6**: Ký tự chữ/rác trả về `0n`.
- **AC-02.7**: Số thập phân vượt quá 6 số bị cắt tỉa an toàn.
- **AC-02.8**: Nút Bid chỉ kích hoạt khi `bidRaw > 0n`.

### REQ-03: Bảng điều khiển Chủ nhóm (Owner Controls)
- **AC-03.1**: Nhận diện chủ nhóm case-insensitive.
- **AC-03.2**: Nút "Bắt đầu các vòng" bị disabled khi số thành viên < 2.
- **AC-03.3**: Nút "Bắt đầu các vòng" kích hoạt khi số thành viên $\ge 2$.
- **AC-03.4**: Nút "Huỷ nhóm" hiển thị khi `state === OPEN`.
- **AC-03.5**: Không hiển thị Owner Controls cho người không phải chủ nhóm.
- **AC-03.6**: Tự động ẩn Owner Controls khi trạng thái nhóm khác `OPEN`.

### REQ-04: Lịch sử các vòng đã chốt (Round History)
- **AC-04.1**: Hiển thị danh sách các vòng có `settled === true`.
- **AC-04.2**: Gắn nhãn `"Bạn!"` nổi bật khi người dùng thắng vòng.
- **AC-04.3**: Hiển thị `"Chưa có vòng nào kết thúc"` khi chưa có vòng settled.

### REQ-05: Chuyển đổi nhóm động & Chia sẻ Link
- **AC-05.1**: Nạp địa chỉ nhóm từ URL query param `?group=0x...` hợp lệ.
- **AC-05.2**: Fallback về địa chỉ mặc định khi thiếu hoặc sai.
- **AC-05.3**: Chuyển đổi nhóm qua `GroupSwitcher` dùng `history.pushState` không reload trang.
- **AC-05.4**: Nút sao chép link nhóm copy URL chuẩn kèm toast.

### REQ-06: Giao diện Công khai Không bị chặn & Hướng dẫn Linh hoạt
- **AC-06.1**: Khi chưa kết nối ví (`!address`), không chặn màn hình; hiển thị đầy đủ Header, GroupSwitcher, ClubCard, ActionPanel prompt, RoundHistory, Footer.
- **AC-06.2**: Nút "Hướng dẫn" trên Header cho phép mở màn hình giới thiệu và nút `(X)` đóng lại bất cứ lúc nào.
- **AC-06.3**: Không hiển thị thông báo lỗi kỹ thuật `.env` gây hoang mang cho người dùng; hiển thị nút kết nối ví Web3 chuẩn.

---

## 4. Bảng đối chiếu Nghiệp vụ (Traceability Matrix)

| REQ ID | AC ID | Test Case (Tester) | Spec/Source Hash | Evidence / Test Run | BA Đối chiếu | Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| REQ-01 | AC-01.1 | TC-01 | `1a755587b324fbb325d5c17d8de49ae1eb5bce1d4e11e9bbf852138fa12247ff` | [test-report.md](file:///home/avada/tontine/docs/qa/task-002/test-report.md), exit code 0 | VERIFIED (Khớp 100%) | VERIFIED |
| REQ-01 | AC-01.2 | TC-02 | `1a755587b324fbb325d5c17d8de49ae1eb5bce1d4e11e9bbf852138fa12247ff` | [test-report.md](file:///home/avada/tontine/docs/qa/task-002/test-report.md), exit code 0 | VERIFIED (Khớp 100%) | VERIFIED |
| REQ-02 | AC-02.1 | TC-03 | `70fe09ccf4d1aaf4f62acd198d791b3ebc9af617e9232dd3180a0e7799d990bf` | [test-report.md](file:///home/avada/tontine/docs/qa/task-002/test-report.md), exit code 0 | VERIFIED (Khớp 100%) | VERIFIED |
| REQ-02 | AC-02.2 | TC-04 | `70fe09ccf4d1aaf4f62acd198d791b3ebc9af617e9232dd3180a0e7799d990bf` | [test-report.md](file:///home/avada/tontine/docs/qa/task-002/test-report.md), exit code 0 | VERIFIED (Khớp 100%) | VERIFIED |
| REQ-02 | AC-02.3 | TC-05 | `70fe09ccf4d1aaf4f62acd198d791b3ebc9af617e9232dd3180a0e7799d990bf` | [test-report.md](file:///home/avada/tontine/docs/qa/task-002/test-report.md), exit code 0 | VERIFIED (Khớp 100%) | VERIFIED |
| REQ-02 | AC-02.4 | TC-06 | `70fe09ccf4d1aaf4f62acd198d791b3ebc9af617e9232dd3180a0e7799d990bf` | [test-report.md](file:///home/avada/tontine/docs/qa/task-002/test-report.md), exit code 0 | VERIFIED (Khớp 100%) | VERIFIED |
| REQ-02 | AC-02.5 | TC-07 | `70fe09ccf4d1aaf4f62acd198d791b3ebc9af617e9232dd3180a0e7799d990bf` | [test-report.md](file:///home/avada/tontine/docs/qa/task-002/test-report.md), exit code 0 | VERIFIED (Khớp 100%) | VERIFIED |
| REQ-02 | AC-02.6 | TC-08 | `70fe09ccf4d1aaf4f62acd198d791b3ebc9af617e9232dd3180a0e7799d990bf` | [test-report.md](file:///home/avada/tontine/docs/qa/task-002/test-report.md), exit code 0 | VERIFIED (Khớp 100%) | VERIFIED |
| REQ-02 | AC-02.7 | TC-09 | `70fe09ccf4d1aaf4f62acd198d791b3ebc9af617e9232dd3180a0e7799d990bf` | [test-report.md](file:///home/avada/tontine/docs/qa/task-002/test-report.md), exit code 0 | VERIFIED (Khớp 100%) | VERIFIED |
| REQ-02 | AC-02.8 | TC-10 | `bcd3fda6704e9d645b04a47ee015563d25f5b6983b6f90b7608629794faef21c` | [test-report.md](file:///home/avada/tontine/docs/qa/task-002/test-report.md), exit code 0 | VERIFIED (Khớp 100%) | VERIFIED |
| REQ-03 | AC-03.1 | TC-11 | `befdb7ecdef5585e93e30c5da66e18fe1d9e6fae1b8db42f92f0881819b44e4c` | [test-report.md](file:///home/avada/tontine/docs/qa/task-002/test-report.md), exit code 0 | VERIFIED (Khớp 100%) | VERIFIED |
| REQ-03 | AC-03.2 | TC-12 | `befdb7ecdef5585e93e30c5da66e18fe1d9e6fae1b8db42f92f0881819b44e4c` | [test-report.md](file:///home/avada/tontine/docs/qa/task-002/test-report.md), exit code 0 | VERIFIED (Khớp 100%) | VERIFIED |
| REQ-03 | AC-03.3 | TC-13 | `befdb7ecdef5585e93e30c5da66e18fe1d9e6fae1b8db42f92f0881819b44e4c` | [test-report.md](file:///home/avada/tontine/docs/qa/task-002/test-report.md), exit code 0 | VERIFIED (Khớp 100%) | VERIFIED |
| REQ-03 | AC-03.4 | TC-14 | `befdb7ecdef5585e93e30c5da66e18fe1d9e6fae1b8db42f92f0881819b44e4c` | [test-report.md](file:///home/avada/tontine/docs/qa/task-002/test-report.md), exit code 0 | VERIFIED (Khớp 100%) | VERIFIED |
| REQ-03 | AC-03.5 | TC-15 | `befdb7ecdef5585e93e30c5da66e18fe1d9e6fae1b8db42f92f0881819b44e4c` | [test-report.md](file:///home/avada/tontine/docs/qa/task-002/test-report.md), exit code 0 | VERIFIED (Khớp 100%) | VERIFIED |
| REQ-03 | AC-03.6 | TC-16 | `befdb7ecdef5585e93e30c5da66e18fe1d9e6fae1b8db42f92f0881819b44e4c` | [test-report.md](file:///home/avada/tontine/docs/qa/task-002/test-report.md), exit code 0 | VERIFIED (Khớp 100%) | VERIFIED |
| REQ-04 | AC-04.1 | TC-17 | `30d0d844b0e55d1d5827aaa5ea952ad7f4c30da7e1f0506b149a389b3cf91045` | [test-report.md](file:///home/avada/tontine/docs/qa/task-002/test-report.md), exit code 0 | VERIFIED (Khớp 100%) | VERIFIED |
| REQ-04 | AC-04.2 | TC-18 | `30d0d844b0e55d1d5827aaa5ea952ad7f4c30da7e1f0506b149a389b3cf91045` | [test-report.md](file:///home/avada/tontine/docs/qa/task-002/test-report.md), exit code 0 | VERIFIED (Khớp 100%) | VERIFIED |
| REQ-04 | AC-04.3 | TC-19 | `30d0d844b0e55d1d5827aaa5ea952ad7f4c30da7e1f0506b149a389b3cf91045` | [test-report.md](file:///home/avada/tontine/docs/qa/task-002/test-report.md), exit code 0 | VERIFIED (Khớp 100%) | VERIFIED |
| REQ-05 | AC-05.1 | TC-20 | `44a212e2d38e3660545efb44b824125c63987656f9e8d5d8552b500b4cd975e9` | [test-report.md](file:///home/avada/tontine/docs/qa/task-002/test-report.md), exit code 0 | VERIFIED (Khớp 100%) | VERIFIED |
| REQ-05 | AC-05.2 | TC-21 | `44a212e2d38e3660545efb44b824125c63987656f9e8d5d8552b500b4cd975e9` | [test-report.md](file:///home/avada/tontine/docs/qa/task-002/test-report.md), exit code 0 | VERIFIED (Khớp 100%) | VERIFIED |
| REQ-05 | AC-05.3 | TC-22 | `44a212e2d38e3660545efb44b824125c63987656f9e8d5d8552b500b4cd975e9` | [test-report.md](file:///home/avada/tontine/docs/qa/task-002/test-report.md), exit code 0 | VERIFIED (Khớp 100%) | VERIFIED |
| REQ-05 | AC-05.4 | TC-23 | `44a212e2d38e3660545efb44b824125c63987656f9e8d5d8552b500b4cd975e9` | [test-report.md](file:///home/avada/tontine/docs/qa/task-002/test-report.md), exit code 0 | VERIFIED (Khớp 100%) | VERIFIED |
| REQ-06 | AC-06.1 | TC-24 | `befdb7ecdef5585e93e30c5da66e18fe1d9e6fae1b8db42f92f0881819b44e4c` | [test-report.md](file:///home/avada/tontine/docs/qa/task-002/test-report.md), exit code 0 | VERIFIED (Khớp 100%) | VERIFIED |
| REQ-06 | AC-06.2 | TC-25 | `78c9a038eb23b467744fadb798437fefe9ff117d162c42bda8b10326c310579e` | [test-report.md](file:///home/avada/tontine/docs/qa/task-002/test-report.md), exit code 0 | VERIFIED (Khớp 100%) | VERIFIED |
| REQ-06 | AC-06.3 | TC-26 | `78c9a038eb23b467744fadb798437fefe9ff117d162c42bda8b10326c310579e` | [test-report.md](file:///home/avada/tontine/docs/qa/task-002/test-report.md), exit code 0 | VERIFIED (Khớp 100%) | VERIFIED |

---

## 5. Kết luận Nghiệm thu Nghiệp vụ (BA Signoff)
- **Độ phủ yêu cầu (Requirements Coverage)**: `100%` (26/26 AC được kiểm chứng có test case thực chạy pass).
- **Tính toàn vẹn mã nguồn**: Mã nguồn khớp 100% với mã băm đóng băng `docs/manifests/task-002/manifest.json`.
- **Đánh giá**: Đặc tả nghiệp vụ `v1.1` đã giải quyết toàn bộ các vấn đề cốt lõi, bao gồm việc sửa đổi màn hình chặn để người dùng truy cập giao diện thông suốt mà không gặp lỗi amber warning.
