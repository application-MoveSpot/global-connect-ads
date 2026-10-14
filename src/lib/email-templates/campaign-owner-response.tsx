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
  startDate?: string;
  endDate?: string;
  totalPrice?: string;
  accepted: boolean;
  dashboardUrl?: string;
  unsubscribeUrl?: string;
}

const Email = ({
  company,
  spotName,
  startDate,
  endDate,
  totalPrice,
  accepted,
  dashboardUrl,
  unsubscribeUrl,
}: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>
      {accepted
        ? `Bonne nouvelle : un propriétaire a accepté votre demande de campagne`
        : `Un propriétaire n'est pas disponible pour votre campagne`}
    </Preview>
    <Body style={bodyStyle}>
      <Container style={{ maxWidth: "560px", margin: "32px auto" }}>
        <Container style={containerStyle}>
          <EmailHeader />

          <Section style={contentPadding}>
            <Text
              style={{
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "1px",
                textTransform: "uppercase",
                color: accepted ? "#22c55e" : "#f59e0b",
                margin: "0 0 10px",
              }}
            >
              {accepted ? "Demande acceptée" : "Demande refusée"}
            </Text>

            <Text style={h1Style}>
              {accepted
                ? "Un propriétaire a accepté votre demande 🎉"
                : "Un propriétaire n'est pas disponible"}
            </Text>

            <Text style={textStyle}>
              {company ? `Bonjour ${company},` : "Bonjour,"}{" "}
              {accepted
                ? "un propriétaire de flotte vient d'accepter votre demande de campagne sur MoveSpot. Rendez-vous sur votre espace annonceur pour consulter les détails et finaliser la campagne."
                : "un propriétaire de flotte n'est pas disponible pour votre demande de campagne. D'autres propriétaires peuvent encore accepter votre demande."}
            </Text>

            <InfoCard>
              {spotName ? <InfoRow label="Campagne" value={spotName} /> : null}
              {startDate && endDate ? (
                <InfoRow label="Période" value={`${startDate} → ${endDate}`} />
              ) : null}
              {totalPrice ? <InfoRow label="Montant estimé" value={totalPrice} /> : null}
            </InfoCard>

            {accepted && (
              <Text style={mutedText}>
                Connectez-vous à votre espace annonceur pour consulter la proposition et procéder au
                paiement si nécessaire.
              </Text>
            )}

            {!accepted && (
              <Text style={mutedText}>
                Ne vous inquiétez pas — votre demande reste visible par d'autres propriétaires de
                flotte dans votre zone.
              </Text>
            )}

            {dashboardUrl ? (
              <Section style={{ margin: "24px 0" }}>
                <Button style={buttonStyle} href={dashboardUrl}>
                  Voir ma demande
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
    data.accepted
      ? data.spotName
        ? `✅ Votre campagne « ${data.spotName} » a été acceptée`
        : "✅ Un propriétaire a accepté votre demande"
      : data.spotName
        ? `ℹ️ Votre campagne « ${data.spotName} » — réponse d'un propriétaire`
        : "ℹ️ Réponse d'un propriétaire sur votre demande",
  displayName: "Réponse propriétaire à une campagne",
  previewData: {
    company: "Rakoun Klub",
    spotName: "Lancement Été 2026 — Pointe-à-Pitre",
    startDate: "20/08/2026",
    endDate: "20/09/2026",
    totalPrice: "1 250,00 €",
    accepted: true,
    dashboardUrl: "https://move-spot.com/annonceur",
  },
} satisfies TemplateEntry;
