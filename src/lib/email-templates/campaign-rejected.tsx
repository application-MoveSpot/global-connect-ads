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
  spotName?: string;
  reason?: string;
  newCampaignUrl?: string;
}

const Email = ({ company, spotName, reason, newCampaignUrl }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre demande de campagne MoveSpot nécessite des ajustements</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>MoveSpot</Text>
        <Heading style={h1}>Demande non retenue</Heading>
        <Text style={text}>
          {company ? `Bonjour ${company},` : "Bonjour,"} après examen, votre demande de campagne n'a
          pas pu être validée en l'état.
        </Text>
        <Section style={card}>
          {spotName ? (
            <Text style={row}>
              Spot : <strong>{spotName}</strong>
            </Text>
          ) : null}
          {reason ? (
            <Text style={reasonStyle}>
              <strong>Motif :</strong> {reason}
            </Text>
          ) : null}
        </Section>
        <Text style={text}>
          Vous pouvez soumettre une nouvelle demande en corrigeant les points mentionnés. Notre
          équipe reste disponible pour vous accompagner.
        </Text>
        {newCampaignUrl ? (
          <Button style={button} href={newCampaignUrl}>
            Soumettre une nouvelle campagne
          </Button>
        ) : null}
        <Hr style={hr} />
        <Text style={footer}>
          MoveSpot — publicité mobile sur véhicules. En cas de question, contactez-nous via votre
          espace annonceur.
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: "Votre demande de campagne MoveSpot — retour de notre équipe",
  displayName: "Campagne refusée",
  previewData: {
    company: "Rakoun Klub",
    spotName: "Taxi Pointe-à-Pitre",
    reason: "⛔ Visuel ou zone refusés par MoveSpot.",
    newCampaignUrl: "https://move-spot.com/",
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
  backgroundColor: "#fff7ed",
  borderRadius: "12px",
  padding: "16px 18px",
  margin: "20px 0",
  borderLeft: "4px solid #f97316",
};
const row = { fontSize: "14px", lineHeight: "1.5", color: "#111827", margin: "4px 0" };
const reasonStyle = { fontSize: "14px", lineHeight: "1.6", color: "#374151", margin: "8px 0 0" };
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
