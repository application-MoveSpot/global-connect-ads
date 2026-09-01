import * as React from "react";
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  fullName?: string;
  spotName?: string;
  startDate?: string;
  delayDays?: number;
  jobUrl?: string;
}

const Email = ({ fullName, spotName, startDate, delayDays, jobUrl }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Action requise : confirmation de pose en attente pour une campagne active</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>MoveSpot</Text>
        <Heading style={h1}>🔧 Confirmation de pose en retard</Heading>
        <Text style={text}>
          {fullName ? `Bonjour ${fullName},` : "Bonjour,"} une campagne dont vous êtes responsable de la pose est active mais n'a pas encore été confirmée.
        </Text>
        <Section style={card}>
          {spotName ? <Text style={row}>Campagne : <strong>{spotName}</strong></Text> : null}
          {startDate ? <Text style={row}>Date de début : <strong>{startDate}</strong></Text> : null}
          {delayDays !== undefined ? (
            <Text style={row}>Retard : <strong>{delayDays} jour(s)</strong></Text>
          ) : null}
        </Section>
        <Text style={text}>
          Merci de confirmer la pose en prenant les photos requises depuis votre espace poseur dès que possible. Un retard persistant peut affecter votre score de fiabilité.
        </Text>
        {jobUrl && (
          <Button style={button} href={jobUrl}>
            Accéder à la mission
          </Button>
        )}
        <Hr style={hr} />
        <Text style={footer}>
          MoveSpot — publicité mobile sur véhicules. Vous recevez cet email car vous avez une mission de pose en cours.
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: (data: Record<string, unknown>) =>
    `🔧 Confirmation requise — pose "${data.spotName ?? "campagne"}" en retard`,
  displayName: "Pose en retard (poseur)",
  previewData: {
    fullName: "Paul Girard",
    spotName: "Camionnette Fort-de-France",
    startDate: "01/09/2026",
    delayDays: 3,
    jobUrl: "https://move-spot.com/chauffeur/espace",
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Helvetica, Arial, sans-serif" };
const container = { padding: "28px 24px", maxWidth: "560px" };
const brand = { fontSize: "13px", letterSpacing: "3px", textTransform: "uppercase" as const, color: "#6b7280", margin: "0 0 12px" };
const h1 = { fontSize: "24px", lineHeight: "1.3", color: "#b45309", margin: "0 0 16px" };
const text = { fontSize: "15px", lineHeight: "1.6", color: "#374151" };
const card = { backgroundColor: "#fffbeb", borderRadius: "12px", padding: "16px 18px", margin: "20px 0", borderLeft: "4px solid #f59e0b" };
const row = { fontSize: "14px", lineHeight: "1.5", color: "#111827", margin: "4px 0" };
const button = { backgroundColor: "#111827", color: "#ffffff", borderRadius: "10px", padding: "12px 20px", fontSize: "15px", fontWeight: 600, textDecoration: "none", display: "inline-block", marginTop: "8px" };
const hr = { borderColor: "#e5e7eb", margin: "28px 0 16px" };
const footer = { fontSize: "12px", lineHeight: "1.5", color: "#6b7280" };
