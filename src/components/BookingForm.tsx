import { useState, useMemo } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import type { Spot } from "./AdSpots";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const FORBIDDEN_KEYWORDS = [
  "religion", "religieux", "religieuse", "église", "eglise", "mosquée", "mosquee", "synagogue", "temple",
  "dieu", "allah", "jésus", "jesus", "christ", "bouddha", "ramadan", "pâques", "paques", "noël", "noel",
  "hanouka", "aïd", "aid", "baptême", "bapteme", "communion",
  "sexiste", "misogyne", "machiste", "femme à la cuisine", "infériorité",
  "porno", "pornographique", "xxx", "nudité", "nudite", "sexe", "escort", "érotique", "erotique",
  "violence", "violent", "tuer", "meurtre", "arme", "sang", "agression", "frapper", "battre",
  "politique", "parti", "élection", "election", "candidat", "candidate", "campagne électorale",
  "vote", "voter", "scrutin", "président", "presidente", "député", "depute", "sénateur", "senateur",
  "maire", "ministre", "gouvernement", "république", "republique", "extrême droite", "extreme droite",
  "extrême gauche", "extreme gauche",
];

type Props = {
  spot: Spot | null;
  onClose: () => void;
};

export function BookingForm({ spot, onClose }: Props) {
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [accepted, setAccepted] = useState(false);
  const [status, setStatus] = useState<"idle" | "rejected" | "success" | "loading">("idle");
  const [reason, setReason] = useState("");

  const { days, total } = useMemo(() => {
    if (!startDate || !endDate || !spot) return { days: 0, total: 0 };
    const ms = endDate.getTime() - startDate.getTime();
    const d = Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
    if (d <= 0) return { days: 0, total: 0 };
    return { days: d, total: d * spot.price };
  }, [startDate, endDate, spot]);

  if (!spot) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const lower = message.toLowerCase();
    const match = FORBIDDEN_KEYWORDS.find((k) => lower.includes(k));
    if (match) {
      setStatus("rejected");
      setReason(`Contenu interdit détecté : « ${match} ». Les publicités religieuses, sexistes, pornographiques ou incitant à la violence ne sont pas acceptées.`);
      return;
    }
    if (!startDate || !endDate) {
      setStatus("rejected");
      setReason("Veuillez sélectionner une date de début et une date de fin.");
      return;
    }
    if (days <= 0) {
      setStatus("rejected");
      setReason("La date de fin doit être postérieure ou égale à la date de début.");
      return;
    }
    if (!accepted) {
      setStatus("rejected");
      setReason("Vous devez accepter la charte de contenu.");
      return;
    }
    setStatus("loading");
    const { error } = await supabase.from("campaign_requests").insert({
      spot_id: String(spot.id),
      spot_name: spot.name,
      spot_location: spot.location,
      spot_price: spot.price,
      company,
      email,
      message,
      start_date: format(startDate, "yyyy-MM-dd"),
      end_date: format(endDate, "yyyy-MM-dd"),
      days_count: days,
      total_price: total,
    });
    if (error) {
      setStatus("rejected");
      setReason("Erreur lors de l'envoi. Veuillez réessayer.");
      return;
    }
    setStatus("success");
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 shadow-elevated max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {status === "success" ? (
          <div className="text-center py-8">
            <div className="mx-auto h-16 w-16 rounded-full bg-signal/20 flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-signal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="font-display text-2xl font-bold mb-2">Demande envoyée</h3>
            <p className="text-muted-foreground mb-6">Votre campagne pour <strong>{spot.name}</strong> est en cours de validation. Vous recevrez une réponse sous 24h.</p>
            <button onClick={onClose} className="rounded-lg bg-primary text-primary-foreground px-6 py-2.5 font-medium">Fermer</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Réservation</div>
                <h3 className="font-display text-2xl font-bold">{spot.name}</h3>
                <p className="text-sm text-muted-foreground">{spot.location} · {spot.price}€/jour</p>
              </div>
              <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground text-2xl leading-none">×</button>
            </div>

            <div className="space-y-4">
              <Field label="Entreprise" value={company} onChange={setCompany} placeholder="Nom de votre entreprise" required />
              <Field label="Email professionnel" value={email} onChange={setEmail} placeholder="contact@entreprise.com" type="email" required />

              <div className="grid grid-cols-2 gap-3">
                <DateField label="Date de début" value={startDate} onChange={(d) => { setStartDate(d); setStatus("idle"); if (endDate && d && endDate < d) setEndDate(undefined); }} minDate={today} />
                <DateField label="Date de fin" value={endDate} onChange={(d) => { setEndDate(d); setStatus("idle"); }} minDate={startDate ?? today} />
              </div>

              {days > 0 && (
                <div className="rounded-lg bg-secondary/50 border border-border p-4 flex items-center justify-between">
                  <div className="text-sm">
                    <div className="text-muted-foreground">{days} jour{days > 1 ? "s" : ""} × {spot.price}€</div>
                    <div className="font-display text-xs uppercase tracking-widest text-muted-foreground mt-1">Total</div>
                  </div>
                  <div className="font-display text-2xl font-bold">{total.toLocaleString("fr-FR")}€</div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1.5">Message de la campagne</label>
                <textarea
                  value={message}
                  onChange={(e) => { setMessage(e.target.value); setStatus("idle"); }}
                  rows={4}
                  required
                  maxLength={500}
                  placeholder="Décrivez le contenu de votre publicité..."
                  className="w-full rounded-lg bg-input border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="text-xs text-muted-foreground mt-1">{message.length}/500</div>
              </div>

              <div className="rounded-lg bg-secondary/50 p-4 text-xs text-muted-foreground border border-border">
                <div className="font-semibold text-foreground mb-2">⚠ Contenus refusés</div>
                <p>Publicités à caractère religieux ou fêtes religieuses, politique ou électoral, sexistes, pornographiques ou incitant à la violence.</p>
              </div>

              <label className="flex items-start gap-3 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => { setAccepted(e.target.checked); setStatus("idle"); }}
                  className="mt-0.5 h-4 w-4 rounded accent-primary"
                />
                <span className="text-muted-foreground">J'accepte la charte de contenu et confirme que ma publicité respecte ces règles.</span>
              </label>

              {status === "rejected" && (
                <div className="rounded-lg bg-destructive/15 border border-destructive/40 p-4 text-sm text-destructive">
                  {reason}
                </div>
              )}

              <button type="submit" disabled={status === "loading"} className="w-full rounded-lg bg-primary text-primary-foreground py-3 font-semibold hover:bg-primary/90 transition disabled:opacity-60">
                {status === "loading" ? "Envoi..." : "Soumettre la campagne"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", required }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg bg-input border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

function DateField({ label, value, onChange, minDate }: {
  label: string; value: Date | undefined; onChange: (d: Date | undefined) => void; minDate?: Date;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "w-full flex items-center justify-between rounded-lg bg-input border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring",
              !value && "text-muted-foreground"
            )}
          >
            {value ? format(value, "d MMM yyyy", { locale: fr }) : "Choisir"}
            <CalendarIcon className="h-4 w-4 opacity-60" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={onChange}
            disabled={(d) => (minDate ? d < minDate : false)}
            initialFocus
            locale={fr}
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
