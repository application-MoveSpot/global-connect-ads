import * as React from "react";
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  fullName?: string;
  spotName?: string;
  dashboardUrl?: string;
}

const Email = ({ fullName, spotName, dashboardUrl }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre campagne MoveSpot a été annulée faute de paiement</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>MoveSpot</Text>
        <Heading style={h1}>❌ Campagne annulée</Heading>
        <Text style={text}>
          {fullName ? `Bonjour ${fullName},` : "Bonjour,"} votre campagne publicitaire n'a pas été réglée dans le délai imparti (7 jours après approbation) et a donc été automatiquement annulée.
        </Text>
        {spotName && (
          <Section style={card}>
            <Text style={row}>Campagne concernée : <strong>{spotName}</strong></Text>
            <Text style={row}>Statut : <strong>Annulée (délai de paiement dépassé)</strong></Text>
          </Section>
        )}
        <Text style={text}>
          Les créneaux réservés ont été libérés. Vous pouvez soumettre une nouvelle demande depuis votre espace annonceur si vous souhaitez toujours diffuser cette campagne.
        </Text>
        {dashboardUrl && (
          <Button style={button} href={dashboardUrl}>
            Retourner à mon espace
          </Button>
        )}
        <Hr style={hr} />
        <Text style={footer}>
          MoveSpot — publicité mobile sur véhicules. Pour toute question, contactez notre support.
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: (data: Record<string, unknown>) =>
    `❌ Campagne "${data.spotName ?? "MoveSpot"}" annulée — délai de paiement dépassé`,
  displayName: "Campagne expirée (non payée)",
  previewData: {
    fullName: "Marc Leblanc",
    spotName: "Taxi Pointe-à-Pitre",
    dashboardUrl: "https://move-spot.com/annonceur",
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Helvetica, Arial, sans-serif" };
const container = { padding: "28px 24px", maxWidth: "560px" };
const brand = { fontSize: "13px", letterSpacing: "3px", textTransform: "uppercase" as const, color: "#6b7280", margin: "0 0 12px" };
const h1 = { fontSize: "24px", lineHeight: "1.3", color: "#dc2626", margin: "0 0 16px" };
const text = { fontSize: "15px", lineHeight: "1.6", color: "#374151" };
const card = { backgroundColor: "#fef2f2", borderRadius: "12px", padding: "16px 18px", margin: "20px 0", borderLeft: "4px solid #ef4444" };
const row = { fontSize: "14px", lineHeight: "1.5", color: "#111827", margin: "4px 0" };
const button = { backgroundColor: "#111827", color: "#ffffff", borderRadius: "10px", padding: "12px 20px", fontSize: "15px", fontWeight: 600, textDecoration: "none", display: "inline-block", marginTop: "8px" };
const hr = { borderColor: "#e5e7eb", margin: "28px 0 16px" };
const footer = { fontSize: "12px", lineHeight: "1.5", color: "#6b7280" };
