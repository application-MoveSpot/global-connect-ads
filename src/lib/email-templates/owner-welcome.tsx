import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";
import {
  EmailHeader,
  EmailFooter,
  bodyStyle,
  containerStyle,
  contentPadding,
  h1Style,
  textStyle,
  mutedText,
  buttonStyle,
} from "./_base";

interface Props {
  firstName?: string;
  stripeOnboardingUrl?: string;
  dashboardUrl?: string;
  unsubscribeUrl?: string;
}

const stepStyle = {
  fontSize: "14px",
  lineHeight: "1.6",
  color: "#374151",
  margin: "0 0 10px",
  paddingLeft: "6px",
};

const Email = ({ firstName, stripeOnboardingUrl, dashboardUrl, unsubscribeUrl }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>
      Bienvenue{firstName ? ` ${firstName}` : ""} — associez votre compte bancaire pour recevoir
      vos paiements MoveSpot
    </Preview>
    <Body style={bodyStyle}>
      <Container style={{ maxWidth: "560px", margin: "32px auto" }}>
        <Container style={containerStyle}>
          <EmailHeader />

          <Section style={contentPadding}>
            <Text style={{ ...h1Style, marginTop: "16px" }}>
              Bienvenue{firstName ? ` ${firstName}` : ""} sur MoveSpot ! 🚗
            </Text>

            <Text style={textStyle}>
              Votre espace propriétaire est activé. Pour commencer à recevoir des offres de
              campagnes et être payé directement, une seule étape reste à faire&nbsp;: connecter
              votre compte bancaire via Stripe.
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
              <Text
                style={{
                  ...mutedText,
                  fontWeight: 600,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.4px",
                  marginBottom: "12px",
                }}
              >
                3 étapes pour commencer à gagner
              </Text>
              <Text style={stepStyle}>✅ Compte propriétaire créé</Text>
              <Text style={{ ...stepStyle, color: "#6366f1", fontWeight: 600 }}>
                🔗 Associer votre compte bancaire (Stripe Connect)
              </Text>
              <Text style={{ ...stepStyle, color: "#9ca3af" }}>
                ⏳ Recevoir vos premières propositions de campagnes
              </Text>
            </Section>

            <Text style={textStyle}>
              Stripe Connect est utilisé par des milliers d'entreprises pour sécuriser les
              virements. L'intégration prend 5 minutes et vos virements sont automatiques après
              chaque campagne validée.
            </Text>

            <Text style={mutedText}>
              Revenus moyens constatés sur MoveSpot&nbsp;: <strong>120 à 280 €/mois</strong> par
              véhicule selon la zone et la disponibilité.
            </Text>

            <Section style={{ margin: "28px 0 8px" }}>
              <Button
                style={buttonStyle}
                href={stripeOnboardingUrl ?? dashboardUrl ?? "https://move-spot.com/proprietaire"}
              >
                Associer mon compte bancaire
              </Button>
            </Section>

            <Text style={{ ...mutedText, marginTop: "10px" }}>
              Besoin d'aide ? Répondez à cet email ou consultez notre FAQ depuis votre espace
              propriétaire.
            </Text>
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
      ? `Bienvenue ${data.firstName} — activez vos paiements MoveSpot`
      : "Bienvenue — activez vos paiements MoveSpot",
  displayName: "Bienvenue propriétaire",
  previewData: {
    firstName: "Marc",
    stripeOnboardingUrl: "https://move-spot.com/proprietaire/paiements",
    dashboardUrl: "https://move-spot.com/proprietaire",
  },
} satisfies TemplateEntry;
