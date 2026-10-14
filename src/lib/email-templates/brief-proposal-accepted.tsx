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
  InfoCard,
  InfoRow,
  StatusBadge,
  bodyStyle,
  containerStyle,
  contentPadding,
  h1Style,
  textStyle,
  mutedText,
  buttonStyle,
} from "./_base";

interface Props {
  ownerName?: string;
  briefTitle?: string;
  company?: string;
  zone?: string;
  proposedPrice?: string;
  startDate?: string;
  endDate?: string;
  dashboardUrl?: string;
  unsubscribeUrl?: string;
}

const Email = ({
  ownerName,
  briefTitle,
  company,
  zone,
  proposedPrice,
  startDate,
  endDate,
  dashboardUrl,
  unsubscribeUrl,
}: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre proposition a été acceptée — campagne en cours de démarrage</Preview>
    <Body style={bodyStyle}>
      <Container style={{ maxWidth: "560px", margin: "32px auto" }}>
        <Container style={containerStyle}>
          <EmailHeader />

          <Section style={contentPadding}>
            <StatusBadge color="green">Proposition acceptée ✅</StatusBadge>

            <Text style={{ ...h1Style, marginTop: "16px" }}>Votre proposition a été retenue !</Text>

            <Text style={textStyle}>
              {ownerName ? `Bonjour ${ownerName},` : "Bonjour,"} l'annonceur
              {company ? ` ${company}` : ""} a accepté votre proposition pour le brief
              {briefTitle ? ` « ${briefTitle} »` : ""}. La campagne va démarrer prochainement.
            </Text>

            <InfoCard>
              {briefTitle ? <InfoRow label="Brief" value={briefTitle} /> : null}
              {company ? <InfoRow label="Annonceur" value={company} /> : null}
              {zone ? <InfoRow label="Zone" value={zone} /> : null}
              {proposedPrice ? <InfoRow label="Votre tarif" value={proposedPrice} /> : null}
              {startDate && endDate ? (
                <InfoRow label="Période" value={`${startDate} → ${endDate}`} />
              ) : null}
            </InfoCard>

            <Text style={textStyle}>
              Retrouvez les détails de la campagne dans votre espace propriétaire. Le poseur
              MoveSpot sera mandaté pour apposer le covering sur votre véhicule.
            </Text>

            <Text style={mutedText}>
              Votre rémunération démarrera après validation de la pose par MoveSpot.
            </Text>

            {dashboardUrl ? (
              <Section style={{ margin: "24px 0" }}>
                <Button style={buttonStyle} href={dashboardUrl}>
                  Voir la campagne →
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
    data.briefTitle
      ? `✅ Proposition acceptée — brief « ${data.briefTitle} »`
      : "Votre proposition MoveSpot a été acceptée",
  displayName: "Proposition acceptée (propriétaire)",
  previewData: {
    ownerName: "Jean-Pierre Martin",
    briefTitle: "Lancement Été 2026 — Pointe-à-Pitre",
    company: "Rakoun Klub",
    zone: "Centre-ville Pointe-à-Pitre",
    proposedPrice: "390 € / mois",
    startDate: "20/08/2026",
    endDate: "20/09/2026",
    dashboardUrl: "https://move-spot.com/proprietaire",
  },
} satisfies TemplateEntry;
