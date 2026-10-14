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
  dashboardUrl?: string;
  unsubscribeUrl?: string;
}

const Email = ({ ownerName, briefTitle, company, zone, dashboardUrl, unsubscribeUrl }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre proposition n'a pas été retenue — d'autres opportunités vous attendent</Preview>
    <Body style={bodyStyle}>
      <Container style={{ maxWidth: "560px", margin: "32px auto" }}>
        <Container style={containerStyle}>
          <EmailHeader />

          <Section style={contentPadding}>
            <StatusBadge color="amber">Proposition non retenue</StatusBadge>

            <Text style={{ ...h1Style, marginTop: "16px" }}>
              Votre proposition n'a pas été retenue
            </Text>

            <Text style={textStyle}>
              {ownerName ? `Bonjour ${ownerName},` : "Bonjour,"} l'annonceur
              {company ? ` ${company}` : ""} n'a pas retenu votre proposition pour le brief
              {briefTitle ? ` « ${briefTitle} »` : ""}. Cela fait partie du processus normal —
              d'autres opportunités arrivent régulièrement sur MoveSpot.
            </Text>

            <InfoCard>
              {briefTitle ? <InfoRow label="Brief" value={briefTitle} /> : null}
              {company ? <InfoRow label="Annonceur" value={company} /> : null}
              {zone ? <InfoRow label="Zone" value={zone} /> : null}
            </InfoCard>

            <Text style={mutedText}>
              Consultez les nouveaux briefs disponibles dans votre espace pour soumettre d'autres
              propositions.
            </Text>

            {dashboardUrl ? (
              <Section style={{ margin: "24px 0" }}>
                <Button style={buttonStyle} href={dashboardUrl}>
                  Voir les briefs disponibles →
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
      ? `Proposition non retenue — brief « ${data.briefTitle} »`
      : "Votre proposition MoveSpot n'a pas été retenue",
  displayName: "Proposition refusée (propriétaire)",
  previewData: {
    ownerName: "Jean-Pierre Martin",
    briefTitle: "Lancement Été 2026 — Pointe-à-Pitre",
    company: "Rakoun Klub",
    zone: "Centre-ville Pointe-à-Pitre",
    dashboardUrl: "https://move-spot.com/proprietaire/briefs",
  },
} satisfies TemplateEntry;
