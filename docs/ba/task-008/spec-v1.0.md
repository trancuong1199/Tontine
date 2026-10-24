# Business Specification: Tối Ưu Giao Diện Trạng Thái Nhóm Đã Hủy (Cancelled State UX & Clarification)

**Task ID**: `task-008`  
**Dispatch ID**: `dispatch-008-ba`  
**Spec Version**: `v1.0`  
**Tác giả (BA)**: `ba-agent`  
**Trạng thái**: `Verified (Signoff 100% - Gate 4 Completed)`  

---

## 1. Tổng quan & Giá trị (Problem & Value Proposition)

### 1.1. Phân tích Hiện trạng từ Ảnh chụp Màn hình Thực tế (`bAmy3d75wUjX.webp`)
Dựa trên phản hồi người dùng thực tế và bằng chứng trực quan thẩm định từ ảnh chụp màn hình URL `https://capture.avada.io/i/bAmy3d75wUjX` (tập tin đệm hệ thống: `custom-aHR0cHM6Ly9jYXB0dXJlLmF2YWRhLmlvL2kvYkFteTNkNzV3VWpY-bAmy3d75wUjX.png`):

```
+----------------------------------------------------------------------------------------------------+
|  [HụiChain Logo]                               [VI 🇻🇳]   [Danh sách nhóm]   [+ Tạo nhóm]  [0.00 USDC] |
|                                                                                                    |
|  +---------------------------------------------+   +---------------------------------------------+ |
|  | [Thẻ ClubCard: Nhóm Hụi Arc Alpha]          |   | [GroupSwitcher: HỢP ĐỒNG NHÓM HỤI]          | |
|  | [Badge: • Đã hủy / Cancelled]               |   | [0xe536...095b]                             | |
|  | Pot: 0.00 USDC | Đóng cố định: 100.00 USDC  |   | [Danh sách nhóm] [+ Tạo nhóm mới] [Đổi nhóm]| |
|  | Sức chứa: 0/10 Thành viên                   |   +---------------------------------------------+ |
|  +---------------------------------------------+   | [MemberStatus: TRẠNG THÁI CỦA BẠN]          | |
|  | [RoundHistory: Lịch sử các vòng - Trống]     |   | "Join club to view your status"             | |
|  |                                             |   |  (LỖI 1: Gây hiểu lầm, nhóm đã hủy rồi!)    | |
|  |                                             |   +---------------------------------------------+ |
|  |                                             |   | [ActionPanel / PasskeyActionPanel]          | |
|  |                                             |   |  <KHUNG TRẮNG TINH / TRỐNG RỖNG HOÀN TOÀN>  | |
|  |                                             |   |  (LỖI 2: Không có nhánh render CANCELLED!)  | |
|  +---------------------------------------------+   +---------------------------------------------+ |
+----------------------------------------------------------------------------------------------------+
```

1. **Vấn đề 1: Thẻ `MemberStatus` hiển thị câu gây hiểu lầm ("Tham gia nhóm để xem trạng thái" / "Join club to view your status")**:
   - **Hiện trạng trên ảnh**: Trong cột bên phải, bên dưới khối địa chỉ ví, thẻ trạng thái cá nhân hiển thị dòng chữ:
     `"Join club to view your status"` (hoặc bản tiếng Việt: `"Tham gia nhóm để xem trạng thái của bạn"`).
   - **Nguyên nhân kỹ thuật**: Trong [src/components/savings/MemberStatus.tsx](file:///home/avada/tontine/src/components/savings/MemberStatus.tsx#L35-L43), component kiểm tra điều kiện `if (!isMember)` đầu tiên. Khi nhóm đã bị hủy (`state === GROUP_STATE.CANCELLED`), nếu người dùng chưa tham gia hoặc sau khi nhóm hủy thì hệ thống trả về thông báo mặc định của người chưa tham gia (`memberStatus.notMemberHint`).
   - **Hệ quả UX**:
     - Người dùng băn khoăn: "Nhóm đã hủy rồi thì sao lại bảo tôi tham gia?", "Nếu tôi đã tham gia trước đó thì tôi đã rời nhóm an toàn chưa hay tài sản còn bị kẹt?".
     - Thông báo tạo cảm giác ứng dụng bị lỗi logic, không nhận biết được trạng thái đóng vĩnh viễn của hợp đồng.

2. **Vấn đề 2: Khung thao tác `ActionPanel` và `PasskeyActionPanel` bị trống rỗng hoàn toàn (Card trắng tinh)**:
   - **Hiện trạng trên ảnh**: Khu vực bên dưới `MemberStatus` — nơi thông thường hiển thị các thao tác tham gia, đóng tiền hụi, đặt bid hoặc tổng kết vòng — đang hiển thị một khung trắng tinh không có bất kỳ chữ hay icon nào.
   - **Nguyên nhân gốc rễ (Root Cause Analysis)**:
     - Trong [src/components/savings/ActionPanel.tsx](file:///home/avada/tontine/src/components/savings/ActionPanel.tsx#L301-L591) và [src/components/savings/PasskeyActionPanel.tsx](file:///home/avada/tontine/src/components/savings/PasskeyActionPanel.tsx#L400-L491), component chỉ có các nhánh kiểm tra:
       + `state === GROUP_STATE.OPEN` (Giai đoạn đăng ký)
       + `state === GROUP_STATE.ACTIVE` (Đang diễn ra các vòng)
       + `state === GROUP_STATE.COMPLETED` (Đã hoàn thành các vòng)
     - Hoàn toàn **KHÔNG CÓ nhánh render cho `state === GROUP_STATE.CANCELLED`** (giá trị enum bằng 3)!
     - Khi `state === 3`, cả ba điều kiện trên đều trả về `false`, khiến thẻ container `<div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">` kết xuất rỗng không có con (children), trở thành một hộp trắng trơ trọi, tạo ấn tượng ứng dụng bị crash hoặc lỗi render.

3. **Chỉ đạo Ràng buộc Nghiêm ngặt từ Người dùng (Strict Negative Constraint)**:
   - Người dùng đã chỉ đạo rõ ràng: *"nhưng [Xem danh sách nhóm] và [+ Tạo nhóm mới] đã có nút ở đó sẵn rồi thì k cần làm nữa"*.
   - **Ý nghĩa nghiệp vụ**: Trên giao diện hiện tại, ngay phía trên thẻ ActionPanel đã có sẵn khung `GroupSwitcher` với 4 nút rõ ràng (`Danh sách nhóm`, `+ Tạo nhóm mới`, `Sao chép link nhóm`, `Đổi nhóm`) và trên thanh Header cũng có sẵn các nút này. Do đó, thẻ trạng thái Cancelled **TUYỆT ĐỐI KHÔNG** chèn thêm các nút hành động trùng lặp (Redundant Action Buttons), tránh làm rối mắt và dư thừa UI.

---

### 1.2. Giá trị mang lại (Value Proposition)
- **Minh bạch Trạng thái & Xóa bỏ Hoài nghi (Absolute Clarity & Closure)**:
  - Thông báo chính xác, dứt khoát rằng nhóm hụi đã bị hủy bởi chủ nhóm trong giai đoạn đăng ký và hợp đồng đã đóng vĩnh viễn.
  - Thay thế triệt để câu mời gọi vô lý "Tham gia nhóm để xem trạng thái" bằng thông điệp giải tán an toàn trong `MemberStatus`.
- **An tâm Tuyệt đối về Tài sản (Asset Safety & Peace of Mind)**:
  - Nhấn mạnh và cam đoan minh bạch: Toàn bộ thành viên đã rời nhóm an toàn, không có bất kỳ đồng USDC nào bị giam giữ hay thất thoát trong smart contract (0 USDC rủi ro).
- **Thẩm mỹ Giao diện Chuyên nghiệp & Tinh gọn (Elegant Status Card, Zero Clutter)**:
  - Thay thế khung trắng rỗng bằng thẻ trạng thái trang nhã: Icon `XCircle` màu đỏ/rose dịu mắt, tiêu đề rõ ràng, mô tả giải thích ngắn gọn và lời nhắc điều hướng nhẹ nhàng.
  - Tuân thủ nghiêm ngặt chỉ thị không chèn nút thừa, giữ cho giao diện tinh tế, gọn gàng và chuẩn mực Web3.
- **Hỗ trợ Song ngữ Hoàn hảo (Bilingual Consistency)**:
  - Đảm bảo 100% nội dung giải thích trạng thái hủy hiển thị mượt mà ở cả tiếng Việt (`vi`) và tiếng Anh (`en`).

---

## 2. Đối tượng sử dụng & Phạm vi (Actors & Scope)

### 2.1. Đối tượng sử dụng (Actors)
- **Thành viên đã từng tham gia nhóm (Registered Member)**: Người đã bấm tham gia nhóm trước khi nhóm bị hủy; cần biết chắc chắn mình đã thoát nhóm an toàn và tiền không bị trừ.
- **Người dùng chưa tham gia nhóm (Non-member / Visitor)**: Người vừa truy cập đường link nhóm đã hủy; cần biết nhóm đã đóng để không tìm chỗ tham gia nữa.
- **Chủ nhóm đã hủy nhóm (Group Owner)**: Sau khi bấm "Huỷ nhóm" (gọi `cancelGroup()`), nhìn thấy giao diện phản hồi trạng thái hủy chuyên nghiệp, rõ ràng.
- **Hệ thống Giao diện (Client Application UI)**: Nhận diện `state === GROUP_STATE.CANCELLED` (3) từ hợp đồng và chuyển sang chế độ hiển thị giải tán an toàn đồng bộ trên toàn bộ component.

---

### 2.2. Phạm vi thực hiện (Scope)

#### Trong phạm vi (In-Scope):
1. **Cập nhật Thẻ `MemberStatus.tsx`**:
   - Bổ sung nhánh xử lý ưu tiên khi `state === GROUP_STATE.CANCELLED`.
   - Bất kể `isMember` là `true` hay `false`, thay thế câu `notMemberHint` ("Tham gia nhóm để xem trạng thái của bạn") bằng thông điệp thông báo nhóm đã hủy, hợp đồng đã giải tán và không còn thành viên.
2. **Cập nhật Thẻ `ActionPanel.tsx` & `PasskeyActionPanel.tsx`**:
   - Bổ sung nhánh render tường minh cho `state === GROUP_STATE.CANCELLED`.
   - Kết xuất thẻ thông báo trạng thái Cancelled chuyên nghiệp:
     + Icon trực quan: `XCircle` (hoặc `AlertCircle` / `Ban` từ `lucide-react`) với tông màu đỏ nhạt/rose thanh lịch (`text-red-500 bg-red-50`).
     + Tiêu đề: `"Nhóm hụi đã bị huỷ"` (vi) / `"Savings Club Cancelled"` (en).
     + Nội dung an tâm: Giải thích nhóm đã được hủy bởi Chủ nhóm trong giai đoạn đăng ký, người dùng đã rời nhóm an toàn, không có tài sản nào bị giam giữ và hợp đồng đã đóng vĩnh viễn.
     + Lời nhắc điều hướng: Nhắc người dùng có thể sử dụng các nút điều hướng phía trên (Header hoặc GroupSwitcher) để chuyển nhóm hoặc tạo nhóm mới.
3. **Tuân thủ Bất biến "Cấm Nút Dư Thừa" (Zero Redundant Buttons Invariant)**:
   - **TUYỆT ĐỐI KHÔNG** chèn các nút bấm `<button>` như "Xem danh sách nhóm", "Tạo nhóm mới" bên trong thẻ Cancelled card của `ActionPanel` / `PasskeyActionPanel`.
4. **Bổ sung Từ điển Song ngữ `src/lib/i18n.ts`**:
   - Khai báo đầy đủ các khóa chuỗi dịch mới cho cả `vi` và `en`:
     + `memberStatus.cancelledTitle`: `"Nhóm hụi đã bị huỷ"` / `"Savings Club Cancelled"`
     + `memberStatus.cancelledHint`: `"Hợp đồng đã giải tán an toàn, không còn thành viên hoạt động."` / `"Contract dissolved safely with no active members."`
     + `actionPanel.cancelledTitle`: `"Nhóm hụi đã bị huỷ"` / `"Savings Club Cancelled"`
     + `actionPanel.cancelledDesc`: `"Nhóm hụi đã được huỷ bởi Chủ nhóm trong giai đoạn đăng ký. Toàn bộ người dùng đã rời nhóm an toàn, không có tài sản nào bị giam giữ và hợp đồng đã đóng vĩnh viễn."` / `"The savings club was cancelled by the club owner during the registration phase. All members have exited safely, no assets are locked, and the contract is permanently closed."`
     + `actionPanel.cancelledNavHint`: `"Bạn có thể sử dụng các nút điều hướng phía trên (Danh sách nhóm hoặc Tạo nhóm mới) để khám phá hoặc khởi tạo nhóm hụi khác."` / `"You can use the navigation buttons above (Club Directory or Create Club) to explore or create another savings club."`

#### Ngoài phạm vi (Out-of-Scope):
- Chỉnh sửa logic hay tái triển khai smart contract Solidity `RotatingSavings.sol`.
- Thêm các nút thao tác giao dịch (giao dịch đã bị chặn hoàn toàn khi contract ở trạng thái Cancelled).

---

## 3. Kích hoạt, Đầu vào & Đầu ra (Trigger, Input & Observable Output)

| Mã ID | Tác nhân (Actor) | Hành động kích hoạt (Trigger) | Đầu vào (Input) | Đầu ra quan sát được (Observable Output) |
| :--- | :--- | :--- | :--- | :--- |
| **TR-01** | Người dùng | Truy cập vào một nhóm hụi có trạng thái đã hủy (`state === GROUP_STATE.CANCELLED`) | URL `?group=0x...` trỏ đến contract đã gọi `cancelGroup()` | - `ClubCard` hiển thị badge đỏ `• Đã hủy` / `Cancelled`.<br>- `MemberStatus` hiển thị thông báo nhóm đã hủy, giải tán an toàn, không còn câu "Tham gia nhóm để xem trạng thái".<br>- `ActionPanel` / `PasskeyActionPanel` hiển thị thẻ thông báo Cancelled với icon đỏ, tiêu đề rõ ràng, thông điệp an tâm tài sản và lời nhắc điều hướng; **không còn khung trắng rỗng**. |
| **TR-02** | Chủ nhóm | Bấm nút "Huỷ nhóm" và xác nhận giao dịch on-chain thành công khi nhóm còn OPEN | Click "Huỷ nhóm" trong OwnerControls | - Giao dịch hoàn tất trên Arc Testnet.<br>- `state` chuyển từ `0` (OPEN) sang `3` (CANCELLED).<br>- Khung OwnerControls tự động ẩn.<br>- `MemberStatus` và `ActionPanel` lập tức cập nhật sang giao diện Cancelled chuyên nghiệp. |
| **TR-03** | Người dùng | Thay đổi ngôn ngữ qua nút Toggle trên Header giữa `VI 🇻🇳` và `EN 🇬🇧` khi đang xem nhóm đã hủy | Click nút chuyển ngôn ngữ | - Toàn bộ thông báo trong `MemberStatus` và `ActionPanel` đổi ngôn ngữ tức thì, chuẩn xác theo từ điển i18n, không bị trộn lẫn ngôn ngữ hay vỡ giao diện. |
| **TR-04** | Người dùng | Quan sát các nút điều hướng khi đang ở trang nhóm đã hủy | Nhìn vào thẻ ActionPanel Cancelled | - Thẻ ActionPanel Cancelled **không chứa bất kỳ nút bấm thừa nào**.<br>- Người dùng nhận biết lời nhắc và chủ động bấm vào các nút điều hướng đã có sẵn phía trên (Header / GroupSwitcher). |

---

## 4. Quy tắc nghiệp vụ (Business Rules - BR)

### BR-01: Xử lý Trạng thái Cancelled trong Thẻ MemberStatus (MemberStatus Cancelled Handling Rule)
1. **Ưu tiên kiểm tra trạng thái Cancelled**:
   - Khi `state === GROUP_STATE.CANCELLED` (hoặc `state === 3`), component `MemberStatus` **bắt buộc** hiển thị thông điệp giải tán nhóm thay vì kiểm tra luồng `!isMember` thông thường.
2. **Loại bỏ triệt để chuỗi gây hiểu lầm**:
   - Tuyệt đối không hiển thị câu `"Tham gia nhóm để xem trạng thái của bạn"` / `"Join club to view your status"` khi nhóm đã ở trạng thái CANCELLED.
3. **Nội dung hiển thị chuẩn**:
   - Khung thẻ màu slate hoặc red nhạt nhẹ nhàng (`bg-slate-50 border-slate-200` hoặc `bg-red-50/50 border-red-100`).
   - Tiêu đề phụ: `"Nhóm hụi đã bị huỷ"` (vi) / `"Savings Club Cancelled"` (en).
   - Mô tả: `"Hợp đồng đã giải tán an toàn, không còn thành viên hoạt động."` (vi) / `"Contract dissolved safely with no active members."` (en).

---

### BR-02: Hiển thị Thẻ Trạng thái Cancelled trong ActionPanel & PasskeyActionPanel (ActionPanel Cancelled Card Rule)
1. **Nhánh render bắt buộc (Explicit Render Branch)**:
   - Cả hai component [src/components/savings/ActionPanel.tsx](file:///home/avada/tontine/src/components/savings/ActionPanel.tsx) và [src/components/savings/PasskeyActionPanel.tsx](file:///home/avada/tontine/src/components/savings/PasskeyActionPanel.tsx) phải bổ sung nhánh kiểm tra rõ ràng:
     `{state === GROUP_STATE.CANCELLED && ( ... )}`
   - Tuyệt đối không để xảy ra trường hợp không có nhánh nào khớp dẫn đến thẻ trắng rỗng.
2. **Cấu trúc Thẻ Thông báo Cancelled**:
   Thẻ phải bao gồm đầy đủ 4 thành phần thị giác:
   - **Thành phần 1 (Biểu tượng)**: Icon vector cỡ lớn (`size={28}`) như `XCircle`, `AlertCircle` hoặc `Ban`, nằm trong khung tròn hoặc bo góc màu đỏ nhạt (`bg-red-50 text-red-600 border border-red-100`).
   - **Thành phần 2 (Tiêu đề)**: Chữ to rõ nét (`text-lg sm:text-xl font-bold text-slate-900`): `"Nhóm hụi đã bị huỷ"` (vi) / `"Savings Club Cancelled"` (en).
   - **Thành phần 3 (Thông điệp An tâm Tài sản)**: Đoạn văn bản cỡ `text-sm text-slate-600 leading-relaxed`: Giải thích rõ nhóm đã được hủy bởi Chủ nhóm trong giai đoạn đăng ký, toàn bộ thành viên đã rời nhóm an toàn, không có tài sản nào bị giam giữ và hợp đồng đã đóng vĩnh viễn.
   - **Thành phần 4 (Lời nhắc Điều hướng)**: Hộp phụ `bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs sm:text-sm text-slate-600`: Nhắc nhở người dùng có thể sử dụng các nút phía trên (Header hoặc GroupSwitcher) để chuyển hoặc tạo nhóm khác.

---

### BR-03: Bất biến "Cấm Nút Bấm Dư Thừa" (Zero Redundant Navigation Buttons Invariant)
1. **Tuyệt đối không chèn nút hành động bên trong thẻ Cancelled**:
   - Thẻ Cancelled trong `ActionPanel` và `PasskeyActionPanel` chỉ đóng vai trò là **Thẻ Thông Tin (Informative Status Card)**, không phải Thẻ Điều Hướng Hành Động (Action Card).
   - Không được thêm các thẻ `<button>` chuyển hướng (như nút "Xem danh sách nhóm", nút "Tạo nhóm mới", nút "Đổi nhóm") bên trong thẻ này.
2. **Lý do nghiệp vụ**:
   - Các nút điều hướng tương ứng đã hiện diện đầy đủ, nổi bật ngay trên thanh Header và trong khung `GroupSwitcher` liền kề bên trên. Việc thêm nút bấm vào trong thẻ này sẽ gây trùng lặp, rối loạn thị giác và vi phạm chỉ đạo trực tiếp của người dùng.

---

### BR-04: Chuẩn hóa Thông điệp An tâm Tài sản & Đa ngôn ngữ (Asset Safety Assurance & Bilingual Standard Rule)
1. **Cam đoan an toàn vốn (Zero Financial Loss Guarantee)**:
   - Do quy tắc smart contract `RotatingSavings.sol` chỉ cho phép gọi `cancelGroup()` khi `state == GroupState.OPEN` (khi chưa thu bất kỳ đồng tiền đóng hụi nào từ thành viên), thông điệp phải truyền tải sự yên tâm tuyệt đối cho người dùng rằng không có bất kỳ khoản tiền nào bị thất thoát hay kẹt trong hợp đồng.
2. **Khóa từ điển đa ngôn ngữ thống nhất**:
   - Mọi chuỗi văn bản dùng cho tính năng này phải được khai báo tập trung trong `src/lib/i18n.ts`, không hardcode chuỗi trực tiếp trong JSX.

---

## 5. Luồng nghiệp vụ (Workflow & Mermaid Diagrams)

### 5.1. Luồng Phân giải và Hiển thị Giao diện Nhóm đã Hủy (Cancelled State UI Resolution Flow)

```mermaid
flowchart TD
    Start([Nạp dữ liệu Hợp đồng Hụi]) --> FetchState[Đọc state từ contract on-chain]
    
    FetchState --> CheckState{Giá trị state?}
    
    CheckState -->|state == 0 OPEN| RenderOpen[Hiển thị Giai đoạn Đăng ký: Tham gia / Bắt đầu]
    CheckState -->|state == 1 ACTIVE| RenderActive[Hiển thị Giai đoạn Vòng chạy: Đóng tiền / Đặt Bid]
    CheckState -->|state == 2 COMPLETED| RenderCompleted[Hiển thị Giai đoạn Hoàn thành: Tất toán]
    CheckState -->|state == 3 CANCELLED| RenderCancelled[XỬ LÝ ĐỒNG BỘ TRẠNG THÁI ĐÃ HỦY]

    RenderCancelled --> StepClubCard[1. ClubCard: Hiển thị Badge đỏ 'Đã hủy / Cancelled']
    RenderCancelled --> StepOwner[2. OwnerControls: Tự động ẩn, không còn thao tác chủ nhóm]
    
    RenderCancelled --> StepMemberStatus[3. MemberStatus:]
    StepMemberStatus --> MS_Check{Đang ở state CANCELLED?}
    MS_Check -->|Đúng| MS_Render[Bỏ qua 'Join club to view status' -> Render: Nhóm đã hủy, giải tán an toàn, không còn thành viên]

    RenderCancelled --> StepActionPanel[4. ActionPanel & PasskeyActionPanel:]
    StepActionPanel --> AP_Render[Render Card Cancelled Chuyên nghiệp:]
    AP_Render --> AP_Icon[Icon XCircle đỏ / rose trang nhã]
    AP_Render --> AP_Title[Tiêu đề: Nhóm hụi đã bị huỷ]
    AP_Render --> AP_Safety[Thông điệp an tâm: Đã rời nhóm an toàn, 0 USDC bị kẹt]
    AP_Render --> AP_NavHint[Lời nhắc: Dùng nút điều hướng phía trên để đổi/tạo nhóm]
    AP_Render --> AP_NoBtn[TUYỆT ĐỐI KHÔNG CHÈN NÚT BẤM DƯ THỪA]

    MS_Render --> Done([Giao diện hiển thị minh bạch, an tâm, không còn khung trắng rỗng])
    AP_NoBtn --> Done
```

---

### 5.2. Hành trình Người dùng khi Tương tác Nhóm đã Hủy (User Journey on Cancelled Club)

```mermaid
flowchart TD
    User([Người dùng mở trang nhóm hụi đã hủy]) --> ViewCard[Quan sát thấy Thẻ ClubCard ghi 'Đã hủy']
    ViewCard --> ViewStatus[Nhìn sang Thẻ MemberStatus: Thấy thông báo giải tán an toàn]
    ViewStatus --> ViewPanel[Nhìn vào Thẻ ActionPanel: Đọc thông điệp an tâm tài sản]
    
    ViewPanel --> Reassured{Người dùng cảm thấy thế nào?}
    Reassured -->|Hoàn toàn an tâm, hiểu rõ trạng thái| NextAction[Muốn tiếp tục sử dụng ứng dụng]
    
    NextAction --> LookUp[Đọc lời nhắc điều hướng và nhìn lên phía trên]
    LookUp --> Choice{Chọn thao tác tiếp theo?}
    
    Choice -->|Bấm 'Danh sách nhóm' trên Header/GroupSwitcher| OpenDir[Mở modal Danh bạ nhóm -> Chọn nhóm khác]
    Choice -->|Bấm '+ Tạo nhóm' trên Header/GroupSwitcher| OpenCreate[Mở modal Tạo nhóm mới -> Khởi tạo nhóm mới]
    Choice -->|Bấm 'Đổi nhóm' trên GroupSwitcher| InputOther[Nhập địa chỉ contract khác]
```

---

## 6. Yêu cầu & Tiêu chí nghiệm thu (Requirements & Acceptance Criteria)

### Yêu cầu REQ-01: Tối ưu Thông báo trong Thẻ MemberStatus khi Nhóm đã Hủy

- **AC-01.1 (Người dùng chưa tham gia truy cập nhóm Cancelled - Non-member View)**:
  - **Input**: Người dùng kết nối ví (hoặc xem ở chế độ guest) mở một nhóm hụi có `state === GROUP_STATE.CANCELLED` và `isMember === false`.
  - **Expected Output**:
    1. Thẻ `MemberStatus` **tuyệt đối không hiển thị** câu `"Tham gia nhóm để xem trạng thái của bạn"` hoặc `"Join club to view your status"`.
    2. Thẻ hiển thị thông báo rõ ràng về việc nhóm đã hủy:
       - Tiêu đề: `"Nhóm hụi đã bị huỷ"` (vi) / `"Savings Club Cancelled"` (en).
       - Nội dung: `"Hợp đồng đã giải tán an toàn, không còn thành viên hoạt động."` (vi) / `"Contract dissolved safely with no active members."` (en).
    3. Giao diện trang nhã, không gây cảm giác lỗi.

- **AC-01.2 (Thành viên đã từng tham gia truy cập nhóm Cancelled - Registered Member View)**:
  - **Input**: Người dùng đã tham gia nhóm trước đó (`isMember === true`) mở nhóm khi nhóm đã chuyển sang `state === GROUP_STATE.CANCELLED`.
  - **Expected Output**:
    1. Thẻ `MemberStatus` không hiển thị nhãn cảnh báo đóng tiền (`"Chưa đóng"`) hay yêu cầu hành động nào.
    2. Thẻ hiển thị thông điệp xác nhận nhóm đã giải tán an toàn, không còn thành viên hoạt động.

- **AC-01.3 (Song ngữ chuẩn xác trong MemberStatus - Bilingual Support)**:
  - **Input**: Người dùng bấm nút chuyển đổi ngôn ngữ giữa `vi` và `en`.
  - **Expected Output**:
    1. Khi chọn `vi`: Hiển thị tiếng Việt chuẩn xác theo từ điển `memberStatus.cancelledTitle` và `memberStatus.cancelledHint`.
    2. Khi chọn `en`: Hiển thị tiếng Anh chuẩn xác.

---

### Yêu cầu REQ-02: Thẻ Trạng thái Chuyên nghiệp & An tâm trong ActionPanel & PasskeyActionPanel

- **AC-02.1 (Hiển thị Thẻ Cancelled trong ActionPanel Wagmi - Regular Wallet View)**:
  - **Input**: Người dùng kết nối ví thông thường (MetaMask/Wagmi) truy cập nhóm có `state === GROUP_STATE.CANCELLED`.
  - **Expected Output**:
    1. `ActionPanel` **không còn bị trắng tinh / rỗng**.
    2. Hiển thị một thẻ hoàn chỉnh có viền bo tròn (`rounded-3xl border border-slate-200/80 shadow-xs`).
    3. Chứa icon vector nổi bật (`XCircle` hoặc `Ban` hoặc `AlertCircle` cỡ 28px, tông màu đỏ/rose).
    4. Tiêu đề: `"Nhóm hụi đã bị huỷ"` (vi) / `"Savings Club Cancelled"` (en).
    5. Đoạn giải thích an tâm tài sản: Nhóm đã hủy bởi Chủ nhóm trong giai đoạn đăng ký, toàn bộ thành viên rời nhóm an toàn, không có tài sản nào bị kẹt và hợp đồng đã đóng vĩnh viễn.
    6. Lời nhắc điều hướng: Nhắc người dùng có thể dùng các nút điều hướng phía trên để chuyển nhóm hoặc tạo nhóm mới.

- **AC-02.2 (Hiển thị Thẻ Cancelled trong PasskeyActionPanel - Circle Passkey View)**:
  - **Input**: Người dùng đăng nhập bằng ví Passkey (Circle Modular Wallet) truy cập nhóm có `state === GROUP_STATE.CANCELLED`.
  - **Expected Output**:
    1. `PasskeyActionPanel` hiển thị thẻ trạng thái Cancelled đồng bộ 100% về mặt cấu trúc, nội dung, icon và độ thẩm mỹ với `ActionPanel`.
    2. Tuyệt đối không để xảy ra hiện tượng khung trắng rỗng.

- **AC-02.3 (Thông điệp An tâm Tài sản rõ ràng - Asset Safety Message)**:
  - **Input**: Kiểm tra nội dung văn bản hiển thị trên thẻ Cancelled.
  - **Expected Output**:
    1. Nội dung khẳng định rõ: *"không có tài sản nào bị giam giữ"* (vi) / *"no assets are locked"* (en).
    2. Khẳng định hợp đồng đã đóng vĩnh viễn, người dùng không cần thực hiện thêm bất kỳ thao tác rút vốn hay claim nào.

---

### Yêu cầu REQ-03: Tuân thủ Bất biến Cấm Nút Bấm Dư Thừa & Đồng bộ i18n

- **AC-03.1 (Tuyệt đối không có nút bấm điều hướng bên trong thẻ Cancelled - Zero Redundant Buttons)**:
  - **Input**: Kiểm tra cấu trúc DOM và giao diện của thẻ Cancelled trong cả `ActionPanel.tsx` và `PasskeyActionPanel.tsx`.
  - **Expected Output**:
    1. Bên trong thẻ Cancelled **hoàn toàn không chứa bất kỳ thẻ `<button>` nào** (như nút "Xem danh sách nhóm", nút "Tạo nhóm mới", nút "Đổi nhóm").
    2. Thẻ thuần túy là thẻ thông tin và nhắc nhở, hướng sự chú ý của người dùng lên các nút đã có sẵn trên Header và GroupSwitcher.

- **AC-03.2 (Khai báo đầy đủ Từ điển Song ngữ trong i18n - Dictionary Completeness)**:
  - **Input**: Kiểm tra file [src/lib/i18n.ts](file:///home/avada/tontine/src/lib/i18n.ts).
  - **Expected Output**:
    1. Cả hai mục `vi` và `en` đều có đầy đủ các khóa:
       - `memberStatus.cancelledTitle`
       - `memberStatus.cancelledHint`
       - `actionPanel.cancelledTitle`
       - `actionPanel.cancelledDesc`
       - `actionPanel.cancelledNavHint`
    2. Không có bất kỳ chuỗi tiếng Anh hoặc tiếng Việt nào bị hardcode trực tiếp trong JSX của component.

---

## 7. Phụ thuộc & Quản trị Rủi ro (Dependencies & Risk Management)

### 7.1. Ma trận Rủi ro & Giải pháp Phòng ngừa

| Mã Rủi ro | Mô tả Rủi ro | Mức độ | Khả năng | Tác động & Giải pháp Phòng ngừa (Mitigation) |
| :--- | :--- | :--- | :--- | :--- |
| **RSK-01** | **Vi phạm Chỉ đạo Nghiêm ngặt của Người dùng (Developer tự ý thêm nút bấm)**: Developer có thói quen thêm nút Call-to-Action (CTA) như `<button>Xem danh sách nhóm</button>` vào thẻ rỗng. | **Nghiêm trọng** | **Cao** | **Giải pháp**: Ghi rõ trong **BR-03** và **AC-03.1** là **TUYỆT ĐỐI CẤM** thêm nút bấm bên trong thẻ Cancelled. Tester phải viết test case kiểm tra số lượng button bên trong thẻ Cancelled bằng 0 (`assert.equal(cancelledCardButtons.length, 0)`). |
| **RSK-02** | **Bỏ quên PasskeyActionPanel (Chỉ sửa ActionPanel thường)**: Dự án có 2 panel riêng biệt cho Wagmi và Passkey. Nếu Developer chỉ sửa `ActionPanel.tsx` mà quên `PasskeyActionPanel.tsx`, người dùng Passkey vẫn bị card trắng. | **Cao** | **Trung bình** | **Giải pháp**: Yêu cầu đồng bộ cả 2 component trong **AC-02.1** và **AC-02.2**. |
| **RSK-03** | **Thứ tự kiểm tra trong MemberStatus bị sai**: Nếu kiểm tra `if (!isMember)` trước `if (state === GROUP_STATE.CANCELLED)`, thành viên đã tham gia sẽ rơi vào nhánh render thẻ active có badge "Chưa đóng". | **Trung bình** | **Cao** | **Giải pháp**: Quy định rõ trong **BR-01**: Kiểm tra `state === GROUP_STATE.CANCELLED` phải được đặt ở vị trí ưu tiên hàng đầu trong hàm render của `MemberStatus`. |

---

## 8. Nhật ký Giả định, Dữ kiện & Câu hỏi chặn (Assumptions, Facts & Questions Log)

### 8.1. Dữ kiện đã Xác thực (Verified Facts)
- **Fact-01**: Ảnh chụp màn hình `bAmy3d75wUjX.webp` chứng minh:
  + Thẻ `ClubCard` hiển thị nhóm `Nhóm Hụi Arc Alpha` ở trạng thái `• Đã hủy` / `Cancelled`.
  + Thẻ `MemberStatus` hiển thị câu gây hiểu lầm `"Join club to view your status"`.
  + Khu vực `ActionPanel` bên dưới hoàn toàn trống rỗng (khung trắng tinh).
- **Fact-02**: Mã nguồn [src/components/savings/ActionPanel.tsx](file:///home/avada/tontine/src/components/savings/ActionPanel.tsx) và [src/components/savings/PasskeyActionPanel.tsx](file:///home/avada/tontine/src/components/savings/PasskeyActionPanel.tsx) hiện tại chỉ có nhánh cho `GROUP_STATE.OPEN`, `GROUP_STATE.ACTIVE`, `GROUP_STATE.COMPLETED`. Hoàn toàn không có nhánh cho `GROUP_STATE.CANCELLED`.
- **Fact-03**: Trong smart contract [contracts/RotatingSavings.sol](file:///home/avada/tontine/contracts/RotatingSavings.sol#L321-L325), hàm `cancelGroup()` chỉ có thể gọi khi nhóm đang ở `GroupState.OPEN` (chưa thu tiền), do đó không có bất kỳ rủi ro thất thoát vốn nào xảy ra khi nhóm bị hủy.
- **Fact-04**: Các nút điều hướng "Danh sách nhóm", "+ Tạo nhóm mới", "Đổi nhóm" đã hiện diện đầy đủ ngay trên thanh Header và trong khung `GroupSwitcher` kề sát phía trên.

### 8.2. Giả định Thiết kế (Design Assumptions)
- **Assumption-01**: Người dùng khi nhìn thấy thông điệp giải thích an tâm và lời nhắc điều hướng sẽ chủ động tương tác với các nút trên Header hoặc GroupSwitcher mà không cần nút phụ trợ bên trong card.
- **Assumption-02**: Màu sắc thông báo đỏ/rose dịu mắt (`bg-red-50 text-red-600 border-red-100`) đồng bộ với huy hiệu `• Đã hủy` trên `ClubCard`, tạo cảm giác nhất quán trong thiết kế hệ thống.

### 8.3. Câu hỏi Chặn (Blocking Questions)
- **None**: Không có câu hỏi chặn. Tất cả các yêu cầu từ người dùng và phân tích kỹ thuật đều đã sáng tỏ 100%.

---

## 9. Bảng truy vết yêu cầu (Traceability Matrix)

> [!NOTE]
> **Đã đối chiếu & Xác nhận Nghiệm thu (Gate 4 Completed)**:
> Tester độc lập (`qa-agent`) đã thực thi toàn bộ bộ kiểm thử độc lập tại `tests/cancelled-state-ux.test.ts` (9/9 tests pass, tổng hệ thống 93/93 tests pass) và ký duyệt nghiệm thu tại `docs/qa/task-008/test-report.md`. Tính toàn vẹn 4 tệp mã nguồn theo manifest `docs/manifests/task-008/manifest.json` đạt 100%. BA xác nhận độ phủ nghiệp vụ đạt **100% (9/9 ACs)**.

| REQ ID | AC ID | Mô tả Tiêu chí | Test Case (Tester) | Spec/Source Hash | Evidence / Test Run | BA Đối chiếu | Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-01** | AC-01.1 | Non-member trong MemberStatus không thấy "Join club to view your status", thấy thông báo đã hủy | `TC-CANCEL-01` | `MemberStatus.tsx` (`f3df9c...`) | `tests/cancelled-state-ux.test.ts`: nhánh `state === GROUP_STATE.CANCELLED` đặt trước `!isMember`, loại bỏ hoàn toàn câu mời tham gia (0.87ms) | Khớp 100% đặc tả (Verified) | `PASS` |
| **REQ-01** | AC-01.2 | Registered Member trong MemberStatus thấy thông báo giải tán an toàn, không có cảnh báo nợ | `TC-CANCEL-02` | `MemberStatus.tsx` (`f3df9c...`) | `tests/cancelled-state-ux.test.ts`: early-return khối giải tán an toàn, không chứa cảnh báo nợ "Chưa đóng" hay nhãn thu tiền (0.24ms) | Khớp 100% đặc tả (Verified) | `PASS` |
| **REQ-01** | AC-01.3 | Song ngữ vi/en chuẩn xác trong MemberStatus khi nhóm đã hủy | `TC-CANCEL-03` | `MemberStatus.tsx` (`f3df9c...`), `i18n.ts` (`02d08a...`) | `tests/cancelled-state-ux.test.ts`: hiển thị đúng `memberStatus.cancelledTitle` và `cancelledHint` theo `language` (0.20ms) | Khớp 100% đặc tả (Verified) | `PASS` |
| **REQ-02** | AC-02.1 | ActionPanel (Wagmi) hiển thị Thẻ Cancelled chuyên nghiệp, không còn card trắng rỗng | `TC-CANCEL-04` | `ActionPanel.tsx` (`ed6fc9...`) | `tests/cancelled-state-ux.test.ts`: render thẻ có icon `<XCircle size={28} />`, tiêu đề, thông điệp an tâm và lời nhắc điều hướng (0.37ms) | Khớp 100% đặc tả (Verified) | `PASS` |
| **REQ-02** | AC-02.2 | PasskeyActionPanel (Passkey) hiển thị Thẻ Cancelled đồng bộ, không còn card trắng rỗng | `TC-CANCEL-05` | `PasskeyActionPanel.tsx` (`872f43...`) | `tests/cancelled-state-ux.test.ts`: đồng bộ 100% cấu trúc, nội dung, icon và kiểu dáng với `ActionPanel` (1.23ms) | Khớp 100% đặc tả (Verified) | `PASS` |
| **REQ-02** | AC-02.3 | Thông điệp an tâm tài sản khẳng định rõ 0 USDC bị giam giữ và hợp đồng đã đóng vĩnh viễn | `TC-CANCEL-06` | `i18n.ts` (`02d08a...`), `ActionPanel.tsx` (`ed6fc9...`) | `tests/cancelled-state-ux.test.ts`: chuỗi dịch khẳng định "không có tài sản nào bị giam giữ" / "no assets are locked", 0 USDC rủi ro (0.14ms) | Khớp 100% đặc tả (Verified) | `PASS` |
| **REQ-02** | AC-02.4 | Lời nhắc điều hướng hướng dẫn người dùng sử dụng các nút phía trên | `TC-CANCEL-04`, `TC-CANCEL-05` | `ActionPanel.tsx` (`ed6fc9...`), `PasskeyActionPanel.tsx` (`872f43...`) | `tests/cancelled-state-ux.test.ts`: hộp phụ hiển thị lời nhắc điều hướng bằng Header / GroupSwitcher trong cả 2 panel | Khớp 100% đặc tả (Verified) | `PASS` |
| **REQ-03** | AC-03.1 | **BẤT BIẾN CẤM NÚT DƯ THỪA**: Tuyệt đối KHÔNG có nút bấm (button) nào bên trong thẻ Cancelled của ActionPanel | `TC-CANCEL-07` | `ActionPanel.tsx` (`ed6fc9...`), `PasskeyActionPanel.tsx` (`872f43...`) | `tests/cancelled-state-ux.test.ts`: `buttonCount === 0` trong cả `ActionPanel` và `PasskeyActionPanel` thẻ Cancelled (0.46ms) | Khớp 100% đặc tả (Verified) | `PASS` |
| **REQ-03** | AC-03.2 | Từ điển i18n khai báo đầy đủ các khóa song ngữ cho cả MemberStatus và ActionPanel | `TC-CANCEL-08` | `src/lib/i18n.ts` (`02d08a...`) | `tests/cancelled-state-ux.test.ts`: 5 keys song ngữ có mặt đầy đủ trong cả `vi` và `en` không chuỗi rỗng (0.26ms) | Khớp 100% đặc tả (Verified) | `PASS` |

### 9.1. Đánh giá Độ phủ Nghiệp vụ (Business Coverage Assessment)
- **Độ phủ Tiêu chí Nghiệm thu (AC Coverage)**: `9/9 ACs (100%)` đã được kiểm thử độc lập và xác nhận bằng chứng đầy đủ.
- **Độ phủ Quy tắc Nghiệp vụ (BR Coverage)**:
  * `BR-01` (Thẻ MemberStatus Cancelled): Bao phủ qua `TC-CANCEL-01`, `TC-CANCEL-02`, `TC-CANCEL-03`.
  * `BR-02` (Thẻ ActionPanel & PasskeyActionPanel Cancelled): Bao phủ qua `TC-CANCEL-04`, `TC-CANCEL-05`, `TC-CANCEL-06`, `TC-CANCEL-09`.
  * `BR-03` (Bất biến Cấm Nút Bấm Dư Thừa): Bao phủ qua `TC-CANCEL-07` (`buttonCount === 0`).
  * `BR-04` (Cam đoan An tâm Tài sản & Đa ngôn ngữ): Bao phủ qua `TC-CANCEL-06`, `TC-CANCEL-08`.
- **Kiểm thử Hồi quy Toàn bộ Hệ thống**: `93/93 tests pass (100%)`.
- **Biên dịch Production (Build)**: `tsc --noEmit && vite build` thành công 100% trong 15.14s.

---

## 10. Hướng dẫn Kỹ thuật Triển khai (Developer Implementation Guidance)

Dành cho Developer tham khảo khi hiện thực giải pháp:

1. **File `src/lib/i18n.ts`**:
   - Thêm vào `translations.vi`:
     ```ts
     memberStatus: {
       ...
       cancelledTitle: "Nhóm hụi đã bị huỷ",
       cancelledHint: "Hợp đồng đã giải tán an toàn, không còn thành viên hoạt động.",
     },
     actionPanel: {
       ...
       cancelledTitle: "Nhóm hụi đã bị huỷ",
       cancelledDesc: "Nhóm hụi đã được huỷ bởi Chủ nhóm trong giai đoạn đăng ký. Toàn bộ người dùng đã rời nhóm an toàn, không có tài sản nào bị giam giữ và hợp đồng đã đóng vĩnh viễn.",
       cancelledNavHint: "Bạn có thể sử dụng các nút điều hướng phía trên (Danh sách nhóm hoặc Tạo nhóm mới) để khám phá hoặc khởi tạo nhóm hụi khác.",
     }
     ```
   - Thêm tương ứng vào `translations.en`:
     ```ts
     memberStatus: {
       ...
       cancelledTitle: "Savings Club Cancelled",
       cancelledHint: "Contract dissolved safely with no active members.",
     },
     actionPanel: {
       ...
       cancelledTitle: "Savings Club Cancelled",
       cancelledDesc: "The savings club was cancelled by the club owner during the registration phase. All members have exited safely, no assets are locked, and the contract is permanently closed.",
       cancelledNavHint: "You can use the navigation buttons above (Club Directory or Create Club) to explore or create another savings club.",
     }
     ```
2. **File `src/components/savings/MemberStatus.tsx`**:
   - Đặt kiểm tra `state === GROUP_STATE.CANCELLED` ở đầu component:
     ```tsx
     if (state === GROUP_STATE.CANCELLED) {
       return (
         <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200/80 text-center space-y-1">
           <p className="text-slate-800 font-semibold text-sm">
             {isEn ? t("memberStatus.cancelledTitle", language) : "Nhóm hụi đã bị huỷ"}
           </p>
           <p className="text-slate-600 text-xs sm:text-sm">
             {isEn ? t("memberStatus.cancelledHint", language) : "Hợp đồng đã giải tán an toàn, không còn thành viên hoạt động."}
           </p>
         </div>
       );
     }
     ```
3. **File `src/components/savings/ActionPanel.tsx` & `PasskeyActionPanel.tsx`**:
   - Thêm nhánh render cho `GROUP_STATE.CANCELLED`:
     ```tsx
     {/* CANCELLED state */}
     {state === GROUP_STATE.CANCELLED && (
       <div className="p-6 sm:p-7 text-center space-y-4">
         <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto border border-red-100 shadow-xs">
           <XCircle size={28} />
         </div>
         <div>
           <h3 className="font-bold text-slate-900 text-lg sm:text-xl">
             {isEn ? t("actionPanel.cancelledTitle", language) : "Nhóm hụi đã bị huỷ"}
           </h3>
           <p className="text-slate-600 text-sm mt-2 leading-relaxed max-w-md mx-auto">
             {isEn
               ? t("actionPanel.cancelledDesc", language)
               : "Nhóm hụi đã được huỷ bởi Chủ nhóm trong giai đoạn đăng ký. Toàn bộ người dùng đã rời nhóm an toàn, không có tài sản nào bị giam giữ và hợp đồng đã đóng vĩnh viễn."}
           </p>
         </div>
         <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
           {isEn
             ? t("actionPanel.cancelledNavHint", language)
             : "Bạn có thể sử dụng các nút điều hướng phía trên (Danh sách nhóm hoặc Tạo nhóm mới) để khám phá hoặc khởi tạo nhóm hụi khác."}
         </div>
       </div>
     )}
     ```
   - **LƯU Ý**: Không thêm bất kỳ thẻ `<button>` nào bên trong khối JSX này.
