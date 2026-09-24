import { createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { submitContactLead } from "@/lib/leads/contact.functions";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/contact")({
  validateSearch: (search: Record<string, unknown>) => ({
    plan: (search.plan as string) ?? "enterprise",
  }),
  head: () => ({
    meta: [
      { title: "Demande de devis — MoveSpot" },
      { name: "description", content: "Obtenez un devis personnalisé pour votre campagne Grand Compte MoveSpot." },
    ],
  }),
  component: ContactPage,
});

const schema = z.object({
  plan: z.enum(["enterprise", "partenaire", "autre"]),
  company_name: z.string().max(200).optional(),
  siret: z.string().max(20).optional(),
  contact_name: z.string().min(2, "Prénom et nom requis").max(100),
  email: z.string().email("Email invalide"),
  phone: z.string().max(30).optional(),
  budget_range: z.string().max(100).optional(),
  message: z.string().max(1000).optional(),
});

type FormValues = z.infer<typeof schema>;

const BUDGET_OPTIONS = [
  "Moins de 5 000 € / an",
  "5 000 – 10 000 € / an",
  "10 000 – 30 000 € / an",
  "30 000 – 100 000 € / an",
  "Plus de 100 000 € / an",
];

function ContactPage() {
  const { plan } = Route.useSearch();
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { plan: (["enterprise", "partenaire", "autre"].includes(plan) ? plan : "enterprise") as FormValues["plan"] },
  });

  const onSubmit = async (values: FormValues): Promise<void> => {
    setServerError(null);
    try {
      await submitContactLead({ data: values });
      setSubmitted(true);
    } catch {
      setServerError("Une erreur est survenue. Réessayez ou écrivez-nous à contact@move-spot.com");
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-md text-center">
            <div className="flex justify-center mb-6">
              <CheckCircle2 className="w-16 h-16 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-bold mb-3">Demande bien reçue !</h1>
            <p className="text-muted-foreground mb-2">
              Un email de confirmation vient de vous être envoyé.
            </p>
            <p className="text-muted-foreground mb-8">
              Notre équipe commerciale vous recontacte sous <strong className="text-foreground">24h ouvrées</strong> pour construire votre offre sur mesure.
            </p>
            <Link to="/" className="text-sm text-primary hover:underline">
              ← Retour à l'accueil
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 flex items-start justify-center px-4 py-12">
        <div className="w-full max-w-xl">
          {/* Header */}
          <div className="mb-8">
            <span className="text-xs font-bold tracking-widest uppercase text-[#F05A28]">
              Grand Compte · Sur devis
            </span>
            <h1 className="text-3xl font-bold mt-2 mb-3">Obtenez votre offre personnalisée</h1>
            <p className="text-muted-foreground">
              Remplissez ce formulaire et un account manager dédié vous rappelle sous 24h ouvrées pour construire ensemble une offre adaptée à votre budget et vos objectifs.
            </p>
          </div>

          {/* Ce qui est inclus */}
          <div className="bg-muted/40 rounded-xl p-5 mb-8 border border-border">
            <p className="text-sm font-semibold mb-3">Ce que comprend l'offre Grand Compte :</p>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {[
                "Commission négociée selon votre budget annuel",
                "Account manager dédié à votre compte",
                "Contrat-cadre annuel avec SLA",
                "Onboarding personnalisé et formation équipe",
                "Accès prioritaire aux véhicules premium",
                "Reporting mensuel détaillé",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="text-emerald-500 font-bold">✓</span> {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <input type="hidden" {...register("plan")} />

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1.5">
                  Nom complet <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("contact_name")}
                  placeholder="Marie Dupont"
                  className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                {errors.contact_name && (
                  <p className="text-xs text-red-500 mt-1">{errors.contact_name.message}</p>
                )}
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium mb-1.5">
                  Email professionnel <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("email")}
                  type="email"
                  placeholder="vous@entreprise.com"
                  className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                {errors.email && (
                  <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
                )}
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium mb-1.5">Téléphone</label>
                <input
                  {...register("phone")}
                  type="tel"
                  placeholder="+596 696 12 34 56"
                  className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium mb-1.5">Nom de l'entreprise</label>
                <input
                  {...register("company_name")}
                  placeholder="Caraïbes Distribution SARL"
                  className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium mb-1.5">SIRET</label>
                <input
                  {...register("siret")}
                  placeholder="123 456 789 00012"
                  className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1.5">Budget annuel estimé</label>
                <select
                  {...register("budget_range")}
                  className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Sélectionner une tranche</option>
                  {BUDGET_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1.5">
                  Décrivez votre projet (optionnel)
                </label>
                <textarea
                  {...register("message")}
                  rows={4}
                  placeholder="Ex : Nous avons 15 véhicules utilitaires en Martinique et souhaitons lancer une campagne de notoriété pour notre enseigne..."
                  className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>
            </div>

            {serverError && (
              <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg p-3">
                {serverError}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-[#F05A28] text-white font-semibold py-3 px-6 hover:bg-[#d94e20] transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Envoi en cours…" : "Envoyer ma demande de devis"}
            </button>

            <p className="text-xs text-muted-foreground text-center">
              En soumettant ce formulaire, vous acceptez d'être recontacté par notre équipe commerciale.
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
