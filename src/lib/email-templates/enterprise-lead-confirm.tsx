import * as React from "react";
import { Body, Container, Head, Html, Preview, Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import {
  EmailHeader, EmailFooter, InfoCard, InfoRow,
  bodyStyle, containerStyle, contentPadding,
  h1Style, textStyle, mutedText,
} from "./_base";

const COMMISSION_TABLE: Record<string, { rate: string; vehicles: string }> = {
  "Moins de 5 000 € / an":   { rate: "28 %",       vehicles: "1 à 3 véhicules" },
  "5 000 – 10 000 € / an":   { rate: "25 %",       vehicles: "3 à 8 véhicules" },
  "10 000 – 30 000 € / an":  { rate: "22 %",       vehicles: "8 à 20 véhicules" },
  "30 000 – 100 000 € / an": { rate: "18 %",       vehicles: "20 à 60 véhicules" },
  "Plus de 100 000 € / an":  { rate: "sur mesure", vehicles: "60+ véhicules" },
};

interface Props {
  contactName?: string;
  company?: string;
  budgetRange?: string;
  unsubscribeUrl?: string;
}

const Email = ({ contactName, company, budgetRange, unsubscribeUrl }: Props) => {
  const tier = budgetRange ? COMMISSION_TABLE[budgetRange] : null;
  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>Votre proposition MoveSpot Grand Compte — générée par notre IA</Preview>
      <Body style={bodyStyle}>
        <Container style={{ maxWidth: "560px", margin: "32px auto" }}>
          <Container style={containerStyle}>
            <EmailHeader />
            <Section style={contentPadding}>
              <Text style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase" as const, color: "#F05A28", margin: "0 0 10px" }}>
                Proposition générée par IA ✦
              </Text>
              <Text style={h1Style}>
                Bonjour {contactName ?? ""} !
              </Text>
              <Text style={textStyle}>
                Voici la proposition commerciale personnalisée que notre assistant IA a établie pour{company ? ` ${company}` : " votre entreprise"}, basée sur votre échange.
              </Text>

              <InfoCard>
                {company ? <InfoRow label="Entreprise" value={company} /> : null}
                {budgetRange ? <InfoRow label="Budget annuel" value={budgetRange} /> : null}
                {tier ? <InfoRow label="Commission négociée" value={tier.rate} /> : null}
                {tier ? <InfoRow label="Flotte estimée" value={tier.vehicles} /> : null}
                <InfoRow label="Suivi GPS temps réel" value="Inclus" />
                <InfoRow label="Rapport PDF mensuel" value="Inclus" />
                <InfoRow label="Contrat-cadre annuel + SLA" value="Inclus" />
                <InfoRow label="Onboarding personnalisé" value="Inclus" />
                {tier?.rate !== "sur mesure"
                  ? <InfoRow label="Account manager" value="Dédié à votre compte" />
                  : <InfoRow label="Équipe dédiée" value="Relation premium" />}
              </InfoCard>

              <Text style={{ ...textStyle, marginTop: "20px" }}>
                Un account manager MoveSpot vous contactera dans les <strong>24h ouvrées</strong> pour valider les détails, affiner les conditions et préparer votre contrat-cadre.
              </Text>
              <Text style={mutedText}>
                Des questions ? Répondez directement à cet email ou écrivez à contact@move-spot.com
              </Text>
            </Section>
            <EmailFooter unsubscribeUrl={unsubscribeUrl} />
          </Container>
        </Container>
      </Body>
    </Html>
  );
};

export const template = {
  component: Email,
  subject: (d: Record<string, string>) =>
    `Votre proposition MoveSpot${d.company ? ` — ${d.company}` : ""}`,
  displayName: "Proposition IA — lead Grand Compte",
  previewData: {
    contactName: "Marie",
    company: "Caraïbes Distribution SARL",
    budgetRange: "10 000 – 30 000 € / an",
  },
} satisfies TemplateEntry;
