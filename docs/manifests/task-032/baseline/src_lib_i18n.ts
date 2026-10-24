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
    tabHome: string;
    tabApp: string;
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
    unawardedMembers: string;
    unawardedCount: string;
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
    cancelledTitle: string;
    cancelledHint: string;
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
    contributeActionRequired: string;
    contributeFixedAmount: string;
    contributeCardDesc: string;
    contributedConfirmed: string;
    contributedTitle: string;
    bidTitle: string;
    bidDesc: string;
    placeBidBtn: string;
    approveBidBtn: string;
    settleBtn: string;
    countdownLabel: string;
    fairWarning: string;
    earlySettleBtn: string;
    settleNowBtn: string;
    winnerHonoredTitle: string;
    winnerOfficialNotice: string;
    winnerNoPayNotice: string;
    deadHuiTitle: string;
    deadHuiBadge: string;
    deadHuiDesc: string;
    deadHuiContributed: string;
    exclusiveBiddingNotice: string;
    exclusiveBiddingDesc: string;
    exploreOtherClubsBtn: string;
    createNewClubBtn: string;
    wonNoticeTitle: string;
    wonNoticeDesc: string;
    kickedNoticeTitle: string;
    kickedNoticeDesc: string;
    completedNotice: string;
    activeNotMemberNotice: string;
    loadingSign: string;
    loadingProcess: string;
    cancelledTitle: string;
    cancelledDesc: string;
    cancelledNavHint: string;
    approveToContributeBtn: string;
    approveToContributeDeadHuiBtn: string;
    roundExpiredNotice: string;
    roundExpiredDesc: string;
    roundExpiredDeadHuiNotice: string;
    roundExpiredDeadHuiDesc: string;
    roundExpiredBtn: string;
    claimReadyTitle: string;
    claimReadyDesc: string;
    claimNowBtn: string;
    claimingPayout: string;
    confirmedBidLabel: string;
    confirmedBidBadge: string;
    leadingPotBadge: string;
    outbidBadge: string;
    raiseBidToggle: string;
    raiseBidCollapse: string;
    raiseBidDesc: string;
    raiseBidBtn: string;
    raiseBidMustBeHigher: string;
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
    noWinnerBadge: string;
    noWinnerRefundDesc: string;
  };
  roster: {
    title: string;
    desc: string;
    memberCount: string;
    colMember: string;
    colContrib: string;
    colBid: string;
    colStatus: string;
    youBadge: string;
    ownerBadge: string;
    contributedBadge: string;
    waitingContribBadge: string;
    noBidBadge: string;
    highestBidderBadge: string;
    activeStatus: string;
    wonRoundStatus: string;
    kickedStatus: string;
    awardedRoundBadge: string;
    awardedGeneralBadge: string;
    emptyList: string;
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
    clearOldClubsBtn: string;
    clearOldClubsSuccess: string;
    clearOldClubsEmpty: string;
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
  guideModal: {
    title: string;
    subtitle: string;
    closeBtn: string;
    pillar1Title: string;
    pillar1Desc: string;
    pillar2Title: string;
    pillar2Subtitle: string;
    tradTitle: string;
    tradRisk1: string;
    tradRisk2: string;
    tradRisk3: string;
    smartTitle: string;
    smartBenefit1: string;
    smartBenefit2: string;
    smartBenefit3: string;
    pillar3Title: string;
    pillar3Subtitle: string;
    step1Title: string;
    step1Desc: string;
    step2Title: string;
    step2Desc: string;
    step3Title: string;
    step3Desc: string;
    step4Title: string;
    step4Desc: string;
    pillar4Title: string;
    pillar4Desc: string;
    pillar5Title: string;
    pillar5Desc: string;
  };
  landingPage: {
    badge: string;
    heroTitle: string;
    heroDesc: string;
    metric1Val: string;
    metric1Label: string;
    metric2Val: string;
    metric2Label: string;
    metric3Val: string;
    metric3Label: string;
    launchAppBtn: string;
    createClubBtn: string;
    guideBtn: string;
    problemTitle: string;
    problemSubtitle: string;
    painPoint1Title: string;
    painPoint1Desc: string;
    painPoint2Title: string;
    painPoint2Desc: string;
    painPoint3Title: string;
    painPoint3Desc: string;
    solution1Title: string;
    solution1Desc: string;
    solution2Title: string;
    solution2Desc: string;
    solution3Title: string;
    solution3Desc: string;
    howItWorksTitle: string;
    howItWorksSubtitle: string;
    step1Title: string;
    step1Desc: string;
    step2Title: string;
    step2Desc: string;
    step3Title: string;
    step3Desc: string;
    step4Title: string;
    step4Desc: string;
    featuredTitle: string;
    featuredSubtitle: string;
    enterClubBtn: string;
    securityTitle: string;
    securitySubtitle: string;
    secFeature1Title: string;
    secFeature1Desc: string;
    secFeature2Title: string;
    secFeature2Desc: string;
    secFeature3Title: string;
    secFeature3Desc: string;
    faqTitle: string;
    faqSubtitle: string;
    q1: string;
    a1: string;
    q2: string;
    a2: string;
    q3: string;
    a3: string;
    q4: string;
    a4: string;
    q5: string;
    a5: string;
    footerDesc: string;
    allRightsReserved: string;
  };
}

export const translations: Record<Language, Translations> = {
  vi: {
    header: {
      appName: "HụiChain",
      appDesc: "Trustless Rotating Savings Club on Arc Network",
      directoryBtn: "Danh sách nhóm",
      createBtn: "Tạo nhóm",
      guideBtn: "Hướng dẫn",
      explorerBtn: "Explorer",
      connectWallet: "Kết nối ví",
      switchLang: "VI 🇻🇳",
      tabHome: "Trang chủ",
      tabApp: "Ứng dụng",
    },
    groupSwitcher: {
      title: "Hợp đồng nhóm hụi",
      directoryBtn: "Danh sách nhóm",
      createBtn: "Tạo nhóm mới",
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
      unawardedMembers: "Thành viên chờ hốt",
      unawardedCount: "chờ hốt",
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
      cancelledTitle: "Nhóm hụi đã bị huỷ",
      cancelledHint: "Hợp đồng đã giải tán an toàn, không còn thành viên hoạt động.",
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
      contributeActionRequired: "Cần đóng tiền",
      contributeFixedAmount: "Mức đóng cố định",
      contributeCardDesc: "Đóng phần hụi của bạn trong vòng này để mở quyền đấu giá nhận Pot và không bị phạt.",
      contributedConfirmed: "Đã xác nhận on-chain",
      contributedTitle: "Đã đóng góp vòng {round}",
      bidTitle: "Đặt bid để nhận pot sớm",
      bidDesc: "Bid cao nhất sẽ nhận Pot vòng này. Toàn bộ tiền bid được chia đều cho các thành viên chưa hốt.",
      placeBidBtn: "Đặt bid",
      approveBidBtn: "Approve bid",
      settleBtn: "Kết thúc vòng (ai cũng gọi được)",
      countdownLabel: "Thời gian đấu giá còn lại",
      fairWarning: "Đang trong thời gian đấu giá (còn {countdown}). Còn {remainingBidders} thành viên chưa đặt giá.",
      earlySettleBtn: "Kết thúc sớm (Tất cả thành viên đã đặt bid)",
      settleNowBtn: "Kết thúc vòng ngay (ai cũng gọi được)",
      winnerHonoredTitle: "🏆 Bạn đã hốt hụi vòng {round}!",
      winnerOfficialNotice: "Bạn vẫn là thành viên chính thức của nhóm và tiếp tục đồng hành cùng các thành viên còn lại cho đến khi hoàn thành đủ {totalRounds} vòng.",
      winnerNoPayNotice: "Bạn không cần đóng thêm tiền và không tham gia đấu giá ở các vòng tiếp theo.",
      deadHuiTitle: "Đóng hụi chết",
      deadHuiBadge: "Hụi chết (Bắt buộc)",
      deadHuiDesc: "Bạn đã nhận Pot ở vòng trước. Bạn có nghĩa vụ tiếp tục đóng góp theo đúng nguyên lý hụi truyền thống.",
      deadHuiContributed: "Đã đóng hụi chết vòng này",
      exclusiveBiddingNotice: "Quyền đấu giá thuộc về các thành viên chưa hốt",
      exclusiveBiddingDesc: "Bạn đã nhận Pot ở vòng trước. Vui lòng nhường quyền đấu giá cho các thành viên đang chờ lượt.",
      exploreOtherClubsBtn: "+ Khám phá nhóm khác",
      createNewClubBtn: "+ Tạo nhóm mới",
      wonNoticeTitle: "Bạn đã thắng vòng của mình!",
      wonNoticeDesc: "Vui lòng kiểm tra số tiền thưởng có thể nhận trong phần Trạng thái thành viên.",
      kickedNoticeTitle: "Bạn đã bị loại khỏi nhóm",
      kickedNoticeDesc: "Do không đóng góp đúng hạn theo chu kỳ của vòng.",
      completedNotice: "Nhóm hụi đã hoàn thành tất cả các vòng.",
      activeNotMemberNotice: "Nhóm đang diễn ra các vòng, không nhận thêm thành viên mới.",
      loadingSign: "Xác nhận trong ví...",
      loadingProcess: "Đang xử lý...",
      cancelledTitle: "Nhóm hụi đã bị huỷ",
      cancelledDesc: "Nhóm hụi đã được huỷ bởi Chủ nhóm trong giai đoạn đăng ký. Toàn bộ người dùng đã rời nhóm an toàn, không có tài sản nào bị giam giữ và hợp đồng đã đóng vĩnh viễn.",
      cancelledNavHint: "Bạn có thể sử dụng các nút điều hướng phía trên (Danh sách nhóm hoặc Tạo nhóm mới) để khám phá hoặc khởi tạo nhóm hụi khác.",
      approveToContributeBtn: "Approve USDC để đóng tiền",
      approveToContributeDeadHuiBtn: "Approve USDC để đóng hụi chết",
      roundExpiredNotice: "Hết hạn nộp tiền vòng này",
      roundExpiredDesc: "Thời gian đóng góp của vòng này đã kết thúc. Cổng nộp tiền đã đóng, vui lòng bấm 'Kết thúc vòng' bên dưới để tất toán và sang vòng mới.",
      roundExpiredDeadHuiNotice: "Hết hạn đóng hụi chết vòng này",
      roundExpiredDeadHuiDesc: "Thời gian đóng hụi chết của vòng này đã kết thúc. Cổng nộp tiền đã đóng, vui lòng bấm 'Kết thúc vòng' bên dưới.",
      roundExpiredBtn: "Đã hết giờ đóng tiền — Bấm kết thúc bên dưới",
      claimReadyTitle: "🎉 Tiền Thưởng Sẵn Sàng Rút!",
      claimReadyDesc: "Tiền trúng hụi & thưởng cổ tức tích lũy",
      claimNowBtn: "Rút {amount} USDC ngay",
      claimingPayout: "Đang rút tiền...",
      confirmedBidLabel: "Mức bid của bạn:",
      confirmedBidBadge: "✓ Đã đặt giá",
      leadingPotBadge: "🏆 Đang dẫn đầu Pot!",
      outbidBadge: "⚠️ Đã bị vượt qua (Cao nhất: {amount} USDC)",
      raiseBidToggle: "+ Nâng mức giá (Nâng bid)",
      raiseBidCollapse: "▲ Thu gọn khung nâng bid",
      raiseBidDesc: "Nhập mức bid mới cao hơn {userBid} USDC. Bạn chỉ thanh toán thêm phần chênh lệch.",
      raiseBidBtn: "Nâng bid lên {amount} USDC",
      raiseBidMustBeHigher: "Phải lớn hơn {userBid} USDC",
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
      noWinnerBadge: "Không có người thắng — Đã hoàn trả 100%",
      noWinnerRefundDesc: "Vòng kết thúc không có người thắng hợp lệ. Toàn bộ tiền đóng góp và tiền bid đã được hoàn trả 100% vào số dư rút của từng thành viên.",
    },
    roster: {
      title: "Danh Sách Thành Viên & Tiến Độ",
      desc: "Theo dõi trực tiếp ai đã đóng tiền và mức đấu giá nhận pot trong vòng này",
      memberCount: "{count}/{max} thành viên",
      colMember: "Thành viên",
      colContrib: "Đóng tiền",
      colBid: "Đấu giá Pot",
      colStatus: "Trạng thái",
      youBadge: "Bạn",
      ownerBadge: "Chủ nhóm",
      contributedBadge: "Đã đóng",
      waitingContribBadge: "Chờ đóng",
      noBidBadge: "Chưa bid",
      highestBidderBadge: "Dẫn đầu",
      activeStatus: "Đang tham gia",
      wonRoundStatus: "Đã nhận pot",
      kickedStatus: "Bị loại",
      awardedRoundBadge: "🏆 Đã hốt vòng {round}",
      awardedGeneralBadge: "🏆 Đã hốt pot",
      emptyList: "Chưa có thành viên nào tham gia.",
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
      createShortcutBtn: "Tạo nhóm mới",
      clubsAvailable: "{count} nhóm hụi khả dụng",
      emptyList: "Chưa có nhóm nào trong danh sách.",
      copyAddrSuccess: "Đã sao chép địa chỉ nhóm!",
      copyAddrFail: "Không thể sao chép địa chỉ.",
      switchedToast: "Đã chuyển sang nhóm {name}!",
      clearOldClubsBtn: "Dọn dẹp nhóm cũ",
      clearOldClubsSuccess: "Đã dọn dẹp danh sách nhóm hụi cũ!",
      clearOldClubsEmpty: "Danh bạ hiện đã sạch sẽ, chỉ chứa các nhóm mặc định.",
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
    guideModal: {
      title: "Hướng dẫn sử dụng HụiChain",
      subtitle: "Mô hình Hụi Xoay Vòng (ROSCA) Trustless không cần niềm tin trên Arc Network",
      closeBtn: "Đóng",
      pillar1Title: "1. Bản chất Hụi Trustless trên Blockchain Arc",
      pillar1Desc: "Hụi (ROSCA / Susu / Tanda) là hình thức tiết kiệm và tương trợ vốn cộng đồng phổ biến toàn cầu. HụiChain chuyển đổi toàn bộ quy trình này lên Smart Contract trên Arc Network: tiền đóng hụi được khoá trong hợp đồng thông minh, không thông qua tài khoản cá nhân của chủ hụi, loại bỏ hoàn toàn nguy cơ chiếm đoạt hay thất thoát vốn.",
      pillar2Title: "2. So sánh Hụi Truyền Thống vs HụiChain Smart Contract",
      pillar2Subtitle: "Giải quyết triệt để vấn nạn bể hụi, bùng tiền nhờ công nghệ blockchain minh bạch",
      tradTitle: "Hụi Truyền Thống",
      tradRisk1: "Chủ hụi giữ tiền mặt, nguy cơ ôm quỹ bỏ trốn hoặc phá sản cao",
      tradRisk2: "Thành viên hốt hụi sớm có thể trốn đóng các kỳ sau, gây vỡ dây hụi",
      tradRisk3: "Sổ tay ghi chép dễ bị gian lận, tranh chấp khó giải quyết",
      smartTitle: "HụiChain Smart Contract",
      smartBenefit1: "Hợp đồng thông minh lưu giữ 100% USDC, không ai có thể rút tiền sai quy tắc",
      smartBenefit2: "Cơ chế đấu giá và tự động loại trừ (Auto-kick) bảo vệ thành viên chưa hốt",
      smartBenefit3: "Minh bạch 100% on-chain, thời gian thực thi tức thì dưới 1 giây trên Arc",
      pillar3Title: "3. Chu kỳ Vận hành 4 Bước",
      pillar3Subtitle: "Quy trình khép kín, minh bạch từ lúc đăng ký đến khi tất toán toàn bộ các vòng",
      step1Title: "Gia nhập nhóm (Registration)",
      step1Desc: "Chọn nhóm hụi phù hợp với mức đóng góp và chu kỳ. Thành viên approve USDC và ghi danh vào hợp đồng. Khi đủ tối thiểu 2 thành viên, Chủ nhóm kích hoạt mở Vòng 1.",
      step2Title: "Đóng tiền mỗi vòng (Contribution)",
      step2Desc: "Mỗi chu kỳ (ví dụ 7 ngày), các thành viên nạp định kỳ mức USDC cố định vào quỹ Pot chung. Quỹ Pot tích luỹ tự động trong hợp đồng.",
      step3Title: "Đấu giá nhận Pot (Bidding)",
      step3Desc: "Các thành viên cần vốn sớm đặt giá bid (chiết khấu). Người đặt bid cao nhất sẽ thắng Pot vòng đó. Toàn bộ tiền bid được chia đều làm lợi tức cho các thành viên chưa thắng.",
      step4Title: "Tất toán & Nhận thưởng (Claim Payout)",
      step4Desc: "Bất kỳ ai cũng có thể kích hoạt kết thúc vòng (Settle). Người thắng chủ động bấm \"Nhận tiền\" để rút toàn bộ quỹ Pot về ví an toàn.",
      pillar4Title: "4. Cơ chế Tự động Loại trừ (Auto-kick) Bảo vệ Nhóm",
      pillar4Desc: "Nếu một thành viên không đóng tiền đúng hạn khi chu kỳ vòng kết thúc, Smart Contract sẽ tự động đánh dấu Kicked (Loại khỏi nhóm) và tước quyền tham gia các vòng tiếp theo. Cơ chế này bảo vệ quyền lợi tuyệt đối cho các thành viên nghiêm túc còn lại.",
      pillar5Title: "5. Ưu thế Đột phá của Mạng Arc Network",
      pillar5Desc: "Arc Testnet sử dụng trực tiếp stablecoin USDC làm Gas Token, loại bỏ nhu cầu sở hữu ETH để trả phí mạng. Thời gian xác thực khối dưới 1 giây và phí giao dịch siêu rẻ (≈ 0 USDC) mang lại trải nghiệm mượt mà như Web2.",
    },
    landingPage: {
      badge: "Đổi mới DeFi trên Arc Testnet • Tài chính Vi mô Trustless",
      heroTitle: "Hụi Xoay Vòng Không Cần Niềm Tin Đầu Tiên Trên Arc Network",
      heroDesc: "Minh bạch 100% trên blockchain. Hợp đồng thông minh giám sát quỹ an toàn, loại bỏ vĩnh viễn nỗi lo chủ hụi giật hụi hay bùng tiền.",
      metric1Val: "100%",
      metric1Label: "On-Chain Smart Contract",
      metric2Val: "0",
      metric2Label: "Rủi ro Giật Hụi / Bùng Tiền",
      metric3Val: "< 1s",
      metric3Label: "Xác thực & Phí Gas USDC ≈ $0",
      launchAppBtn: "Vào ứng dụng ngay",
      createClubBtn: "+ Tạo nhóm mới",
      guideBtn: "Xem hướng dẫn",
      problemTitle: "Nỗi đau Bể Hụi Truyền Thống & Giải Pháp HụiChain",
      problemSubtitle: "Hàng nghìn tỷ đồng bốc hơi mỗi năm vì niềm tin đặt sai chỗ. Smart contract sinh ra để thay thế lòng tin bằng toán học.",
      painPoint1Title: "Chủ hụi ôm quỹ bỏ trốn",
      painPoint1Desc: "Hụi truyền thống phụ thuộc 100% vào uy tín chủ thảo. Khi chủ vỡ nợ hoặc lừa đảo, người chơi mất trắng tích luỹ.",
      painPoint2Title: "Bội tín không đóng tiếp",
      painPoint2Desc: "Người hốt hụi chót hoặc hốt sớm bùng tiền các kỳ sau, đẩy rủi ro sang những người chưa hốt.",
      painPoint3Title: "Tranh chấp không chứng từ",
      painPoint3Desc: "Ghi chép sổ tay dễ bị sửa chữa, tẩy xoá; thiếu cơ sở pháp lý rõ ràng khi xảy ra tranh chấp.",
      solution1Title: "Hợp đồng giữ tiền 100%",
      solution1Desc: "Toàn bộ tiền nạp được khoá trực tiếp trong Smart Contract. Không ai, kể cả chủ nhóm, có thể rút tiền trái luật.",
      solution2Title: "Cơ chế phạt Auto-kick",
      solution2Desc: "Smart contract tự động phát hiện và loại bỏ thành viên trễ hạn, bảo toàn quỹ hụi cho tập thể.",
      solution3Title: "Sổ cái Arc minh bạch",
      solution3Desc: "Mọi giao dịch đóng tiền, đặt bid và rút pot đều được ghi nhận công khai, bất biến trên Arc Explorer.",
      howItWorksTitle: "Cách Thức Hoạt Động 4 Bước Đơn Giản",
      howItWorksSubtitle: "Trực quan, dễ hiểu cho bất kỳ ai — từ người mới bắt đầu đến chuyên gia DeFi",
      step1Title: "1. Tham gia hoặc Tạo nhóm",
      step1Desc: "Chọn nhóm hụi với mức đóng phù hợp hoặc tự khởi tạo nhóm mới chỉ với 1 cú click.",
      step2Title: "2. Đóng góp USDC định kỳ",
      step2Desc: "Nạp số tiền USDC cố định mỗi chu kỳ. Hợp đồng tích lũy thành Quỹ Pot chung tự động.",
      step3Title: "3. Đấu giá Bidding nhận Pot",
      step3Desc: "Ai cần vốn sớm đặt giá bid. Người bid cao nhất nhận Pot, tiền bid chia đều cho người chưa hốt.",
      step4Title: "4. Tất toán & Rút tiền về ví",
      step4Desc: "Kết thúc vòng, người thắng bấm rút tiền về ví an toàn trong chưa đầy 1 giây.",
      featuredTitle: "Nhóm Hụi Cộng Đồng Nổi Bật",
      featuredSubtitle: "Khám phá các nhóm hụi mẫu đang hoạt động trên Arc Testnet",
      enterClubBtn: "Vào nhóm ngay",
      securityTitle: "Bảo Mật Cấp Tổ Chức & Hạ Tầng Arc Network",
      securitySubtitle: "Xây dựng trên nền tảng công nghệ tài chính phi tập trung hiện đại",
      secFeature1Title: "USDC Stablecoin Chuẩn Hoá",
      secFeature1Desc: "Sử dụng đồng dollar kỹ thuật số USDC của Circle, bảo toàn giá trị vốn góp không bị biến động.",
      secFeature2Title: "Phí Gas Bằng USDC & Tốc Độ < 1s",
      secFeature2Desc: "Không cần mua token native để trả phí gas. Trực tiếp trả phí bằng lượng nhỏ USDC với tốc độ cực nhanh.",
      secFeature3Title: "Hỗ Trợ Ví Passkey & Web3",
      secFeature3Desc: "Đăng nhập tiện lợi bằng sinh trắc học vân tay / FaceID qua Passkey hoặc kết nối ví MetaMask tuỳ chọn.",
      faqTitle: "Câu Hỏi Thường Gặp (FAQ)",
      faqSubtitle: "Mọi thắc mắc của bạn về HụiChain được giải đáp chi tiết tại đây",
      q1: "HụiChain là gì và tại sao an toàn hơn hụi truyền thống?",
      a1: "HụiChain là nền tảng Hụi Xoay Vòng (ROSCA) phi tập trung trên Arc Network. Thay vì đưa tiền cho chủ hụi giữ, toàn bộ tiền được khoá trong Smart Contract độc lập. Hợp đồng tự động thực thi luật chơi bằng mã code bất biến, không ai có thể can thiệp hay ôm tiền bỏ trốn.",
      q2: "Nếu chủ nhóm biến mất thì nhóm hụi có bị mất tiền không?",
      a2: "Không bao giờ. Chủ nhóm chỉ có quyền tạo nhóm và mở vòng 1 ban đầu. Khi vòng đã bắt đầu, hợp đồng hoạt động hoàn toàn tự trị. Bất kỳ ai cũng có thể gọi hàm Kết thúc vòng (Settle) và người thắng tự rút tiền về ví mà không phụ thuộc chủ nhóm.",
      q3: "Lợi tức từ việc tham gia HụiChain đến từ đâu?",
      a3: "Khi người cần vốn đặt giá bid để được nhận Pot sớm, toàn bộ số tiền bid đó không bị đốt mà được chia đều trực tiếp cho tất cả các thành viên chưa nhận pot trong vòng đó. Người nhận pot càng muộn càng được nhận nhiều tiền lãi từ các vòng trước.",
      q4: "Điều gì xảy ra nếu một thành viên không đóng tiền đúng hạn?",
      a4: "Smart Contract có cơ chế phạt tự động (Auto-kick). Khi vòng kết thúc, thành viên chưa đóng tiền sẽ bị đánh dấu loại khỏi nhóm và mất quyền tham gia các vòng tiếp theo, ngăn ngừa nguy cơ làm gián đoạn chuỗi hụi.",
      q5: "Tôi cần chuẩn bị những gì để bắt đầu tham gia?",
      a5: "Bạn chỉ cần một chiếc ví Web3 (như MetaMask) hoặc sử dụng tính năng tạo ví Passkey bằng vân tay ngay trên ứng dụng, cùng một ít USDC trên mạng Arc Testnet để đóng tiền và trả phí gas siêu rẻ.",
      footerDesc: "Nền tảng Hụi Xoay Vòng Không Cần Niềm Tin (Trustless ROSCA) tiên phong trên Arc Network.",
      allRightsReserved: "Bảo lưu mọi quyền.",
    },
  },
  en: {
    header: {
      appName: "HụiChain",
      appDesc: "Trustless Rotating Savings Club on Arc Network",
      directoryBtn: "Club Directory",
      createBtn: "Create Club",
      guideBtn: "Guide",
      explorerBtn: "Explorer",
      connectWallet: "Connect Wallet",
      switchLang: "EN 🇬🇧",
      tabHome: "Home",
      tabApp: "Savings Clubs",
    },
    groupSwitcher: {
      title: "SAVINGS CLUB CONTRACT",
      directoryBtn: "Club Directory",
      createBtn: "Create Club",
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
      unawardedMembers: "Unawarded Members",
      unawardedCount: "unawarded",
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
      cancelledTitle: "Savings Club Cancelled",
      cancelledHint: "Contract dissolved safely with no active members.",
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
      contributeActionRequired: "Action Required",
      contributeFixedAmount: "Fixed amount",
      contributeCardDesc: "Contribute your share for this round to qualify for pot bidding and avoid penalty.",
      contributedConfirmed: "Confirmed on-chain",
      contributedTitle: "Contributed Round {round}",
      bidTitle: "Bid for Pot early",
      bidDesc: "Highest bidder wins this round's Pot. Total bids are distributed equally among unawarded members.",
      placeBidBtn: "Place Bid",
      approveBidBtn: "Approve Bid",
      settleBtn: "Settle Round (callable by anyone)",
      countdownLabel: "Auction countdown",
      fairWarning: "Auction round in progress ({countdown} left). {remainingBidders} members have not placed bids yet.",
      earlySettleBtn: "Early Settle (All bids placed)",
      settleNowBtn: "Settle Round Now (callable by anyone)",
      winnerHonoredTitle: "🏆 You were awarded Round {round} Pot!",
      winnerOfficialNotice: "You remain an official club member and continue journeying with fellow members until all {totalRounds} rounds are completed.",
      winnerNoPayNotice: "You do not need to contribute further or participate in subsequent auctions.",
      deadHuiTitle: "Dead Hui Contribution",
      deadHuiBadge: "Dead Hui (Mandatory)",
      deadHuiDesc: "You received the pot in a previous round. You are required to continue contributing under ROSCA rules.",
      deadHuiContributed: "Dead hui contributed for this round",
      exclusiveBiddingNotice: "Bidding is reserved for unawarded members",
      exclusiveBiddingDesc: "You already won a pot in a previous round. Bidding is exclusively reserved for unawarded members.",
      exploreOtherClubsBtn: "+ Explore Other Clubs",
      createNewClubBtn: "+ Create New Club",
      wonNoticeTitle: "You won your round!",
      wonNoticeDesc: "Please check your claimable payout under Your Status.",
      kickedNoticeTitle: "You have been kicked from the club",
      kickedNoticeDesc: "Due to defaulting on round contribution deadline.",
      completedNotice: "The savings club has completed all rounds.",
      activeNotMemberNotice: "The club is active and not accepting new members.",
      loadingSign: "Sign in wallet...",
      loadingProcess: "Processing on-chain...",
      cancelledTitle: "Savings Club Cancelled",
      cancelledDesc: "The savings club was cancelled by the club owner during the registration phase. All members have exited safely, no assets are locked, and the contract is permanently closed.",
      cancelledNavHint: "You can use the navigation buttons above (Club Directory or Create Club) to explore or create another savings club.",
      approveToContributeBtn: "Approve USDC to Contribute",
      approveToContributeDeadHuiBtn: "Approve USDC to Contribute Dead Hui",
      roundExpiredNotice: "Round contribution deadline ended",
      roundExpiredDesc: "The contribution period for this round has ended. The deposit gate is closed, please click 'Settle Round' below to conclude and advance to the next round.",
      roundExpiredDeadHuiNotice: "Dead hui contribution deadline ended",
      roundExpiredDeadHuiDesc: "The dead hui contribution window for this round has ended. Deposit gate is closed, please click 'Settle Round' below.",
      roundExpiredBtn: "Contribution deadline ended — Settle below",
      claimReadyTitle: "🎉 Claimable Payout Ready!",
      claimReadyDesc: "Round Pot winnings & dividend rewards",
      claimNowBtn: "Claim {amount} USDC Now",
      claimingPayout: "Claiming payout...",
      confirmedBidLabel: "Your Confirmed Bid:",
      confirmedBidBadge: "✓ Bid Placed",
      leadingPotBadge: "🏆 Leading the Pot!",
      outbidBadge: "⚠️ Outbid (Highest: {amount} USDC)",
      raiseBidToggle: "+ Raise Bid to higher amount",
      raiseBidCollapse: "▲ Collapse raise form",
      raiseBidDesc: "Enter new bid higher than {userBid} USDC. You only pay the difference.",
      raiseBidBtn: "Raise Bid to {amount} USDC",
      raiseBidMustBeHigher: "Must be > {userBid} USDC",
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
      noWinnerBadge: "No Winner — 100% Refunded",
      noWinnerRefundDesc: "Round ended with no eligible winner. All contributions and bids have been 100% refunded to members' claimable balance.",
    },
    roster: {
      title: "Club Members & Live Tracker",
      desc: "Real-time visibility into who contributed and who placed bids for this round",
      memberCount: "{count}/{max} members",
      colMember: "Member",
      colContrib: "Contribution",
      colBid: "Pot Bid",
      colStatus: "Status",
      youBadge: "You",
      ownerBadge: "Owner",
      contributedBadge: "Contributed",
      waitingContribBadge: "Pending",
      noBidBadge: "No bid",
      highestBidderBadge: "Highest Bidder",
      activeStatus: "Active",
      wonRoundStatus: "Won Pot",
      kickedStatus: "Kicked",
      awardedRoundBadge: "🏆 Awarded Round {round}",
      awardedGeneralBadge: "🏆 Won Pot",
      emptyList: "No members joined yet.",
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
      createShortcutBtn: "Create Club",
      clubsAvailable: "{count} savings clubs available",
      emptyList: "No savings clubs found in directory.",
      copyAddrSuccess: "Club address copied to clipboard!",
      copyAddrFail: "Failed to copy address.",
      switchedToast: "Switched to club {name}!",
      clearOldClubsBtn: "Clear old clubs",
      clearOldClubsSuccess: "Cleaned up old savings clubs!",
      clearOldClubsEmpty: "Directory is already clean with default clubs.",
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
    guideModal: {
      title: "HụiChain User Guide",
      subtitle: "Trustless Rotating Savings and Credit Association (ROSCA) on Arc Network",
      closeBtn: "Close",
      pillar1Title: "1. The Essence of Trustless Microfinance on Arc Blockchain",
      pillar1Desc: "Tontine / ROSCA (known as Susu, Tanda, Chit Fund, or Hụi) is a time-tested community microfinance model worldwide. HụiChain migrates this entire mechanism to smart contracts on Arc Network: contributions are locked directly in the smart contract, bypassing individual custodial accounts and permanently eradicating fund misappropriation and default risks.",
      pillar2Title: "2. Traditional Tontine vs HụiChain Smart Contract",
      pillar2Subtitle: "Eliminating tontine collapse and fraud through decentralized, immutable blockchain technology",
      tradTitle: "Traditional Tontine",
      tradRisk1: "Organizer holds physical cash; high risk of embezzlement, bankruptcy, or disappearance",
      tradRisk2: "Early pot winners may default on future contributions, breaking the chain for others",
      tradRisk3: "Manual paper records are prone to alteration, fraud, and unresolvable disputes",
      smartTitle: "HụiChain Smart Contract",
      smartBenefit1: "Smart contracts custody 100% of USDC funds; no one can withdraw outside contract rules",
      smartBenefit2: "Transparent bidding and auto-kick mechanisms protect unawarded savers",
      smartBenefit3: "100% on-chain transparency with sub-second execution on Arc Network",
      pillar3Title: "3. The 4-Step Lifecycle",
      pillar3Subtitle: "A seamless, transparent loop from registration to final round settlement",
      step1Title: "Join or Create Club (Registration)",
      step1Desc: "Choose a savings club that matches your desired contribution and cycle. Members approve USDC and register into the contract. Once at least 2 members have joined, the owner triggers Round 1.",
      step2Title: "Periodic Contribution",
      step2Desc: "Each round cycle (e.g. 7 days), all members deposit their fixed USDC contribution into the shared Pot. The Pot accumulates automatically inside the contract.",
      step3Title: "Auction Bidding",
      step3Desc: "Members in need of early capital submit bids (discount). The highest bidder wins that round's Pot. The bid amount is distributed equally as dividend yield among all unawarded members.",
      step4Title: "Settlement & Payout Claim",
      step4Desc: "Anyone can settle the completed round. The winner clicks \"Claim Payout\" to withdraw the full pot directly to their wallet safely and instantly.",
      pillar4Title: "4. Automatic Default Protection (Auto-kick)",
      pillar4Desc: "If a member fails to contribute before the round deadline, the smart contract automatically flags them as Kicked and revokes their eligibility for future rounds, safeguarding the remaining savers.",
      pillar5Title: "5. Groundbreaking Advantages of Arc Network",
      pillar5Desc: "Arc Testnet natively utilizes USDC as the gas token, removing the need for native ETH tokens. Sub-second block finality and near-zero transaction fees (≈ $0) deliver a smooth Web2-like user experience.",
    },
    landingPage: {
      badge: "Arc Testnet DeFi Innovation • Trustless Microfinance",
      heroTitle: "The First Trustless Rotating Savings Club on Arc Network",
      heroDesc: "100% on-chain transparency. Smart contracts custody funds securely, permanently eliminating tontine defaults and organizer fraud.",
      metric1Val: "100%",
      metric1Label: "On-Chain Smart Contract",
      metric2Val: "0",
      metric2Label: "Default & Fraud Risk",
      metric3Val: "< 1s",
      metric3Label: "Confirmation & USDC Gas ≈ $0",
      launchAppBtn: "Launch App",
      createClubBtn: "+ Create Club",
      guideBtn: "View Guide",
      problemTitle: "The Pain of Traditional Tontines & HụiChain's Solution",
      problemSubtitle: "Billions of dollars are lost every year to broken trust. Smart contracts replace blind trust with transparent mathematics.",
      painPoint1Title: "Organizer Exit Scams",
      painPoint1Desc: "Traditional clubs rely 100% on individual organizers. When organizers go bankrupt or flee, savers lose everything.",
      painPoint2Title: "Early Winner Defaults",
      painPoint2Desc: "Members who take early pots often default on future rounds, shifting the financial burden to remaining members.",
      painPoint3Title: "Disputes & Lack of Records",
      painPoint3Desc: "Paper ledgers are easily forged or lost, leaving savers with no legal recourse or proof of payments.",
      solution1Title: "100% Contract Custody",
      solution1Desc: "All deposits are locked inside the smart contract. No one, not even the club owner, can touch funds unlawfully.",
      solution2Title: "Automated Auto-kick Defense",
      solution2Desc: "The smart contract automatically detects and expels defaulting members, protecting the collective pot.",
      solution3Title: "Transparent Arc Ledger",
      solution3Desc: "Every deposit, bid, and payout is permanently verifiable and immutable on the Arc Testnet Explorer.",
      howItWorksTitle: "How It Works in 4 Simple Steps",
      howItWorksSubtitle: "Intuitive and straightforward for everyone — from newcomers to DeFi veterans",
      step1Title: "1. Join or Create a Club",
      step1Desc: "Select an existing savings club with suitable terms, or deploy your own custom club with 1 click.",
      step2Title: "2. Periodic USDC Contribution",
      step2Desc: "Contribute fixed USDC each round. The contract accumulates the collective pot automatically.",
      step3Title: "3. Place Bids for the Pot",
      step3Desc: "Bid to take the pot early. The highest bidder receives the pot, and their bid is distributed to peers.",
      step4Title: "4. Settle & Claim Payout",
      step4Desc: "When the round ends, the winner claims their payout directly to their wallet in under 1 second.",
      featuredTitle: "Featured Community Savings Clubs",
      featuredSubtitle: "Explore verified default savings clubs active on Arc Testnet",
      enterClubBtn: "Join Club",
      securityTitle: "Institutional Security & Arc Network Infrastructure",
      securitySubtitle: "Built on battle-tested decentralized microfinance engineering",
      secFeature1Title: "Standardized Circle USDC",
      secFeature1Desc: "Powered by Circle's trusted digital dollar USDC, preserving savings value without volatility.",
      secFeature2Title: "USDC Native Gas & Sub-Second Latency",
      secFeature2Desc: "No need for native gas tokens. Directly pay micro-fees in USDC with instant confirmation times.",
      secFeature3Title: "Passkey MPC & Web3 Wallet Support",
      secFeature3Desc: "Effortlessly log in with biometric FaceID / fingerprint passkeys or connect your favorite Web3 wallet.",
      faqTitle: "Frequently Asked Questions (FAQ)",
      faqSubtitle: "Everything you need to know about HụiChain answered in detail",
      q1: "What is HụiChain and why is it safer than traditional tontines?",
      a1: "HụiChain is a trustless Rotating Savings and Credit Association (ROSCA) platform on Arc Network. Instead of entrusting funds to an organizer, all USDC contributions are locked in an autonomous smart contract that strictly executes immutable game rules without counterparty risk.",
      q2: "What happens if the club creator disappears?",
      a2: "Nothing is lost. The creator only creates the club and initiates Round 1. Once active, the contract is fully autonomous. Anyone can trigger round settlement, and winners pull their payouts directly without needing the creator.",
      q3: "How does the dividend yield from bidding work?",
      a3: "When a saver bids to take the pot early, their bid amount is divided equally among all members who haven't yet won a pot. Members who wait for later rounds earn cumulative yields from earlier bidders.",
      q4: "What happens if a member fails to contribute on time?",
      a4: "The smart contract features an automatic expulsion (Auto-kick) mechanism. Defaulting members are excluded from future participation, preventing disruption to the savings cycle.",
      q5: "What do I need to get started?",
      a5: "All you need is a Web3 wallet (such as MetaMask) or create an instant biometric Passkey wallet on the app, along with a small amount of USDC on Arc Testnet to contribute and cover micro gas fees.",
      footerDesc: "Pioneering Trustless Rotating Savings and Credit Association (ROSCA) on Arc Network.",
      allRightsReserved: "All rights reserved.",
    },
  },
};

/**
 * Helper lấy chuỗi dịch theo key path dạng 'header.appName'
 */
export function t(keyPath: string, lang: Language = "vi"): string {
  const parts = keyPath.split(".");
  let cur: Record<string, unknown> | unknown = translations[lang];
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in cur) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      // Fallback sang tiếng Việt nếu thiếu
      let fallbackCur: Record<string, unknown> | unknown = translations.vi;
      for (const fp of parts) {
        if (fallbackCur && typeof fallbackCur === "object" && fp in fallbackCur) {
          fallbackCur = (fallbackCur as Record<string, unknown>)[fp];
        } else {
          return keyPath;
        }
      }
      return typeof fallbackCur === "string" ? fallbackCur : keyPath;
    }
  }
  return typeof cur === "string" ? cur : keyPath;
}
