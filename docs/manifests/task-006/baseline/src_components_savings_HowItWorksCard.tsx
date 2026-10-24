import { ShieldCheck, Users, Coins, TrendingUp, Award, Lock } from "lucide-react";

export function HowItWorksCard() {
  const steps = [
    {
      step: "01",
      title: "Tham gia nhóm",
      desc: "Chọn nhóm hụi với số tiền và chu kỳ phù hợp. Kết nối ví Arc Testnet và bấm tham gia.",
      icon: Users,
      badge: "Gia nhập",
      color: "text-blue-600 bg-blue-50 border-blue-200/60",
    },
    {
      step: "02",
      title: "Góp vốn mỗi vòng",
      desc: "Mỗi vòng (1 ngày), mọi thành viên đóng cố định 10 USDC vào quỹ Pot tập trung an toàn.",
      icon: Coins,
      badge: "Đóng hụi",
      color: "text-indigo-600 bg-indigo-50 border-indigo-200/60",
    },
    {
      step: "03",
      title: "Đấu giá hốt hụi",
      desc: "Thành viên nào cần vốn sớm sẽ đặt Bid. Người trả giá bid cao nhất sẽ thắng toàn bộ Pot vòng đó.",
      icon: TrendingUp,
      badge: "Đấu giá",
      color: "text-violet-600 bg-violet-50 border-violet-200/60",
    },
    {
      step: "04",
      title: "Tất toán & Chia thưởng",
      desc: "Tiền bid của người thắng được chia đều làm lợi tức thưởng cho những người chưa hốt hụi.",
      icon: Award,
      badge: "Nhận tiền",
      color: "text-emerald-600 bg-emerald-50 border-emerald-200/60",
    },
  ];

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-xs font-semibold tracking-wider uppercase text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
            Quy trình vận hành
          </span>
          <h3 className="text-xl font-bold text-slate-900 mt-1.5">
            Cách hoạt động của Hụi Trustless
          </h3>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60">
          <Lock size={14} className="text-emerald-600" />
          <span>Bảo mật 100% On-chain</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {steps.map(({ step, title, desc, icon: Icon, badge, color }) => (
          <div
            key={step}
            className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/60 hover:bg-slate-50 hover:border-slate-300 transition-all space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${color}`}>
                <Icon size={16} />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-400 font-mono">#{step}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200 shadow-2xs">
                  {badge}
                </span>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm">{title}</h4>
              <p className="text-slate-500 text-xs leading-relaxed mt-1">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 border border-blue-100/80 text-xs text-slate-600">
        <ShieldCheck size={18} className="text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-800">
            Không thể quỵt hụi — Cơ chế bảo vệ dòng tiền thông minh
          </p>
          <p className="text-slate-500 leading-relaxed">
            Hợp đồng tự động loại (kick) thành viên không đóng tiền ở vòng kế tiếp, đồng thời giữ lại toàn bộ số tiền đã đóng để bù trừ rủi ro cho nhóm. Tất cả lệnh rút tiền đều là pull-based trực tiếp từ ví của bạn.
          </p>
        </div>
      </div>
    </div>
  );
}
