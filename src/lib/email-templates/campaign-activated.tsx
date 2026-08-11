import * as React from "react";
import {
  Body,
  Button,
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
  company?: string;
  campaignName?: string;
  startDate?: string;
  endDate?: string;
  amount?: string;
  trackingUrl?: string;
}

const Email = ({
  company,
  campaignName,
  startDate,
  endDate,
  amount,
  trackingUrl,
}: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre campagne MoveSpot est activée</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>MoveSpot</Text>
        <Heading style={h1}>🚀 Votre campagne est activée !</Heading>
        <Text style={text}>
          {company ? `Bonjour ${company},` : "Bonjour,"} bonne nouvelle : notre équipe a validé
          votre paiement. Vos chauffeurs vont recevoir leurs missions d'affichage.
        </Text>

        <Section style={card}>
          {campaignName ? <Text style={row}>Campagne : <strong>{campaignName}</strong></Text> : null}
          {startDate && endDate ? (
            <Text style={row}>
              Période : <strong>{startDate} → {endDate}</strong>
            </Text>
          ) : null}
          {amount ? <Text style={row}>Montant réglé : <strong>{amount}</strong></Text> : null}
        </Section>

        <Text style={text}>
          Dès la pose des visuels, vous pourrez suivre les kilomètres parcourus dans votre zone de
          ciblage et les impressions estimées depuis votre espace annonceur.
        </Text>

        {trackingUrl ? (
          <Button style={button} href={trackingUrl}>
            Suivre ma campagne
          </Button>
        ) : null}

        <Hr style={hr} />
        <Text style={footer}>
          MoveSpot — publicité mobile sur véhicules. Cet email vous est envoyé suite à la
          validation du paiement de votre campagne.
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: "🚀 Votre campagne MoveSpot est activée !",
  displayName: "Campagne activée",
  previewData: {
    company: "Rakoun Klub",
    campaignName: "Taxi Pointe-à-Pitre",
    startDate: "12/08/2026",
    endDate: "12/09/2026",
    amount: "1 250,00 €",
    trackingUrl: "https://move-spot.com/annonceur",
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
  backgroundColor: "#f4f6f8",
  borderRadius: "12px",
  padding: "16px 18px",
  margin: "20px 0",
};
const row = { fontSize: "14px", lineHeight: "1.5", color: "#111827", margin: "4px 0" };
const button = {
  backgroundColor: "#111827",
  color: "#ffffff",
  borderRadius: "10px",
  padding: "12px 20px",
  fontSize: "15px",
  fontWeight: 600,
  textDecoration: "none",
  display: "inline-block",
};
const hr = { borderColor: "#e5e7eb", margin: "28px 0 16px" };
const footer = { fontSize: "12px", lineHeight: "1.5", color: "#6b7280" };
