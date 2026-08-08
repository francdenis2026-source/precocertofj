import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, 
  Hash, 
  Lock, 
  User, 
  Phone, 
  Calendar, 
  MapPin, 
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { signUpWithCpf, resolveLoginEmail } from "@/lib/account.functions";
import { maskCpf, maskPhone, maskCep, stripCpf, isValidCpf } from "@/lib/cpf";
import { hasPendingCartItem } from "@/lib/pending-cart";
import { safeInternalPath } from "@/lib/auth-redirect";
import { toast } from "sonner";
import { notify } from "@/lib/notify";

import { AuthInput } from "@/components/auth/AuthInput";
import { AuthButton } from "@/components/auth/AuthButton";
import { PinInput } from "@/components/auth/PinInput";
import { Logo } from "@/components/brand/Logo";

export function LoginShell({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="min-h-screen w-full bg-[#F7F9FC] flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-[440px] space-y-8">
        <div className="flex flex-col items-center text-center space-y-4">
          <Link to="/" className="transition-transform hover:scale-105">
            <Logo variant="on-light" compact showTagline={false} className="[&_img]:h-12 [&_img]:w-12" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">{title}</h1>
            <p className="text-sm text-[#64748B] font-medium mt-1">{subtitle}</p>
          </div>
        </div>
        
        <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#E5EAF1]">
          {children}
        </div>

        <div className="flex items-center justify-center gap-2 text-[12px] font-bold text-[#94A3B8] uppercase tracking-widest">
          <ShieldCheck className="h-4 w-4 text-[#10B981]" />
          Seus dados estão protegidos
        </div>
      </div>
    </div>
  );
}
