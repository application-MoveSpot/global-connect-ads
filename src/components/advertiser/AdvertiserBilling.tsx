/**
 * AdvertiserBilling
 *
 * Liste les factures PDF de l'annonceur avec téléchargement sécurisé
 * via URL signée Supabase Storage.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Loader2, ReceiptText } from "lucide-react";
import { toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as any;

interface Invoice {
  id: string;
  invoice_number: string;
  campaign_id: string;
  amount_ht: number;
  amount_ttc: number;
  vat_amount: number;
  pdf_url: string | null;
  status: string;
  created_at: string;
  campaign?: { spot_name: string } | null;
}

function fmtCurrency(amount: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount);
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function AdvertiserBilling() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const { data: invoices, isLoading } = useQuery<Invoice[]>({
    queryKey: ["advertiser-invoices"],
    queryFn: async () => {
      const { data, error } = await db
        .from("invoices")
        .select("*, campaign:campaign_requests!campaign_id(spot_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Invoice[];
    },
    staleTime: 2 * 60_000,
  });

  const handleDownload = async (invoice: Invoice) => {
    if (!invoice.pdf_url) {
      toast.error("PDF non disponible pour cette facture.");
      return;
    }
    setDownloading(invoice.id);
    try {
      const { data, error } = await supabase.storage
        .from("invoices-archive")
        .createSignedUrl(invoice.pdf_url, 300); // 5 min

      if (error || !data?.signedUrl) throw error ?? new Error("URL non générée");

      // Ouvrir dans un nouvel onglet (téléchargement natif PDF)
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error("Download error:", err);
      toast.error("Impossible de télécharger la facture. Réessayez.");
    } finally {
      setDownloading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Chargement des factures…</span>
      </div>
    );
  }

  if (!invoices || invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <ReceiptText className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <p className="font-semibold text-foreground">Aucune facture pour le moment</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Vos factures apparaîtront ici dès qu&apos;une campagne sera activée.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">
          Mes factures ({invoices.length})
        </h3>
      </div>

      {/* Mobile : cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {invoices.map((inv) => (
          <div key={inv.id} className="rounded-lg border bg-card p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-xs text-muted-foreground">{inv.invoice_number}</p>
                <p className="text-sm font-medium line-clamp-1 mt-0.5">
                  {inv.campaign?.spot_name ?? "Campagne"}
                </p>
              </div>
              <Badge
                variant={inv.status === "paid" ? "default" : "secondary"}
                className={inv.status === "paid" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : ""}
              >
                {inv.status === "paid" ? "Payée" : inv.status}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{fmtDate(inv.created_at)}</p>
                <p className="text-base font-bold text-foreground">{fmtCurrency(inv.amount_ttc)}</p>
                <p className="text-xs text-muted-foreground">HT : {fmtCurrency(inv.amount_ht)}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDownload(inv)}
                disabled={downloading === inv.id || !inv.pdf_url}
                className="shrink-0"
              >
                {downloading === inv.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span className="ml-1.5">PDF</span>
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop : table */}
      <div className="hidden md:block rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs">N° Facture</TableHead>
              <TableHead className="text-xs">Campagne</TableHead>
              <TableHead className="text-xs text-right">Montant HT</TableHead>
              <TableHead className="text-xs text-right">TVA 20%</TableHead>
              <TableHead className="text-xs text-right">Total TTC</TableHead>
              <TableHead className="text-xs text-center">Statut</TableHead>
              <TableHead className="text-xs text-right">PDF</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((inv) => (
              <TableRow key={inv.id} className="hover:bg-muted/20 transition-colors">
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {fmtDate(inv.created_at)}
                </TableCell>
                <TableCell className="font-mono text-xs">{inv.invoice_number}</TableCell>
                <TableCell className="text-sm max-w-[160px] truncate">
                  {inv.campaign?.spot_name ?? "—"}
                </TableCell>
                <TableCell className="text-sm text-right tabular-nums">
                  {fmtCurrency(inv.amount_ht)}
                </TableCell>
                <TableCell className="text-sm text-right tabular-nums text-muted-foreground">
                  {fmtCurrency(inv.vat_amount)}
                </TableCell>
                <TableCell className="text-sm text-right tabular-nums font-semibold">
                  {fmtCurrency(inv.amount_ttc)}
                </TableCell>
                <TableCell className="text-center">
                  <Badge
                    variant="secondary"
                    className={
                      inv.status === "paid"
                        ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                        : inv.status === "cancelled"
                          ? "bg-red-100 text-red-700 border border-red-200"
                          : "bg-amber-100 text-amber-700 border border-amber-200"
                    }
                  >
                    {inv.status === "paid"
                      ? "Payée"
                      : inv.status === "cancelled"
                        ? "Annulée"
                        : "En attente"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDownload(inv)}
                    disabled={downloading === inv.id || !inv.pdf_url}
                    title={inv.pdf_url ? "Télécharger la facture PDF" : "PDF non disponible"}
                    className="h-8 w-8 p-0"
                  >
                    {downloading === inv.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className={`h-4 w-4 ${!inv.pdf_url ? "text-muted-foreground/50" : ""}`} />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Les factures PDF sont générées automatiquement à l&apos;activation de chaque campagne.
        Le lien de téléchargement expire après 5 minutes.
      </p>
    </div>
  );
}
