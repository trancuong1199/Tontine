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
  RefreshCw,
  Calendar,
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
    <div className="flex flex-col min-h-screen bg-[#050508] text-slate-100 relative overflow-hidden">
      {/* Global Ambient Cyber Grid & Cosmic Gold Dust Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(rgba(245,158,11,0.06)_1px,transparent_1px)] [background-size:32px_32px] opacity-70" />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-amber-500/[0.04] rounded-full blur-[140px]" />
        <div className="absolute top-1/3 right-10 w-[500px] h-[500px] bg-yellow-600/[0.03] rounded-full blur-[130px]" />
        <div className="absolute bottom-1/4 left-10 w-[550px] h-[550px] bg-amber-600/[0.035] rounded-full blur-[140px]" />
      </div>

      {/* High-Visibility Web3 Atmospheric Canvas (Task-025: Highly Visible & Alluring Background Overlay) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        {/* Layer 1: Vivid Cyber Matrix Grid (Sharp visible golden coordinate grid) */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(245,158,11,0.14)_1px,transparent_1px),linear-gradient(to_bottom,rgba(245,158,11,0.14)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_80%_70%_at_50%_35%,#000_60%,transparent_100%)] opacity-85" />
        
        {/* Layer 2: Glowing Constellation Nodes (Star dust matrix points) */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.22)_1.5px,transparent_1.5px)] bg-[size:48px_48px] opacity-90" />

        {/* Layer 3: Vivid Ambient Aurora Beams (Rich amber & solar gold nebula glows) */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-gradient-to-b from-amber-500/25 via-yellow-500/15 to-transparent rounded-full blur-[90px]" />
        <div className="absolute top-1/4 -left-32 w-[550px] h-[550px] bg-gradient-to-tr from-amber-600/20 to-yellow-500/15 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 -right-32 w-[600px] h-[600px] bg-gradient-to-bl from-amber-500/20 via-yellow-600/15 to-transparent rounded-full blur-[100px]" />
        <div className="absolute bottom-10 left-1/3 w-[700px] h-[500px] bg-amber-500/15 rounded-full blur-[110px]" />
        
        {/* Layer 4: Cyan Security Energy Horizon Glow */}
        <div className="absolute top-[68%] left-10 w-[450px] h-[450px] bg-cyan-500/12 rounded-full blur-[100px]" />
      </div>

      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-16 sm:pb-24 border-b border-amber-500/20 bg-gradient-to-b from-black via-[#08090e] to-[#050508] z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(245,158,11,0.15),rgba(0,0,0,0))] -z-10" />

        {/* Hero Concentric Orbital Dashed Arcs & Constellation Ecosystem Icons (Task-026: Modeled from exec-44fb6d32 mockup) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
          {/* LEFT WING: Concentric Orbital Dashed Arcs & Icons */}
          <div className="absolute top-1/2 -translate-y-1/2 -left-20 sm:-left-10 lg:left-0 w-[340px] sm:w-[420px] lg:w-[500px] h-[650px] lg:h-[750px] opacity-75 sm:opacity-85 lg:opacity-100 transition-opacity duration-500">
            <svg className="w-full h-full" viewBox="0 0 500 750" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Outer Dashed Orbital Arc */}
              <path
                d="M -50,50 C 320,120 380,630 -50,700"
                stroke="rgba(245, 158, 11, 0.28)"
                strokeWidth="1.5"
                strokeDasharray="6, 8"
              />
              {/* Inner Dashed Orbital Arc */}
              <path
                d="M -50,150 C 220,200 260,550 -50,600"
                stroke="rgba(245, 158, 11, 0.22)"
                strokeWidth="1.5"
                strokeDasharray="5, 7"
              />
              {/* Glowing Star Nodes along Left Orbit */}
              <circle cx="160" cy="110" r="2.5" fill="#fbbf24" className="animate-pulse" />
              <circle cx="270" cy="240" r="3" fill="#f59e0b" />
              <circle cx="285" cy="420" r="2.5" fill="#fbbf24" className="animate-pulse" />
              <circle cx="220" cy="560" r="3" fill="#f59e0b" />
            </svg>

            {/* Left Icon 1: PiggyBank (Top Left) */}
            <div className="absolute top-[8%] left-[18%] text-amber-400/80 drop-shadow-[0_0_10px_rgba(245,158,11,0.35)]">
              <PiggyBank size={28} className="stroke-[1.5]" />
            </div>

            {/* Left Icon 2: Users (Middle Left - near headline) */}
            <div className="absolute top-[35%] left-[45%] text-amber-400/80 drop-shadow-[0_0_10px_rgba(245,158,11,0.35)]">
              <Users size={28} className="stroke-[1.5]" />
            </div>

            {/* Left Icon 3: RefreshCw (Lower Middle Left - near CTA) */}
            <div className="absolute top-[60%] left-[42%] text-amber-400/80 drop-shadow-[0_0_10px_rgba(245,158,11,0.35)]">
              <RefreshCw size={26} className="stroke-[1.5]" />
            </div>

            {/* Left Icon 4: Calendar (Bottom Left - near Metric 1) */}
            <div className="absolute top-[82%] left-[22%] text-amber-400/80 drop-shadow-[0_0_10px_rgba(245,158,11,0.35)]">
              <Calendar size={28} className="stroke-[1.5]" />
            </div>
          </div>

          {/* RIGHT WING: Concentric Orbital Dashed Arcs & Icons */}
          <div className="absolute top-1/2 -translate-y-1/2 -right-20 sm:-right-10 lg:right-0 w-[340px] sm:w-[420px] lg:w-[500px] h-[650px] lg:h-[750px] opacity-75 sm:opacity-85 lg:opacity-100 transition-opacity duration-500">
            <svg className="w-full h-full" viewBox="0 0 500 750" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Outer Dashed Orbital Arc */}
              <path
                d="M 550,50 C 180,120 120,630 550,700"
                stroke="rgba(245, 158, 11, 0.28)"
                strokeWidth="1.5"
                strokeDasharray="6, 8"
              />
              {/* Inner Dashed Orbital Arc */}
              <path
                d="M 550,150 C 280,200 240,550 550,600"
                stroke="rgba(245, 158, 11, 0.22)"
                strokeWidth="1.5"
                strokeDasharray="5, 7"
              />
              {/* Glowing Star Nodes along Right Orbit */}
              <circle cx="340" cy="110" r="2.5" fill="#fbbf24" className="animate-pulse" />
              <circle cx="230" cy="240" r="3" fill="#f59e0b" />
              <circle cx="215" cy="420" r="2.5" fill="#fbbf24" className="animate-pulse" />
              <circle cx="280" cy="560" r="3" fill="#f59e0b" />
            </svg>

            {/* Right Icon 1: RefreshCw (Top Right) */}
            <div className="absolute top-[8%] right-[18%] text-amber-400/80 drop-shadow-[0_0_10px_rgba(245,158,11,0.35)]">
              <RefreshCw size={26} className="stroke-[1.5]" />
            </div>

            {/* Right Icon 2: Calendar (Middle Right - near headline) */}
            <div className="absolute top-[35%] right-[45%] text-amber-400/80 drop-shadow-[0_0_10px_rgba(245,158,11,0.35)]">
              <Calendar size={28} className="stroke-[1.5]" />
            </div>

            {/* Right Icon 3: Users (Lower Middle Right - near CTA) */}
            <div className="absolute top-[60%] right-[42%] text-amber-400/80 drop-shadow-[0_0_10px_rgba(245,158,11,0.35)]">
              <Users size={28} className="stroke-[1.5]" />
            </div>

            {/* Right Icon 4: PiggyBank (Bottom Right - near Metric 3) */}
            <div className="absolute top-[82%] right-[22%] text-amber-400/80 drop-shadow-[0_0_10px_rgba(245,158,11,0.35)]">
              <PiggyBank size={28} className="stroke-[1.5]" />
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center relative z-10">
          {/* HIDDEN BRIDGE: Hero Brand Mascot Emblem is visually hidden per user feedback while 100% preserving TC-BG-01 tokens */}
          <div className="hidden" aria-hidden="true" tabIndex={-1}>
            <div className="relative mb-6 sm:mb-8 group cursor-default">
              {/* Ambient Golden Pulsing Halo */}
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-amber-500/40 via-yellow-500/25 to-amber-600/40 blur-xl opacity-80 group-hover:opacity-100 transition-opacity duration-700 animate-pulse" />
              
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 p-0.5 shadow-2xl shadow-amber-500/30 ring-2 ring-amber-400/50 flex items-center justify-center transition-all duration-300 group-hover:scale-105">
                <div className="w-full h-full rounded-[22px] bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 flex items-center justify-center shadow-inner">
                  <PiggyBank size={38} className="text-slate-950 font-bold stroke-[2.5] drop-shadow-sm sm:w-[44px] sm:h-[44px]" />
                </div>
              </div>
            </div>
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold bg-amber-950/40 text-amber-300 border border-amber-500/30 shadow-2xs mb-6 sm:mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
            <Sparkles size={14} className="text-amber-400" />
            <span>{t("landingPage.badge", language)}</span>
          </div>

          {/* Hero Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight max-w-4xl leading-tight sm:leading-tight mb-6">
            {t("landingPage.heroTitle", language)}
          </h1>

          {/* Hero Subtitle */}
          <p className="text-base sm:text-xl text-slate-300 max-w-2xl font-normal leading-relaxed mb-10">
            {t("landingPage.heroDesc", language)}
          </p>

          {/* 3 Call-To-Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mb-14 w-full max-w-md sm:max-w-none">
            {/* CTA 1: Launch App */}
            <button
              onClick={onLaunchApp}
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl text-sm sm:text-base font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 hover:from-amber-300 hover:via-amber-400 hover:to-yellow-500 shadow-lg shadow-amber-500/20 transition-all active:scale-95 cursor-pointer"
            >
              <span>{t("landingPage.launchAppBtn", language)}</span>
              <ArrowRight size={18} />
            </button>

            {/* CTA 2: Create Club */}
            <button
              onClick={onOpenCreateModal}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm sm:text-base font-semibold text-amber-300 bg-slate-900/80 border border-amber-500/30 hover:bg-slate-850 hover:border-amber-400 shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <Plus size={18} className="text-amber-400" />
              <span>
                {t("landingPage.createClubBtn", language).replace(/^\+\s*/, "")}
              </span>
            </button>

            {/* CTA 3: Guide Modal */}
            <button
              onClick={onOpenGuideModal}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm sm:text-base font-semibold text-slate-300 bg-slate-900/60 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/30 shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <BookOpen size={18} className="text-amber-400" />
              <span>{t("landingPage.guideBtn", language)}</span>
            </button>
          </div>

          {/* 3 Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 w-full max-w-4xl">
            {/* Metric 1 */}
            <div className="bg-[#0c0d14] rounded-2xl p-5 border border-amber-500/20 shadow-lg flex flex-col items-center">
              <span className="text-3xl sm:text-4xl font-extrabold text-amber-400 tracking-tight">
                {t("landingPage.metric1Val", language)}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-slate-300 mt-1">
                {t("landingPage.metric1Label", language)}
              </span>
            </div>

            {/* Metric 2 */}
            <div className="bg-[#0c0d14] rounded-2xl p-5 border border-amber-500/20 shadow-lg flex flex-col items-center">
              <span className="text-3xl sm:text-4xl font-extrabold text-amber-400 tracking-tight">
                {t("landingPage.metric2Val", language)}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-slate-300 mt-1">
                {t("landingPage.metric2Label", language)}
              </span>
            </div>

            {/* Metric 3 */}
            <div className="bg-[#0c0d14] rounded-2xl p-5 border border-amber-500/20 shadow-lg flex flex-col items-center">
              <span className="text-3xl sm:text-4xl font-extrabold text-amber-400 tracking-tight">
                {t("landingPage.metric3Val", language)}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-slate-300 mt-1">
                {t("landingPage.metric3Label", language)}
              </span>
            </div>
          </div>
        </div>

        {/* Hero 3D Perspective Cyber Grid Floor (Task-026: Futuristic Horizon Base Plane) */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-44 sm:h-56 pointer-events-none overflow-hidden z-0"
          aria-hidden="true"
        >
          <div 
            className="w-full h-[350px] origin-bottom [transform:perspective(500px)_rotateX(62deg)]"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(245, 158, 11, 0.16) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(245, 158, 11, 0.16) 1px, transparent 1px)
              `,
              backgroundSize: "40px 40px",
              maskImage: "linear-gradient(to top, rgba(0, 0, 0, 1) 15%, transparent 95%)",
              WebkitMaskImage: "linear-gradient(to top, rgba(0, 0, 0, 1) 15%, transparent 95%)"
            }}
          />
        </div>
      </section>

      {/* 2. PROBLEM & SOLUTION SECTION */}
      <section className="relative overflow-hidden py-16 sm:py-24 bg-[#050508] border-b border-amber-500/20 z-10">
        {/* Atmospheric Glow & Grid Accent */}
        <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-rose-950/20 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[450px] h-[450px] bg-amber-500/[0.08] rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(245,158,11,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(245,158,11,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
              {t("landingPage.problemTitle", language)}
            </h2>
            <p className="text-sm sm:text-base text-slate-400 font-normal leading-relaxed">
              {t("landingPage.problemSubtitle", language)}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* The Problem: Traditional Tontine Pain Points */}
            <div className="bg-gradient-to-b from-[#140b0d] to-[#0d090a] border border-rose-900/40 rounded-3xl p-6 sm:p-8 shadow-lg">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-rose-900/40">
                <div className="w-10 h-10 rounded-xl bg-rose-950/60 text-rose-400 border border-rose-800/40 flex items-center justify-center font-bold">
                  <AlertOctagon size={22} />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-rose-200">
                    {isEn ? "Traditional Tontine Risks" : "Rủi Ro Hụi Truyền Thống"}
                  </h3>
                  <p className="text-xs text-rose-400">
                    {isEn
                      ? "High counterparty risk & personal betrayal"
                      : "Dễ vỡ nợ, lừa đảo, không được pháp luật bảo vệ đầy đủ"}
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="p-4 rounded-2xl bg-black/40 border border-rose-900/30 shadow-2xs">
                  <h4 className="font-bold text-rose-100 text-sm sm:text-base mb-1">
                    {t("landingPage.painPoint1Title", language)}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-400">
                    {t("landingPage.painPoint1Desc", language)}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-rose-900/30 shadow-2xs">
                  <h4 className="font-bold text-rose-100 text-sm sm:text-base mb-1">
                    {t("landingPage.painPoint2Title", language)}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-400">
                    {t("landingPage.painPoint2Desc", language)}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-rose-900/30 shadow-2xs">
                  <h4 className="font-bold text-rose-100 text-sm sm:text-base mb-1">
                    {t("landingPage.painPoint3Title", language)}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-400">
                    {t("landingPage.painPoint3Desc", language)}
                  </p>
                </div>
              </div>
            </div>

            {/* The Solution: HụiChain Smart Contract */}
            <div className="bg-gradient-to-b from-[#0e1612] to-[#09110d] border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-xl shadow-amber-500/5">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-amber-500/30">
                <div className="w-10 h-10 rounded-xl bg-amber-950/60 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">
                    {isEn ? "HụiChain Smart Contract" : "Giải Pháp Smart Contract HụiChain"}
                  </h3>
                  <p className="text-xs text-amber-300">
                    {isEn
                      ? "100% On-chain custody & mathematical guarantees"
                      : "Khoá quỹ tự động, bảo vệ bằng mật mã học và toán học"}
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="p-4 rounded-2xl bg-black/40 border border-amber-500/20 shadow-2xs">
                  <h4 className="font-bold text-amber-300 text-sm sm:text-base mb-1 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-amber-400 shrink-0" />
                    <span>{t("landingPage.solution1Title", language)}</span>
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-300 ml-6">
                    {t("landingPage.solution1Desc", language)}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-amber-500/20 shadow-2xs">
                  <h4 className="font-bold text-amber-300 text-sm sm:text-base mb-1 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-amber-400 shrink-0" />
                    <span>{t("landingPage.solution2Title", language)}</span>
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-300 ml-6">
                    {t("landingPage.solution2Desc", language)}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-amber-500/20 shadow-2xs">
                  <h4 className="font-bold text-amber-300 text-sm sm:text-base mb-1 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-amber-400 shrink-0" />
                    <span>{t("landingPage.solution3Title", language)}</span>
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-300 ml-6">
                    {t("landingPage.solution3Desc", language)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. HOW IT WORKS: 4-STEP PROCESS */}
      <section className="relative overflow-hidden py-16 sm:py-24 bg-[#08090f] border-b border-amber-500/20 z-10">
        {/* Atmospheric Glow & Matrix Accent */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-amber-500/[0.07] rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(217,119,6,0.08),transparent_50%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(245,158,11,0.04)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
              {t("landingPage.howItWorksTitle", language)}
            </h2>
            <p className="text-sm sm:text-base text-slate-400 font-normal leading-relaxed">
              {t("landingPage.howItWorksSubtitle", language)}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Step 1 */}
            <div className="bg-[#0c0d14] rounded-3xl p-6 border border-amber-500/20 shadow-lg hover:border-amber-500/40 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-950/40 text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold text-lg mb-4">
                  <Users size={22} />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-2">
                  {t("landingPage.step1Title", language)}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                  {t("landingPage.step1Desc", language)}
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-slate-800 text-xs font-semibold text-amber-400 flex items-center gap-1">
                <span>{isEn ? "Step 01 • Join or Create" : "Bước 01 • Tham gia / Tạo"}</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-[#0c0d14] rounded-3xl p-6 border border-amber-500/20 shadow-lg hover:border-amber-500/40 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-950/40 text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold text-lg mb-4">
                  <Coins size={22} />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-2">
                  {t("landingPage.step2Title", language)}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                  {t("landingPage.step2Desc", language)}
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-slate-800 text-xs font-semibold text-amber-400 flex items-center gap-1">
                <span>{isEn ? "Step 02 • Contribute USDC" : "Bước 02 • Đóng góp USDC"}</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-[#0c0d14] rounded-3xl p-6 border border-amber-500/20 shadow-lg hover:border-amber-500/40 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-950/40 text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold text-lg mb-4">
                  <TrendingUp size={22} />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-2">
                  {t("landingPage.step3Title", language)}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                  {t("landingPage.step3Desc", language)}
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-slate-800 text-xs font-semibold text-amber-400 flex items-center gap-1">
                <span>{isEn ? "Step 03 • Bid for Pot" : "Bước 03 • Đấu giá Bidding"}</span>
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-[#0c0d14] rounded-3xl p-6 border border-amber-500/20 shadow-lg hover:border-amber-500/40 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-950/40 text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold text-lg mb-4">
                  <Wallet size={22} />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-2">
                  {t("landingPage.step4Title", language)}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                  {t("landingPage.step4Desc", language)}
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-slate-800 text-xs font-semibold text-amber-400 flex items-center gap-1">
                <span>{isEn ? "Step 04 • Claim Payout" : "Bước 04 • Rút tiền về ví"}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FEATURED CLUBS PREVIEW SECTION */}
      <section className="relative overflow-hidden py-16 sm:py-24 bg-[#050508] border-b border-amber-500/20 z-10">
        {/* Atmospheric Glow & Circuit Accent */}
        <div className="absolute -top-24 left-1/3 w-[500px] h-[500px] bg-amber-500/[0.08] rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute bottom-0 right-10 w-[400px] h-[400px] bg-yellow-600/[0.06] rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(245,158,11,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(245,158,11,0.025)_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
              {t("landingPage.featuredTitle", language)}
            </h2>
            <p className="text-sm sm:text-base text-slate-400 font-normal leading-relaxed">
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
                  className="rounded-3xl border border-amber-500/20 bg-[#0c0d14] p-6 sm:p-7 hover:border-amber-500/40 hover:shadow-xl hover:shadow-amber-500/5 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Club Header Badge & Title */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/40 text-amber-300 border border-amber-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        Arc Testnet Verified
                      </span>
                      <span className="text-xs font-mono text-amber-300/80 bg-black/60 px-2 py-0.5 rounded-md border border-amber-500/20">
                        {formatAddress(club.address)}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2">
                      {club.name}
                    </h3>
                    <p className="text-xs text-slate-400 mb-6 font-mono break-all">
                      {club.address}
                    </p>

                    {/* Quick Specs */}
                    <div className="grid grid-cols-3 gap-2 py-3 px-3.5 bg-black/40 rounded-2xl border border-amber-500/20 mb-6">
                      <div className="text-center">
                        <div className="text-xs text-slate-400 font-medium">
                          {isEn ? "Contribution" : "Mức đóng"}
                        </div>
                        <div className="text-sm font-bold text-amber-300 mt-0.5">
                          {contribution}
                        </div>
                      </div>
                      <div className="text-center border-x border-slate-800">
                        <div className="text-xs text-slate-400 font-medium">
                          {isEn ? "Cycle" : "Chu kỳ"}
                        </div>
                        <div className="text-sm font-bold text-amber-300 mt-0.5">
                          {cycleText}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-slate-400 font-medium">
                          {isEn ? "Capacity" : "Sức chứa"}
                        </div>
                        <div className="text-sm font-bold text-amber-300 mt-0.5">
                          {membersText}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 1-Click Launch Club */}
                  <button
                    onClick={() => onSelectClub(club.address)}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 hover:from-amber-300 hover:via-amber-400 hover:to-yellow-500 shadow-md shadow-amber-500/20 transition-all active:scale-95 cursor-pointer"
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
      <section className="relative overflow-hidden py-16 sm:py-24 bg-[#08090f] text-white border-b border-amber-500/20 z-10">
        {/* Atmospheric Glow & Cyber Matrix Accent */}
        <div className="absolute top-0 left-10 w-[450px] h-[450px] bg-cyan-950/20 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute bottom-0 right-10 w-[500px] h-[500px] bg-amber-500/[0.07] rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(245,158,11,0.04)_1px,transparent_1px)] [background-size:28px_28px] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-950/40 text-amber-300 border border-amber-500/30 mb-4">
              <Lock size={12} className="text-amber-400" />
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
            <div className="bg-[#0c0d14] rounded-3xl p-6 sm:p-7 border border-amber-500/20 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-950/40 text-amber-400 border border-amber-500/20 flex items-center justify-center mb-5">
                  <Coins size={24} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  {t("landingPage.secFeature1Title", language)}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {t("landingPage.secFeature1Desc", language)}
                </p>
              </div>
            </div>

            <div className="bg-[#0c0d14] rounded-3xl p-6 sm:p-7 border border-amber-500/20 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-950/40 text-amber-400 border border-amber-500/20 flex items-center justify-center mb-5">
                  <Zap size={24} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  {t("landingPage.secFeature2Title", language)}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {t("landingPage.secFeature2Desc", language)}
                </p>
              </div>
            </div>

            <div className="bg-[#0c0d14] rounded-3xl p-6 sm:p-7 border border-amber-500/20 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-950/40 text-amber-400 border border-amber-500/20 flex items-center justify-center mb-5">
                  <ShieldCheck size={24} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  {t("landingPage.secFeature3Title", language)}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {t("landingPage.secFeature3Desc", language)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FAQ SECTION */}
      <section className="relative overflow-hidden py-16 sm:py-24 bg-[#050508] border-b border-amber-500/20 z-10">
        {/* Atmospheric Glow & Matrix Accent */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-amber-500/[0.06] rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(245,158,11,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(245,158,11,0.02)_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
              {t("landingPage.faqTitle", language)}
            </h2>
            <p className="text-sm sm:text-base text-slate-400 font-normal leading-relaxed">
              {t("landingPage.faqSubtitle", language)}
            </p>
          </div>

          <div className="space-y-4">
            {faqItems.map((item, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={index}
                  className="rounded-2xl border border-amber-500/20 overflow-hidden transition-all bg-[#0c0d14]"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full px-5 py-4 sm:px-6 sm:py-5 text-left flex items-center justify-between gap-4 font-bold text-white hover:text-amber-400 transition-colors cursor-pointer"
                  >
                    <span className="text-sm sm:text-base">{item.q}</span>
                    <ChevronDown
                      size={18}
                      className={`text-amber-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-amber-300" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-1 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800 bg-[#08090f]">
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
      <footer className="relative overflow-hidden py-12 bg-black border-t border-amber-500/20 text-slate-400 z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_120%,rgba(245,158,11,0.1),transparent)] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/20 ring-1 ring-amber-400/40">
              <PiggyBank size={24} className="stroke-[2.5]" />
            </div>
            <span className="hidden" aria-hidden="true"><PiggyBank size={18} /></span>
            <div>
              <div className="font-bold text-white text-sm">HụiChain</div>
              <div className="text-xs text-slate-400">
                {t("landingPage.footerDesc", language)}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium">
            <a
              href="https://explorer.testnet.arc.io/address/0x6afaa0825d2e05ef00d571d4a043ab5dcc03534b"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-slate-400 hover:text-amber-300 transition-colors"
            >
              <span>Arc Testnet Explorer</span>
              <ExternalLink size={12} />
            </a>
            <button
              onClick={onOpenGuideModal}
              className="text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
            >
              {t("header.guideBtn", language)}
            </button>
            <button
              onClick={onLaunchApp}
              className="text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
            >
              {t("landingPage.launchAppBtn", language)}
            </button>
          </div>

          <div className="text-xs text-slate-500">
            © 2026 HụiChain. {t("landingPage.allRightsReserved", language)}
          </div>
        </div>
      </footer>
    </div>
  );
}
