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
  briefTitle?: string;
  approved?: boolean;
  reason?: string;
  dashboardUrl?: string;
}

const Email = ({ briefTitle = "votre brief", approved = true, reason, dashboardUrl }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>
      {approved
        ? `Brief "${briefTitle}" approuvé — les propriétaires de flotte peuvent maintenant y répondre`
        : `Brief "${briefTitle}" non approuvé — consultez le motif`}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>MoveSpot</Text>
        <Heading style={h1}>{approved ? "Brief approuvé ✅" : "Brief non approuvé ❌"}</Heading>
        <Text style={text}>
          {approved ? (
            <>
              Votre brief <strong>{briefTitle}</strong> a été validé par notre équipe. Il est
              maintenant visible par les propriétaires de flotte et prestataires MoveSpot, qui
              peuvent y soumettre des propositions.
            </>
          ) : (
            <>
              Votre brief <strong>{briefTitle}</strong> n'a pas pu être approuvé en l'état.
              Consultez le motif ci-dessous et soumettez-en un nouveau en corrigeant les points
              indiqués.
            </>
          )}
        </Text>
        {!approved && reason && (
          <Section style={reasonBox}>
            <Text style={reasonText}>Motif : {reason}</Text>
          </Section>
        )}
        {dashboardUrl && (
          <Button style={button} href={dashboardUrl}>
            {approved ? "Voir mes briefs en cours" : "Créer un nouveau brief"}
          </Button>
        )}
        <Hr style={hr} />
        <Text style={footer}>
          MoveSpot — publicité mobile sur véhicules. Vous recevez cet email en tant qu'annonceur
          MoveSpot.
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: (data: Record<string, unknown>) =>
    data.approved
      ? `✅ Brief "${data.briefTitle ?? ""}" approuvé — MoveSpot`
      : `❌ Brief "${data.briefTitle ?? ""}" non approuvé — MoveSpot`,
  displayName: "Décision brief (approuvé / refusé)",
  previewData: {
    briefTitle: "Campagne printemps Paris",
    approved: true,
    dashboardUrl: "https://move-spot.com/annonceur",
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
const reasonBox = {
  backgroundColor: "#fef2f2",
  borderRadius: "10px",
  padding: "14px 18px",
  margin: "16px 0",
  borderLeft: "4px solid #ef4444",
};
const reasonText = { fontSize: "14px", lineHeight: "1.5", color: "#7f1d1d", margin: 0 };
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
