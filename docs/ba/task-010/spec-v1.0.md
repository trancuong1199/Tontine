# Business Specification: Tối Ưu & Dọn Dẹp URL Sạch (Clean URL for Homepage & App Navigation)

**Task ID**: `task-010`  
**Dispatch ID**: `dispatch-010-ba`  
**Spec Version**: `v1.0`  
**Tác giả (BA)**: `ba-agent`  
**Ngày lập**: `2026-10-09`  
**Trạng thái**: `Accepted / Ready for Release`  

---

## 1. Tổng quan & Giá trị (Problem & Value Proposition)

### 1.1. Hiện trạng & Vấn đề Thực tế (Problem Statement)
Người dùng phản ánh trực tiếp trong quá trình trải nghiệm:
> *"sao lại có đuôi này ?group=0x6afaa0825d2e05ef00d571d4a043ab5dcc03534b&view=home ở url"*

```
+----------------------------------------------------------------------------------------------------+
|  HIỆN TRẠNG LỖI URL KHI CHUYỂN TAB TRÊN TRÌNH DUYỆT:                                               |
|                                                                                                    |
|  1. Đang ở màn hình Ứng dụng:                                                                     |
|     URL: http://localhost:5173/?group=0x6afaa0825d2e05ef00d571d4a043ab5dcc03534b                  |
|                                                                                                    |
|  2. Bấm vào tab "Trang chủ" (Home) trên Header:                                                    |
|     Hàm handleSelectTab('home') thực thi: url.searchParams.set('view', 'home')                     |
|                                                                                                    |
|  3. KẾT QUẢ URL HIỂN THỊ TRÊN THANH ĐỊA CHỈ:                                                        |
|     http://localhost:5173/?group=0x6afaa0825d2e05ef00d571d4a043ab5dcc03534b&view=home            |
|                                                                                                    |
|  -> BẤT HỢP LÝ: Đang ở Trang chủ (Landing Page) nhưng URL lại gắn kèm địa chỉ contract nhóm hụi    |
|     và đuôi '&view=home' rườm rà, gây mất thẩm mỹ, hiểu lầm ngữ cảnh và khó chia sẻ link gốc!      |
+----------------------------------------------------------------------------------------------------+
```

#### Phân tích Nguyên nhân Kỹ thuật (Technical Root Cause):
1. **Ghép chuỗi tham số không chọn lọc (Indiscriminate Query String Appending)**:
   - Trong [src/App.tsx](file:///home/avada/tontine/src/App.tsx#L95-L106), hàm chuyển tab `handleSelectTab` hiện tại hoạt động theo cơ chế:
     ```ts
     const handleSelectTab = (tab: "home" | "app") => {
       setActiveTab(tab);
       if (typeof window !== "undefined") {
         const url = new URL(window.location.href);
         if (tab === "home") {
           url.searchParams.set("view", "home");
         } else {
           url.searchParams.set("view", "app");
         }
         window.history.pushState({}, "", url.toString());
       }
     };
     ```
   - Khi người dùng đang ở chế độ xem Ứng dụng, URL trình duyệt đang mang sẵn query parameter `?group=0x6afaa...`.
   - Khi bấm chuyển sang tab "Trang chủ", `url.searchParams.set('view', 'home')` giữ nguyên tham số `group` cũ và chỉ append thêm `&view=home`, tạo thành chuỗi URL dài dòng và sai ngữ cảnh: `?group=0x6afaa...&view=home`.
2. **Thiếu cơ chế làm sạch URL gốc cho Trang Chủ (Missing Clean URL Strategy for Homepage)**:
   - Trang chủ (Landing Page) của một ứng dụng Web3 tiêu chuẩn phải có URL gốc tinh gọn, chuyên nghiệp: `http://localhost:5173/` (hoặc `/`), không được kèm theo bất kỳ query parameter nào.
3. **Thừa thãi tham số `&view=app` khi ở màn hình Ứng dụng**:
   - Khi ở Ứng dụng (App Dashboard), bản thân tham số `?group=0x...` đã là định danh duy nhất và đầy đủ của nhóm hụi đang xem. Việc nối thêm `&view=app` là hoàn toàn dư thừa.
4. **Chưa có cơ chế tự động dọn URL cũ (No Legacy URL Sanitization)**:
   - Khi người dùng bấm bookmark hoặc truy cập bằng link cũ chứa `view=home`, ứng dụng vẫn giữ nguyên query rác này trên thanh địa chỉ thay vì tự động dọn sạch về URL gốc.

---

### 1.2. Giá trị mang lại (Value Proposition)
- **Chuẩn hóa URL Sạch Sẽ & Tinh Tế (Clean URL Ergonomics)**:
  - Khi xem **Trang chủ (Homepage)**: URL luôn luôn là URL gốc sạch sẽ `http://localhost:5173/` (hoặc `/`), xóa bỏ 100% các query parameter rác.
  - Khi xem **Ứng dụng (App Dashboard)**: URL chỉ lưu duy nhất `?group=0x...`, loại bỏ hoàn toàn `&view=app`.
- **Tự động Thanh lọc URL Rác (Seamless Legacy Sanitization)**:
  - Khi người dùng truy cập link cũ có chứa `view=home` hoặc link bị dính cả `group` lẫn `view=home`, hệ thống tự động nhận diện và kích hoạt `history.replaceState` để làm sạch thanh địa chỉ ngay lập tức, không reload trang, không giật màn hình.
- **Tối ưu Khả năng Chia sẻ & Bookmark (Shareability & Social Ready)**:
  - Chia sẻ link Trang chủ: Người dùng chỉ cần copy URL gốc `/` gọn gàng.
  - Chia sẻ link Nhóm hụi: Người dùng copy `?group=0x...` chuẩn xác đến từng contract, người nhận click vào là mở thẳng dashboard của nhóm đó.
- **Bảo toàn 100% Bộ Test Hệ Thống (Zero Regression Invariant)**:
  - Toàn bộ 106 bài kiểm thử hiện có của dự án tiếp tục PASS 100%, không bị ảnh hưởng bởi việc dọn dẹp URL.

---

### 1.3. Đối tượng sử dụng (Actors)
- **Khách tham quan Trang chủ (Homepage Visitor)**: Trải nghiệm website với thanh địa chỉ sạch đẹp `/`, cảm giác tin cậy của một sản phẩm Web3 chuyên nghiệp.
- **Thành viên Hụi (Club Member / Saver)**: Chuyển đổi qua lại giữa Trang chủ và Ứng dụng mượt mà, URL phản ánh chính xác ngữ cảnh hiện tại.
- **Người nhận liên kết chia sẻ (Shared Link Recipient)**: Nhận link nhóm `?group=0x...` hoặc link trang chủ `/` không bị dính đuôi rác.
- **Trình duyệt & Quản lý Lịch sử (Browser History & PopState Manager)**: Nút Back và Forward trên trình duyệt hoạt động chuẩn xác giữa các trang mà không tạo lịch sử rác.

---

### 1.4. Phạm vi thực hiện (Scope)

#### Trong phạm vi (In-Scope):
1. **Tái cấu trúc Logic URL trong `src/App.tsx`**:
   - `handleSelectTab("home")`: Cập nhật `activeTab = "home"`, dọn sạch toàn bộ query parameters, dùng `window.history.pushState({}, "", window.location.pathname)` để URL trở về `/`.
   - `handleSelectTab("app")`: Cập nhật `activeTab = "app"`, chỉ gán `?group=${contractAddress}`, xóa bỏ sạch tham số `view` nếu có.
   - `handleSwitchGroup(newAddress)`: Cập nhật `contractAddress = newAddress`, kích hoạt `activeTab = "app"`, xóa bỏ `view`, cập nhật URL thành `?group=${newAddress}`.
2. **Cơ chế Tự động Dọn URL Cũ khi Khởi tạo (Mount Sanitization)**:
   - Trong `useEffect` khởi tạo hoặc lúc mount:
     * Nếu URL có `view === "home"` hoặc dính cả `group` lẫn `view=home`: Kích hoạt `activeTab = "home"`, tự động gọi `window.history.replaceState({}, "", window.location.pathname)` để dọn sạch URL về `/`.
     * Nếu URL có `view === "app"` kèm `group=0x...`: Tự động gọi `window.history.replaceState` để loại bỏ `&view=app`, chỉ giữ lại `?group=0x...`.
3. **Đồng bộ với các Nút Điều hướng trên Landing Page**:
   - Nút "Vào ứng dụng ngay" (Launch App) gọi `handleSelectTab("app")` -> chuyển URL sang `?group=${contractAddress}`.
   - Thẻ Featured Clubs ("Vào nhóm") gọi `handleSwitchGroup(clubAddress)` -> chuyển URL sang `?group=${clubAddress}`.
   - Nút "+ Tạo nhóm mới": Khi tạo nhóm thành công, chuyển sang `app` với `?group=${newAddress}`.
4. **Xử lý Sự kiện PopState (Browser Back / Forward)**:
   - Khi bấm Back/Forward:
     * Nếu URL không có query parameter `group` (URL là `/`): Chuyển về tab `home`.
     * Nếu URL có `group` hợp lệ: Chuyển về tab `app` và cập nhật `contractAddress`.
     * Tự động dọn sạch nếu phát hiện query parameter `view` cũ.
5. **Đảm bảo 100% Bộ Test Hệ Thống Tiếp Tục Pass (106/106 tests)**.

#### Ngoài phạm vi (Out-of-Scope):
- Cài đặt thêm các thư viện định tuyến bên ngoài (React Router DOM, TanStack Router...) làm tăng bundle size và phá vỡ kiến trúc client-native.
- Can thiệp smart contract Solidity `RotatingSavings.sol`.

---

## 2. Kích hoạt, Đầu vào & Đầu ra (Trigger, Input & Observable Output)

| Mã ID | Tác nhân | Hành động kích hoạt (Trigger) | Đầu vào (Input) | Đầu ra quan sát được (Observable Output) |
| :--- | :--- | :--- | :--- | :--- |
| **TR-01** | Người dùng | Đang ở Ứng dụng (URL `?group=0x...`), bấm vào tab "Trang chủ" trên Header | Click tab "Trang chủ" (Home) | - Giao diện chuyển ngay sang Trang chủ (`LandingPage`).<br>- URL trên thanh địa chỉ **được dọn sạch 100% về URL gốc** (ví dụ: `http://localhost:5173/`).<br>- **Biến mất hoàn toàn** cả `group` lẫn `view=home`. |
| **TR-02** | Người dùng | Đang ở Trang chủ (URL `/`), bấm vào tab "Ứng dụng" trên Header hoặc nút CTA "Vào ứng dụng ngay" | Click tab "Ứng dụng" / CTA "Launch App" | - Giao diện chuyển sang màn hình Dashboard nhóm hụi (`app`).<br>- URL trên thanh địa chỉ cập nhật thành **`?group=0x...`** (địa chỉ của contract hiện tại).<br>- **Tuyệt đối không có `&view=app`** trên URL. |
| **TR-03** | Khách truy cập | Truy cập website bằng liên kết cũ bị lỗi: `http://localhost:5173/?group=0x6afaa...&view=home` | Nhập URL cũ hoặc click bookmark | - Ứng dụng nhận diện và hiển thị giao diện **Trang chủ (Home)**.<br>- Tự động thực thi `history.replaceState`, thanh địa chỉ lập tức **trở về URL gốc `/`** sạch sẽ mà không reload trang. |
| **TR-04** | Người dùng | Đang ở Trang chủ, bấm nút "Vào nhóm" tại thẻ `Nhóm Hụi Arc Alpha` (`0xe536a...`) | Click nút tại card nhóm nổi bật | - Giao diện chuyển sang màn hình Ứng dụng của nhóm Arc Alpha.<br>- URL cập nhật thành: **`?group=0xe536ab0afa098cb6841781d7aa95f7b0fab7095b`**.<br>- Không kèm theo bất kỳ tham số `view` nào. |
| **TR-05** | Người dùng | Bấm nút Back trên trình duyệt sau khi chuyển từ Trang chủ sang Ứng dụng | Click nút Back của browser (PopState) | - Giao diện tự động quay về Trang chủ.<br>- URL trên thanh địa chỉ trở về `/` sạch sẽ. |

---

## 3. Quy tắc nghiệp vụ (Business Rules - BR)

### BR-01: Quy tắc URL Sạch cho Trang Chủ (Clean URL for Homepage Rule)
1. **Tính nguyên vẹn của URL gốc**:
   - Khi ứng dụng đang hiển thị màn hình **Trang chủ (`activeTab === "home"`)**, thanh địa chỉ trình duyệt **bắt buộc** phải hiển thị URL gốc thuần túy: `window.location.pathname` (ví dụ `http://localhost:5173/` hoặc `/`).
   - Tuyệt đối không được xuất hiện bất kỳ tham số query parameter nào, bao gồm:
     * CẤM: `?view=home`
     * CẤM: `?group=0x...`
     * CẤM: `?group=0x...&view=home`
2. **Cơ chế cập nhật khi chuyển sang Trang chủ**:
   - Thao tác chuyển sang Trang chủ thông qua hàm `handleSelectTab("home")` phải sử dụng:
     ```ts
     window.history.pushState({}, "", window.location.pathname);
     ```
   - Không được dùng `url.searchParams.set("view", "home")`.

---

### BR-02: Quy tắc URL Định Danh Nhóm cho Ứng Dụng (Clean Group URL for App Rule)
1. **Tham số duy nhất**:
   - Khi ứng dụng đang hiển thị màn hình **Ứng dụng (`activeTab === "app"`)**, URL chỉ được chứa duy nhất tham số định danh nhóm hụi:
     `?group=${contractAddress}`
2. **Khử triệt để tham số `view`**:
   - Tuyệt đối không được nối thêm `&view=app` vào URL.
   - Bất kỳ thao tác chuyển nhóm (`handleSwitchGroup`) hoặc chuyển tab sang app (`handleSelectTab("app")`) đều phải loại bỏ tham số `view` nếu đang tồn tại trước khi ghi vào lịch sử trình duyệt.
3. **Mẫu URL hợp lệ khi ở chế độ Ứng dụng**:
   - Chuẩn: `http://localhost:5173/?group=0x6afaa0825d2e05ef00d571d4a043ab5dcc03534b`
   - Bất hợp lệ: `http://localhost:5173/?group=0x6afaa...&view=app` (bị cấm).

---

### BR-03: Cơ chế Tự động Thanh Lọc URL Cũ (Auto-clean Legacy Dirty URLs Rule)
1. **Thanh lọc khi Mount / Khởi tạo**:
   - Trong quá trình khởi tạo ứng dụng, nếu URL hiện tại chứa query parameter rác:
     - **Trường hợp A (Có `view=home`)**: Dù có kèm `group` hay không, hệ thống xác định người dùng muốn vào Trang chủ -> Kích hoạt `activeTab = "home"`, đồng thời thực thi ngay:
       ```ts
       window.history.replaceState({}, "", window.location.pathname);
       ```
     - **Trường hợp B (Có `view=app` kèm `group` hợp lệ)**: Hệ thống kích hoạt `activeTab = "app"`, đồng thời dọn sạch `view`:
       ```ts
       const cleanUrl = new URL(window.location.href);
       cleanUrl.searchParams.delete("view");
       window.history.replaceState({}, "", cleanUrl.toString());
       ```
2. **Không tải lại trang (Zero Reload)**:
   - Quá trình thanh lọc URL bắt buộc sử dụng `window.history.replaceState` để thay thế trực tiếp URL hiển thị trên thanh địa chỉ trình duyệt mà không gây reload trang, không kích hoạt lại các lifecycle mạng.

---

### BR-04: Bảo Toàn Lịch Sử Trình Duyệt & Bất Biến Kiểm Thử (History & Test Invariant Rule)
1. **Sự kiện PopState (Back / Forward Navigation)**:
   - Khi người dùng bấm nút Back hoặc Forward trên trình duyệt, trình lắng nghe sự kiện `popstate` phải phân giải đúng:
     - Nếu `group` không tồn tại hoặc rỗng (URL là `/`): Chuyển sang `activeTab = "home"`.
     - Nếu `group` là địa chỉ hex 42 ký tự hợp lệ: Chuyển sang `activeTab = "app"`, nạp `contractAddress` tương ứng.
2. **Tương thích ngược kiểm thử (Zero Test Regression)**:
   - Các định nghĩa state và callback trong `src/App.tsx`:
     * `const [activeTab, setActiveTab] = useState<"home" | "app">`
     * Khởi tạo mặc định `return "app"` khi có `group` hợp lệ, và `return "home"` khi không có
     * `handleSwitchGroup` cập nhật `setActiveTab("app")` và `url.searchParams.set("group", newAddress)`
     * Conditional rendering `activeTab === "home" ? (<LandingPage ... />) : (...)`
   - Tất cả các mẫu cấu trúc này **bắt buộc phải được giữ nguyên** để đảm bảo 106/106 bài kiểm thử hiện có (đặc biệt là bài test `TC-NAV-02` trong `tests/guidemodal-and-homepage.test.ts`) tiếp tục PASS 100%.

---

## 4. Luồng nghiệp vụ (Workflow & Mermaid Diagrams)

### 4.1. Luồng Điều Hướng và Chuẩn Hóa Clean URL (Clean URL Navigation Flow)

```mermaid
flowchart TD
    Start([Người dùng thực hiện hành động chuyển đổi]) --> ActionType{Hành động là gì?}
    
    ActionType -->|Click tab 'Trang chủ' trên Header| GoHome[handleSelectTab('home')]
    ActionType -->|Click tab 'Ứng dụng' trên Header| GoApp[handleSelectTab('app')]
    ActionType -->|Click 'Vào ứng dụng ngay' CTA| GoApp
    ActionType -->|Click 'Vào nhóm' tại thẻ Featured Club| SwitchClub[handleSwitchGroup(clubAddr)]
    ActionType -->|Deploy tạo nhóm mới thành công| NewClub[handleSwitchGroup(newAddr)]

    GoHome --> CleanHomeURL[1. setActiveTab('home')]
    CleanHomeURL --> PushHome[2. history.pushState: window.location.pathname]
    PushHome --> HomeResult[KẾT QUẢ: URL sạch hoàn toàn: http://localhost:5173/]

    GoApp --> CleanAppURL[1. setActiveTab('app')]
    CleanAppURL --> PushApp[2. URL chỉ giữ: ?group={contractAddress}]
    PushApp --> AppResult[KẾT QUẢ: http://localhost:5173/?group=0x6afaa...]

    SwitchClub --> SwitchAction[1. setContractAddress & setActiveTab('app')]
    SwitchAction --> PushClub[2. URL chỉ gán: ?group={clubAddr}, xóa view]
    PushClub --> ClubResult[KẾT QUẢ: http://localhost:5173/?group=0xe536a...]

    NewClub --> SwitchClub
```

---

### 4.2. Luồng Khởi Tạo & Tự Động Thanh Lọc URL Cũ (Mount & Legacy Sanitization Flow)

```mermaid
flowchart TD
    Visit([Người dùng mở website bằng link bất kỳ]) --> ParseParams[Phân tích URL query parameters]
    
    ParseParams --> CheckLegacy{Kiểm tra URL hiện tại:}
    
    CheckLegacy -->|Có view=home| LegacyHome[URL dính view=home hoặc ?group=...&view=home]
    CheckLegacy -->|Có view=app và có group| LegacyApp[URL dính &view=app kèm group=0x...]
    CheckLegacy -->|Chỉ có ?group=0x... hợp lệ| CleanGroup[URL chuẩn nhóm hụi]
    CheckLegacy -->|Không có query params /| CleanRoot[URL gốc trang chủ /]

    LegacyHome --> SetHomeTab[1. setActiveTab('home')]
    SetHomeTab --> ReplaceHome[2. history.replaceState về: window.location.pathname]
    ReplaceHome --> ViewHome([Hiển thị Trang chủ với URL sạch: /])

    LegacyApp --> SetAppTab[1. setActiveTab('app')]
    SetAppTab --> StripView[2. history.replaceState chỉ giữ: ?group={group}]
    StripView --> ViewApp([Hiển thị App với URL sạch: ?group=0x...])

    CleanGroup --> DirectApp[1. setActiveTab('app') & setContractAddress]
    DirectApp --> ViewApp

    CleanRoot --> DirectHome[1. setActiveTab('home')]
    DirectRoot --> ViewHome
```

---

### 4.3. Luồng Điều Hướng Nút Back/Forward Trình Duyệt (PopState Navigation Flow)

```mermaid
flowchart TD
    PopEvent([Người dùng bấm Back hoặc Forward trên Browser]) --> ReadLocation[Đọc window.location.search]
    
    ReadLocation --> EvaluateParams{Đánh giá tham số:}
    
    EvaluateParams -->|Không có query / URL là /| NavToHome[1. setActiveTab('home')]
    EvaluateParams -->|Có view=home| NavToHomeClean[1. setActiveTab('home') -> replaceState về /]
    EvaluateParams -->|Có group=0x... hợp lệ| NavToApp[1. setActiveTab('app') & setContractAddress(group)]

    NavToHome --> RenderHomeView([Hiển thị LandingPage, URL sạch: /])
    NavToHomeClean --> RenderHomeView
    NavToApp --> RenderAppView([Hiển thị App Dashboard, URL: ?group=0x...])
```

---

## 5. Yêu cầu & Tiêu chí nghiệm thu (Requirements & Acceptance Criteria)

### Yêu cầu REQ-01: Chuẩn hóa Clean URL cho Trang Chủ (Homepage Clean URL)

- **AC-01.1 (Chuyển từ App sang Trang chủ dọn sạch hoàn toàn URL - Clean URL upon Switching to Home)**:
  - **Input**: Người dùng đang ở màn hình Ứng dụng (URL hiện tại là `http://localhost:5173/?group=0x6afaa0825d2e05ef00d571d4a043ab5dcc03534b`); người dùng bấm vào tab "Trang chủ" trên Header.
  - **Expected Output**:
    1. Giao diện chuyển ngay sang `LandingPage` (Trang chủ).
    2. URL trên thanh địa chỉ của trình duyệt trở thành **`http://localhost:5173/`** (hoặc `pathname` hiện tại).
    3. **Tuyệt đối không còn** tham số `view` (không có `&view=home` hay `?view=home`).
    4. **Tuyệt đối không còn** tham số `group` (không có `?group=0x...` trên trang chủ).

- **AC-01.2 (Tự động thanh lọc URL cũ chứa `view=home` - Auto-sanitizing Legacy URLs on Mount)**:
  - **Input**: Người dùng dán vào trình duyệt hoặc click link cũ có dạng `http://localhost:5173/?group=0x6afaa0825d2e05ef00d571d4a043ab5dcc03534b&view=home` (hoặc `http://localhost:5173/?view=home`).
  - **Expected Output**:
    1. Ứng dụng nạp thành công ở chế độ xem Trang chủ (`activeTab === "home"`).
    2. Thanh địa chỉ của trình duyệt được tự động chuẩn hóa về **`http://localhost:5173/`** thông qua `history.replaceState`.
    3. Không gây tải lại trang (zero full-page reload).

- **AC-01.3 (Loại bỏ triệt để chuỗi `?group=0x...&view=home` - Eradication of Dirty Query String)**:
  - **Input**: Kiểm tra mã nguồn và hành vi điều hướng của `src/App.tsx`.
  - **Expected Output**:
    1. Không còn bất kỳ đoạn mã nào thực thi `url.searchParams.set("view", "home")` trên một URL đang chứa `group`.
    2. Chuỗi `?group=0x...&view=home` bị xóa bỏ vĩnh viễn khỏi toàn bộ ứng dụng.

---

### Yêu cầu REQ-02: Chuẩn hóa Clean URL cho Ứng Dụng (App Dashboard Clean URL)

- **AC-02.1 (Chuyển sang Ứng dụng chỉ lưu `?group=0x...` - Clean App URL without `&view=app`)**:
  - **Input**: Người dùng đang ở Trang chủ (`http://localhost:5173/`); người dùng bấm vào tab "Ứng dụng" trên Header hoặc bấm nút CTA "Vào ứng dụng ngay" trên Landing Page.
  - **Expected Output**:
    1. Giao diện chuyển sang màn hình Dashboard nhóm hụi (`app`).
    2. URL trên thanh địa chỉ cập nhật thành **`http://localhost:5173/?group=0x6afaa0825d2e05ef00d571d4a043ab5dcc03534b`** (hoặc địa chỉ nhóm hiện tại).
    3. **Tuyệt đối không xuất hiện** tham số `&view=app` trên URL.

- **AC-02.2 (Chọn nhóm từ thẻ Featured Club trên Trang chủ - 1-Click Club Selection from Landing)**:
  - **Input**: Người dùng đang ở Trang chủ, bấm nút "Vào nhóm" tại thẻ `Nhóm Hụi Arc Alpha` (`0xe536ab0afa098cb6841781d7aa95f7b0fab7095b`).
  - **Expected Output**:
    1. Giao diện chuyển sang màn hình Ứng dụng với nhóm Alpha được chọn.
    2. URL trên thanh địa chỉ cập nhật chính xác thành: **`http://localhost:5173/?group=0xe536ab0afa098cb6841781d7aa95f7b0fab7095b`**.
    3. Không bị dính bất kỳ tham số `view` nào.

- **AC-02.3 (Đổi nhóm trong màn hình Ứng dụng duy trì URL sạch - Clean URL upon Switching Group)**:
  - **Input**: Người dùng đổi nhóm qua `GroupSwitcher` hoặc `ClubDirectoryModal`.
  - **Expected Output**:
    1. URL cập nhật sang `?group=${newAddress}`.
    2. Không phát sinh tham số `view` nào.

---

### Yêu cầu REQ-03: Điều Hướng Lịch Sử Trình Duyệt & Bảo Toàn Kiểm Thử

- **AC-03.1 (Hỗ trợ nút Back / Forward chuẩn xác - Browser PopState Integrity)**:
  - **Input**: Người dùng chuyển từ Trang chủ sang Ứng dụng, sau đó bấm nút Back trên trình duyệt; rồi bấm nút Forward.
  - **Expected Output**:
    1. Bấm Back: Quay về Trang chủ (`LandingPage`), URL hiển thị `/`.
    2. Bấm Forward: Quay lại Ứng dụng (`App Dashboard`), URL hiển thị `?group=0x...`.
    3. Chuyển đổi trạng thái mượt mà, không crash ứng dụng.

- **AC-03.2 (Bảo toàn 100% 106 bài kiểm thử hiện có - Zero Regression Guarantee)**:
  - **Input**: Thực thi lệnh `npm test`.
  - **Expected Output**:
    1. Toàn bộ 106 bài kiểm thử hiện có tiếp tục **PASS 100%** (0 fail, 0 cancelled).
    2. Các assertion trong bài test `TC-NAV-02` ([tests/guidemodal-and-homepage.test.ts](file:///home/avada/tontine/tests/guidemodal-and-homepage.test.ts#L323-L355)) được giữ nguyên tính hợp lệ.

---

## 6. Phụ thuộc & Quản trị Rủi ro (Dependencies & Risk Management)

### 6.1. Ma trận Rủi ro & Giải pháp Phòng ngừa

| Mã Rủi ro | Mô tả Rủi ro | Mức độ | Khả năng | Tác động & Giải pháp Phòng ngừa (Mitigation) |
| :--- | :--- | :--- | :--- | :--- |
| **RSK-01** | **Gãy bài kiểm thử `TC-NAV-02` do thay đổi cách khởi tạo `activeTab`**: Bài test `TC-NAV-02` kiểm tra chuỗi `appSrc.includes('const [activeTab, setActiveTab] = useState<"home" | "app">')` và các nhánh khởi tạo. | **Cao** | **Trung bình** | **Giải pháp**: Giữ nguyên cú pháp khai báo state `const [activeTab, setActiveTab] = useState<"home" | "app">` và các logic `return "app"`, `return "home"` trong hàm khởi tạo. |
| **RSK-02** | **Mất địa chỉ nhóm khi chuyển sang Home rồi quay lại App**: Nếu dọn `group` trên URL khi sang Home mà không lưu trong state `contractAddress`, người dùng quay lại App sẽ bị mất nhóm đang xem. | **Cao** | **Cao** | **Giải pháp**: Quy định rõ: `contractAddress` trong React state vẫn được giữ nguyên độc lập. Khi bấm sang App, hệ thống tự động lấy lại `contractAddress` đang có để tạo URL `?group=${contractAddress}`. |
| **RSK-03** | **Lỗi reload trang ngoài ý muốn do gọi nhầm `window.location.href = ...`**: Developer gán href trực tiếp thay vì dùng History API. | **Nghiêm trọng** | **Thấp** | **Giải pháp**: Ghi rõ trong **BR-01** và **BR-03**: Chỉ sử dụng `window.history.pushState` và `window.history.replaceState`. |

---

## 7. Nhật ký Giả định, Dữ kiện & Câu hỏi chặn (Assumptions, Facts & Questions Log)

### 7.1. Dữ kiện đã Xác thực (Verified Facts)
- **Fact-01**: Phản ánh từ người dùng là hoàn toàn chính xác: Khi ở App và bấm sang Home, thanh địa chỉ hiển thị `?group=0x6afaa0825d2e05ef00d571d4a043ab5dcc03534b&view=home`.
- **Fact-02**: Hàm `handleSelectTab` trong [src/App.tsx](file:///home/avada/tontine/src/App.tsx#L98-L105) hiện tại gọi `url.searchParams.set("view", "home")` hoặc `url.searchParams.set("view", "app")` trên URL cũ mà không dọn dẹp.
- **Fact-03**: Bộ kiểm thử hiện tại có 106 bài test, trong đó `tests/guidemodal-and-homepage.test.ts` kiểm tra tĩnh sự tồn tại của `activeTab`, `setActiveTab`, `handleSwitchGroup` và `LandingPage`.
- **Fact-04**: Trong toàn bộ dự án, chỉ duy nhất tệp [src/App.tsx](file:///home/avada/tontine/src/App.tsx) xử lý logic URL, pushState và popstate.

### 7.2. Giả định Thiết kế (Design Assumptions)
- **Assumption-01**: URL sạch `/` cho Trang chủ và `?group=0x...` cho Ứng dụng mang lại trải nghiệm Web3 cao cấp, tinh gọn nhất cho người dùng.
- **Assumption-02**: Tự động thanh lọc các URL cũ qua `replaceState` giúp khắc phục triệt để các bookmark hoặc liên kết cũ mà không làm gián đoạn người dùng.

### 7.3. Câu hỏi Chặn (Blocking Questions)
- **None**: Không có câu hỏi chặn. Yêu cầu của người dùng và nguyên nhân kỹ thuật đều đã rõ ràng 100%.

---

## 8. Bảng truy vết yêu cầu (Traceability Matrix & Gate 4 Signoff)

> [!NOTE]
> **Kết quả nghiệm thu Gate 4 (BA Review & Acceptance)**:  
> BA đã đối chiếu toàn bộ các yêu cầu nghiệp vụ (REQ-01 đến REQ-03) và tiêu chí nghiệm thu (AC-01.1 đến AC-03.2) với kết quả thực thi kiểm thử độc lập từ QA (`docs/qa/task-010/test-report.md`) và mã băm đóng băng nguồn trong manifest (`docs/manifests/task-010/manifest.json`).  
> **Độ phủ nghiệp vụ**: **100% (8/8 AC PASS)**.  
> **An toàn hệ thống**: **113/113 tests PASS** (Zero Regression), `npm run build` hoàn thành thành công.

| REQ ID | AC ID | Tiêu chí Nghiệp vụ | Test Case (Tester) | Spec/Source Hash | Evidence / Test Run | BA Đối chiếu | Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-01** | AC-01.1 | Chuyển từ App sang Trang chủ dọn sạch hoàn toàn URL về `/` | `TC-URL-01` | `src/App.tsx`<br>`5c30c2cb5332...` | `handleSelectTab('home')` xóa `view` & `group`, `pushState` về `cleanPath` (`/`) | Khớp 100% đặc tả BR-01 | `PASS` |
| **REQ-01** | AC-01.2 | Tự động thanh lọc URL cũ chứa `view=home` về `/` qua `replaceState` | `TC-URL-05` | `src/App.tsx`<br>`5c30c2cb5332...` | Mount effect nhận diện `view=home` gọi `history.replaceState` về pathname gốc | Khớp 100% đặc tả BR-03 | `PASS` |
| **REQ-01** | AC-01.3 | Loại bỏ triệt để chuỗi `?group=0x...&view=home` trên thanh địa chỉ | `TC-URL-04` | `src/App.tsx`<br>`5c30c2cb5332...` | Xóa vĩnh viễn `url.searchParams.set('view', 'home')` khi đang mang `group` | Khớp 100% đặc tả BR-01 | `PASS` |
| **REQ-02** | AC-02.1 | Chuyển sang Ứng dụng chỉ lưu `?group=0x...` (không có `&view=app`) | `TC-URL-02` | `src/App.tsx`<br>`5c30c2cb5332...` | `handleSelectTab('app')` xóa `view`, chỉ set `group = contractAddress` | Khớp 100% đặc tả BR-02 | `PASS` |
| **REQ-02** | AC-02.2 | Chọn nhóm từ thẻ Featured Club trên Trang chủ chuyển sang App với URL sạch `?group=0x...` | `TC-URL-03`<br>`TC-URL-04` | `src/App.tsx`<br>`5c30c2cb5332...` | `handleSwitchGroup` xóa `view`, set `group = newAddress`, không sinh `&view=app` | Khớp 100% đặc tả BR-02 | `PASS` |
| **REQ-02** | AC-02.3 | Đổi nhóm trong màn hình Ứng dụng duy trì URL sạch `?group=0x...` | `TC-URL-03` | `src/App.tsx`<br>`5c30c2cb5332...` | Đổi nhóm đẩy URL sạch `?group=${newAddress}` | Khớp 100% đặc tả BR-02 | `PASS` |
| **REQ-03** | AC-03.1 | Nút Back/Forward của trình duyệt (PopState) điều hướng chuẩn xác giữa `/` và `?group=0x...` | `TC-URL-06` | `src/App.tsx`<br>`5c30c2cb5332...` | `onPopState` listener điều hướng về `home` nếu rỗng, về `app` nếu có `group` | Khớp 100% đặc tả BR-04 | `PASS` |
| **REQ-03** | AC-03.2 | Toàn bộ 106 bài kiểm thử hiện có tiếp tục PASS 100% (Zero Regression) | `TC-REG-01`<br>`TC-REG-SYS` | Toàn bộ `tests/*.test.ts` | 113/113 tests PASS 100% (106 tests cũ + 7 tests độc lập mới) | Đạt kiểm thử toàn hệ thống | `PASS` |

---

## 9. Hướng dẫn Kỹ thuật Triển khai (Developer Implementation Guidance)

Dành cho Developer tham khảo khi hiện thực giải pháp trong [src/App.tsx](file:///home/avada/tontine/src/App.tsx):

1. **Khởi tạo và Thanh lọc URL khi Mount**:
   ```ts
   // Navigation active tab: 'home' | 'app'
   const [activeTab, setActiveTab] = useState<"home" | "app">(() => {
     if (typeof window !== "undefined") {
       const params = new URLSearchParams(window.location.search);
       const view = params.get("view");
       const group = params.get("group");
       if (view === "home") {
         return "home";
       }
       if (view === "app" || isValidAddress(group)) {
         return "app";
       }
     }
     return "home";
   });

   // Mount effect: Tự động dọn sạch URL cũ
   useEffect(() => {
     if (typeof window !== "undefined") {
       const params = new URLSearchParams(window.location.search);
       const view = params.get("view");
       const group = params.get("group");
       
       if (view === "home" || (activeTab === "home" && (view || group))) {
         // Dọn sạch URL về gốc pathname
         window.history.replaceState({}, "", window.location.pathname);
       } else if (activeTab === "app" && view) {
         // Dọn view param, chỉ giữ ?group=...
         const cleanUrl = new URL(window.location.href);
         cleanUrl.searchParams.delete("view");
         if (isValidAddress(group)) {
           cleanUrl.searchParams.set("group", group);
         }
         window.history.replaceState({}, "", cleanUrl.toString());
       }
     }
   }, []);
   ```

2. **Hàm `handleSelectTab`**:
   ```ts
   const handleSelectTab = (tab: "home" | "app") => {
     setActiveTab(tab);
     if (typeof window !== "undefined") {
       if (tab === "home") {
         // Dọn sạch URL về URL gốc
         window.history.pushState({}, "", window.location.pathname);
       } else {
         // Chuyển sang App: URL là ?group=...
         const cleanUrl = new URL(window.location.href);
         cleanUrl.searchParams.delete("view");
         cleanUrl.searchParams.set("group", contractAddress);
         window.history.pushState({}, "", cleanUrl.toString());
       }
     }
   };
   ```

3. **Hàm `handleSwitchGroup`**:
   ```ts
   const handleSwitchGroup = (newAddress: `0x${string}`) => {
     setContractAddress(newAddress);
     setActiveTab("app");
     if (typeof window !== "undefined") {
       const url = new URL(window.location.href);
       url.searchParams.delete("view");
       url.searchParams.set("group", newAddress);
       window.history.pushState({}, "", url.toString());
     }
   };
   ```

4. **Sự kiện `onPopState`**:
   ```ts
   useEffect(() => {
     const onPopState = () => {
       const params = new URLSearchParams(window.location.search);
       const group = params.get("group");
       const view = params.get("view");
       if (view === "home" || (!group && !view)) {
         setActiveTab("home");
         if (view === "home") {
           window.history.replaceState({}, "", window.location.pathname);
         }
       } else if (isValidAddress(group)) {
         setContractAddress(group.toLowerCase() as `0x${string}`);
         setActiveTab("app");
         if (view) {
           const cleanUrl = new URL(window.location.href);
           cleanUrl.searchParams.delete("view");
           window.history.replaceState({}, "", cleanUrl.toString());
         }
       } else {
         setActiveTab("home");
       }
     };
     window.addEventListener("popstate", onPopState);
     return () => window.removeEventListener("popstate", onPopState);
   }, [contractAddress]);
   ```
