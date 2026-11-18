import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
  Link,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  vehicleName?: string;
  incidentType?: string;
  reporterEmail?: string;
  description?: string;
  createdAt?: string;
}

const INCIDENT_LABELS: Record<string, string> = {
  accident_sinistre: "Accident / Sinistre",
  degradation_vandalisme: "Dégradation / Vandalisme",
  decollement_vinyle: "Décollement vinyle",
  retrait_urgence: "Retrait d'urgence",
  autre: "Autre",
};

const Email = ({ vehicleName, incidentType, reporterEmail, description, createdAt }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>⚠️ Nouveau signalement sinistre — {vehicleName ?? "véhicule inconnu"}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>MoveSpot</Text>
        <Heading style={h1}>⚠️ Nouveau rapport d'incident</Heading>
        <Text style={text}>
          Un propriétaire ou chauffeur vient de soumettre un signalement de sinistre ou dégradation
          nécessitant votre attention.
        </Text>
        <Section style={card}>
          <Text style={row}>
            Véhicule : <strong>{vehicleName ?? "—"}</strong>
          </Text>
          <Text style={row}>
            Type : <strong>{incidentType ? (INCIDENT_LABELS[incidentType] ?? incidentType) : "—"}</strong>
          </Text>
          {reporterEmail ? (
            <Text style={row}>
              Signalé par : <strong>{reporterEmail}</strong>
            </Text>
          ) : null}
          {description ? (
            <Text style={row}>
              Description : <strong>{description}</strong>
            </Text>
          ) : null}
          {createdAt ? (
            <Text style={row}>
              Date/heure : <strong>{createdAt}</strong>
            </Text>
          ) : null}
        </Section>
        <Link href="https://move-spot.com/admin/dashboard" style={cta}>
          Voir le dashboard admin →
        </Link>
        <Hr style={hr} />
        <Text style={footer}>
          MoveSpot — cet email est envoyé automatiquement à chaque nouveau rapport d'incident.
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: (data: Record<string, unknown>) =>
    `⚠️ Incident signalé — ${(data.vehicleName as string | undefined) ?? "véhicule"} (${(data.incidentType as string | undefined) ?? "?"})`,
  displayName: "Alerte incident admin",
  to: "rakounklub@gmail.com",
  previewData: {
    vehicleName: "Tesla Model 3 #42",
    incidentType: "degradation_vandalisme",
    reporterEmail: "proprietaire@example.com",
    description: "Vinyle partiellement décollé sur le côté passager.",
    createdAt: new Date().toLocaleString("fr-FR"),
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Helvetica, Arial, sans-serif" };
const container = { padding: "28px 24px", maxWidth: "560px" };
const brand = {
  fontSize: "13px",
  letterSpacing: "3px",
  textTransform: "uppercase" as const,
  color: "#6b7280",
  margin: "0 0 12px",
};
const h1 = { fontSize: "24px", lineHeight: "1.3", color: "#d97706", margin: "0 0 16px" };
const text = { fontSize: "15px", lineHeight: "1.6", color: "#374151" };
const card = {
  backgroundColor: "#fffbeb",
  borderRadius: "12px",
  padding: "16px 18px",
  margin: "20px 0",
  borderLeft: "4px solid #f59e0b",
};
const row = { fontSize: "14px", lineHeight: "1.5", color: "#111827", margin: "4px 0" };
const cta = {
  display: "inline-block",
  backgroundColor: "#f59e0b",
  color: "#ffffff",
  padding: "10px 20px",
  borderRadius: "8px",
  fontSize: "14px",
  fontWeight: "600",
  textDecoration: "none",
};
const hr = { borderColor: "#e5e7eb", margin: "28px 0 16px" };
const footer = { fontSize: "12px", lineHeight: "1.5", color: "#6b7280" };
