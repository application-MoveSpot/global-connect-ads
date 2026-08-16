import * as React from "react";
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  company?: string;
  spotName?: string;
  startDate?: string;
  endDate?: string;
  dashboardUrl?: string;
}

const Email = ({ company, spotName, startDate, endDate, dashboardUrl }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre demande de campagne MoveSpot est bien reçue</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>MoveSpot</Text>
        <Heading style={h1}>Demande reçue ✓</Heading>
        <Text style={text}>
          {company ? `Bonjour ${company},` : "Bonjour,"} nous avons bien reçu votre demande de campagne. Notre équipe l'examine sous <strong>48h ouvrées</strong>.
        </Text>
        <Section style={card}>
          {spotName ? <Text style={row}>Spot : <strong>{spotName}</strong></Text> : null}
          {startDate && endDate ? (
            <Text style={row}>Période : <strong>{startDate} → {endDate}</strong></Text>
          ) : null}
        </Section>
        <Text style={text}>
          Nous vérifions la conformité de votre visuel et la disponibilité du véhicule.
          Vous recevrez un email de confirmation ou de retour dès qu'une décision est prise.
        </Text>
        {dashboardUrl ? (
          <Button style={button} href={dashboardUrl}>
            Suivre ma demande
          </Button>
        ) : null}
        <Hr style={hr} />
        <Text style={footer}>
          MoveSpot — publicité mobile sur véhicules. Cet email confirme la bonne réception de votre demande.
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: "Votre demande de campagne MoveSpot est bien reçue",
  displayName: "Campagne soumise",
  previewData: {
    company: "Rakoun Klub",
    spotName: "Taxi Pointe-à-Pitre",
    startDate: "20/08/2026",
    endDate: "20/09/2026",
    dashboardUrl: "https://move-spot.com/annonceur",
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Helvetica, Arial, sans-serif" };
const container = { padding: "28px 24px", maxWidth: "560px" };
const brand = { fontSize: "13px", letterSpacing: "3px", textTransform: "uppercase" as const, color: "#6b7280", margin: "0 0 12px" };
const h1 = { fontSize: "24px", lineHeight: "1.3", color: "#111827", margin: "0 0 16px" };
const text = { fontSize: "15px", lineHeight: "1.6", color: "#374151" };
const card = { backgroundColor: "#f4f6f8", borderRadius: "12px", padding: "16px 18px", margin: "20px 0" };
const row = { fontSize: "14px", lineHeight: "1.5", color: "#111827", margin: "4px 0" };
const button = { backgroundColor: "#111827", color: "#ffffff", borderRadius: "10px", padding: "12px 20px", fontSize: "15px", fontWeight: 600, textDecoration: "none", display: "inline-block" };
const hr = { borderColor: "#e5e7eb", margin: "28px 0 16px" };
const footer = { fontSize: "12px", lineHeight: "1.5", color: "#6b7280" };
