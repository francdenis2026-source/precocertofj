import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Price } from "@/components/ds/Price";
import { supabase } from "@/integrations/supabase/client";
import { useSignOut } from "@/hooks/use-sign-out";
import { AppShell } from "@/components/brand/AppShell";
import { PageHeader } from "@/components/layout";
import { IconTile } from "@/components/ui/icon-tile";
import {
  Award, MapPin, Settings, LogOut, Sparkles, Heart,
  Hash, Loader2, Check, User, Phone, ShoppingBag, Trash2, ExternalLink, Camera,
  Download, Database, BarChart3, TrendingUp, Store, ChevronRight, Cpu
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getMyAccount, updateMyCpf, updateMyProfile, updateMyAvatar } from "@/lib/account.functions";
import { getMyProfileStats } from "@/lib/profile-stats.functions";
import { SubscriptionStatusCard } from "@/components/account/SubscriptionStatusCard";
import { PreferencesPanel } from "@/components/account/PreferencesPanel";
import { CollaboratorStatusCard } from "@/components/collab/CollaboratorStatusCard";
import { listMyPriceReports } from "@/lib/stores-public.functions";
import { listMyStoreQuotes, deleteStoreQuote } from "@/lib/store-quotes.functions";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { maskCpf, maskPhone, maskCep, stripCpf, isValidCpf } from "@/lib/cpf";
import { toast } from "sonner";
import { downloadFullDatabase } from "@/lib/database-export.functions";
import { organizeAllProducts } from "@/lib/catalog-organization.functions";
import { getAdminMetrics } from "@/lib/admin-metrics.functions";
import { getPendingClassification, updateProductClassification } from "@/lib/catalog-review.functions";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Meu perfil — PreçoCerto" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Perfil,
});

type Address = {
  zip: string; street: string; number: string;
  district: string; city: string; state: string;
};
const emptyAddress: Address = { zip: "", street: "", number: "", district: "", city: "", state: "" };

function Perfil() {
  const fetchAccount = useServerFn(getMyAccount);
  const updateCpfFn = useServerFn(updateMyCpf);
  const updateProfileFn = useServerFn(updateMyProfile);
  const updateAvatarFn = useServerFn(updateMyAvatar);
  const statsFn = useServerFn(getMyProfileStats);
  const statsQuery = useQuery({
    queryKey: ["my-profile-stats"],
    queryFn: () => statsFn(),
    staleTime: 60_000,
  });
  const s = statsQuery.data;
  const fmtBrl = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const [cpf, setCpf] = useState("");
  const [cpfError, setCpfError] = useState<string | null>(null);
  const [savingCpf, setSavingCpf] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState<Address>(emptyAddress);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function refreshAvatarSignedUrl(path: string | null) {
    if (!path) { setAvatarUrl(null); return; }
    const { data } = await supabase.storage
      .from("avatars")
      .createSignedUrl(path, 60 * 60 * 24 * 7);
    setAvatarUrl(data?.signedUrl ?? null);
  }

  useEffect(() => {
    fetchAccount()
      .then((acc) => {
        if (!acc) return;
        setCpf(acc.cpf ?? "");
        setFullName(acc.fullName ?? "");
        setPhone(acc.phone ?? "");
        setAvatarPath(acc.avatarUrl ?? null);
        void refreshAvatarSignedUrl(acc.avatarUrl ?? null);
        setAddress({
          zip: acc.address.zip ?? "",
          street: acc.address.street ?? "",
          number: acc.address.number ?? "",
          district: acc.address.district ?? "",
          city: acc.address.city ?? "",
          state: acc.address.state ?? "",
        });
      })
      .catch(() => {});
  }, [fetchAccount]);

  async function handleAvatarFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Envie uma imagem (JPG, PNG ou WEBP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem grande demais (máx. 5 MB).");
      return;
    }
    setUploadingAvatar(true);
    try {
      const { data: sess } = await supabase.auth.getUser();
      const uid = sess.user?.id;
      if (!uid) throw new Error("Sessão expirada");
      const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${uid}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      await updateAvatarFn({ data: { path } });
      // Remove arquivo antigo para não deixar órfão no bucket
      const previous = avatarPath;
      if (previous && previous !== path) {
        await supabase.storage.from("avatars").remove([previous]).catch(() => null);
      }
      setAvatarPath(path);
      await refreshAvatarSignedUrl(path);
      toast.success("Foto de perfil atualizada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao enviar foto");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleRemoveAvatar() {
    if (uploadingAvatar) return;
    setUploadingAvatar(true);
    try {
      const previous = avatarPath;
      await updateAvatarFn({ data: { path: null } });
      if (previous) {
        await supabase.storage.from("avatars").remove([previous]).catch(() => null);
      }
      setAvatarPath(null);
      setAvatarUrl(null);
      toast.success("Foto removida. Usaremos suas iniciais como avatar.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao remover foto");
    } finally {
      setUploadingAvatar(false);
    }
  }

  const digits = stripCpf(cpf);
  const cpfValid = isValidCpf(digits);
  const remaining = 11 - digits.length;

  const nameOk = fullName.trim().length >= 3;
  const phoneDigits = phone.replace(/\D/g, "");
  const phoneOk = phoneDigits.length >= 10;
  const zipDigits = address.zip.replace(/\D/g, "");
  const zipOk = zipDigits.length === 0 || zipDigits.length === 8;
  const profileOk = nameOk && phoneOk && zipOk;

  async function handleSaveCpf(e: React.FormEvent) {
    e.preventDefault();
    if (!cpfValid || savingCpf) return;
    setSavingCpf(true);
    setCpfError(null);
    try {
      await updateCpfFn({ data: { cpf: digits } });
      toast.success("CPF atualizado.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao salvar CPF";
      setCpfError(msg);
    } finally {
      setSavingCpf(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profileOk || savingProfile) return;
    setSavingProfile(true);
    setProfileError(null);
    try {
      await updateProfileFn({
        data: {
          fullName: fullName.trim(),
          phone: phoneDigits,
          address: {
            zip: zipDigits,
            street: address.street,
            number: address.number,
            district: address.district,
            city: address.city,
            state: address.state,
          },
        },
      });
      toast.success("Perfil atualizado.");
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Falha ao salvar perfil");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleCepBlur() {
    if (zipDigits.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${zipDigits}/json/`);
      const data = (await res.json()) as {
        erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string;
      };
      if (data.erro) return;
      setAddress((a) => ({
        ...a,
        street: data.logradouro ?? a.street,
        district: data.bairro ?? a.district,
        city: data.localidade ?? a.city,
        state: data.uf ?? a.state,
      }));
    } catch {
      /* silencioso */
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 md:px-6">
        <PageHeader
          breadcrumbs={[{ label: "Início", to: "/app" }, { label: "Meu perfil" }]}
          title="Meu perfil"
          description="Aqui você troca sua foto, ajusta seus dados e escolhe como quer ver os preços."
        />
        <div className="grid gap-3 pb-4 md:grid-cols-[1fr_2fr]">
          <div className="rounded-2xl border border-border bg-card p-4 text-center">
            <div className="relative mx-auto h-24 w-24">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-[oklch(0.36_0.11_255)] font-display text-4xl text-primary-foreground shadow-[0_10px_24px_-12px_oklch(0.44_0.12_252/0.55)] ring-1 ring-inset ring-accent/30">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Foto de perfil" className="h-full w-full object-cover" />
                ) : (
                  (fullName.trim()[0] ?? "?").toUpperCase()
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                aria-label="Trocar foto de perfil"
                className="absolute bottom-0 right-0 grid h-8 w-8 place-items-center rounded-full bg-accent text-accent-foreground shadow-md ring-2 ring-card transition-transform hover:scale-105 disabled:opacity-60"
              >
                {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleAvatarFile(f);
                  e.target.value = "";
                }}
              />
            </div>
            <div className="mt-3 flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="text-[11px] font-semibold uppercase tracking-widest text-primary hover:underline disabled:opacity-50"
              >
                {avatarPath ? "Trocar foto" : "Enviar foto"}
              </button>
              {avatarPath && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={uploadingAvatar}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-destructive hover:underline disabled:opacity-50"
                >
                  <Trash2 className="h-3 w-3" /> Remover foto
                </button>
              )}
              {!avatarPath && (
                <p className="text-[11px] text-muted-foreground">
                  Sem foto — usamos as iniciais do seu nome.
                </p>
              )}
            </div>
            <p className="mt-4 font-display text-2xl text-foreground">
              {fullName || "Sua conta"}
            </p>
            <p className="text-sm text-muted-foreground">
              {digits ? maskCpf(digits) : "sem CPF cadastrado"}
            </p>
            {/* status real de assinatura fica no SubscriptionStatusCard abaixo */}
            {(address.city || address.state) && (
              <p className="mt-6 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> {address.city}
                {address.state ? ` · ${address.state}` : ""}
              </p>
            )}
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <MetricBox
                icon={Award}
                label="Contribuições"
                value={s ? s.contributionsCount.toLocaleString("pt-BR") : "…"}
                note={s ? (s.contributionsCount > 0 ? "scans + denúncias" : "envie sua 1ª nota") : "carregando"}
              />
              <MetricBox
                icon={Heart}
                label="Favoritos"
                value={s ? s.favoritesCount.toLocaleString("pt-BR") : "…"}
                note={s && s.favoritesCount > 0 ? "produtos salvos" : "nada favoritado"}
              />
              <MetricBox
                icon={Sparkles}
                label="Economia (90d)"
                value={s ? fmtBrl(s.totalSavings) : "…"}
                note={
                  s
                    ? s.totalSavings > 0
                      ? "escolhendo o menor preço"
                      : s.potentialSavings > 0
                        ? `poderia poupar ${fmtBrl(s.potentialSavings)}`
                        : "sem dados suficientes"
                    : "carregando"
                }
              />
              <AdminPanel />

            </div>

            {/* CPF */}
            <form onSubmit={handleSaveCpf} className="rounded-2xl border border-border bg-card p-4">
              <p className="font-display text-lg text-foreground">CPF</p>
              <p className="mt-1 text-xs text-muted-foreground">
                É o número que você usa para entrar na sua conta.
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start">
                <label className="flex-1">
                  <div className="relative">
                    <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={maskCpf(cpf)}
                      onChange={(e) => { setCpf(stripCpf(e.target.value)); setCpfError(null); }}
                      placeholder="000.000.000-00"
                      inputMode="numeric"
                      autoComplete="off"
                      className="h-11 w-full rounded-full border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
                    />
                  </div>
                  <CpfHint digits={digits} valid={cpfValid} remaining={remaining} error={cpfError} />
                </label>
                <button
                  type="submit"
                  disabled={!cpfValid || savingCpf}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingCpf ? <Loader2 className="h-4 w-4 animate-spin" /> : (<><Check className="h-4 w-4" /> Salvar</>)}
                </button>
              </div>
            </form>

            {/* Nome, telefone, endereço */}
            <form onSubmit={handleSaveProfile} className="rounded-2xl border border-border bg-card p-4 space-y-4">
              <div>
                <p className="font-display text-lg text-foreground">Dados pessoais</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Deixe tudo certinho para a gente te mandar os melhores avisos de preço.
                </p>
              </div>

              <ProfileField label="Nome completo" icon={User} value={fullName} onChange={setFullName}>
                {fullName.length > 0 && !nameOk && (
                  <InlineError>Escreva seu nome completo (pelo menos 3 letras).</InlineError>
                )}
              </ProfileField>

              <ProfileField
                label="Celular" icon={Phone} placeholder="(00) 00000-0000"
                value={maskPhone(phone)}
                onChange={(v) => setPhone(v.replace(/\D/g, ""))}
                inputMode="tel"
              >
                {phone.length > 0 && !phoneOk && (
                  <InlineError>Celular inválido — inclua DDD e número.</InlineError>
                )}
              </ProfileField>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <ProfileField
                    label="CEP" placeholder="00000-000"
                    value={maskCep(address.zip)}
                    onChange={(v) => setAddress({ ...address, zip: v.replace(/\D/g, "") })}
                    onBlur={handleCepBlur}
                    inputMode="numeric"
                  />
                  {address.zip.length > 0 && !zipOk && (
                    <InlineError>CEP deve ter 8 dígitos.</InlineError>
                  )}
                </div>
                <div className="col-span-2">
                  <ProfileField
                    label="Rua" icon={MapPin} placeholder="Rua / Avenida"
                    value={address.street}
                    onChange={(v) => setAddress({ ...address, street: v })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <ProfileField
                  label="Número" placeholder="123"
                  value={address.number}
                  onChange={(v) => setAddress({ ...address, number: v })}
                />
                <div className="col-span-2">
                  <ProfileField
                    label="Bairro" placeholder="Bairro"
                    value={address.district}
                    onChange={(v) => setAddress({ ...address, district: v })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <ProfileField
                    label="Cidade" placeholder="Cidade"
                    value={address.city}
                    onChange={(v) => setAddress({ ...address, city: v })}
                  />
                </div>
                <ProfileField
                  label="UF" placeholder="UF"
                  value={address.state}
                  onChange={(v) => setAddress({ ...address, state: v.toUpperCase().slice(0, 2) })}
                />
              </div>

              {profileError && <InlineError>{profileError}</InlineError>}

              <button
                type="submit"
                disabled={!profileOk || savingProfile}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : (<><Check className="h-4 w-4" /> Salvar alterações</>)}
              </button>
            </form>

            <div className="rounded-2xl border border-border bg-card">
              <div className="border-b border-border px-4 py-3">
                <p className="font-display text-lg text-foreground">Minha lista de compras</p>
              </div>
              <ul className="divide-y divide-border">
                {["Arroz Tio João 5kg", "Café Pilão 500g", "Leite Piracanjuba 1L", "Óleo Soya 900ml"].map((n) => (
                  <li key={n} className="flex items-center justify-between px-6 py-3 text-sm">
                    <span className="text-foreground">{n}</span>
                    <Link to="/comparador" className="text-xs text-savings-foreground hover:underline">
                      comparar →
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <PreferencesPanel />

            <SubscriptionStatusCard />

            <CollaboratorStatusCard />

            <div className="rounded-2xl border border-border bg-card">
              <ul className="divide-y divide-border">
                <MenuItem icon={Settings} label="Configurações da conta" />
                <MenuItem icon={MapPin} label="Endereços e raio de busca" />
                <Link to="/comprar-licenca" className="block">
                  <MenuItem icon={Sparkles} label="Gerenciar assinatura Premium" />
                </Link>
                <SignOutMenuItem />
              </ul>
            </div>

            <MyStoreQuotesPanel />
            <MyReportsPanel />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function CpfHint({ digits, valid, remaining, error }: { digits: string; valid: boolean; remaining: number; error: string | null }) {
  if (error) return <InlineError>{error}</InlineError>;
  if (digits.length === 0) return null;
  const isIncomplete = digits.length < 11;
  return (
    <p
      className={`mt-1.5 pl-1 text-[11px] font-medium ${
        isIncomplete ? "text-muted-foreground" : valid ? "text-primary" : "text-destructive"
      }`}
      aria-live="polite"
    >
      {isIncomplete
        ? `Digite os ${remaining} dígito${remaining > 1 ? "s" : ""} restante${remaining > 1 ? "s" : ""}`
        : valid ? "✓ CPF válido" : "CPF inválido — verifique os dígitos"}
    </p>
  );
}

function InlineError({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1.5 pl-1 text-[11px] font-medium text-destructive" aria-live="polite">
      {children}
    </p>
  );
}

function ProfileField({
  label, icon: Icon, placeholder, value, onChange, onBlur, inputMode, children,
}: {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  children?: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-foreground">{label}</span>
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        )}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          inputMode={inputMode}
          className={
            "h-11 w-full rounded-full border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none " +
            (Icon ? "pl-9 pr-3" : "px-3")
          }
        />
      </div>
      {children}
    </label>
  );
}

function MetricBox({
  icon: Icon, label, value, note, tone = "accent",
}: {
  icon: LucideIcon;
  label: string; value: string; note: string;
  tone?: "surface" | "primary" | "accent";
}) {
  return (
    <div className="group rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/60">
      <IconTile icon={Icon} tone={tone} size="sm" density="regular" interactive />
      <p className="mt-3 font-mono text-2xl font-medium text-foreground">{value}</p>
      <p className="mt-1 text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

function MenuItem({
  icon: Icon, label, tone,
}: {
  icon: LucideIcon;
  label: string;
  tone?: "destructive";
}) {
  return (
    <li>
      <button
        className={
          "group flex w-full items-center gap-3 px-6 py-3.5 text-left text-sm transition-colors hover:bg-muted/50 " +
          (tone === "destructive" ? "text-destructive" : "text-foreground")
        }
      >
        <IconTile icon={Icon} size="md" tone="surface" density="regular" interactive />
        <span className="font-medium">{label}</span>
      </button>
    </li>
  );
}

function SignOutMenuItem() {
  const { signOut, loading } = useSignOut();
  return (
    <li>
      <button
        type="button"
        onClick={signOut}
        disabled={loading}
        className="group flex w-full items-center gap-3 px-6 py-3.5 text-left text-sm text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
      >
        {loading ? (
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-destructive/10 ring-1 ring-inset ring-destructive/30">
            <Loader2 className="h-5 w-5 animate-spin text-destructive" />
          </span>
        ) : (
          <IconTile icon={LogOut} size="md" tone="surface" density="regular" interactive />
        )}
        <span className="font-medium">{loading ? "Saindo..." : "Sair"}</span>
      </button>
    </li>
  );
}

/* ===================== Meus reportes de preço ===================== */

function MyReportsPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-price-reports", "all"],
    queryFn: () => listMyPriceReports({ data: {} }),
    staleTime: 15_000,
    retry: false,
  });

  if (isLoading) return null;
  if (!data || data.length === 0) return null;

  const REASON: Record<string, string> = {
    outdated: "Desatualizado",
    incorrect: "Valor incorreto",
    wrong_product: "Produto errado",
    other: "Outro",
  };
  const STATUS: Record<string, { label: string; classes: string }> = {
    pending: { label: "Em análise", classes: "bg-muted text-muted-foreground" },
    reviewed: { label: "Revisado", classes: "bg-primary/15 text-primary" },
    resolved: { label: "Resolvido", classes: "bg-savings/15 text-savings" },
    rejected: { label: "Rejeitado", classes: "bg-destructive/10 text-destructive" },
  };

  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
          Meus reportes de preço
        </h2>
        <span className="text-[11px] text-muted-foreground">{data.length} total</span>
      </div>
      <ul className="space-y-2">
        {data.slice(0, 8).map((r) => {
          const meta = STATUS[r.status] ?? STATUS.pending;
          return (
            <li
              key={r.id}
              className="rounded-xl border border-border bg-background p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-semibold text-foreground">
                    {r.productName}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {r.establishmentName ?? "—"} · {REASON[r.reason] ?? r.reason} ·{" "}
                    {new Date(r.createdAt).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </p>
                </div>
                <span
                  className={
                    "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider " +
                    meta.classes
                  }
                >
                  {meta.label}
                </span>
              </div>
              {r.adminNotes && (
                <p className="mt-1.5 rounded-md bg-muted/60 px-2 py-1 text-[11px] text-foreground">
                  <span className="font-semibold">Admin:</span> {r.adminNotes}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ===================== Minhas cotações salvas ===================== */

function MyStoreQuotesPanel() {
  const fetchFn = useServerFn(listMyStoreQuotes);
  const delFn = useServerFn(deleteStoreQuote);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["my-store-quotes"],
    queryFn: () => fetchFn(),
    staleTime: 15_000,
    retry: false,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-store-quotes"] });
      toast.success("Cotação removida");
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Falha ao remover");
    },
  });

  if (isLoading) return null;
  if (!data || data.length === 0) return null;

  const fmt = (n: number) => `R$ ${n.toFixed(2).replace(".", ",")}`;

  async function copyShareLink(id: string) {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/cotacao/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado");
    } catch {
      toast.message(url);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold tracking-tight text-foreground">
          <ShoppingBag className="h-4 w-4 text-primary" /> Minhas cotações salvas
        </h2>
        <span className="text-[11px] text-muted-foreground">{data.length} total</span>
      </div>
      <ul className="space-y-2">
        {data.map((q) => (
          <li key={q.id} className="rounded-xl border border-border bg-background p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[12.5px] font-semibold text-foreground">
                  {q.storeName}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {q.itemCount} {q.itemCount === 1 ? "item" : "itens"} ·{" "}
                  <span className="num font-semibold text-foreground"><Price value={q.total} size="sm" /></span> ·{" "}
                  {new Date(q.createdAt).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                  })}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Link
                  to="/cotacao/$id"
                  params={{ id: q.id }}
                  aria-label="Abrir cotação"
                  className="grid h-8 w-8 place-items-center rounded-full text-primary hover:bg-primary/10"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
                {q.isPublic && (
                  <button
                    type="button"
                    onClick={() => copyShareLink(q.id)}
                    aria-label="Copiar link público"
                    className="rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary hover:bg-primary/10"
                  >
                    Link
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove.mutate(q.id)}
                  disabled={remove.isPending}
                  aria-label="Remover cotação"
                  className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AdminExportPanel() {
  // Removido - agora faz parte do AdminPanel
  return null;
}

function AdminMetricsPanel() {
  const fetchMetrics = useServerFn(getAdminMetrics);
  const { data, isLoading } = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: () => fetchMetrics(),
    refetchInterval: 300000 // 5 min
  });

  if (isLoading || !data) return (
    <div className="animate-pulse rounded-2xl border border-border bg-card p-4 space-y-4">
      <div className="h-4 w-32 bg-muted rounded" />
      <div className="grid grid-cols-2 gap-2">
        <div className="h-16 bg-muted rounded-xl" />
        <div className="h-16 bg-muted rounded-xl" />
      </div>
    </div>
  );

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold flex items-center gap-2 text-foreground">
          <BarChart3 className="h-4 w-4 text-primary" /> Métricas do Ecossistema
        </h3>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Live</span>
      </div>
      
      <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-background border border-border">
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Produtos</p>
          <p className="text-xl font-mono font-medium mt-1">{data.totalProducts}</p>
        </div>
        <div className="p-3 rounded-xl bg-background border border-border">
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Lojas</p>
          <p className="text-xl font-mono font-medium mt-1">{data.establishments.length}</p>
        </div>
        <div className="p-3 rounded-xl bg-background border border-border">
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Categorias</p>
          <p className="text-xl font-mono font-medium mt-1">{data.categories.length}</p>
        </div>
        <div className="p-3 rounded-xl bg-background border border-border">
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Status</p>
          <p className="text-xs font-bold text-savings mt-2 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> OTIMIZADO
          </p>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="text-[11px] font-bold text-muted-foreground mb-2 flex items-center gap-1 uppercase">
          <Store className="h-3 w-3" /> Inventário por Loja
        </div>
        <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
          {data.establishments.slice(0, 10).map(e => (
            <div key={e.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/50 last:border-0">
              <span className="truncate max-w-[150px] font-medium">{e.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">{e.productCount} itens</span>
                <span className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                   <div 
                    className="h-full bg-primary" 
                    style={{ width: `${Math.min(100, (e.productCount / data.totalProducts) * 500)}%` }} 
                  />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CatalogReviewPanel() {
  const fetchPending = useServerFn(getPendingClassification);
  const updateClass = useServerFn(updateProductClassification);
  const qc = useQueryClient();
  
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['pending-catalog'],
    queryFn: () => fetchPending(),
  });

  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const categories = ['Mercearia', 'Açougue', 'Bebidas', 'Limpeza', 'Higiene', 'Hortifruti', 'Padaria', 'Laticínios', 'Infantil', 'Farmácia', 'Outros'];

  async function handleUpdate(productId: string, category: string) {
    try {
      await updateClass({ data: { productId, category } });
      toast.success("Classificação atualizada!");
      qc.invalidateQueries({ queryKey: ['pending-catalog'] });
      qc.invalidateQueries({ queryKey: ['admin-metrics'] });
    } catch (e) {
      toast.error("Erro ao salvar classificação");
    }
  }

  if (isLoading || !data || data.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="p-4 border-b border-border bg-amber-50/50 dark:bg-amber-950/10 flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-500">
          <Sparkles className="h-4 w-4" /> Revisão de IA do Catálogo
        </h3>
        <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-500 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
          {data.length} Pendentes
        </span>
      </div>
      
      <div className="divide-y divide-border">
        {data.slice(0, 3).map(p => (
          <div key={p.id} className="p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{p.display_name}</p>
                <p className="text-[11px] text-muted-foreground italic">Sugestão: {p.category || 'Não definida'}</p>
              </div>
              <button 
                onClick={() => setReviewingId(reviewingId === p.id ? null : p.id)}
                className="text-[11px] font-bold text-primary hover:underline flex items-center"
              >
                Corrigir <ChevronRight className={`h-3 w-3 transition-transform ${reviewingId === p.id ? 'rotate-90' : ''}`} />
              </button>
            </div>
            
            {reviewingId === p.id && (
              <div className="flex flex-wrap gap-1.5 animate-in slide-in-from-top-1 duration-200">
                {categories.map(c => (
                  <button
                    key={c}
                    onClick={() => handleUpdate(p.id, c)}
                    className="text-[10px] px-2 py-1 rounded-md border border-border hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="p-3 bg-muted/20 text-center">
         <button onClick={() => refetch()} className="text-[11px] font-medium text-muted-foreground hover:text-foreground">
           Carregar mais sugestões
         </button>
      </div>
    </div>
  );
}

function AdminPanel() {
  const exportFn = useServerFn(downloadFullDatabase);
  const organizeFn = useServerFn(organizeAllProducts);
  const [loading, setLoading] = useState(false);
  const [organizing, setOrganizing] = useState(false);

  const { data: roleData } = useQuery({
    queryKey: ['my-roles'],
    queryFn: async () => {
      const { data } = await supabase.from('user_roles').select('role').eq('role', 'admin').maybeSingle();
      return data;
    }
  });

  if (!roleData) return null;

  async function handleExport() {
    setLoading(true);
    try {
      const result = await exportFn();
      if ('error' in result) throw new Error(result.error as string);
      
      const blob = new Blob([result.content], { type: result.mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Banco de dados exportado com sucesso!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha na exportação");
    } finally {
      setLoading(false);
    }
  }

  async function handleOrganize() {
    setOrganizing(true);
    try {
      const res = await organizeFn();
      toast.success(`Produtos organizados! ${res.updatedCount} itens reclassificados.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha na organização");
    } finally {
      setOrganizing(false);
    }
  }

  return (
    <div className="col-span-3 mt-2 flex flex-col gap-3">
      <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold text-indigo-900 dark:text-indigo-300">Integração de Agentes (MCP)</h3>
            <p className="text-[11px] text-muted-foreground">Conecte fontes de dados externas ao assistente inteligente.</p>
          </div>
        </div>
        <button 
          onClick={() => toast.info("Integração MCP ativa. Use o chat para configurar servidores.")}
          className="bg-indigo-600 text-white px-4 py-2 rounded-full text-xs font-bold transition-all hover:bg-indigo-700 active:scale-95"
        >
          Configurar
        </button>
      </div>
      <AdminMetricsPanel />
      <CatalogReviewPanel />
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between">
        <div>
          <h3 className="font-display text-sm font-semibold flex items-center gap-2 text-primary">
            <Database className="h-4 w-4" /> Exportação e Organização
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Gerencie o banco de dados e as categorias globais.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleOrganize}
            disabled={organizing}
            className="flex items-center gap-2 bg-[oklch(0.36_0.11_255)] text-white px-4 py-2 rounded-full text-xs font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {organizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Organizar
          </button>
          <button
            onClick={handleExport}
            disabled={loading}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-xs font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Exportar
          </button>
        </div>
      </div>
    </div>
  );
}
