/**
 * Module Đa ngôn ngữ (i18n) cho HụiChain
 * Hỗ trợ song ngữ Tiếng Việt (vi) và Tiếng Anh (en).
 * Lưu trữ trạng thái bền bỉ trong localStorage với khóa 'hui_language'.
 */

export type Language = "vi" | "en";

export const LANGUAGE_STORAGE_KEY = "hui_language";

export function getStoredLanguage(): Language {
  if (typeof window === "undefined") return "vi";
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === "en" || saved === "vi") {
      return saved;
    }
  } catch {
    // In case localStorage is disabled (private browsing)
  }
  return "vi";
}

export function setStoredLanguage(lang: Language): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    // In case localStorage is disabled
  }
}

export interface Translations {
  header: {
    appName: string;
    appDesc: string;
    directoryBtn: string;
    createBtn: string;
    guideBtn: string;
    explorerBtn: string;
    connectWallet: string;
    switchLang: string;
  };
  groupSwitcher: {
    title: string;
    directoryBtn: string;
    createBtn: string;
    copyBtn: string;
    copiedBtn: string;
    switchBtn: string;
    closeBtn: string;
    switchFormTitle: string;
    inputPlaceholder: string;
    switchSubmitBtn: string;
    toastCopied: string;
    toastSwitched: string;
    toastEmptyAddr: string;
    toastInvalidAddr: string;
    toastCopyFail: string;
  };
  clubCard: {
    badge: string;
    stateOpen: string;
    stateActive: string;
    stateCompleted: string;
    stateCancelled: string;
    heroPotLabel: string;
    fixedContribLabel: string;
    perMemberPerRound: string;
    maxPotLabel: string;
    capacityLabel: string;
    min2Condition: string;
    readyCondition: string;
    statMembers: string;
    statRound: string;
    statRoundNotStarted: string;
    statDuration: string;
    roundTimeEnded: string;
  };
  memberStatus: {
    title: string;
    notMemberHint: string;
    memberBadge: string;
    joinedBadge: string;
    contribBadge: string;
    waitingRound1Badge: string;
    contributedBadge: string;
    notContributedBadge: string;
    bidBadge: string;
    wonBadge: string;
    yourRoundBadge: string;
    kickedBadge: string;
    kickedReason: string;
    claimableBadge: string;
    claimPayoutBtn: string;
    claimingBtn: string;
  };
  actionPanel: {
    title: string;
    notConnectedTitle: string;
    notConnectedDesc: string;
    connectBtn: string;
    wrongChainTitle: string;
    wrongChainDesc: string;
    switchChainBtn: string;
    openBadge: string;
    openRegisteredNotice: string;
    openRegisteredDesc: string;
    whyNoContribTitle: string;
    whyNoContribDesc: string;
    roadmapTitle: string;
    roadmapStep1: string;
    roadmapStep2: string;
    roadmapStep3: string;
    inviteBtn: string;
    inviteCopied: string;
    toastInviteCopied: string;
    toastInviteCopiedDesc: string;
    joinFeeDesc: string;
    joinFeeBenefits: string;
    approveAndJoinBtn: string;
    joinBtn: string;
    contributeTitle: string;
    contributeSubtitle: string;
    contributedBadge: string;
    contributeBtn: string;
    bidTitle: string;
    bidDesc: string;
    placeBidBtn: string;
    approveBidBtn: string;
    settleBtn: string;
    wonNoticeTitle: string;
    wonNoticeDesc: string;
    kickedNoticeTitle: string;
    kickedNoticeDesc: string;
    completedNotice: string;
    activeNotMemberNotice: string;
    loadingSign: string;
    loadingProcess: string;
  };
  roundHistory: {
    title: string;
    desc: string;
    settledCountBadge: string;
    loading: string;
    emptyTitle: string;
    emptyDesc: string;
    roundLabel: string;
    settledBadge: string;
    totalPotLabel: string;
    winnerLabel: string;
    youBadge: string;
    bidYieldLabel: string;
  };
  howItWorks: {
    badge: string;
    title: string;
    secBadge: string;
    step1Title: string;
    step1Desc: string;
    step1Badge: string;
    step2Title: string;
    step2Desc: string;
    step2Badge: string;
    step3Title: string;
    step3Desc: string;
    step3Badge: string;
    step4Title: string;
    step4Desc: string;
    step4Badge: string;
    safetyTitle: string;
    safetyDesc: string;
  };
  createClubModal: {
    title: string;
    desc: string;
    nameLabel: string;
    namePlaceholder: string;
    nameError: string;
    amountLabel: string;
    amountSublabel: string;
    amountPlaceholder: string;
    amountError: string;
    membersLabel: string;
    membersSuffix: string;
    membersMin: string;
    membersStandard: string;
    membersMax: string;
    membersError: string;
    durationLabel: string;
    durationPresets: Record<string, { label: string; hint: string }>;
    potSummaryTitle: string;
    potSummaryLabel: string;
    cycleSummaryLabel: string;
    cycleSummarySublabel: string;
    ownerBenefitTitle: string;
    ownerBenefitDesc: string;
    deployBtn: string;
    pendingBtn: string;
    confirmingBtn: string;
    deployHint: string;
  };
  clubDirectoryModal: {
    title: string;
    desc: string;
    featuredBadge: string;
    currentBadge: string;
    switchBtn: string;
    currentBtn: string;
    createShortcutBtn: string;
    clubsAvailable: string;
    emptyList: string;
    copyAddrSuccess: string;
    copyAddrFail: string;
    switchedToast: string;
  };
  ownerControls: {
    title: string;
    badge: string;
    desc: string;
    startBtn: string;
    cancelBtn: string;
    need2MembersHint: string;
    transferTitle: string;
    transferDesc: string;
    acceptBtn: string;
    toastStartSuccess: string;
    toastCancelSuccess: string;
    toastOwnerActionSuccess: string;
  };
  common: {
    days: string;
    hours: string;
    rounds: string;
    viewOnExplorer: string;
  };
}

export const translations: Record<Language, Translations> = {
  vi: {
    header: {
      appName: "HụiChain",
      appDesc: "Trustless Rotating Savings Club on Arc Network",
      directoryBtn: "Danh sách nhóm",
      createBtn: "+ Tạo nhóm",
      guideBtn: "Hướng dẫn",
      explorerBtn: "Explorer",
      connectWallet: "Kết nối ví",
      switchLang: "VI 🇻🇳",
    },
    groupSwitcher: {
      title: "Hợp đồng nhóm hụi",
      directoryBtn: "Danh sách nhóm",
      createBtn: "+ Tạo nhóm mới",
      copyBtn: "Sao chép link nhóm",
      copiedBtn: "Đã chép link",
      switchBtn: "Đổi nhóm",
      closeBtn: "Đóng",
      switchFormTitle: "Nhập địa chỉ contract nhóm hụi khác (Arc Testnet):",
      inputPlaceholder: "0x...",
      switchSubmitBtn: "Chuyển",
      toastCopied: "Đã sao chép link nhóm!",
      toastSwitched: "Đã chuyển sang nhóm mới!",
      toastEmptyAddr: "Vui lòng nhập địa chỉ hợp đồng.",
      toastInvalidAddr: "Địa chỉ hợp đồng không hợp lệ. Cần 42 ký tự hex bắt đầu bằng 0x.",
      toastCopyFail: "Không thể sao chép liên kết vào clipboard.",
    },
    clubCard: {
      badge: "Trustless Savings Club",
      stateOpen: "Mở nhận thành viên",
      stateActive: "Đang diễn ra",
      stateCompleted: "Đã hoàn thành",
      stateCancelled: "Đã hủy",
      heroPotLabel: "Tổng Pot vòng này",
      fixedContribLabel: "Đóng góp cố định:",
      perMemberPerRound: "USDC / thành viên / vòng",
      maxPotLabel: "Tổng quỹ tối đa (khi đủ 100%)",
      capacityLabel: "Sức chứa thành viên",
      min2Condition: "Cần tối thiểu 2 để bắt đầu",
      readyCondition: "Đủ điều kiện bắt đầu",
      statMembers: "Thành viên",
      statRound: "Vòng hiện tại",
      statRoundNotStarted: "Chưa chạy",
      statDuration: "Thời gian vòng",
      roundTimeEnded: "—",
    },
    memberStatus: {
      title: "Trạng thái của bạn",
      notMemberHint: "Tham gia nhóm để xem trạng thái của bạn",
      memberBadge: "Thành viên",
      joinedBadge: "Đã tham gia",
      contribBadge: "Đóng góp",
      waitingRound1Badge: "Chờ mở vòng 1",
      contributedBadge: "Đã đóng",
      notContributedBadge: "Chưa đóng",
      bidBadge: "Bid của bạn",
      wonBadge: "Đã thắng",
      yourRoundBadge: "Vòng của bạn",
      kickedBadge: "Bị loại",
      kickedReason: "Không đóng đúng hạn",
      claimableBadge: "Có thể nhận",
      claimPayoutBtn: "Nhận tiền",
      claimingBtn: "Đang nhận...",
    },
    actionPanel: {
      title: "Tham gia nhóm",
      notConnectedTitle: "Tham gia nhóm hụi",
      notConnectedDesc: "Đóng góp {amount} USDC mỗi vòng và đặt bid nhận pot sớm. Không cần tin tưởng ai — hợp đồng giữ tiền an toàn.",
      connectBtn: "Kết nối ví để tham gia",
      wrongChainTitle: "Sai mạng kết nối",
      wrongChainDesc: "Cần chuyển ví sang mạng Arc Testnet (Chain ID: {chainId}) để tương tác.",
      switchChainBtn: "Chuyển mạng Arc Testnet",
      openBadge: "Giai đoạn đăng ký",
      openRegisteredNotice: "Bạn đã là thành viên của nhóm!",
      openRegisteredDesc: "Ghi danh thành công. Nhóm hiện đang ở Giai đoạn đăng ký (OPEN).",
      whyNoContribTitle: "Vì sao chưa thấy chỗ đóng tiền?",
      whyNoContribDesc: "Theo quy tắc Smart Contract Hụi xoay vòng (Tontine), tiền đóng hụi ({amount} USDC/vòng) chỉ bắt đầu thu khi Vòng 1 chính thức bắt đầu. Điều này giúp đảm bảo thời gian đếm ngược và đấu giá được tính chuẩn cho tất cả thành viên.",
      roadmapTitle: "Quy trình tiếp theo:",
      roadmapStep1: "Chờ nhóm có tối thiểu 2 thành viên tham gia.",
      roadmapStep2: "Chủ nhóm bấm \"Bắt đầu các vòng\" trong bảng điều khiển.",
      roadmapStep3: "Nút \"Đóng góp ({amount} USDC)\" & ô Đặt Bid sẽ lập tức hiển thị ngay tại đây!",
      inviteBtn: "Mời bạn bè gia nhập để nhóm đủ điều kiện",
      inviteCopied: "Đã sao chép liên kết mời!",
      toastInviteCopied: "Đã sao chép link mời nhóm!",
      toastInviteCopiedDesc: "Gửi link này cho bạn bè để cùng tham gia hụi.",
      joinFeeDesc: "Mỗi vòng đóng cố định:",
      joinFeeBenefits: "Được quyền đặt Bid nhận Pot sớm hơn và hưởng lợi tức chia đều từ các thành viên khác.",
      approveAndJoinBtn: "Approve & Tham gia",
      joinBtn: "Tham gia nhóm",
      contributeTitle: "Đóng góp vòng {round}",
      contributeSubtitle: "Số tiền: {amount} USDC",
      contributedBadge: "Đã đóng",
      contributeBtn: "Đóng {amount} USDC",
      bidTitle: "Đặt bid để nhận pot sớm",
      bidDesc: "Bid cao nhất sẽ nhận Pot vòng này. Toàn bộ tiền bid được chia đều cho các thành viên chưa hốt.",
      placeBidBtn: "Đặt bid",
      approveBidBtn: "Approve bid",
      settleBtn: "Kết thúc vòng (ai cũng gọi được)",
      wonNoticeTitle: "Bạn đã thắng vòng của mình!",
      wonNoticeDesc: "Vui lòng kiểm tra số tiền thưởng có thể nhận trong phần Trạng thái thành viên.",
      kickedNoticeTitle: "Bạn đã bị loại khỏi nhóm",
      kickedNoticeDesc: "Do không đóng góp đúng hạn theo chu kỳ của vòng.",
      completedNotice: "Nhóm hụi đã hoàn thành tất cả các vòng.",
      activeNotMemberNotice: "Nhóm đang diễn ra các vòng, không nhận thêm thành viên mới.",
      loadingSign: "Xác nhận trong ví...",
      loadingProcess: "Đang xử lý...",
    },
    roundHistory: {
      title: "Lịch sử các vòng",
      desc: "Danh sách các vòng hụi đã tất toán và trao giải",
      settledCountBadge: "{count} vòng đã tất toán",
      loading: "Đang tải lịch sử vòng...",
      emptyTitle: "Chưa có vòng nào kết thúc",
      emptyDesc: "Khi vòng đầu tiên hoàn tất và tất toán, thông tin trúng pot sẽ xuất hiện tại đây.",
      roundLabel: "Vòng {round}",
      settledBadge: "Đã tất toán",
      totalPotLabel: "Tổng quỹ nhận",
      winnerLabel: "Người thắng vòng",
      youBadge: "Bạn!",
      bidYieldLabel: "Tổng tiền bid đã chia",
    },
    howItWorks: {
      badge: "Quy trình vận hành",
      title: "Cách hoạt động của Hụi Trustless",
      secBadge: "Bảo mật 100% On-chain",
      step1Title: "Tham gia nhóm",
      step1Desc: "Chọn nhóm hụi với số tiền và chu kỳ phù hợp. Kết nối ví Arc Testnet và bấm tham gia.",
      step1Badge: "Gia nhập",
      step2Title: "Góp vốn mỗi vòng",
      step2Desc: "Mỗi vòng (1 ngày), mọi thành viên đóng cố định 10 USDC vào quỹ Pot tập trung an toàn.",
      step2Badge: "Đóng hụi",
      step3Title: "Đấu giá hốt hụi",
      step3Desc: "Thành viên nào cần vốn sớm sẽ đặt Bid. Người trả giá bid cao nhất sẽ thắng toàn bộ Pot vòng đó.",
      step3Badge: "Đấu giá",
      step4Title: "Tất toán & Chia thưởng",
      step4Desc: "Tiền bid của người thắng được chia đều làm lợi tức thưởng cho những người chưa hốt hụi.",
      step4Badge: "Nhận tiền",
      safetyTitle: "Không thể quỵt hụi — Cơ chế bảo vệ dòng tiền thông minh",
      safetyDesc: "Hợp đồng tự động loại (kick) thành viên không đóng tiền ở vòng kế tiếp, đồng thời giữ lại toàn bộ số tiền đã đóng để bù trừ rủi ro cho nhóm. Tất cả lệnh rút tiền đều là pull-based trực tiếp từ ví của bạn.",
    },
    createClubModal: {
      title: "Tạo Nhóm Hụi Mới",
      desc: "Khởi tạo hợp đồng xoay vòng vốn trustless trên Arc Testnet",
      nameLabel: "Tên nhóm Hụi",
      namePlaceholder: "VD: Nhóm Hụi Gia Đình, Tiết Kiệm Tháng...",
      nameError: "Tên nhóm không được để trống (tối đa 32 ký tự).",
      amountLabel: "Mức đóng mỗi vòng (USDC)",
      amountSublabel: "USDC 6 decimals",
      amountPlaceholder: "Nhập số tiền khác (VD: 15, 25.5)",
      amountError: "Số tiền đóng góp phải lớn hơn 0 USDC.",
      membersLabel: "Số thành viên tối đa (2 - 20 người)",
      membersSuffix: "người",
      membersMin: "2 người",
      membersStandard: "10 người (chuẩn)",
      membersMax: "20 người",
      membersError: "Số thành viên phải từ 2 đến 20 người.",
      durationLabel: "Chu kỳ mỗi vòng",
      durationPresets: {
        "3600": { label: "1 giờ", hint: "Thử nghiệm" },
        "86400": { label: "1 ngày", hint: "Phổ biến" },
        "259200": { label: "3 ngày", hint: "Vừa phải" },
        "604800": { label: "7 ngày", hint: "1 tuần" },
      },
      potSummaryTitle: "Tổng quan nhóm dự kiến",
      potSummaryLabel: "Tổng Pot tối đa mỗi vòng",
      cycleSummaryLabel: "Thời gian hoàn thành",
      cycleSummarySublabel: "(Toàn bộ chu kỳ)",
      ownerBenefitTitle: "Quyền lợi:",
      ownerBenefitDesc: "Bạn sẽ là Chủ nhóm (Owner) 100%, có quyền bắt đầu vòng khi đủ thành viên và quản trị hợp đồng trực tiếp trên blockchain.",
      deployBtn: "Tạo nhóm Hụi",
      pendingBtn: "Chờ ký ví (MetaMask)...",
      confirmingBtn: "Đang triển khai lên blockchain...",
      deployHint: "Triển khai trực tiếp smart contract lên Arc Testnet qua ví Web3 của bạn",
    },
    clubDirectoryModal: {
      title: "Danh Sách Nhóm Hụi",
      desc: "Savings Clubs Directory trên Arc Testnet",
      featuredBadge: "Nổi bật",
      currentBadge: "Đang xem",
      switchBtn: "Vào nhóm",
      currentBtn: "Đang xem",
      createShortcutBtn: "+ Tạo nhóm mới",
      clubsAvailable: "{count} nhóm hụi khả dụng",
      emptyList: "Chưa có nhóm nào trong danh sách.",
      copyAddrSuccess: "Đã sao chép địa chỉ nhóm!",
      copyAddrFail: "Không thể sao chép địa chỉ.",
      switchedToast: "Đã chuyển sang nhóm {name}!",
    },
    ownerControls: {
      title: "Bảng điều khiển Chủ nhóm",
      badge: "Owner",
      desc: "Bạn là chủ nhóm này. Khi có đủ tối thiểu 2 thành viên, bạn có thể bắt đầu các vòng hoặc huỷ nhóm khi còn mở.",
      startBtn: "Bắt đầu các vòng",
      cancelBtn: "Huỷ nhóm",
      need2MembersHint: "Cần tối thiểu 2 thành viên để bắt đầu",
      transferTitle: "Chuyển nhượng quyền Chủ nhóm",
      transferDesc: "Ví của bạn được chỉ định làm Chủ nhóm cho hợp đồng này. Bấm nút dưới đây để nhận quyền sở hữu và toàn quyền kích hoạt các vòng.",
      acceptBtn: "Nhận quyền Chủ nhóm (Accept Ownership)",
      toastStartSuccess: "Đã bắt đầu các vòng hụi!",
      toastCancelSuccess: "Đã huỷ nhóm thành công!",
      toastOwnerActionSuccess: "Thao tác Chủ nhóm thành công!",
    },
    common: {
      days: "ngày",
      hours: "giờ",
      rounds: "vòng",
      viewOnExplorer: "Xem trên explorer",
    },
  },
  en: {
    header: {
      appName: "HụiChain",
      appDesc: "Trustless Rotating Savings Club on Arc Network",
      directoryBtn: "Club Directory",
      createBtn: "+ Create Club",
      guideBtn: "Guide",
      explorerBtn: "Explorer",
      connectWallet: "Connect Wallet",
      switchLang: "EN 🇬🇧",
    },
    groupSwitcher: {
      title: "SAVINGS CLUB CONTRACT",
      directoryBtn: "Club Directory",
      createBtn: "+ Create Club",
      copyBtn: "Copy Club Link",
      copiedBtn: "Link Copied",
      switchBtn: "Switch Club",
      closeBtn: "Close",
      switchFormTitle: "Enter contract address (Arc Testnet):",
      inputPlaceholder: "0x...",
      switchSubmitBtn: "Switch",
      toastCopied: "Club link copied to clipboard!",
      toastSwitched: "Switched to new club!",
      toastEmptyAddr: "Please enter contract address.",
      toastInvalidAddr: "Invalid contract address. Must be 42-char hex starting with 0x.",
      toastCopyFail: "Failed to copy link to clipboard.",
    },
    clubCard: {
      badge: "Trustless Savings Club",
      stateOpen: "Open for Members",
      stateActive: "Active",
      stateCompleted: "Completed",
      stateCancelled: "Cancelled",
      heroPotLabel: "Total Pot this round",
      fixedContribLabel: "Fixed contribution:",
      perMemberPerRound: "USDC / member / round",
      maxPotLabel: "Max pool (at 100%)",
      capacityLabel: "Member capacity",
      min2Condition: "Need min 2 to start",
      readyCondition: "Ready to start",
      statMembers: "Members",
      statRound: "Current Round",
      statRoundNotStarted: "Not started",
      statDuration: "Round Timer",
      roundTimeEnded: "—",
    },
    memberStatus: {
      title: "Your Status",
      notMemberHint: "Join club to view your status",
      memberBadge: "Member",
      joinedBadge: "Joined",
      contribBadge: "Contribution",
      waitingRound1Badge: "Waiting for Round 1",
      contributedBadge: "Contributed",
      notContributedBadge: "Not contributed",
      bidBadge: "Your Bid",
      wonBadge: "Won",
      yourRoundBadge: "Your round",
      kickedBadge: "Kicked",
      kickedReason: "Defaulted on deadline",
      claimableBadge: "Claimable",
      claimPayoutBtn: "Claim Payout",
      claimingBtn: "Claiming...",
    },
    actionPanel: {
      title: "Join Club",
      notConnectedTitle: "Join Savings Club",
      notConnectedDesc: "Contribute {amount} USDC each round and bid to receive pot early. Zero counterparty risk — contract safeguards funds.",
      connectBtn: "Connect Wallet to Join",
      wrongChainTitle: "Wrong Network",
      wrongChainDesc: "Please switch network to Arc Testnet (Chain ID: {chainId}) to interact.",
      switchChainBtn: "Switch to Arc Testnet",
      openBadge: "Registration Phase",
      openRegisteredNotice: "You are already a member of the club!",
      openRegisteredDesc: "Successfully registered. The club is currently in the Registration phase (OPEN).",
      whyNoContribTitle: "Why can't I see the contribution button yet?",
      whyNoContribDesc: "According to Rotating Savings (Tontine) smart contract rules, contributions ({amount} USDC/round) only start when Round 1 officially begins. This ensures round countdown and bidding are accurately synchronized for all members.",
      roadmapTitle: "Next steps:",
      roadmapStep1: "Wait for club to have at least 2 members.",
      roadmapStep2: "Club owner clicks \"Start Rounds\" in the control panel.",
      roadmapStep3: "Button \"Contribute ({amount} USDC)\" & Place Bid form will appear right here!",
      inviteBtn: "Invite friends to meet eligibility",
      inviteCopied: "Invite link copied to clipboard!",
      toastInviteCopied: "Club invite link copied!",
      toastInviteCopiedDesc: "Share this link with friends to join the club.",
      joinFeeDesc: "Fixed round contribution:",
      joinFeeBenefits: "Eligible to place bids for early pot and receive dividend yield distributed from other bidders.",
      approveAndJoinBtn: "Approve & Join",
      joinBtn: "Join Savings Club",
      contributeTitle: "Contribute Round {round}",
      contributeSubtitle: "Amount: {amount} USDC",
      contributedBadge: "Contributed",
      contributeBtn: "Contribute {amount} USDC",
      bidTitle: "Bid for Pot early",
      bidDesc: "Highest bidder wins this round's Pot. Total bids are distributed equally among unawarded members.",
      placeBidBtn: "Place Bid",
      approveBidBtn: "Approve Bid",
      settleBtn: "Settle Round (callable by anyone)",
      wonNoticeTitle: "You won your round!",
      wonNoticeDesc: "Please check your claimable payout under Your Status.",
      kickedNoticeTitle: "You have been kicked from the club",
      kickedNoticeDesc: "Due to defaulting on round contribution deadline.",
      completedNotice: "The savings club has completed all rounds.",
      activeNotMemberNotice: "The club is active and not accepting new members.",
      loadingSign: "Sign in wallet...",
      loadingProcess: "Processing on-chain...",
    },
    roundHistory: {
      title: "Round History",
      desc: "List of settled and awarded rounds",
      settledCountBadge: "{count} rounds settled",
      loading: "Loading round history...",
      emptyTitle: "No rounds completed yet",
      emptyDesc: "When the first round settles, pot distribution details will appear here.",
      roundLabel: "Round {round}",
      settledBadge: "Settled",
      totalPotLabel: "Total Pot Won",
      winnerLabel: "Round Winner",
      youBadge: "You!",
      bidYieldLabel: "Total Bid Yield Distributed",
    },
    howItWorks: {
      badge: "OPERATIONAL PROCESS",
      title: "How Trustless Tontine Works",
      secBadge: "100% On-chain Security",
      step1Title: "Join the Club",
      step1Desc: "Pick a savings club with matching contribution and duration. Connect Arc Testnet wallet and join.",
      step1Badge: "Join",
      step2Title: "Contribute Each Round",
      step2Desc: "Each round (1 day), all members contribute fixed 10 USDC into the secure smart contract escrow.",
      step2Badge: "Deposit",
      step3Title: "Bid for the Pot",
      step3Desc: "Members needing liquidity early place bids. Highest bidder wins the entire round's Pot.",
      step3Badge: "Bid",
      step4Title: "Settle & Distribute",
      step4Desc: "Winner's bid is distributed as dividends equally among members who haven't taken the pot.",
      step4Badge: "Payout",
      safetyTitle: "Default-proof — Smart Fund Protection",
      safetyDesc: "Smart contract automatically kicks defaulting members from subsequent rounds, retaining prior funds to offset club risk. All payouts are pull-based directly to your wallet.",
    },
    createClubModal: {
      title: "Create New Savings Club",
      desc: "Deploy decentralized rotating savings contract on Arc Testnet",
      nameLabel: "Club Name",
      namePlaceholder: "e.g. Family Savings, Monthly Susu...",
      nameError: "Club name cannot be empty (max 32 characters).",
      amountLabel: "Contribution per round (USDC)",
      amountSublabel: "USDC 6 decimals",
      amountPlaceholder: "Enter other amount (e.g. 15, 25.5)",
      amountError: "Contribution amount must be greater than 0 USDC.",
      membersLabel: "Max members (2 - 20 members)",
      membersSuffix: "members",
      membersMin: "2 members",
      membersStandard: "10 members (standard)",
      membersMax: "20 members",
      membersError: "Member count must be between 2 and 20.",
      durationLabel: "Round Duration",
      durationPresets: {
        "3600": { label: "1 hour", hint: "Test" },
        "86400": { label: "1 day", hint: "Popular" },
        "259200": { label: "3 days", hint: "Moderate" },
        "604800": { label: "7 days", hint: "1 week" },
      },
      potSummaryTitle: "Estimated Club Overview",
      potSummaryLabel: "Max Pot per round",
      cycleSummaryLabel: "Total Cycle Duration",
      cycleSummarySublabel: "(Entire cycle)",
      ownerBenefitTitle: "Owner Privileges:",
      ownerBenefitDesc: "You will be 100% Club Owner, with rights to start rounds when capacity is reached and manage contract on-chain.",
      deployBtn: "Deploy Savings Club",
      pendingBtn: "Awaiting wallet signature...",
      confirmingBtn: "Deploying on blockchain...",
      deployHint: "Deploy smart contract directly to Arc Testnet via your Web3 wallet",
    },
    clubDirectoryModal: {
      title: "Savings Club Directory",
      desc: "Savings Clubs Directory on Arc Testnet",
      featuredBadge: "Featured",
      currentBadge: "Current",
      switchBtn: "Switch Club",
      currentBtn: "Current",
      createShortcutBtn: "+ Create Club",
      clubsAvailable: "{count} savings clubs available",
      emptyList: "No savings clubs found in directory.",
      copyAddrSuccess: "Club address copied to clipboard!",
      copyAddrFail: "Failed to copy address.",
      switchedToast: "Switched to club {name}!",
    },
    ownerControls: {
      title: "Club Owner Controls",
      badge: "Owner",
      desc: "You are the owner of this club. Once there are at least 2 members, you can start the rounds or cancel while open.",
      startBtn: "Start Rounds",
      cancelBtn: "Cancel Club",
      need2MembersHint: "Need at least 2 members to start",
      transferTitle: "Ownership Transfer",
      transferDesc: "Your wallet is nominated as Owner for this club. Click below to accept ownership and gain full controls.",
      acceptBtn: "Accept Ownership",
      toastStartSuccess: "Started rounds successfully!",
      toastCancelSuccess: "Club cancelled successfully!",
      toastOwnerActionSuccess: "Owner action successful!",
    },
    common: {
      days: "days",
      hours: "hours",
      rounds: "rounds",
      viewOnExplorer: "View on explorer",
    },
  },
};

/**
 * Helper lấy chuỗi dịch theo key path dạng 'header.appName'
 */
export function t(keyPath: string, lang: Language = "vi"): string {
  const parts = keyPath.split(".");
  let cur: any = translations[lang];
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in cur) {
      cur = cur[p];
    } else {
      // Fallback sang tiếng Việt nếu thiếu
      let fallbackCur: any = translations.vi;
      for (const fp of parts) {
        if (fallbackCur && typeof fallbackCur === "object" && fp in fallbackCur) {
          fallbackCur = fallbackCur[fp];
        } else {
          return keyPath;
        }
      }
      return typeof fallbackCur === "string" ? fallbackCur : keyPath;
    }
  }
  return typeof cur === "string" ? cur : keyPath;
}
