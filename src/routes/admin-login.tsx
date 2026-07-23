import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shield, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMyRoles } from "@/hooks/useMyRoles";

export const Route = createFileRoute("/admin-login")({
  head: () => ({
    meta: [
      { title: "Portal Interno — PreçoCerto" },
      { name: "description", content: "Acesso interno protegido do PreçoCerto." },
      { property: "og:title", content: "Portal Interno — PreçoCerto" },
      { property: "og:description", content: "Acesso interno protegido do PreçoCerto." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, loading: roleLoading, isAdmin } = useMyRoles();

  useEffect(() => {
    if (roleLoading || !user) return;
    navigate({ to: isAdmin ? "/admin" : "/app", replace: true });
  }, [roleLoading, user, isAdmin, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInErr) {
        setError("E-mail ou senha inválidos.");
        return;
      }
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setError("Não foi possível validar o acesso.");
        return;
      }
      const { data: hasAdminRole } = await supabase.rpc("has_role", {
        _user_id: userData.user.id,
        _role: "admin",
      });
      toast.success("Acesso validado com sucesso");
      navigate({ to: hasAdminRole ? "/admin" : "/app", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao entrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para o site
        </Link>

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {/* Hero navy — alinhado à homepage (Ocean Modern) */}
          <div
            className="relative px-8 py-6 text-white"
            style={{
              background: "linear-gradient(135deg, #081b3a 0%, #0f2b52 55%, #1e4a85 100%)",
              fontFamily: "'Outfit', system-ui, sans-serif",
            }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-25 blur-3xl"
              style={{ background: "#f5b301" }}
            />
            <div className="relative flex items-center gap-3">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-lg"
                style={{ background: "#f5b301", color: "#0f2b52" }}
              >
                <Shield className="h-5 w-5" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-[0.22em] text-white/70">
                  PreçoCerto
                </p>
                <h1 className="text-lg font-bold leading-tight tracking-tight">
                  Portal Interno
                </h1>
              </div>
            </div>
            <p className="relative mt-3 text-[12.5px] leading-relaxed text-white/80">
              Acesso protegido para a equipe. Suas ações ficam registradas na auditoria.
            </p>
          </div>

          <div className="p-8">
            <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="admin-email" className="text-sm font-medium text-foreground">
                E-mail
              </label>
              <input
                id="admin-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="admin@exemplo.com"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="admin-password" className="text-sm font-medium text-foreground">
                Senha
              </label>
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Entrando…
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4" />
                  Entrar no portal
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            É cliente?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Ir para o login de usuário
            </Link>
          </p>
          </div>
        </div>
      </div>
    </div>
  );
}
