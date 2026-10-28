import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  LANGUAGE_STORAGE_KEY,
  getStoredLanguage,
  setStoredLanguage,
  t,
  translations,
  type Language,
  type Translations,
} from "../src/lib/i18n.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf-8");
}

// ============================================================================
// TC-I18N-01 (AC-01.1): Khởi tạo mặc định ngôn ngữ "en", lưu trữ và đọc an toàn
// ============================================================================
test("TC-I18N-01 (AC-01.1): Khởi tạo mặc định ngôn ngữ 'en', lưu trữ và đọc an toàn từ localStorage key 'hui_language'", () => {
  // 1. Kiểm tra khóa lưu trữ chuẩn
  assert.equal(
    LANGUAGE_STORAGE_KEY,
    "hui_language",
    "LANGUAGE_STORAGE_KEY phải chính xác là 'hui_language'"
  );

  // 2. Môi trường SSR / window undefined fallback về "en"
  const origWindow = globalThis.window;
  try {
    // @ts-expect-error - simulating window undefined
    delete globalThis.window;
    assert.equal(
      getStoredLanguage(),
      "en",
      "getStoredLanguage() phải trả về 'en' khi window is undefined"
    );
  } finally {
    globalThis.window = origWindow;
  }

  // 3. Giả lập localStorage trong client runtime
  const storageMock: Record<string, string> = {};
  const mockLocalStorage = {
    getItem: (key: string) => storageMock[key] ?? null,
    setItem: (key: string, val: string) => {
      storageMock[key] = val;
    },
    removeItem: (key: string) => {
      delete storageMock[key];
    },
    clear: () => {
      for (const k in storageMock) delete storageMock[k];
    },
  };

  // @ts-expect-error - attach mock window & localStorage
  globalThis.window = {} as unknown;
  // @ts-expect-error - attach mock localStorage
  globalThis.localStorage = mockLocalStorage;

  try {
    // Key rỗng -> trả về 'en'
    mockLocalStorage.clear();
    assert.equal(
      getStoredLanguage(),
      "en",
      "Khi localStorage chưa có key 'hui_language', ngôn ngữ mặc định phải là 'en'"
    );

    // Key không hợp lệ (ví dụ: 'fr', 'es', '') -> tự fallback về 'en'
    storageMock[LANGUAGE_STORAGE_KEY] = "fr";
    assert.equal(
      getStoredLanguage(),
      "en",
      "Khi localStorage lưu giá trị không hợp lệ ('fr'), phải tự chuẩn hóa về 'en'"
    );

    storageMock[LANGUAGE_STORAGE_KEY] = "";
    assert.equal(
      getStoredLanguage(),
      "en",
      "Khi localStorage lưu chuỗi rỗng, phải fallback về 'en'"
    );

    // Key hợp lệ: 'en'
    storageMock[LANGUAGE_STORAGE_KEY] = "en";
    assert.equal(
      getStoredLanguage(),
      "en",
      "Khi localStorage lưu 'en', getStoredLanguage() phải trả về 'en'"
    );

    // Key hợp lệ: 'vi'
    storageMock[LANGUAGE_STORAGE_KEY] = "vi";
    assert.equal(
      getStoredLanguage(),
      "vi",
      "Khi localStorage lưu 'vi', getStoredLanguage() phải trả về 'vi'"
    );

    // Kiểm tra ghi bằng setStoredLanguage
    setStoredLanguage("en");
    assert.equal(
      storageMock[LANGUAGE_STORAGE_KEY],
      "en",
      "setStoredLanguage('en') phải lưu 'en' vào localStorage"
    );

    setStoredLanguage("vi");
    assert.equal(
      storageMock[LANGUAGE_STORAGE_KEY],
      "vi",
      "setStoredLanguage('vi') phải lưu 'vi' vào localStorage"
    );

    // Chịu lỗi: localStorage throw exception (private browsing mode)
    const errorStorage = {
      getItem: () => {
        throw new Error("SecurityError: Access denied");
      },
      setItem: () => {
        throw new Error("SecurityError: Access denied");
      },
    };
    // @ts-expect-error - testing exception handling
    globalThis.localStorage = errorStorage;

    assert.doesNotThrow(() => {
      const lang = getStoredLanguage();
      assert.equal(lang, "en", "Khi localStorage bị chặn, phải an toàn trả về 'en'");
    }, "getStoredLanguage không được throw khi localStorage lỗi");

    assert.doesNotThrow(() => {
      setStoredLanguage("en");
    }, "setStoredLanguage không được throw khi localStorage lỗi");
  } finally {
    globalThis.window = origWindow;
  }

  // 4. Kiểm tra App.tsx khởi tạo state ngôn ngữ từ getStoredLanguage
  const appSrc = readSource("src/App.tsx");
  assert.ok(
    appSrc.includes("const [language, setLanguage] = useState<Language>(getStoredLanguage);"),
    "App.tsx phải khởi tạo language state bằng getStoredLanguage"
  );
  assert.ok(
    appSrc.includes("setStoredLanguage(next);"),
    "App.tsx phải cập nhật localStorage khi toggle ngôn ngữ"
  );
});

// ============================================================================
// TC-I18N-02 (AC-01.2): Nút toggle ngôn ngữ trên Header (cả 2 header)
// ============================================================================
test("TC-I18N-02 (AC-01.2): Nút toggle ngôn ngữ trên Header (cả 2 header) hỗ trợ chuyển đổi giữa 'vi' và 'en', cập nhật state và localStorage", () => {
  const headerSrc = readSource("src/components/savings/Header.tsx");
  const appSrc = readSource("src/App.tsx");

  // 1. Kiểm tra interface HeaderProps trong Header.tsx
  assert.ok(
    headerSrc.includes("language?: Language;"),
    "HeaderProps phải khai báo prop language?: Language"
  );
  assert.ok(
    headerSrc.includes("onToggleLanguage?: () => void;"),
    "HeaderProps phải khai báo prop onToggleLanguage?: () => void"
  );

  // 2. Nút toggle trên Header (MetaMask header)
  assert.ok(
    headerSrc.includes("onToggleLanguage && ("),
    "Header.tsx phải render nút toggle khi có onToggleLanguage callback"
  );
  assert.ok(
    headerSrc.includes("onClick={onToggleLanguage}"),
    "Nút toggle phải gọi onToggleLanguage khi click"
  );
  assert.ok(
    headerSrc.includes("<Globe size={15}"),
    "Nút toggle phải có icon Globe kích thước 15px"
  );
  assert.ok(
    headerSrc.includes('{isEn ? "EN 🇬🇧" : "VI 🇻🇳"}'),
    "Nút toggle phải hiển thị nhãn EN 🇬🇧 hoặc VI 🇻🇳 theo ngôn ngữ hiện tại"
  );
  assert.ok(
    headerSrc.includes('aria-label="Toggle language"'),
    "Nút toggle phải có aria-label hỗ trợ accessibility"
  );
  assert.ok(
    headerSrc.includes("whitespace-nowrap"),
    "Nút toggle phải có class whitespace-nowrap ngăn vỡ chữ"
  );

  // 3. App.tsx truyền props cho MetaMask Header
  assert.ok(
    appSrc.includes("language={language}"),
    "App.tsx phải truyền prop language xuống Header"
  );
  assert.ok(
    appSrc.includes("onToggleLanguage={handleToggleLanguage}"),
    "App.tsx phải truyền handleToggleLanguage xuống Header"
  );

  // 4. Passkey Header trong App.tsx cũng tích hợp nút toggle
  assert.ok(
    appSrc.includes("onClick={handleToggleLanguage}"),
    "Passkey header top bar phải có nút gọi handleToggleLanguage"
  );
  assert.ok(
    appSrc.includes('{language === "en" ? "EN 🇬🇧" : "VI 🇻🇳"}'),
    "Passkey header top bar phải hiển thị nhãn EN 🇬🇧 hoặc VI 🇻🇳"
  );
  assert.ok(
    appSrc.includes("<Globe size={14}"),
    "Passkey header top bar phải có icon Globe"
  );

  // 5. Logic handleToggleLanguage trong App.tsx
  assert.ok(
    appSrc.includes('const next: Language = language === "vi" ? "en" : "vi";'),
    "handleToggleLanguage phải đảo trạng thái giữa 'vi' và 'en'"
  );
  assert.ok(
    appSrc.includes("setLanguage(next);") && appSrc.includes("setStoredLanguage(next);"),
    "handleToggleLanguage phải cập nhật cả React state lẫn localStorage"
  );
});

// ============================================================================
// TC-I18N-03 (AC-01.3): Độ bao phủ từ điển song ngữ: đầy đủ keys cho 10 component
// ============================================================================
test("TC-I18N-03 (AC-01.3): Độ bao phủ từ điển song ngữ: kiểm tra đầy đủ các keys trong Translations cho 10 component", () => {
  const vi = translations.vi;
  const en = translations.en;

  // 1. Kiểm tra 10 namespaces component cốt lõi
  const requiredNamespaces = [
    "header",
    "groupSwitcher",
    "clubCard",
    "memberStatus",
    "actionPanel",
    "roundHistory",
    "howItWorks",
    "createClubModal",
    "clubDirectoryModal",
    "ownerControls",
    "common",
  ];

  for (const ns of requiredNamespaces) {
    assert.ok(
      ns in vi,
      `Từ điển tiếng Việt phải có namespace '${ns}'`
    );
    assert.ok(
      ns in en,
      `Từ điển tiếng Anh phải có namespace '${ns}'`
    );
  }

  // 2. So khớp đệ quy 100% key parity giữa 'vi' và 'en'
  function compareKeys(objVi: Record<string, unknown>, objEn: Record<string, unknown>, prefix = "") {
    for (const key of Object.keys(objVi)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      assert.ok(
        key in objEn,
        `Key '${fullKey}' có trong tiếng Việt nhưng thiếu trong tiếng Anh`
      );

      const valVi = objVi[key];
      const valEn = objEn[key];

      if (typeof valVi === "object" && valVi !== null && !Array.isArray(valVi)) {
        assert.equal(
          typeof valEn,
          "object",
          `Key '${fullKey}' phải là object ở cả 2 ngôn ngữ`
        );
        compareKeys(valVi as Record<string, unknown>, valEn as Record<string, unknown>, fullKey);
      } else {
        assert.equal(
          typeof valVi,
          "string",
          `Giá trị tiếng Việt của '${fullKey}' phải là chuỗi`
        );
        assert.equal(
          typeof valEn,
          "string",
          `Giá trị tiếng Anh của '${fullKey}' phải là chuỗi`
        );
        assert.ok(
          (valVi as string).trim().length > 0,
          `Chuỗi tiếng Việt của '${fullKey}' không được để trống`
        );
        assert.ok(
          (valEn as string).trim().length > 0,
          `Chuỗi tiếng Anh của '${fullKey}' không được để trống`
        );
      }
    }

    for (const key of Object.keys(objEn)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      assert.ok(
        key in objVi,
        `Key '${fullKey}' có trong tiếng Anh nhưng thiếu trong tiếng Việt`
      );
    }
  }

  compareKeys(vi as unknown as Record<string, unknown>, en as unknown as Record<string, unknown>);

  // 3. Kiểm tra hàm helper t(keyPath, lang)
  assert.equal(t("header.appName", "vi"), "HụiChain");
  assert.equal(t("header.appName", "en"), "HụiChain");
  assert.equal(t("header.directoryBtn", "vi"), "Danh sách nhóm");
  assert.equal(t("header.directoryBtn", "en"), "Club Directory");
  assert.equal(t("groupSwitcher.title", "vi"), "Hợp đồng nhóm hụi");
  assert.equal(t("groupSwitcher.title", "en"), "SAVINGS CLUB CONTRACT");
  assert.equal(t("clubCard.badge", "en"), "Trustless Savings Club");
  assert.equal(t("memberStatus.title", "en"), "Your Status");
  assert.equal(t("actionPanel.openBadge", "en"), "Registration Phase");
  assert.equal(t("roundHistory.title", "en"), "Round History");
  assert.equal(t("howItWorks.title", "en"), "How Trustless Tontine Works");
  assert.equal(t("createClubModal.title", "en"), "Create New Savings Club");
  assert.equal(t("clubDirectoryModal.title", "en"), "Savings Club Directory");

  // Fallback an toàn: key không tồn tại trả về chính tên key
  assert.equal(
    t("nonExistentKey.deepProperty", "en"),
    "nonExistentKey.deepProperty",
    "Key không tồn tại phải trả về chính tên keyPath thay vì crash"
  );
});

// ============================================================================
// TC-I18N-04 (AC-01.4): Thông báo Toast và helper feedback song ngữ chuẩn
// ============================================================================
test("TC-I18N-04 (AC-01.4): Thông báo Toast và helper feedback song ngữ chuẩn theo ngôn ngữ được chọn", () => {
  const appSrc = readSource("src/App.tsx");
  const switcherSrc = readSource("src/components/savings/GroupSwitcher.tsx");
  const actionSrc = readSource("src/components/savings/ActionPanel.tsx");
  const pkActionSrc = readSource("src/components/savings/PasskeyActionPanel.tsx");
  const dirModalSrc = readSource("src/components/savings/ClubDirectoryModal.tsx");

  // 1. Toast trong App.tsx
  // Tạo nhóm thành công
  assert.ok(
    appSrc.includes('toast.success("Savings Club created successfully!"') &&
      appSrc.includes('toast.success("Tạo nhóm Hụi thành công!"'),
    "App.tsx phải hiển thị toast tạo nhóm song ngữ theo isEn"
  );
  // Nhận tiền (claim payout)
  assert.ok(
    appSrc.includes('toast.success(isEn ? "Claimed payout successfully!" : "Đã nhận tiền thành công!"'),
    "App.tsx phải hiển thị toast claim payout song ngữ"
  );
  // Owner actions
  assert.ok(
    appSrc.includes('toast.success(isEn ? "Started rounds successfully!" : "Đã bắt đầu các vòng hụi!"'),
    "App.tsx phải hiển thị toast start rounds song ngữ"
  );
  assert.ok(
    appSrc.includes('toast.success(isEn ? "Cancellation vote recorded." : "Đã ghi nhận phiếu huỷ nhóm."'),
    "App.tsx phải hiển thị toast cancel group song ngữ"
  );

  // 2. Toast trong GroupSwitcher.tsx
  assert.ok(
    switcherSrc.includes('t("groupSwitcher.toastCopied", language)'),
    "GroupSwitcher.tsx phải dùng t('groupSwitcher.toastCopied', language) cho toast sao chép"
  );
  assert.ok(
    switcherSrc.includes('isEn ? t("groupSwitcher.toastEmptyAddr", language) : "Vui lòng nhập địa chỉ hợp đồng."'),
    "GroupSwitcher.tsx phải có thông báo lỗi địa chỉ rỗng song ngữ"
  );
  assert.ok(
    switcherSrc.includes('isEn ? t("groupSwitcher.toastInvalidAddr", language) : "Địa chỉ hợp đồng không hợp lệ'),
    "GroupSwitcher.tsx phải có thông báo lỗi địa chỉ không hợp lệ song ngữ"
  );
  assert.ok(
    switcherSrc.includes('isEn ? t("groupSwitcher.toastSwitched", language) : "Đã chuyển sang nhóm mới!"'),
    "GroupSwitcher.tsx phải có thông báo chuyển nhóm song ngữ"
  );

  // 3. Toast trong ActionPanel.tsx
  assert.ok(
    actionSrc.includes('t("actionPanel.toastInviteCopied", language)'),
    "ActionPanel.tsx phải dùng toast mời nhóm song ngữ"
  );
  assert.ok(
    actionSrc.includes('toast.success("Transaction successful!"') &&
      actionSrc.includes('toast.success("Giao dịch thành công!"'),
    "ActionPanel.tsx phải có toast giao dịch thành công song ngữ"
  );

  // 4. Toast trong PasskeyActionPanel.tsx
  assert.ok(
    pkActionSrc.includes('t("actionPanel.toastInviteCopied", language)'),
    "PasskeyActionPanel.tsx phải dùng toast mời nhóm song ngữ"
  );
  assert.ok(
    pkActionSrc.includes("isEn ? 'Joined the club.' : 'Đã tham gia nhóm.'"),
    "PasskeyActionPanel.tsx phải có toast join nhóm song ngữ"
  );

  // 5. Toast trong ClubDirectoryModal.tsx
  assert.ok(
    dirModalSrc.includes('isEn ? t("clubDirectoryModal.copyAddrSuccess", language) : "Đã sao chép địa chỉ nhóm!"'),
    "ClubDirectoryModal.tsx phải có toast sao chép địa chỉ song ngữ"
  );
  assert.ok(
    dirModalSrc.includes('toast.success(`Switched to club ${group.name}!`)') &&
      dirModalSrc.includes('toast.success(`Đã chuyển sang nhóm ${group.name}!`)'),
    "ClubDirectoryModal.tsx phải có toast chuyển nhóm song ngữ"
  );
});

// ============================================================================
// TC-LAYOUT-01 (AC-02.1): GroupSwitcher áp dụng lưới 2x2 grid (grid-cols-2)
// ============================================================================
test("TC-LAYOUT-01 (AC-02.1): GroupSwitcher áp dụng lưới 2x2 grid (grid-cols-2) thoáng đãng, không ép 4 nút vào 1 hàng hẹp", () => {
  const source = readSource("src/components/savings/GroupSwitcher.tsx");

  // 1. Kiểm tra cấu trúc lưới grid grid-cols-2
  assert.ok(
    source.includes('<div className="grid grid-cols-2 gap-2.5">'),
    "GroupSwitcher phải sử dụng grid grid-cols-2 gap-2.5 để phân chia 4 nút thành 2 hàng x 2 cột"
  );

  // 2. Không được dùng flex 1 hàng ép 4 nút
  assert.ok(
    !source.includes('className="flex items-center gap-1.5 overflow-x-auto"'),
    "GroupSwitcher không được dùng hàng flex ép nút hẹp cũ"
  );

  // 3. Kiểm tra phân bổ đủ 4 nút trong lưới
  assert.ok(
    source.includes("onOpenDirectoryModal") && source.includes("Danh sách nhóm"),
    "Lưới phải có nút Danh sách nhóm"
  );
  assert.ok(
    source.includes("onOpenCreateModal") && source.includes("+ Tạo nhóm mới"),
    "Lưới phải có nút + Tạo nhóm mới"
  );
  assert.ok(
    source.includes("handleCopyLink") && source.includes("Sao chép link nhóm"),
    "Lưới phải có nút Sao chép link nhóm"
  );
  assert.ok(
    source.includes("setIsExpanded(!isExpanded)") && source.includes("Đổi nhóm"),
    "Lưới phải có nút Đổi nhóm"
  );
});

// ============================================================================
// TC-LAYOUT-02 (AC-02.2): Các nút trong GroupSwitcher chứa thuộc tính whitespace-nowrap
// ============================================================================
test("TC-LAYOUT-02 (AC-02.2): Các nút trong GroupSwitcher chứa thuộc tính whitespace-nowrap, không bị ngắt chữ vụn thành 2-3 hàng", () => {
  const source = readSource("src/components/savings/GroupSwitcher.tsx");

  // Tất cả 4 nút chính phải có class whitespace-nowrap
  const matches = source.match(/whitespace-nowrap/g);
  assert.ok(
    matches && matches.length >= 4,
    `GroupSwitcher phải áp dụng whitespace-nowrap cho toàn bộ các nút bấm (tìm thấy: ${matches?.length ?? 0})`
  );

  // Nhãn nút dùng thẻ truncate hoặc nằm trên 1 dòng
  assert.ok(
    source.includes('<span className="truncate">'),
    "GroupSwitcher phải bọc nhãn nút trong span truncate để phòng ngừa tràn viền"
  );

  // Tuyệt đối không có ngắt dòng cứng \n trong nhãn nút
  assert.ok(
    !source.includes("Danh \\n sách") && !source.includes("Tạo \\n nhóm"),
    "GroupSwitcher tuyệt đối không được bẻ dòng vụn bằng ký tự xuống hàng"
  );
});

// ============================================================================
// TC-LAYOUT-03 (AC-02.3): Nâng kích thước icon (15-16px) và vùng chạm padding py-2.5 px-3
// ============================================================================
test("TC-LAYOUT-03 (AC-02.3): Nâng kích thước icon (15-16px) và vùng chạm padding tối thiểu py-2.5 px-3", () => {
  const source = readSource("src/components/savings/GroupSwitcher.tsx");

  // 1. Kiểm tra kích thước icon tối thiểu 15-16px
  assert.ok(
    source.includes("<Layers size={15}"),
    "Icon Layers trong GroupSwitcher phải có size={15}"
  );
  assert.ok(
    source.includes("<Plus size={15}"),
    "Icon Plus trong GroupSwitcher phải có size={15}"
  );
  assert.ok(
    source.includes("<Share2 size={15}") || source.includes("<Check size={15}"),
    "Icon Share2/Check trong GroupSwitcher phải có size={15}"
  );
  assert.ok(
    source.includes("<Shuffle size={15}"),
    "Icon Shuffle trong GroupSwitcher phải có size={15}"
  );

  // 2. Padding nút đạt chuẩn tiếp cận di động (py-2.5 px-3)
  const pyMatches = source.match(/py-2\.5 px-3/g);
  assert.ok(
    pyMatches && pyMatches.length >= 4,
    "Tất cả các nút trong GroupSwitcher phải có padding vùng chạm thoải mái py-2.5 px-3"
  );

  // 3. Phản hồi xúc giác bấm (active:scale-95)
  assert.ok(
    source.includes("active:scale-95"),
    "Các nút trong GroupSwitcher phải có hiệu ứng active:scale-95"
  );
});

// ============================================================================
// TC-LAYOUT-04 (AC-02.4): Tiêu đề HỢP ĐỒNG NHÓM HỤI & contract/balance rõ nét
// ============================================================================
test("TC-LAYOUT-04 (AC-02.4): Tiêu đề HỢP ĐỒNG NHÓM HỤI và thông tin contract/balance hiển thị rõ nét, tương phản cao", () => {
  const switcherSrc = readSource("src/components/savings/GroupSwitcher.tsx");
  const appSrc = readSource("src/App.tsx");

  // 1. Tiêu đề HỢP ĐỒNG NHÓM HỤI
  assert.ok(
    switcherSrc.includes("text-slate-500 text-xs font-bold uppercase tracking-wider block"),
    "GroupSwitcher overline tiêu đề phải hiển thị font-bold uppercase tracking-wider sắc nét"
  );
  assert.ok(
    switcherSrc.includes('{isEn ? t("groupSwitcher.title", language) : "Hợp đồng nhóm hụi"}'),
    "GroupSwitcher tiêu đề phải hỗ trợ song ngữ"
  );

  // 2. Địa chỉ contract rút gọn hiển thị mono có nền tương phản
  assert.ok(
    switcherSrc.includes("font-mono text-xs text-slate-800 font-bold bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/60"),
    "Địa chỉ hợp đồng trong GroupSwitcher phải định dạng font-mono đậm trên nền bg-slate-100"
  );

  // 3. Số dư USDC trong App.tsx hiển thị to rõ
  assert.ok(
    appSrc.includes("text-xs sm:text-sm font-bold text-slate-800 tabular-nums bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/60"),
    "Số dư USDC ví MetaMask phải hiển thị rõ nét bằng font tabular-nums"
  );
  assert.ok(
    appSrc.includes("text-xs sm:text-sm font-bold text-slate-700 tabular-nums bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200/60"),
    "Số dư USDC ví Passkey phải hiển thị rõ nét bằng font tabular-nums"
  );
});

// ============================================================================
// TC-TYPO-01 (AC-03.1): ActionPanel & PasskeyActionPanel phóng to khối giải thích
// ============================================================================
test("TC-TYPO-01 (AC-03.1): ActionPanel & PasskeyActionPanel khối giải thích và 3 bước quy trình nâng cỡ chữ lên text-sm / text-base, số thứ tự w-6 h-6 text-sm font-bold", () => {
  const actionSrc = readSource("src/components/savings/ActionPanel.tsx");
  const pkActionSrc = readSource("src/components/savings/PasskeyActionPanel.tsx");

  // 1. ActionPanel.tsx
  // Tiêu đề khối giải thích
  assert.ok(
    actionSrc.includes("font-bold text-slate-900 text-base sm:text-lg"),
    "ActionPanel tiêu đề khối giải thích 'Vì sao chưa thấy chỗ đóng tiền?' phải nâng lên text-base sm:text-lg font-bold"
  );
  // Khối giải thích có cỡ chữ text-sm sm:text-base
  assert.ok(
    actionSrc.includes("bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 text-sm sm:text-base space-y-3 sm:space-y-4"),
    "ActionPanel khối giải thích phải có padding p-4 sm:p-5 và cỡ chữ text-sm sm:text-base"
  );
  // Nội dung giải thích
  assert.ok(
    actionSrc.includes("text-slate-700 leading-relaxed text-sm sm:text-base"),
    "ActionPanel nội dung mô tả phải có text-slate-700 leading-relaxed text-sm sm:text-base"
  );
  // Tiêu đề quy trình tiếp theo
  assert.ok(
    actionSrc.includes("font-bold text-slate-800 text-sm sm:text-base"),
    "ActionPanel tiêu đề 'Quy trình tiếp theo:' phải nâng lên text-sm sm:text-base font-bold"
  );
  // Số thứ tự 3 bước (1, 2, 3) có kích thước w-6 h-6 font-bold text-sm
  assert.ok(
    actionSrc.includes("w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0"),
    "ActionPanel bước 1 phải dùng badge tròn w-6 h-6 text-sm font-bold"
  );
  assert.ok(
    actionSrc.includes("w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0"),
    "ActionPanel bước 2 phải dùng badge tròn w-6 h-6 text-sm font-bold"
  );
  assert.ok(
    actionSrc.includes("w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0"),
    "ActionPanel bước 3 phải dùng badge tròn w-6 h-6 text-sm font-bold"
  );
  // Nút mời bạn bè
  assert.ok(
    actionSrc.includes("w-full py-2.5 sm:py-3 px-3 bg-blue-50/90 hover:bg-blue-100 text-blue-700 font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer border border-blue-200"),
    "ActionPanel nút mời bạn bè phải có cỡ chữ text-sm font-semibold và padding thoải mái"
  );

  // 2. PasskeyActionPanel.tsx
  assert.ok(
    pkActionSrc.includes("font-bold text-slate-900 text-base sm:text-lg"),
    "PasskeyActionPanel tiêu đề khối giải thích phải nâng lên text-base sm:text-lg font-bold"
  );
  assert.ok(
    pkActionSrc.includes("text-sm sm:text-base space-y-3 sm:space-y-4"),
    "PasskeyActionPanel khối giải thích phải có text-sm sm:text-base"
  );
  assert.ok(
    pkActionSrc.includes("w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0"),
    "PasskeyActionPanel bước 1 phải dùng badge tròn w-6 h-6 text-sm font-bold"
  );
  assert.ok(
    pkActionSrc.includes("w-full py-2.5 sm:py-3 px-3 bg-blue-50/90 hover:bg-blue-100 text-blue-700 font-semibold rounded-xl text-sm"),
    "PasskeyActionPanel nút mời bạn bè phải có cỡ chữ text-sm font-semibold"
  );
});

// ============================================================================
// TC-TYPO-02 (AC-03.2): ClubCard Pot hero hiển thị to nổi bật (text-3xl sm:text-4xl)
// ============================================================================
test("TC-TYPO-02 (AC-03.2): ClubCard Pot hero hiển thị to nổi bật (text-3xl sm:text-4xl), mô tả mức đóng và 3 ô thống kê rõ nét", () => {
  const source = readSource("src/components/savings/ClubCard.tsx");

  // 1. Tiêu đề tên nhóm
  assert.ok(
    source.includes("text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-xs"),
    "ClubCard tên nhóm phải có cỡ chữ text-2xl sm:text-3xl font-extrabold"
  );

  // 2. Pot Hero Amount
  assert.ok(
    source.includes("text-3xl sm:text-4xl font-extrabold tabular-nums tracking-tight text-white"),
    "ClubCard con số Pot Hero phải đạt cỡ chữ text-3xl sm:text-4xl font-extrabold"
  );
  assert.ok(
    source.includes("text-lg sm:text-xl font-bold text-cyan-200"),
    "ClubCard đơn vị USDC của Pot Hero phải đạt text-lg sm:text-xl font-bold"
  );

  // 3. Mô tả mức đóng cố định
  assert.ok(
    source.includes("text-sm font-medium text-blue-200/95 mt-1.5"),
    "ClubCard mô tả mức đóng cố định phải đạt text-sm font-medium"
  );

  // 4. Tổng quỹ tối đa
  assert.ok(
    source.includes("text-base font-bold text-white tabular-nums"),
    "ClubCard tổng quỹ tối đa (100%) phải đạt text-base font-bold"
  );

  // 5. Thanh tiến độ sức chứa
  assert.ok(
    source.includes("flex items-center justify-between text-sm font-semibold text-blue-200 mb-2"),
    "ClubCard nhãn sức chứa thành viên phải đạt text-sm font-semibold"
  );

  // 6. 3 ô thống kê (Thành viên, Vòng hiện tại, Thời gian)
  assert.ok(
    source.includes("text-lg sm:text-xl font-bold tabular-nums text-white"),
    "ClubCard 3 ô thống kê phải có số liệu to rõ text-lg sm:text-xl font-bold"
  );
  assert.ok(
    source.includes("text-blue-200 text-xs font-semibold mt-1"),
    "ClubCard 3 ô thống kê phải có nhãn phụ rõ nét text-xs font-semibold"
  );
});

// ============================================================================
// TC-TYPO-03 (AC-03.3): MemberStatus & RoundHistory typography upgrade
// ============================================================================
test("TC-TYPO-03 (AC-03.3): MemberStatus tiêu đề text-base, trạng thái text-sm; RoundHistory tiêu đề text-lg", () => {
  const memberSrc = readSource("src/components/savings/MemberStatus.tsx");
  const historySrc = readSource("src/components/savings/RoundHistory.tsx");

  // 1. MemberStatus.tsx
  assert.ok(
    memberSrc.includes("font-bold text-slate-900 text-base sm:text-lg"),
    "MemberStatus tiêu đề 'Trạng thái của bạn' phải đạt text-base sm:text-lg font-bold"
  );
  assert.ok(
    memberSrc.includes("text-xs sm:text-sm text-emerald-800 font-semibold"),
    "MemberStatus nhãn thành viên phải có text-xs sm:text-sm font-semibold"
  );
  assert.ok(
    memberSrc.includes("text-xs sm:text-sm text-emerald-600 font-medium"),
    "MemberStatus trạng thái 'Đã tham gia' phải có text-xs sm:text-sm font-medium"
  );
  assert.ok(
    memberSrc.includes("text-xs sm:text-sm font-semibold text-blue-800"),
    "MemberStatus nhãn đóng góp phải có text-xs sm:text-sm font-semibold"
  );
  assert.ok(
    memberSrc.includes("text-xs sm:text-sm font-medium text-blue-600"),
    "MemberStatus trạng thái 'Chờ mở vòng 1' phải có text-xs sm:text-sm font-medium"
  );
  assert.ok(
    memberSrc.includes("text-xl font-extrabold text-emerald-900 tabular-nums"),
    "MemberStatus số tiền claimable phải đạt text-xl font-extrabold"
  );

  // 2. RoundHistory.tsx
  assert.ok(
    historySrc.includes("font-bold text-slate-900 text-lg sm:text-xl"),
    "RoundHistory tiêu đề 'Lịch sử các vòng' phải đạt text-lg sm:text-xl font-bold"
  );
  assert.ok(
    historySrc.includes("text-xs sm:text-sm font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200/60 tabular-nums"),
    "RoundHistory badge số vòng tất toán phải có text-xs sm:text-sm font-semibold"
  );
  assert.ok(
    historySrc.includes("font-bold text-slate-900 text-sm sm:text-base"),
    "RoundHistory tiêu đề vòng phải có text-sm sm:text-base font-bold"
  );
  assert.ok(
    historySrc.includes("text-sm sm:text-base font-bold text-slate-900 tabular-nums"),
    "RoundHistory tổng quỹ nhận phải đạt text-sm sm:text-base font-bold"
  );
});

// ============================================================================
// TC-TYPO-04 (AC-03.4): HowItWorksCard, CreateClubModal & ClubDirectoryModal
// ============================================================================
test("TC-TYPO-04 (AC-03.4): HowItWorksCard, CreateClubModal & ClubDirectoryModal tiêu đề và nhãn rõ nét (text-base / text-xl / text-sm)", () => {
  const howSrc = readSource("src/components/savings/HowItWorksCard.tsx");
  const createModalSrc = readSource("src/components/savings/CreateClubModal.tsx");
  const dirModalSrc = readSource("src/components/savings/ClubDirectoryModal.tsx");

  // 1. HowItWorksCard.tsx
  assert.ok(
    howSrc.includes("text-xl sm:text-2xl font-bold text-slate-900 mt-2"),
    "HowItWorksCard tiêu đề chính phải đạt text-xl sm:text-2xl font-bold"
  );
  assert.ok(
    howSrc.includes("font-bold text-slate-900 text-base"),
    "HowItWorksCard tiêu đề 4 bước phải đạt text-base font-bold"
  );
  assert.ok(
    howSrc.includes("text-slate-600 text-sm leading-relaxed mt-1"),
    "HowItWorksCard mô tả 4 bước phải đạt text-sm leading-relaxed"
  );
  assert.ok(
    howSrc.includes("font-bold text-slate-900 text-base") &&
      howSrc.includes("text-slate-600 leading-relaxed text-sm"),
    "HowItWorksCard khối bảo vệ dòng tiền phải có tiêu đề text-base và nội dung text-sm"
  );

  // 2. CreateClubModal.tsx
  assert.ok(
    createModalSrc.includes("text-xl font-bold text-slate-900 tracking-tight"),
    "CreateClubModal tiêu đề modal phải đạt text-xl font-bold"
  );
  assert.ok(
    createModalSrc.includes("text-xs sm:text-sm font-bold text-slate-700"),
    "CreateClubModal nhãn form phải có text-xs sm:text-sm font-bold"
  );

  // 3. ClubDirectoryModal.tsx
  assert.ok(
    dirModalSrc.includes("text-xl font-bold text-slate-900 tracking-tight"),
    "ClubDirectoryModal tiêu đề modal phải đạt text-xl font-bold"
  );
  assert.ok(
    dirModalSrc.includes("font-bold text-slate-900 text-base sm:text-lg"),
    "ClubDirectoryModal tên nhóm trong danh bạ phải đạt text-base sm:text-lg font-bold"
  );
});
