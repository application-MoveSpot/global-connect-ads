import * as React from "react";
import { Body, Button, Container, Head, Html, Preview, Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import {
  EmailHeader, EmailFooter,
  bodyStyle, containerStyle, contentPadding,
  h1Style, textStyle, mutedText, buttonStyle,
} from "./_base";

interface Props {
  firstName?: string;
  dashboardUrl?: string;
  unsubscribeUrl?: string;
}

const checkStyle = {
  fontSize: "14px",
  lineHeight: "1.6",
  color: "#374151",
  margin: "0 0 8px",
  paddingLeft: "6px",
};

const Email = ({ firstName, dashboardUrl, unsubscribeUrl }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Bienvenue sur MoveSpot — votre espace annonceur est prêt</Preview>
    <Body style={bodyStyle}>
      <Container style={{ maxWidth: "560px", margin: "32px auto" }}>
        <Container style={containerStyle}>
          <EmailHeader />

          <Section style={contentPadding}>
            <Text style={{ ...h1Style, marginTop: "16px" }}>
              Bienvenue{firstName ? ` ${firstName}` : ""} ! 🎉
            </Text>

            <Text style={textStyle}>
              Votre compte annonceur MoveSpot est activé. Vous pouvez dès maintenant lancer votre première campagne de publicité mobile sur véhicules.
            </Text>

            <Section
              style={{
                backgroundColor: "#f8fafc",
                border: "1px solid #e5e7eb",
                borderRadius: "10px",
                padding: "16px 18px",
                margin: "20px 0",
              }}
            >
              <Text style={{ ...mutedText, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.4px", marginBottom: "12px" }}>
                Ce que vous pouvez faire
              </Text>
              <Text style={checkStyle}>✅ Créer un brief et cibler une zone géographique</Text>
              <Text style={checkStyle}>✅ Recevoir des propositions de flottes locales</Text>
              <Text style={checkStyle}>✅ Suivre votre campagne en temps réel (km, couverture)</Text>
              <Text style={{ ...checkStyle, margin: 0 }}>✅ Gérer votre portefeuille et vos factures</Text>
            </Section>

            <Text style={mutedText}>
              Besoin d'aide pour démarrer ? Notre FAQ répond aux questions les plus courantes — accessible depuis votre espace annonceur.
            </Text>

            {dashboardUrl ? (
              <Section style={{ margin: "28px 0 8px" }}>
                <Button style={buttonStyle} href={dashboardUrl}>
                  Accéder à mon espace annonceur
                </Button>
              </Section>
            ) : null}
          </Section>

          <EmailFooter unsubscribeUrl={unsubscribeUrl} />
        </Container>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: (data: Record<string, unknown>) =>
    data.firstName
      ? `Bienvenue ${data.firstName} — votre espace MoveSpot est prêt`
      : "Bienvenue sur MoveSpot — votre espace annonceur est prêt",
  displayName: "Bienvenue annonceur",
  previewData: {
    firstName: "Sophie",
    dashboardUrl: "https://move-spot.com/annonceur",
  },
} satisfies TemplateEntry;
