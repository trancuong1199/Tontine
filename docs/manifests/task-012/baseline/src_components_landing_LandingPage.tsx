import React, { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Plus,
  ShieldCheck,
  Zap,
  TrendingUp,
  AlertOctagon,
  CheckCircle2,
  Users,
  Coins,
  Wallet,
  ExternalLink,
  ChevronDown,
  Sparkles,
  Lock,
  PiggyBank,
} from "lucide-react";
import { Language, t } from "../../lib/i18n";
import {
  DEFAULT_SAVINGS_CLUBS,
  formatAddress,
} from "../../lib/savingsClubDirectory";

export interface LandingPageProps {
  onLaunchApp: () => void;
  onSelectClub: (address: `0x${string}`) => void;
  onOpenCreateModal: () => void;
  onOpenGuideModal: () => void;
  language?: Language;
}

export function LandingPage({
  onLaunchApp,
  onSelectClub,
  onOpenCreateModal,
  onOpenGuideModal,
  language = "vi",
}: LandingPageProps) {
  const isEn = language === "en";
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex((prev) => (prev === index ? null : index));
  };

  const faqItems = [
    {
      q: t("landingPage.q1", language),
      a: t("landingPage.a1", language),
    },
    {
      q: t("landingPage.q2", language),
      a: t("landingPage.a2", language),
    },
    {
      q: t("landingPage.q3", language),
      a: t("landingPage.a3", language),
    },
    {
      q: t("landingPage.q4", language),
      a: t("landingPage.a4", language),
    },
    {
      q: t("landingPage.q5", language),
      a: t("landingPage.a5", language),
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 border-b border-slate-200/80 bg-gradient-to-b from-blue-50/50 via-white to-slate-50">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold bg-blue-100/80 text-blue-800 border border-blue-200 shadow-2xs mb-6 sm:mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
            <Sparkles size={14} className="text-blue-600 animate-spin" />
            <span>{t("landingPage.badge", language)}</span>
          </div>

          {/* Hero Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl leading-tight sm:leading-tight mb-6">
            {t("landingPage.heroTitle", language)}
          </h1>

          {/* Hero Subtitle */}
          <p className="text-base sm:text-xl text-slate-600 max-w-2xl font-normal leading-relaxed mb-10">
            {t("landingPage.heroDesc", language)}
          </p>

          {/* 3 Call-To-Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mb-14 w-full max-w-md sm:max-w-none">
            {/* CTA 1: Launch App */}
            <button
              onClick={onLaunchApp}
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl text-sm sm:text-base font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-all active:scale-95 cursor-pointer ring-1 ring-blue-500/20"
            >
              <span>{t("landingPage.launchAppBtn", language)}</span>
              <ArrowRight size={18} />
            </button>

            {/* CTA 2: Create Club */}
            <button
              onClick={onOpenCreateModal}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm sm:text-base font-semibold text-slate-800 bg-white border border-slate-200/90 hover:bg-slate-100 hover:border-slate-300 shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <Plus size={18} className="text-blue-600" />
              <span>
                {t("landingPage.createClubBtn", language).replace(/^\+\s*/, "")}
              </span>
            </button>

            {/* CTA 3: Guide Modal */}
            <button
              onClick={onOpenGuideModal}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm sm:text-base font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200/60 shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <BookOpen size={18} className="text-indigo-600" />
              <span>{t("landingPage.guideBtn", language)}</span>
            </button>
          </div>

          {/* 3 Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 w-full max-w-4xl">
            {/* Metric 1 */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex flex-col items-center">
              <span className="text-3xl sm:text-4xl font-extrabold text-blue-600 tracking-tight">
                {t("landingPage.metric1Val", language)}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-slate-600 mt-1">
                {t("landingPage.metric1Label", language)}
              </span>
            </div>

            {/* Metric 2 */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex flex-col items-center">
              <span className="text-3xl sm:text-4xl font-extrabold text-emerald-600 tracking-tight">
                {t("landingPage.metric2Val", language)}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-slate-600 mt-1">
                {t("landingPage.metric2Label", language)}
              </span>
            </div>

            {/* Metric 3 */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex flex-col items-center">
              <span className="text-3xl sm:text-4xl font-extrabold text-indigo-600 tracking-tight">
                {t("landingPage.metric3Val", language)}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-slate-600 mt-1">
                {t("landingPage.metric3Label", language)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. PROBLEM & SOLUTION SECTION */}
      <section className="py-16 sm:py-24 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
              {t("landingPage.problemTitle", language)}
            </h2>
            <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed">
              {t("landingPage.problemSubtitle", language)}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* The Problem: Traditional Tontine Pain Points */}
            <div className="bg-rose-50/50 border border-rose-200 rounded-3xl p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-rose-200/80">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  <AlertOctagon size={22} />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-rose-950">
                    {isEn ? "Traditional Tontine Risks" : "Rủi Ro Hụi Truyền Thống"}
                  </h3>
                  <p className="text-xs text-rose-700">
                    {isEn
                      ? "High counterparty risk & personal betrayal"
                      : "Dễ vỡ nợ, lừa đảo, không được pháp luật bảo vệ đầy đủ"}
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="p-4 rounded-2xl bg-white/80 border border-rose-200/80 shadow-2xs">
                  <h4 className="font-bold text-slate-900 text-sm sm:text-base mb-1">
                    {t("landingPage.painPoint1Title", language)}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600">
                    {t("landingPage.painPoint1Desc", language)}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/80 border border-rose-200/80 shadow-2xs">
                  <h4 className="font-bold text-slate-900 text-sm sm:text-base mb-1">
                    {t("landingPage.painPoint2Title", language)}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600">
                    {t("landingPage.painPoint2Desc", language)}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/80 border border-rose-200/80 shadow-2xs">
                  <h4 className="font-bold text-slate-900 text-sm sm:text-base mb-1">
                    {t("landingPage.painPoint3Title", language)}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600">
                    {t("landingPage.painPoint3Desc", language)}
                  </p>
                </div>
              </div>
            </div>

            {/* The Solution: HụiChain Smart Contract */}
            <div className="bg-emerald-50/50 border border-emerald-200 rounded-3xl p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-emerald-200/80">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-emerald-950">
                    {isEn ? "HụiChain Smart Contract" : "Giải Pháp Smart Contract HụiChain"}
                  </h3>
                  <p className="text-xs text-emerald-700">
                    {isEn
                      ? "100% On-chain custody & mathematical guarantees"
                      : "Khoá quỹ tự động, bảo vệ bằng mật mã học và toán học"}
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="p-4 rounded-2xl bg-white/90 border border-emerald-200/80 shadow-2xs">
                  <h4 className="font-bold text-emerald-950 text-sm sm:text-base mb-1 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span>{t("landingPage.solution1Title", language)}</span>
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 ml-6">
                    {t("landingPage.solution1Desc", language)}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/90 border border-emerald-200/80 shadow-2xs">
                  <h4 className="font-bold text-emerald-950 text-sm sm:text-base mb-1 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span>{t("landingPage.solution2Title", language)}</span>
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 ml-6">
                    {t("landingPage.solution2Desc", language)}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/90 border border-emerald-200/80 shadow-2xs">
                  <h4 className="font-bold text-emerald-950 text-sm sm:text-base mb-1 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span>{t("landingPage.solution3Title", language)}</span>
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 ml-6">
                    {t("landingPage.solution3Desc", language)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. HOW IT WORKS: 4-STEP PROCESS */}
      <section className="py-16 sm:py-24 bg-slate-50 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
              {t("landingPage.howItWorksTitle", language)}
            </h2>
            <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed">
              {t("landingPage.howItWorksSubtitle", language)}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Step 1 */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg mb-4">
                  <Users size={22} />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2">
                  {t("landingPage.step1Title", language)}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                  {t("landingPage.step1Desc", language)}
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-slate-100 text-xs font-semibold text-blue-600 flex items-center gap-1">
                <span>{isEn ? "Step 01 • Join or Create" : "Bước 01 • Tham gia / Tạo"}</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-lg mb-4">
                  <Coins size={22} />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2">
                  {t("landingPage.step2Title", language)}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                  {t("landingPage.step2Desc", language)}
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-slate-100 text-xs font-semibold text-amber-600 flex items-center gap-1">
                <span>{isEn ? "Step 02 • Contribute USDC" : "Bước 02 • Đóng góp USDC"}</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg mb-4">
                  <TrendingUp size={22} />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2">
                  {t("landingPage.step3Title", language)}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                  {t("landingPage.step3Desc", language)}
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-slate-100 text-xs font-semibold text-indigo-600 flex items-center gap-1">
                <span>{isEn ? "Step 03 • Bid for Pot" : "Bước 03 • Đấu giá Bidding"}</span>
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg mb-4">
                  <Wallet size={22} />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2">
                  {t("landingPage.step4Title", language)}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                  {t("landingPage.step4Desc", language)}
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-slate-100 text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <span>{isEn ? "Step 04 • Claim Payout" : "Bước 04 • Rút tiền về ví"}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FEATURED CLUBS PREVIEW SECTION */}
      <section className="py-16 sm:py-24 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
              {t("landingPage.featuredTitle", language)}
            </h2>
            <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed">
              {t("landingPage.featuredSubtitle", language)}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {DEFAULT_SAVINGS_CLUBS.map((club, idx) => {
              const isFirst = idx === 0;
              const contribution = isFirst ? "10 USDC" : "100 USDC";
              const cycleText = isEn ? "7 Days / Cycle" : "7 ngày / Chu kỳ";
              const membersText = isFirst
                ? isEn
                  ? "Max 5 Members"
                  : "Tối đa 5 thành viên"
                : isEn
                ? "Max 10 Members"
                : "Tối đa 10 thành viên";

              return (
                <div
                  key={club.address}
                  className="rounded-3xl border border-slate-200/80 bg-slate-50/60 p-6 sm:p-7 hover:border-blue-300 hover:shadow-lg transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Club Header Badge & Title */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100/80 text-emerald-800 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Arc Testnet Verified
                      </span>
                      <span className="text-xs font-mono text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                        {formatAddress(club.address)}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 mb-2">
                      {club.name}
                    </h3>
                    <p className="text-xs text-slate-500 mb-6 font-mono break-all">
                      {club.address}
                    </p>

                    {/* Quick Specs */}
                    <div className="grid grid-cols-3 gap-2 py-3 px-3.5 bg-white rounded-2xl border border-slate-200/80 mb-6">
                      <div className="text-center">
                        <div className="text-xs text-slate-400 font-medium">
                          {isEn ? "Contribution" : "Mức đóng"}
                        </div>
                        <div className="text-sm font-bold text-slate-800 mt-0.5">
                          {contribution}
                        </div>
                      </div>
                      <div className="text-center border-x border-slate-100">
                        <div className="text-xs text-slate-400 font-medium">
                          {isEn ? "Cycle" : "Chu kỳ"}
                        </div>
                        <div className="text-sm font-bold text-slate-800 mt-0.5">
                          {cycleText}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-slate-400 font-medium">
                          {isEn ? "Capacity" : "Sức chứa"}
                        </div>
                        <div className="text-sm font-bold text-slate-800 mt-0.5">
                          {membersText}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 1-Click Launch Club */}
                  <button
                    onClick={() => onSelectClub(club.address)}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all active:scale-95 cursor-pointer"
                  >
                    <span>{t("landingPage.enterClubBtn", language)}</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. SECURITY & ARC ARCHITECTURE SECTION */}
      <section className="py-16 sm:py-24 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-4">
              <Lock size={12} />
              <span>Arc Testnet • Enterprise Security</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
              {t("landingPage.securityTitle", language)}
            </h2>
            <p className="text-sm sm:text-base text-slate-400 font-normal leading-relaxed">
              {t("landingPage.securitySubtitle", language)}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-800/80 rounded-3xl p-6 sm:p-7 border border-slate-700/80 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-5">
                  <Coins size={24} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  {t("landingPage.secFeature1Title", language)}
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  {t("landingPage.secFeature1Desc", language)}
                </p>
              </div>
            </div>

            <div className="bg-slate-800/80 rounded-3xl p-6 sm:p-7 border border-slate-700/80 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-5">
                  <Zap size={24} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  {t("landingPage.secFeature2Title", language)}
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  {t("landingPage.secFeature2Desc", language)}
                </p>
              </div>
            </div>

            <div className="bg-slate-800/80 rounded-3xl p-6 sm:p-7 border border-slate-700/80 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-5">
                  <ShieldCheck size={24} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  {t("landingPage.secFeature3Title", language)}
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  {t("landingPage.secFeature3Desc", language)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FAQ SECTION */}
      <section className="py-16 sm:py-24 bg-white border-b border-slate-200/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
              {t("landingPage.faqTitle", language)}
            </h2>
            <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed">
              {t("landingPage.faqSubtitle", language)}
            </p>
          </div>

          <div className="space-y-4">
            {faqItems.map((item, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={index}
                  className="rounded-2xl border border-slate-200/80 overflow-hidden transition-all bg-slate-50/50"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full px-5 py-4 sm:px-6 sm:py-5 text-left flex items-center justify-between gap-4 font-bold text-slate-900 hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    <span className="text-sm sm:text-base">{item.q}</span>
                    <ChevronDown
                      size={18}
                      className={`text-slate-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-blue-600" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-200/60 bg-white">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="py-12 bg-slate-100 border-t border-slate-200 text-slate-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
              <PiggyBank size={18} />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-sm">HụiChain</div>
              <div className="text-xs text-slate-500">
                {t("landingPage.footerDesc", language)}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium">
            <a
              href="https://explorer.testnet.arc.io/address/0x6afaa0825d2e05ef00d571d4a043ab5dcc03534b"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-slate-600 hover:text-blue-600 transition-colors"
            >
              <span>Arc Testnet Explorer</span>
              <ExternalLink size={12} />
            </a>
            <button
              onClick={onOpenGuideModal}
              className="text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
            >
              {t("header.guideBtn", language)}
            </button>
            <button
              onClick={onLaunchApp}
              className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
            >
              {t("landingPage.launchAppBtn", language)}
            </button>
          </div>

          <div className="text-xs text-slate-400">
            © 2026 HụiChain. {t("landingPage.allRightsReserved", language)}
          </div>
        </div>
      </footer>
    </div>
  );
}
