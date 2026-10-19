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
  startDate?: string;
  endDate?: string;
  totalPrice?: string;
  paymentUrl?: string;
}

const Email = ({ company, spotName, startDate, endDate, totalPrice, paymentUrl }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre campagne MoveSpot est approuvée — procédez au paiement</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>MoveSpot</Text>
        <Heading style={h1}>Campagne approuvée 🎉</Heading>
        <Text style={text}>
          {company ? `Bonjour ${company},` : "Bonjour,"} bonne nouvelle : votre demande de campagne
          a été validée par notre équipe. Il ne reste plus qu'à procéder au paiement pour lancer la
          diffusion.
        </Text>
        <Section style={card}>
          {spotName ? (
            <Text style={row}>
              Spot : <strong>{spotName}</strong>
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
          {totalPrice ? (
            <Text style={row}>
              Montant : <strong>{totalPrice}</strong>
            </Text>
          ) : null}
        </Section>
        <Text style={text}>
          Payez depuis votre portefeuille MoveSpot. Si votre solde est insuffisant, vous pouvez le
          recharger directement depuis votre espace annonceur.
        </Text>
        {paymentUrl ? (
          <Button style={button} href={paymentUrl}>
            Payer ma campagne
          </Button>
        ) : null}
        <Hr style={hr} />
        <Text style={footer}>
          MoveSpot — publicité mobile sur véhicules. Une fois le paiement confirmé, les chauffeurs
          recevront leur mission d'affichage.
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: "✅ Votre campagne MoveSpot est approuvée — procédez au paiement",
  displayName: "Campagne approuvée",
  previewData: {
    company: "Rakoun Klub",
    spotName: "Taxi Pointe-à-Pitre",
    startDate: "20/08/2026",
    endDate: "20/09/2026",
    totalPrice: "1 250,00 €",
    paymentUrl: "https://move-spot.com/advertiser",
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
};
const hr = { borderColor: "#e5e7eb", margin: "28px 0 16px" };
const footer = { fontSize: "12px", lineHeight: "1.5", color: "#6b7280" };
