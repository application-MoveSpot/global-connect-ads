import * as React from "react";
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  amountEur?: string;
  date?: string;
  time?: string;
}

const Email = ({ amountEur = "0,00", date = "", time = "" }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Recharge de {amountEur} € enregistrée sur votre portefeuille MoveSpot</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>MoveSpot</Text>
        <Heading style={h1}>Recharge portefeuille confirmée</Heading>
        <Text style={text}>
          Bonjour, une recharge de <strong>{amountEur} €</strong> vient d'être créditée sur votre portefeuille MoveSpot.
        </Text>
        <Section style={card}>
          <Text style={row}>Montant : <strong>{amountEur} €</strong></Text>
          {date ? <Text style={row}>Date : <strong>{date}{time ? ` à ${time}` : ""}</strong></Text> : null}
        </Section>
        <Section style={alertBox}>
          <Text style={alertText}>
            ⚠️ Si vous n'êtes pas à l'origine de cette recharge, contactez notre support immédiatement à{" "}
            <a href="mailto:support@move-spot.com" style={link}>support@move-spot.com</a>{" "}
            afin de bloquer votre compte.
          </Text>
        </Section>
        <Button style={button} href="https://move-spot.com/annonceur/portefeuille">
          Voir mon portefeuille
        </Button>
        <Hr style={hr} />
        <Text style={footer}>
          MoveSpot — publicité mobile sur véhicules · Cet email est envoyé automatiquement à chaque recharge.
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: (data: Record<string, unknown>) =>
    `💳 Recharge de ${data.amountEur ?? "0,00"} € — portefeuille MoveSpot`,
  displayName: "Alerte recharge portefeuille",
  previewData: {
    amountEur: "150,00",
    date: "01/09/2026",
    time: "14h32",
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Helvetica, Arial, sans-serif" };
const container = { padding: "28px 24px", maxWidth: "560px" };
const brand = { fontSize: "13px", letterSpacing: "3px", textTransform: "uppercase" as const, color: "#6b7280", margin: "0 0 12px" };
const h1 = { fontSize: "24px", lineHeight: "1.3", color: "#111827", margin: "0 0 16px" };
const text = { fontSize: "15px", lineHeight: "1.6", color: "#374151" };
const card = { backgroundColor: "#f0f9ff", borderRadius: "12px", padding: "16px 18px", margin: "20px 0", borderLeft: "4px solid #3b82f6" };
const row = { fontSize: "14px", lineHeight: "1.5", color: "#111827", margin: "4px 0" };
const alertBox = { backgroundColor: "#fef9c3", borderRadius: "12px", padding: "14px 18px", margin: "16px 0", borderLeft: "4px solid #ca8a04" };
const alertText = { fontSize: "13px", lineHeight: "1.6", color: "#78350f", margin: 0 };
const link = { color: "#1d4ed8", textDecoration: "underline" };
const button = { backgroundColor: "#111827", color: "#ffffff", borderRadius: "10px", padding: "12px 20px", fontSize: "15px", fontWeight: 600, textDecoration: "none", display: "inline-block", marginTop: "8px" };
const hr = { borderColor: "#e5e7eb", margin: "28px 0 16px" };
const footer = { fontSize: "12px", lineHeight: "1.5", color: "#6b7280" };
