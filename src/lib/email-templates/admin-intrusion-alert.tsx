import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  intruderEmail?: string;
  intruderUserId?: string;
  attemptedAt?: string;
  userAgent?: string;
}

const Email = ({ intruderEmail, intruderUserId, attemptedAt, userAgent }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>⚠️ Tentative d'accès non autorisé à votre espace administrateur</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>MoveSpot</Text>
        <Heading style={h1}>🚨 Accès admin non autorisé détecté</Heading>
        <Text style={text}>
          Un utilisateur a tenté d'accéder à votre espace administrateur sans y être autorisé.
        </Text>
        <Section style={card}>
          {intruderEmail ? (
            <Text style={row}>
              Email : <strong>{intruderEmail}</strong>
            </Text>
          ) : null}
          {intruderUserId ? (
            <Text style={row}>
              ID utilisateur : <strong>{intruderUserId}</strong>
            </Text>
          ) : null}
          {attemptedAt ? (
            <Text style={row}>
              Date/heure : <strong>{attemptedAt}</strong>
            </Text>
          ) : null}
          {userAgent ? (
            <Text style={row}>
              Navigateur : <strong>{userAgent}</strong>
            </Text>
          ) : null}
        </Section>
        <Text style={text}>
          Si vous ne reconnaissez pas cette tentative, vérifiez la sécurité de votre application.
          Aucune action n'est nécessaire si l'utilisateur a simplement essayé d'accéder à une page
          réservée.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>
          MoveSpot — cet email est envoyé automatiquement à chaque tentative d'accès non autorisé à
          /admin.
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: () => `🚨 Tentative d'accès admin non autorisée — ${new Date().toLocaleString("fr-FR")}`,
  displayName: "Alerte intrusion admin",
  to: "rakounklub@gmail.com",
  previewData: {
    intruderEmail: "inconnu@example.com",
    intruderUserId: "abc-123",
    attemptedAt: new Date().toLocaleString("fr-FR"),
    userAgent: "Mozilla/5.0 (Windows NT 10.0)",
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
const hr = { borderColor: "#e5e7eb", margin: "28px 0 16px" };
const footer = { fontSize: "12px", lineHeight: "1.5", color: "#6b7280" };
