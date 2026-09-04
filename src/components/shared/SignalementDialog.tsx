import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Flag } from "lucide-react";
import { submitSignalement } from "@/lib/support/signalement.functions";

interface SignalementDialogProps {
  contextUrl?: string;
  triggerLabel?: string;
  variant?: "ghost" | "outline" | "destructive";
  size?: "sm" | "default";
}

export function SignalementDialog({
  contextUrl,
  triggerLabel = "Signaler un problème",
  variant = "ghost",
  size = "sm",
}: SignalementDialogProps) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setLoading(true);
    try {
      await submitSignalement({ subject: subject.trim(), message: message.trim(), contextUrl });
      toast.success("Signalement envoyé. L'équipe vous répondra rapidement.");
      setOpen(false);
      setSubject("");
      setMessage("");
    } catch (err) {
      toast.error("Erreur lors de l'envoi du signalement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className="gap-1.5 text-muted-foreground">
          <Flag className="h-3.5 w-3.5" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Signaler un problème</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="signal-subject">Sujet</Label>
            <Input
              id="signal-subject"
              placeholder="Ex : problème de paiement, contenu inapproprié..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={200}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="signal-message">Description</Label>
            <Textarea
              id="signal-message"
              placeholder="Décrivez le problème en détail..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
              rows={5}
              required
            />
            <p className="text-xs text-muted-foreground text-right">{message.length}/2000</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading || !subject.trim() || !message.trim()}>
              {loading ? "Envoi..." : "Envoyer le signalement"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
