import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserPlus, Loader2, Copy } from "lucide-react";
import { adminCreateCustomer } from "@/lib/admin-create-customer.functions";

type Result = {
  userId: string;
  email: string;
  pinCode: string;
  pinExpiresAt: string;
  inviteSent: boolean;
  resgatarPath: string;
};

export function NewCustomerDialog({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [sendInvite, setSendInvite] = useState(true);
  const [result, setResult] = useState<Result | null>(null);

  const createFn = useServerFn(adminCreateCustomer);

  const reset = () => {
    setEmail(""); setFullName(""); setCpf(""); setPhone("");
    setCity(""); setNeighborhood(""); setSendInvite(true); setResult(null);
  };

  const submit = async () => {
    setSaving(true);
    try {
      const res = await createFn({
        data: {
          email: email.trim(),
          fullName: fullName.trim(),
          cpf: cpf.trim(),
          phone: phone.trim(),
          city: city.trim() || null,
          neighborhood: neighborhood.trim() || null,
          sendInvite,
        },
      });
      setResult(res as Result);
      toast.success("Cliente criado. Repasse o código para definir o PIN.");
      onCreated?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao criar cliente");
    } finally {
      setSaving(false);
    }
  };

  const copyPin = () => {
    if (!result) return;
    void navigator.clipboard.writeText(result.pinCode);
    toast.success("Código copiado");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5"><UserPlus className="h-4 w-4" /> Novo cliente</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Cadastrar cliente manualmente</DialogTitle>
          <DialogDescription>
            Cria a conta no Auth, o perfil no banco e gera um código de definição de PIN (15 min).
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-3 rounded-md border bg-muted/40 p-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Código de PIN</div>
              <div className="mt-1 flex items-center gap-2">
                <code className="rounded bg-background px-3 py-1.5 font-mono text-2xl tracking-widest">
                  {result.pinCode}
                </code>
                <Button size="sm" variant="outline" onClick={copyPin}><Copy className="h-4 w-4" /></Button>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Expira em {new Date(result.pinExpiresAt).toLocaleTimeString("pt-BR")}.
              </div>
            </div>
            <div className="text-sm">
              <p><strong>E-mail:</strong> {result.email}</p>
              <p><strong>Invite enviado:</strong> {result.inviteSent ? "Sim" : "Não (envie o código manualmente)"}</p>
              <p><strong>Link para definir PIN:</strong> <code className="text-xs">{result.resgatarPath}</code></p>
            </div>
            <DialogFooter>
              <Button onClick={() => { setOpen(false); reset(); }}>Fechar</Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="nc-name">Nome completo *</Label>
                <Input id="nc-name" value={fullName} onChange={(e) => setFullName(e.target.value)} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="nc-cpf">CPF (só números) *</Label>
                  <Input id="nc-cpf" value={cpf} onChange={(e) => setCpf(e.target.value)} maxLength={14} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="nc-phone">Telefone</Label>
                  <Input id="nc-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="nc-email">E-mail *</Label>
                <Input id="nc-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="nc-city">Cidade</Label>
                  <Input id="nc-city" value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="nc-neigh">Bairro</Label>
                  <Input id="nc-neigh" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={sendInvite} onCheckedChange={(v) => setSendInvite(Boolean(v))} />
                Enviar e-mail com link de recuperação/definição
              </label>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
              <Button onClick={submit} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar cliente
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
