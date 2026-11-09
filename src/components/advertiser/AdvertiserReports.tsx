/**
 * AdvertiserReports
 *
 * Affiche l'historique des rapports mensuels PDF de l'annonceur,
 * avec téléchargement via URL signée (2 min d'expiration).
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Download, Loader2, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as any;

interface MonthlyStatRow {
  id: string;
  campaign_id: string;
  report_period: string;
  total_kilometers: number;
  active_vehicles_count: number;
  estimated_impressions: number;
  pdf_storage_url: string | null;
  created_at: string;
  campaign_requests?: { spot_name: string | null } | null;
}

function fmtPeriod(period: string) {
  const [year, month] = period.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
}

function fmtNum(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n);
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function AdvertiserReports() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const { data: reports, isLoading } = useQuery<MonthlyStatRow[]>({
    queryKey: ["advertiser-monthly-reports"],
    queryFn: async () => {
      const { data, error } = await db
        .from("campaign_monthly_stats")
        .select("*, campaign_requests(spot_name)")
        .order("report_period", { ascending: false })
        .limit(24);
      if (error) throw error;
      return (data ?? []) as MonthlyStatRow[];
    },
    staleTime: 120_000,
  });

  const handleDownload = async (row: MonthlyStatRow) => {
    if (!row.pdf_storage_url) {
      toast.error("PDF non disponible pour ce rapport.");
      return;
    }
    setDownloading(row.id);
    try {
      const { data, error } = await supabase.storage
        .from("campaign-reports")
        .createSignedUrl(row.pdf_storage_url, 120); // 2 minutes
      if (error || !data?.signedUrl) throw error ?? new Error("Signed URL generation failed");
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error("Download error:", err);
      toast.error("Impossible de générer le lien de téléchargement.");
    } finally {
      setDownloading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Chargement des rapports…</span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Rapports mensuels de performance</CardTitle>
        </div>
        <CardDescription>
          Vos rapports PDF sont générés automatiquement à la fin de chaque mois de campagne.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {!reports || reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-3 text-center px-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <FileText className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold">Aucun rapport disponible</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Vos rapports mensuels apparaîtront ici à la fin du premier mois de campagne.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Mobile : cards */}
            <div className="flex flex-col gap-3 p-4 md:hidden">
              {reports.map((r) => (
                <div key={r.id} className="rounded-lg border bg-card p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm">{fmtPeriod(r.report_period)}</p>
                      {r.campaign_requests?.spot_name && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {r.campaign_requests.spot_name}
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-[10px] border shrink-0">
                      {r.report_period}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-sm font-bold text-primary">{fmtNum(r.total_kilometers)}</p>
                      <p className="text-[10px] text-muted-foreground">km</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-primary">{fmtNum(r.active_vehicles_count)}</p>
                      <p className="text-[10px] text-muted-foreground">véhicules</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-primary">{fmtNum(r.estimated_impressions)}</p>
                      <p className="text-[10px] text-muted-foreground">impressions</p>
                    </div>
                  </div>
                  {r.pdf_storage_url && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full gap-2"
                      disabled={downloading === r.id}
                      onClick={() => handleDownload(r)}
                    >
                      {downloading === r.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Download className="h-3 w-3" />
                      )}
                      Télécharger le PDF
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop : table */}
            <div className="hidden md:block overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-xs">Période</TableHead>
                    <TableHead className="text-xs">Campagne</TableHead>
                    <TableHead className="text-xs text-right">Km parcourus</TableHead>
                    <TableHead className="text-xs text-right">Véhicules actifs</TableHead>
                    <TableHead className="text-xs text-right">Impressions</TableHead>
                    <TableHead className="text-xs text-center">Généré le</TableHead>
                    <TableHead className="text-xs text-center">PDF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((r) => (
                    <TableRow key={r.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="font-medium text-sm capitalize">
                        {fmtPeriod(r.report_period)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                        {r.campaign_requests?.spot_name ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-right tabular-nums font-semibold text-primary">
                        {fmtNum(r.total_kilometers)} km
                      </TableCell>
                      <TableCell className="text-sm text-right tabular-nums">
                        {fmtNum(r.active_vehicles_count)}
                      </TableCell>
                      <TableCell className="text-sm text-right tabular-nums">
                        {fmtNum(r.estimated_impressions)}
                      </TableCell>
                      <TableCell className="text-sm text-center text-muted-foreground whitespace-nowrap">
                        {fmtDate(r.created_at)}
                      </TableCell>
                      <TableCell className="text-center">
                        {r.pdf_storage_url ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1.5 h-7 text-xs"
                            disabled={downloading === r.id}
                            onClick={() => handleDownload(r)}
                          >
                            {downloading === r.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Download className="h-3 w-3" />
                            )}
                            PDF
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
