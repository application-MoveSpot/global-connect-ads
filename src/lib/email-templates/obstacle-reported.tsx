import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  vehicleName?: string;
  vehicleId?: string;
  obstacleType?: string;
  description?: string;
  reportedAt?: string;
  campaignId?: string | null;
}

const TYPE_LABEL: Record<string, string> = {
  travaux: "🚧 Travaux de voirie",
  manifestation: "📣 Manifestation / cortège",
  meteo: "🌩️ Conditions climatiques extrêmes",
  route_barree: "🚫 Route barrée / barrage",
  accident: "🚨 Accident / déviation imposée",
  autre: "❓ Autre obstacle",
};

const Email = ({
  vehicleName,
  vehicleId,
  obstacleType,
  description,
  reportedAt,
  campaignId,
}: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Obstacle signalé par un chauffeur MoveSpot</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>MoveSpot</Text>
        <Heading style={h1}>⚠️ Obstacle signalé par un chauffeur</Heading>
        <Text style={text}>
          Un chauffeur a signalé un événement extérieur affectant son trajet de campagne. Ce
          signalement peut justifier une neutralisation des métriques pour la période concernée.
        </Text>

        <Section style={card}>
          <Text style={row}>
            Type : <strong>{TYPE_LABEL[obstacleType ?? "autre"] ?? obstacleType}</strong>
          </Text>
          <Text style={row}>
            Véhicule : <strong>{vehicleName ?? "—"}</strong>
          </Text>
          {vehicleId ? (
            <Text style={row}>
              ID véhicule : <strong style={{ fontFamily: "monospace" }}>{vehicleId}</strong>
            </Text>
          ) : null}
          {campaignId ? (
            <Text style={row}>
              ID campagne active : <strong style={{ fontFamily: "monospace" }}>{campaignId}</strong>
            </Text>
          ) : null}
          <Text style={row}>
            Signalé le : <strong>{reportedAt ?? new Date().toISOString()}</strong>
          </Text>
          {description ? (
            <Text style={row}>
              Description : <em>{description}</em>
            </Text>
          ) : null}
        </Section>

        <Text style={text}>
          Pour neutraliser les métriques de cette période, rendez-vous dans le tableau de bord admin
          et ajustez manuellement la campagne concernée si le signalement est avéré.
        </Text>

        <Hr style={hr} />
        <Text style={footer}>
          MoveSpot — Ce message est envoyé automatiquement suite au signalement d'un chauffeur.
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: (data: Record<string, unknown>) =>
    `⚠️ Obstacle signalé — ${data.vehicleName ?? "véhicule"} (${data.obstacleType ?? "autre"})`,
  displayName: "Obstacle signalé par chauffeur",
  to: "contact@notify.move-spot.com",
  previewData: {
    vehicleName: "Taxi Guadeloupe #12",
    vehicleId: "uuid-exemple",
    obstacleType: "manifestation",
    description: "Cortège bloquant l'avenue principale pendant 2h",
    reportedAt: "2026-08-20T10:30:00Z",
    campaignId: "uuid-campagne",
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
const h1 = { fontSize: "24px", lineHeight: "1.3", color: "#111827", margin: "0 0 16px" };
const text = { fontSize: "15px", lineHeight: "1.6", color: "#374151" };
const card = {
  backgroundColor: "#fefce8",
  borderRadius: "12px",
  padding: "16px 18px",
  margin: "20px 0",
  borderLeft: "4px solid #f59e0b",
};
const row = { fontSize: "14px", lineHeight: "1.5", color: "#111827", margin: "4px 0" };
const hr = { borderColor: "#e5e7eb", margin: "28px 0 16px" };
const footer = { fontSize: "12px", lineHeight: "1.5", color: "#6b7280" };
