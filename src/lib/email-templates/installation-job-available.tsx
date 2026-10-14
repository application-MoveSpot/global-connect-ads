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
  spaceUrl?: string;
}

const Email = ({ fullName, spotName, company, startDate, endDate, spaceUrl }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Une nouvelle campagne attend son covering</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>MoveSpot</Text>
        <Heading style={h1}>🚗 Une campagne est prête à être équipée</Heading>
        <Text style={text}>
          {fullName ? `Bonjour ${fullName},` : "Bonjour,"} une campagne validée par MoveSpot cherche
          un poseur certifié pour la pose du covering.
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
          L'affiche/vidéo à imprimer ainsi que le QR code à coller sont disponibles dans votre
          espace poseur, dans la fiche de cette campagne. Après la pose, transmettez les 4 photos du
          véhicule pour validation.
        </Text>

        {spaceUrl ? (
          <Button style={button} href={spaceUrl}>
            Voir le kit de pose
          </Button>
        ) : null}

        <Hr style={hr} />
        <Text style={footer}>
          MoveSpot — publicité mobile sur véhicules. Vous recevez cet email car votre profil poseur
          est certifié MoveSpot.
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: "🚗 Une campagne MoveSpot attend son covering",
  displayName: "Nouvelle pose disponible",
  previewData: {
    fullName: "Jean Dupont",
    spotName: "Taxi Pointe-à-Pitre",
    company: "Rakoun Klub",
    startDate: "12/08/2026",
    endDate: "12/09/2026",
    spaceUrl: "https://move-spot.com/chauffeur/espace",
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
