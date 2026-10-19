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
  campaignName?: string;
  startDate?: string;
  endDate?: string;
  amount?: string;
  vehicleCount?: string;
  zone?: string;
  trackingUrl?: string;
  unsubscribeUrl?: string;
}

const Email = ({
  company,
  campaignName,
  startDate,
  endDate,
  amount,
  vehicleCount,
  zone,
  trackingUrl,
  unsubscribeUrl,
}: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Paiement validé — votre campagne MoveSpot est en cours de diffusion</Preview>
    <Body style={bodyStyle}>
      <Container style={{ maxWidth: "560px", margin: "32px auto" }}>
        <Container style={containerStyle}>
          <EmailHeader />

          <Section style={contentPadding}>
            <StatusBadge color="green">Paiement validé</StatusBadge>

            <Text style={{ ...h1Style, marginTop: "16px" }}>
              Votre campagne est en diffusion 🚀
            </Text>

            <Text style={textStyle}>
              {company ? `Bonjour ${company},` : "Bonjour,"} votre paiement a bien été reçu et
              confirmé. Vos chauffeurs ont reçu leurs missions — la diffusion de votre campagne est
              maintenant active.
            </Text>

            {/* Récapitulatif financier */}
            <InfoCard>
              {campaignName ? <InfoRow label="Campagne" value={campaignName} /> : null}
              {amount ? <InfoRow label="Montant réglé" value={amount} /> : null}
              {startDate && endDate ? (
                <InfoRow label="Période" value={`${startDate} → ${endDate}`} />
              ) : null}
              {vehicleCount ? <InfoRow label="Véhicules assignés" value={vehicleCount} /> : null}
              {zone ? <InfoRow label="Zone de diffusion" value={zone} /> : null}
            </InfoCard>

            <Text style={textStyle}>
              Suivez en temps réel les kilomètres parcourus dans votre zone, les minutes actives et
              le taux de couverture depuis votre espace annonceur.
            </Text>

            <Text style={mutedText}>
              Les photographies de pose vous seront envoyées dès que les visuels seront installés
              sur les véhicules.
            </Text>

            {trackingUrl ? (
              <Section style={{ margin: "24px 0" }}>
                <Button style={buttonStyle} href={trackingUrl}>
                  Suivre ma campagne en direct
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
    data.campaignName
      ? `Paiement validé — « ${data.campaignName} » est en diffusion`
      : "Votre paiement MoveSpot est confirmé — campagne active",
  displayName: "Paiement validé / Campagne activée",
  previewData: {
    company: "Rakoun Klub",
    campaignName: "Taxi Pointe-à-Pitre — Été 2026",
    startDate: "20/08/2026",
    endDate: "20/09/2026",
    amount: "1 250,00 €",
    vehicleCount: "4 véhicules",
    zone: "Centre-ville Pointe-à-Pitre",
    trackingUrl: "https://move-spot.com/advertiser",
  },
} satisfies TemplateEntry;
