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
  configUrl?: string;
  unsubscribeUrl?: string;
}

const Email = ({ firstName, configUrl, unsubscribeUrl }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>
      {firstName ? `${firstName}, il` : "Il"} ne reste qu'une étape pour recevoir vos premières
      offres MoveSpot
    </Preview>
    <Body style={bodyStyle}>
      <Container style={{ maxWidth: "560px", margin: "32px auto" }}>
        <Container style={containerStyle}>
          <EmailHeader />

          <Section style={contentPadding}>
            <Text style={{ ...h1Style, marginTop: "16px" }}>
              {firstName ? `${firstName}, il` : "Il"} manque encore la dernière étape 🔧
            </Text>

            <Text style={textStyle}>
              Votre espace propriétaire est prêt, mais votre configuration n'est pas encore
              complète. Les annonceurs ne peuvent pas vous faire de propositions tant que votre
              compte bancaire n'est pas lié et/ou votre véhicule non renseigné.
            </Text>

            <Section
              style={{
                backgroundColor: "#fef9c3",
                border: "1px solid #fde68a",
                borderRadius: "10px",
                padding: "16px 18px",
                margin: "20px 0",
              }}
            >
              <Text
                style={{
                  fontSize: "13px",
                  color: "#92400e",
                  fontWeight: 600,
                  margin: "0 0 8px",
                }}
              >
                ⚠️ Ce qu'il reste à faire
              </Text>
              <Text
                style={{
                  fontSize: "13px",
                  lineHeight: "1.65",
                  color: "#78350f",
                  margin: 0,
                }}
              >
                Associez votre compte bancaire Stripe et renseignez les informations de votre
                véhicule (type, photos, disponibilités). Cela prend moins de 10 minutes.
              </Text>
            </Section>

            <Text style={textStyle}>
              Une fois votre profil complet, votre véhicule apparaîtra dans les résultats des
              annonceurs qui ciblent votre zone. Les premières propositions arrivent généralement
              dans les 48h.
            </Text>

            <Text style={mutedText}>
              Rappel : vos paiements sont automatiques et sécurisés via Stripe — vous êtes payé
              directement sur votre compte bancaire après chaque campagne validée.
            </Text>

            <Section style={{ margin: "28px 0 8px" }}>
              <Button style={buttonStyle} href={configUrl ?? "https://move-spot.com/proprietaire"}>
                Finaliser la configuration de mon véhicule
              </Button>
            </Section>
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
      ? `${data.firstName}, finalisez votre profil propriétaire MoveSpot`
      : "Finalisez votre profil propriétaire MoveSpot",
  displayName: "Propriétaire J+2 — relance configuration",
  previewData: {
    firstName: "Marc",
    configUrl: "https://move-spot.com/proprietaire",
  },
} satisfies TemplateEntry;
