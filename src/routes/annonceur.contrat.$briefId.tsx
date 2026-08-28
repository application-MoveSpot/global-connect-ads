import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getContractData } from "@/lib/campaigns/contract.functions";

export const Route = createFileRoute("/annonceur/contrat/$briefId")({
  head: () => ({ meta: [{ title: "Devis — MoveSpot" }] }),
  component: ContratPage,
  errorComponent: ({ error }: { error: Error }) => (
    <div className="p-8 text-center text-destructive">Erreur : {error.message}</div>
  ),
});

function ContratPage() {
  const { briefId } = Route.useParams();
  const fetchContract = useServerFn(getContractData);
  const printed = useRef(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["contract", briefId],
    queryFn: () => fetchContract({ data: { briefId } }),
    staleTime: 15 * 60_000,
    retry: false,
  });

  useEffect(() => {
    if (data && !printed.current) {
      printed.current = true;
      setTimeout(() => window.print(), 400);
    }
  }, [data]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Génération du devis…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-destructive p-8 text-center">
        {error instanceof Error ? error.message : "Devis introuvable."}
      </div>
    );
  }

  const contractNumber = `DEV-${new Date(data.generatedAt).getFullYear()}-${briefId.slice(0, 8).toUpperCase()}`;
  const generatedAt = new Date(data.generatedAt).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .contract-page { box-shadow: none !important; margin: 0 !important; padding: 24px !important; }
        }
      `}</style>

      {/* Toolbar */}
      <div className="no-print bg-muted border-b py-3 px-6 flex items-center justify-between">
        <Link to="/annonceur/briefs/$briefId" params={{ briefId }} className="text-sm text-muted-foreground hover:text-foreground">
          ← Retour au brief
        </Link>
        <button
          onClick={() => window.print()}
          className="rounded-full bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold hover:bg-primary/90 transition"
        >
          🖨 Imprimer / Enregistrer en PDF
        </button>
      </div>

      <div className="min-h-screen bg-gray-100 py-10 px-4 print:bg-white print:py-0 print:px-0">
        <div
          className="contract-page max-w-2xl mx-auto bg-white shadow-lg rounded-xl p-10 text-sm text-gray-800"
          style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
        >
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <div className="text-2xl font-bold text-gray-900 tracking-tight">MoveSpot</div>
              <div className="text-xs text-gray-500 mt-0.5">Publicité mobile sur véhicules</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-gray-900 uppercase tracking-wide">Devis</div>
              <div className="text-xs text-gray-500 mt-0.5">{contractNumber}</div>
              <div className="text-xs text-gray-500">Établi le {generatedAt}</div>
              <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-300 px-2.5 py-0.5 text-amber-700 text-[10px] font-bold uppercase tracking-wide">
                ⏳ À valider par les parties
              </div>
            </div>
          </div>

          {/* Parties */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Annonceur (client)</div>
              <div className="font-semibold text-gray-900">{data.advertiser.fullName}</div>
              {data.advertiser.company && <div className="text-xs text-gray-700">{data.advertiser.company}</div>}
              {data.advertiser.siret && <div className="text-xs text-gray-500">SIRET : {data.advertiser.siret}</div>}
              {data.advertiser.address && (
                <div className="text-xs text-gray-600 leading-relaxed mt-0.5 whitespace-pre-line">{data.advertiser.address}</div>
              )}
              <div className="text-xs text-gray-500 mt-0.5">{data.advertiser.email}</div>
              {data.advertiser.phone && <div className="text-xs text-gray-500">{data.advertiser.phone}</div>}
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Prestataire (régie)</div>
              <div className="font-semibold text-gray-900">RAKOUN KLUB</div>
              <div className="text-xs text-gray-700">MoveSpot</div>
              <div className="text-xs text-gray-600 leading-relaxed mt-0.5">
                1 Lot, Immeuble Sud Jarry<br />
                ZAC de Houelbourg<br />
                97122 Baie-Mahault, Guadeloupe<br />
                contact@movespot.fr
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 mb-6" />

          {/* Campaign details */}
          <div className="mb-6">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Objet de la campagne</div>
            <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
              <tbody>
                <Row label="Intitulé" value={data.briefTitle} />
                <Row label="Description" value={data.description} />
                <Row label="Période" value={`${fmt(data.startDate)} → ${fmt(data.endDate)} (${data.daysCount} jour${data.daysCount > 1 ? "s" : ""})`} />
                <Row label="Zones de diffusion" value={data.zones.length > 0 ? data.zones.join(", ") : "—"} />
                {data.adFormat && <Row label="Format publicitaire" value={data.adFormat} />}
                <Row label="Types de véhicules" value={data.vehicleTypes.join(", ")} />
                {data.audienceTarget && <Row label="Audience cible" value={data.audienceTarget} />}
              </tbody>
            </table>
          </div>

          <div className="border-t border-gray-200 mb-6" />

          {/* Vehicles table */}
          <div className="mb-6">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Véhicules retenus ({data.vehicles.length})
            </div>
            <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                  <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Véhicule / Propriétaire</th>
                  <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Qté (j)</th>
                  <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">P.U.</th>
                  <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sous-total</th>
                </tr>
              </thead>
              <tbody>
                {data.vehicles.map((v: import("@/lib/campaigns/contract.functions").ContractVehicle, i: number) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td className="py-3 pr-3">
                      <div className="font-medium text-gray-900">{v.vehicleName}</div>
                      <div className="text-gray-500">
                        {v.vehicleType}{v.formatPublicitaire ? ` · ${v.formatPublicitaire}` : ""}
                        {v.surfaceM2 ? ` · ${v.surfaceM2} m²` : ""}
                      </div>
                      <div className="text-gray-400 italic">Propriétaire : {v.ownerName}{v.ownerCompany ? ` (${v.ownerCompany})` : ""}</div>
                      {v.proposalMessage && (
                        <div className="text-gray-500 mt-0.5 italic">« {v.proposalMessage} »</div>
                      )}
                    </td>
                    <td className="py-3 text-right text-gray-700">{data.daysCount}</td>
                    <td className="py-3 text-right text-gray-700">{v.pricePerDay.toFixed(2)} €</td>
                    <td className="py-3 text-right font-semibold text-gray-900">{v.subtotal.toFixed(2)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-6">
            <div className="w-56">
              <div className="flex justify-between py-1.5 text-gray-600">
                <span>Sous-total HT</span>
                <span>{data.totalHT.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between py-1.5 text-gray-500 text-xs">
                <span>TVA</span>
                <span>Exonéré (Art. 294 CGI)</span>
              </div>
              <div
                className="flex justify-between py-2 mt-1 font-bold text-gray-900 text-base"
                style={{ borderTop: "2px solid #111827" }}
              >
                <span>Total TTC</span>
                <span>{data.totalHT.toFixed(2)} €</span>
              </div>
            </div>
          </div>

          {/* Conditions */}
          <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-xs text-gray-600 mb-8">
            <div className="font-semibold text-gray-800 mb-2">Conditions générales (extrait)</div>
            <ul className="space-y-1 list-disc list-inside text-gray-500">
              <li>MoveSpot conserve 30 % du montant et reverse 70 % au(x) propriétaire(s) du/des véhicule(s) à l'issue de la diffusion.</li>
              <li>L'annonceur garantit détenir tous les droits sur les visuels fournis (marque, image, droits d'auteur).</li>
              <li>La pose du covering est réalisée par un poseur certifié MoveSpot. Les photos d'installation sont transmises à l'annonceur.</li>
              <li>En cas d'annulation après acceptation, des frais peuvent être retenus selon les délais (CGV complètes disponibles sur movespot.fr).</li>
              <li>Exonéré de TVA en application de l'article 294 du Code Général des Impôts (DOM).</li>
            </ul>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 mb-4">
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                L'annonceur
              </div>
              <div className="text-xs text-gray-500 mb-1">{data.advertiser.fullName}</div>
              {data.advertiser.company && <div className="text-xs text-gray-400">{data.advertiser.company}</div>}
              <div className="mt-6 border-t border-gray-300" style={{ height: 48 }} />
              <div className="text-xs text-gray-400 mt-1">Signature &amp; date</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Pour MoveSpot — RAKOUN KLUB
              </div>
              <div className="text-xs text-gray-500 mb-1">Gérant</div>
              <div className="mt-6 border-t border-gray-300" style={{ height: 48 }} />
              <div className="text-xs text-gray-400 mt-1">Signature &amp; cachet</div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 pt-4 text-xs text-gray-400 text-center">
            MoveSpot — RAKOUN KLUB · contact@movespot.fr<br />
            1 Lot, Immeuble Sud Jarry, ZAC de Houelbourg, 97122 Baie-Mahault, Guadeloupe<br />
            Devis valable 30 jours à compter du {generatedAt} · Réf. {contractNumber}
          </div>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr style={{ borderBottom: "1px solid #f9fafb" }}>
      <td className="py-1.5 pr-4 text-gray-500 font-medium w-40 align-top">{label}</td>
      <td className="py-1.5 text-gray-800">{value}</td>
    </tr>
  );
}
