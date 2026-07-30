import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, CheckCircle2, XCircle, Wallet, Zap } from "lucide-react";
import {
  getMpConfig, saveMpConfig, testMpConnection,
} from "@/lib/mp-config.functions";

export function PaymentsTab() {
  const qc = useQueryClient();
  const fetchCfg = useServerFn(getMpConfig);
  const saveFn = useServerFn(saveMpConfig);
  const testFn = useServerFn(testMpConnection);

  const { data: cfg, isLoading } = useQuery({
    queryKey: ["mp-config"],
    queryFn: () => fetchCfg(),
  });

  const [accessToken, setAccessToken] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [publicKey, setPublicKey] = useState<string>("");
  const [environment, setEnvironment] = useState<"sandbox" | "production">("production");
  const [pixEnabled, setPixEnabled] = useState(true);
  const [pixOnly, setPixOnly] = useState(false);
  const [initialized, setInitialized] = useState(false);

  if (cfg && !initialized) {
    setPublicKey(cfg.publicKey ?? "");
    setEnvironment(cfg.environment);
    setPixEnabled(cfg.pixEnabled);
    setPixOnly(cfg.pixOnly);
    setInitialized(true);
  }

  const save = useMutation({
    mutationFn: async () =>
      saveFn({
        data: {
          accessToken: accessToken || undefined,
          webhookSecret: webhookSecret || undefined,
          publicKey: publicKey || undefined,
          environment,
          pixEnabled,
          pixOnly,
        },
      }),
    onSuccess: () => {
      toast.success("Configuração salva");
      setAccessToken("");
      setWebhookSecret("");
      qc.invalidateQueries({ queryKey: ["mp-config"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao salvar"),
  });

  const test = useMutation({
    mutationFn: async () => testFn(),
    onSuccess: (r) => {
      if (r.ok) toast.success(`Conectado como ${r.account}`);
      else toast.error(`Falha: ${r.error}`);
    },
  });

  if (isLoading) {
    return (
      <Card className="p-6 text-center">
        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Wallet className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">Mercado Pago — credenciais</h2>
          {cfg?.hasAccessToken ? (
            <Badge variant="default" className="ml-auto gap-1">
              <CheckCircle2 className="w-3 h-3" /> Configurado
            </Badge>
          ) : (
            <Badge variant="destructive" className="ml-auto gap-1">
              <XCircle className="w-3 h-3" /> Não configurado
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Encontre suas credenciais em{" "}
          <a
            href="https://www.mercadopago.com.br/developers/panel/app"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-foreground"
          >
            mercadopago.com.br/developers/panel/app
          </a>
          . Ao salvar, o token substitui a variável de ambiente e é usada em
          todos os checkouts (assinatura mensal e códigos de licença).
        </p>

        <div className="grid gap-3">
          <div>
            <Label>Access Token {cfg?.accessTokenMasked && (
              <span className="text-xs text-muted-foreground font-mono ml-2">
                atual: {cfg.accessTokenMasked}
              </span>
            )}</Label>
            <Input
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder={cfg?.hasAccessToken ? "Deixe vazio para manter o atual" : "APP_USR-..."}
              autoComplete="off"
            />
            <p className="text-[12.5px] text-muted-foreground mt-1">
              Use <code>-</code> para remover o token salvo.
            </p>
          </div>

          <div>
            <Label>Webhook Secret {cfg?.webhookSecretMasked && (
              <span className="text-xs text-muted-foreground font-mono ml-2">
                atual: {cfg.webhookSecretMasked}
              </span>
            )}</Label>
            <Input
              type="password"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder={cfg?.hasWebhookSecret ? "Deixe vazio para manter o atual" : "Chave secreta do painel MP"}
              autoComplete="off"
            />
            <p className="text-[12.5px] text-muted-foreground mt-1">
              Configure a URL do webhook no painel MP como <code>/api/public/mercadopago/webhook</code>.
            </p>
          </div>

          <div>
            <Label>Public Key (opcional)</Label>
            <Input
              value={publicKey}
              onChange={(e) => setPublicKey(e.target.value)}
              placeholder="APP_USR-... (para brick de checkout)"
            />
          </div>

          <div>
            <Label>Ambiente</Label>
            <Select value={environment} onValueChange={(v) => setEnvironment(v as "sandbox" | "production")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="production">Produção (dinheiro real)</SelectItem>
                <SelectItem value="sandbox">Sandbox (testes)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">Pagamento PIX</h2>
        </div>

        <div className="flex items-start justify-between py-3 border-b">
          <div>
            <div className="font-medium">Priorizar PIX no checkout</div>
            <div className="text-xs text-muted-foreground">
              PIX aparece como método de pagamento padrão.
            </div>
          </div>
          <Switch checked={pixEnabled} onCheckedChange={setPixEnabled} />
        </div>

        <div className="flex items-start justify-between py-3">
          <div>
            <div className="font-medium">Aceitar somente PIX</div>
            <div className="text-xs text-muted-foreground">
              Desativa cartão de crédito, débito e boleto no checkout MP.
            </div>
          </div>
          <Switch checked={pixOnly} onCheckedChange={setPixOnly} disabled={!pixEnabled} />
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => save.mutate()}
          disabled={save.isPending}
        >
          {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar configuração"}
        </Button>
        <Button
          variant="outline"
          disabled={!cfg?.hasAccessToken || test.isPending}
          onClick={() => test.mutate()}
        >
          {test.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Testar conexão"}
        </Button>
        {cfg?.updatedAt && (
          <span className="ml-auto text-xs text-muted-foreground self-center">
            atualizado em {new Date(cfg.updatedAt).toLocaleString("pt-BR")}
          </span>
        )}
      </div>
    </div>
  );
}
