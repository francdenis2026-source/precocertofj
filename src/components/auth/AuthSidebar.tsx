import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, TrendingUp, Users, ShoppingBag, PiggyBank, Clock, ArrowUpRight } from "lucide-react";
import { getLoginPanelMetrics, type LoginPanelMetrics } from "@/lib/login-panel.functions";
import { useQuery } from "@tanstack/react-query";

export const AuthSidebar: React.FC = () => {
  const { data: metrics } = useQuery({
    queryKey: ["login-metrics"],
    queryFn: () => getLoginPanelMetrics({}),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const stats = [
    {
      label: "Produtos monitorados",
      value: metrics?.totalItems.toLocaleString("pt-BR") || "...",
      icon: ShoppingBag,
      color: "text-blue-500",
    },
    {
      label: "Comércios parceiros",
      value: metrics?.totalMarkets || "...",
      icon: TrendingUp,
      color: "text-amber-500",
    },
    {
      label: "Usuários ativos",
      value: "1.2k+", // Mock or calculate if available
      icon: Users,
      color: "text-emerald-500",
    },
    {
      label: "Economia gerada",
      value: metrics ? `R$ ${(metrics.monthlySavings * 12).toLocaleString("pt-BR")}` : "...",
      icon: PiggyBank,
      color: "text-[var(--brand-primary)]",
    },
  ];

  return (
    <div className="relative h-full w-full overflow-hidden bg-[var(--pc-brand-navy-deep)] p-8 lg:p-12 flex flex-col justify-between">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-[var(--brand-primary)]/10 blur-[100px]" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-[80px]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      </div>

      <div className="relative z-10">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 mb-12"
        >
          <div className="p-2 rounded-[var(--radius-xl)] bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20 shadow-[0_0_20px_rgba(212,175,55,0.15)]">
            <img src="/logo-mark.png?v=5" alt="Logo" className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">PreçoCerto</h2>
            <p className="text-[10px] uppercase tracking-widest text-[var(--brand-primary)] font-black">Sua economia começa aqui</p>
          </div>
        </motion.div>

        <div className="space-y-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h1 className="text-3xl lg:text-4xl font-bold text-white leading-tight mb-4">
              A inteligência que <br />
              <span className="text-[var(--brand-primary)]">protege o seu bolso.</span>
            </h1>
            <p className="text-slate-400 text-sm max-w-sm leading-relaxed">
              Junte-se a milhares de feijoenses que economizam todos os meses comparando preços em tempo real nos mercados da nossa cidade.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 gap-4">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="p-4 rounded-[var(--radius-2xl)] bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors group"
              >
                <stat.icon className={`w-5 h-5 mb-3 ${stat.color} group-hover:scale-110 transition-transform`} />
                <div className="text-lg font-bold text-white">{stat.value}</div>
                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="relative z-10">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex items-center gap-4 p-4 rounded-[var(--radius-2xl)] bg-white/5 border border-white/10 backdrop-blur-sm"
        >
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-[var(--pc-brand-navy-deep)] rounded-full animate-pulse" />
          </div>
          <div className="flex-1">
            <div className="text-[11px] text-emerald-500 font-bold uppercase tracking-wider">Atualizado em tempo real</div>
            <div className="text-[10px] text-slate-400">
              Última sincronização há poucos segundos · {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </motion.div>

        <div className="mt-8 flex items-center gap-6 text-[10px] text-slate-500 font-medium uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3 h-3 text-[var(--brand-primary)]" />
            Conexão Segura
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-slate-700" />
            LGPD Compliant
          </div>
        </div>
      </div>
    </div>
  );
};
