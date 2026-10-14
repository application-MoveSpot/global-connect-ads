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
  fullName?: string;
  spotName?: string;
  company?: string;
  startDate?: string;
  endDate?: string;
  profileUrl?: string;
}

const Email = ({ fullName, spotName, company, startDate, endDate, profileUrl }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Une nouvelle campagne MoveSpot peut correspondre à votre offre de services</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>MoveSpot</Text>
        <Heading style={h1}>🎯 Nouvelle opportunité de prestation</Heading>
        <Text style={text}>
          {fullName ? `Bonjour ${fullName},` : "Bonjour,"} une nouvelle campagne publicitaire vient
          d'être approuvée sur MoveSpot. Elle pourrait nécessiter vos services (covering, production
          vidéo ou création graphique).
        </Text>
        <Section style={card}>
          {spotName ? (
            <Text style={row}>
              Campagne : <strong>{spotName}</strong>
            </Text>
          ) : null}
          {company ? (
            <Text style={row}>
              Annonceur : <strong>{company}</strong>
            </Text>
          ) : null}
          {startDate && endDate ? (
            <Text style={row}>
              Période :{" "}
              <strong>
                {startDate} → {endDate}
              </strong>
            </Text>
          ) : null}
        </Section>
        <Text style={text}>
          Si cette campagne vous intéresse, mettez à jour votre profil prestataire et contactez
          l'annonceur via votre espace MoveSpot.
        </Text>
        {profileUrl && (
          <Button style={button} href={profileUrl}>
            Voir mon espace prestataire
          </Button>
        )}
        <Hr style={hr} />
        <Text style={footer}>
          MoveSpot — publicité mobile sur véhicules. Vous recevez cet email car votre profil
          prestataire est actif sur MoveSpot.
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: (data: Record<string, unknown>) =>
    `🎯 Nouvelle opportunité MoveSpot — ${data.spotName ?? "campagne"}`,
  displayName: "Opportunité prestataire (nouvelle campagne)",
  previewData: {
    fullName: "Marie Martin",
    spotName: "Taxi Pointe-à-Pitre",
    company: "Rakoun Klub",
    startDate: "15/09/2026",
    endDate: "15/10/2026",
    profileUrl: "https://move-spot.com/prestataire",
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
  backgroundColor: "#f0fdf4",
  borderRadius: "12px",
  padding: "16px 18px",
  margin: "20px 0",
  borderLeft: "4px solid #22c55e",
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
  marginTop: "8px",
};
const hr = { borderColor: "#e5e7eb", margin: "28px 0 16px" };
const footer = { fontSize: "12px", lineHeight: "1.5", color: "#6b7280" };
