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
  company?: string;
  spotName?: string;
  ownerName?: string;
  vehicleCount?: string;
  zone?: string;
  proposedPrice?: string;
  startDate?: string;
  endDate?: string;
  dashboardUrl?: string;
  unsubscribeUrl?: string;
}

const Email = ({
  company,
  spotName,
  ownerName,
  vehicleCount,
  zone,
  proposedPrice,
  startDate,
  endDate,
  dashboardUrl,
  unsubscribeUrl,
}: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Un propriétaire de flotte a répondu à votre brief MoveSpot</Preview>
    <Body style={bodyStyle}>
      <Container style={{ maxWidth: "560px", margin: "32px auto" }}>
        <Container style={containerStyle}>
          <EmailHeader />

          <Section style={contentPadding}>
            <StatusBadge color="blue">Nouvelle proposition</StatusBadge>

            <Text style={{ ...h1Style, marginTop: "16px" }}>Vous avez reçu une proposition 📬</Text>

            <Text style={textStyle}>
              {company ? `Bonjour ${company},` : "Bonjour,"} un propriétaire de flotte a répondu à
              votre brief et soumet une proposition pour diffuser votre campagne.
            </Text>

            <InfoCard>
              {spotName ? <InfoRow label="Brief" value={spotName} /> : null}
              {ownerName ? <InfoRow label="Proposé par" value={ownerName} /> : null}
              {vehicleCount ? <InfoRow label="Véhicules proposés" value={vehicleCount} /> : null}
              {zone ? <InfoRow label="Zone de diffusion" value={zone} /> : null}
              {proposedPrice ? <InfoRow label="Tarif proposé" value={proposedPrice} /> : null}
              {startDate && endDate ? (
                <InfoRow label="Période" value={`${startDate} → ${endDate}`} />
              ) : null}
            </InfoCard>

            <Text style={textStyle}>
              Consultez les détails de la proposition et décidez si elle correspond à vos attentes.
              Vous pouvez l'accepter directement depuis votre espace annonceur.
            </Text>

            <Text style={mutedText}>
              Cette proposition vous est réservée pendant 48h. Passé ce délai, le propriétaire sera
              libre de la retirer.
            </Text>

            {dashboardUrl ? (
              <Section style={{ margin: "24px 0" }}>
                <Button style={buttonStyle} href={dashboardUrl}>
                  Voir la proposition
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
    data.spotName
      ? `Nouvelle proposition pour votre brief « ${data.spotName} »`
      : "Un propriétaire a répondu à votre brief MoveSpot",
  displayName: "Proposition reçue",
  previewData: {
    company: "Rakoun Klub",
    spotName: "Lancement Été 2026 — Pointe-à-Pitre",
    ownerName: "Flotte Caraïbes Transport",
    vehicleCount: "3 taxis",
    zone: "Centre-ville Pointe-à-Pitre",
    proposedPrice: "390 € / mois",
    startDate: "20/08/2026",
    endDate: "20/09/2026",
    dashboardUrl: "https://move-spot.com/advertiser",
  },
} satisfies TemplateEntry;
