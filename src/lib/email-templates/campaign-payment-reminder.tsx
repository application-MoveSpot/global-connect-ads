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
  totalPrice?: string;
  daysLeft?: number;
  payUrl?: string;
}

const Email = ({ fullName, spotName, totalPrice, daysLeft, payUrl }: Props) => {
  const urgent = (daysLeft ?? 7) <= 2;
  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>
        {urgent
          ? `⚠️ Dernière chance — votre campagne expire dans ${daysLeft ?? 1} jour(s)`
          : "Rappel : votre campagne MoveSpot est en attente de paiement"}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brand}>MoveSpot</Text>
          <Heading style={urgent ? h1Urgent : h1}>
            {urgent ? "⚠️ Paiement requis d'urgence" : "💳 Rappel de paiement"}
          </Heading>
          <Text style={text}>
            {fullName ? `Bonjour ${fullName},` : "Bonjour,"} votre campagne publicitaire a été
            approuvée par MoveSpot mais n'a pas encore été réglée.
          </Text>
          <Section style={urgent ? cardUrgent : card}>
            {spotName ? (
              <Text style={row}>
                Campagne : <strong>{spotName}</strong>
              </Text>
            ) : null}
            {totalPrice ? (
              <Text style={row}>
                Montant dû : <strong>{totalPrice}</strong>
              </Text>
            ) : null}
            {daysLeft !== undefined ? (
              <Text style={row}>
                {daysLeft <= 0
                  ? "Expiration imminente — agissez maintenant"
                  : `Expiration dans : ${daysLeft} jour(s)`}
              </Text>
            ) : null}
          </Section>
          <Text style={text}>
            {urgent
              ? "Sans paiement dans les délais, votre campagne sera automatiquement annulée et les créneaux libérés."
              : "Effectuez le paiement depuis votre espace annonceur pour activer la campagne."}
          </Text>
          {payUrl && (
            <Button style={urgent ? buttonUrgent : button} href={payUrl}>
              Payer maintenant
            </Button>
          )}
          <Hr style={hr} />
          <Text style={footer}>
            MoveSpot — publicité mobile sur véhicules. Vous recevez cet email car une campagne vous
            attend.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export const template = {
  component: Email,
  subject: (data: Record<string, unknown>) =>
    (data.daysLeft as number) <= 2
      ? `⚠️ Dernière chance — campagne "${data.spotName ?? "en cours"}" expire bientôt`
      : `💳 Rappel : paiement en attente pour "${data.spotName ?? "votre campagne"}"`,
  displayName: "Rappel paiement campagne",
  previewData: {
    fullName: "Sophie Bernard",
    spotName: "Taxi Basse-Terre",
    totalPrice: "240 €",
    daysLeft: 4,
    payUrl: "https://move-spot.com/annonceur",
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
const h1Urgent = { fontSize: "24px", lineHeight: "1.3", color: "#b45309", margin: "0 0 16px" };
const text = { fontSize: "15px", lineHeight: "1.6", color: "#374151" };
const card = {
  backgroundColor: "#fffbeb",
  borderRadius: "12px",
  padding: "16px 18px",
  margin: "20px 0",
  borderLeft: "4px solid #f59e0b",
};
const cardUrgent = {
  backgroundColor: "#fef2f2",
  borderRadius: "12px",
  padding: "16px 18px",
  margin: "20px 0",
  borderLeft: "4px solid #ef4444",
};
const row = { fontSize: "14px", lineHeight: "1.5", color: "#111827", margin: "4px 0" };
const button = {
  backgroundColor: "#f59e0b",
  color: "#ffffff",
  borderRadius: "10px",
  padding: "12px 20px",
  fontSize: "15px",
  fontWeight: 600,
  textDecoration: "none",
  display: "inline-block",
  marginTop: "8px",
};
const buttonUrgent = {
  backgroundColor: "#dc2626",
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
