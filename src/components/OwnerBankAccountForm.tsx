import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getMyBankAccount, updateMyBankAccount } from "@/lib/owner-payouts.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, AlertCircle } from "lucide-react";

export function OwnerBankAccountForm() {
  const fetchAccount = useServerFn(getMyBankAccount);
  const updateAccount = useServerFn(updateMyBankAccount);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ iban: "", bic: "", account_holder: "" });
  const [saved, setSaved] = useState({ iban: "", bic: "", account_holder: "" });

  useEffect(() => {
    fetchAccount()
      .then((a) => {
        const v = { iban: a.iban ?? "", bic: a.bic ?? "", account_holder: a.account_holder ?? "" };
        setForm(v);
        setSaved(v);
        setEditing(!a.iban);
      })
      .finally(() => setLoading(false));
  }, [fetchAccount]);

  const save = async () => {
    setSaving(true); setError(null); setSuccess(false);
    try {
      await updateAccount({ data: form });
      setSaved(form);
      setEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  const hasIban = !!saved.iban;
  const masked = saved.iban ? `${saved.iban.slice(0, 4)} •••• •••• ${saved.iban.slice(-4)}` : "";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {hasIban && !editing ? (
            <><CheckCircle2 className="h-5 w-5 text-emerald-600" /> Compte bancaire enregistré</>
          ) : (
            <><AlertCircle className="h-5 w-5 text-amber-600" /> Renseigner mon IBAN</>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasIban && !editing ? (
          <>
            <p className="text-sm text-muted-foreground">
              Vos revenus de campagne (70 % du prix par jour) seront virés sur ce compte à la fin de chaque diffusion.
            </p>
            <div className="rounded-lg border border-border bg-secondary/30 p-3 text-sm font-mono">{masked}</div>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Modifier</Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Pour recevoir vos revenus (70 % du prix de chaque campagne, MoveSpot conserve 30 %), renseignez votre IBAN. Les virements sont effectués 1× par semaine après la fin de chaque diffusion.
            </p>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Titulaire du compte"
                value={form.account_holder}
                onChange={(e) => setForm({ ...form, account_holder: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="IBAN (FR76 ...)"
                value={form.iban}
                onChange={(e) => setForm({ ...form, iban: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
              />
              <input
                type="text"
                placeholder="BIC"
                value={form.bic}
                onChange={(e) => setForm({ ...form, bic: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && <p className="text-sm text-emerald-600">✓ Coordonnées enregistrées</p>}
            <div className="flex gap-2">
              <Button onClick={save} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
              {hasIban && <Button variant="outline" onClick={() => { setEditing(false); setForm(saved); }}>Annuler</Button>}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
