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
  spaceUrl?: string;
}

const Email = ({ fullName, spaceUrl }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Finalisez votre configuration Stripe pour recevoir vos reversements MoveSpot</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>MoveSpot</Text>
        <Heading style={h1}>Votre IBAN n'est pas encore lié ⚠️</Heading>
        <Text style={text}>
          {fullName ? `Bonjour ${fullName},` : "Bonjour,"} nous avons remarqué que votre compte
          prestataire MoveSpot n'a pas encore finalisé la liaison bancaire via Stripe.
        </Text>
        <Section style={card}>
          <Text style={row}>
            Tant que cette étape n'est pas complétée,{" "}
            <strong>aucun reversement ne peut vous être versé</strong>, même si vos prestations sont
            validées.
          </Text>
        </Section>
        <Text style={text}>
          La configuration prend moins de 5 minutes : vérification d'identité et saisie de votre
          IBAN directement sur Stripe (MoveSpot n'a jamais accès à vos coordonnées bancaires).
        </Text>
        {spaceUrl ? (
          <Button style={button} href={spaceUrl}>
            Finaliser ma liaison bancaire
          </Button>
        ) : null}
        <Hr style={hr} />
        <Text style={footer}>
          MoveSpot — publicité mobile sur véhicules. Si vous avez déjà finalisé l'onboarding Stripe,
          ignorez cet email.
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: "⚠️ Action requise : finalisez votre liaison bancaire MoveSpot",
  displayName: "Rappel liaison Stripe",
  previewData: {
    fullName: "Jean Martin",
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
  backgroundColor: "#fffbeb",
  borderRadius: "12px",
  padding: "16px 18px",
  margin: "20px 0",
  borderLeft: "4px solid #f59e0b",
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
