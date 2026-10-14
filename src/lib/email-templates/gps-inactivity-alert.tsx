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
  vehicleName?: string;
  spotName?: string;
  trackingUrl?: string;
}

const Email = ({ fullName, vehicleName, spotName, trackingUrl }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Alerte : aucun signal GPS enregistré pour votre véhicule en campagne active</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>MoveSpot</Text>
        <Heading style={h1}>📍 Alerte inactivité GPS</Heading>
        <Text style={text}>
          {fullName ? `Bonjour ${fullName},` : "Bonjour,"} aucun point GPS n'a été enregistré au
          cours des dernières 24 heures pour un véhicule qui participe à une campagne active.
        </Text>
        <Section style={card}>
          {vehicleName ? (
            <Text style={row}>
              Véhicule : <strong>{vehicleName}</strong>
            </Text>
          ) : null}
          {spotName ? (
            <Text style={row}>
              Campagne : <strong>{spotName}</strong>
            </Text>
          ) : null}
          <Text style={row}>
            GPS actif depuis : <strong>moins de 24h</strong>
          </Text>
        </Section>
        <Text style={text}>
          Assurez-vous que l'application de suivi est bien démarrée sur ce véhicule. Le suivi GPS
          est obligatoire pendant toute la durée de la campagne. Une inactivité prolongée peut
          affecter votre score de fiabilité et déclencher des vérifications.
        </Text>
        {trackingUrl && (
          <Button style={button} href={trackingUrl}>
            Démarrer le suivi GPS
          </Button>
        )}
        <Hr style={hr} />
        <Text style={footer}>
          MoveSpot — publicité mobile sur véhicules. Vous recevez cet email car un de vos véhicules
          a une campagne active.
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: (data: Record<string, unknown>) =>
    `📍 Alerte GPS — "${data.vehicleName ?? "véhicule"}" inactif depuis 24h`,
  displayName: "Alerte inactivité GPS (propriétaire)",
  previewData: {
    fullName: "Jean-Pierre Marcellin",
    vehicleName: "Taxi Anabel",
    spotName: "Campagne Rakoun Klub",
    trackingUrl: "https://move-spot.com/proprietaire/tracking",
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
const h1 = { fontSize: "24px", lineHeight: "1.3", color: "#dc2626", margin: "0 0 16px" };
const text = { fontSize: "15px", lineHeight: "1.6", color: "#374151" };
const card = {
  backgroundColor: "#fef2f2",
  borderRadius: "12px",
  padding: "16px 18px",
  margin: "20px 0",
  borderLeft: "4px solid #ef4444",
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
