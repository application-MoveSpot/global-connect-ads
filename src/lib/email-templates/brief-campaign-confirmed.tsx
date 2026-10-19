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
  advertiserName?: string;
  briefTitle?: string;
  ownerName?: string;
  totalPrice?: string;
  startDate?: string;
  endDate?: string;
  dashboardUrl?: string;
  unsubscribeUrl?: string;
}

const Email = ({
  advertiserName,
  briefTitle,
  ownerName,
  totalPrice,
  startDate,
  endDate,
  dashboardUrl,
  unsubscribeUrl,
}: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre campagne a démarré — proposition acceptée avec succès</Preview>
    <Body style={bodyStyle}>
      <Container style={{ maxWidth: "560px", margin: "32px auto" }}>
        <Container style={containerStyle}>
          <EmailHeader />

          <Section style={contentPadding}>
            <StatusBadge color="green">Campagne lancée 🚗</StatusBadge>

            <Text style={{ ...h1Style, marginTop: "16px" }}>Votre campagne est lancée !</Text>

            <Text style={textStyle}>
              {advertiserName ? `Bonjour ${advertiserName},` : "Bonjour,"} vous avez accepté la
              proposition{ownerName ? ` de ${ownerName}` : ""} pour le brief
              {briefTitle ? ` « ${briefTitle} »` : ""}. La campagne est maintenant en cours de
              préparation.
            </Text>

            <InfoCard>
              {briefTitle ? <InfoRow label="Brief" value={briefTitle} /> : null}
              {ownerName ? <InfoRow label="Propriétaire" value={ownerName} /> : null}
              {startDate && endDate ? (
                <InfoRow label="Période" value={`${startDate} → ${endDate}`} />
              ) : null}
              {totalPrice ? <InfoRow label="Montant total" value={totalPrice} /> : null}
            </InfoCard>

            <Text style={textStyle}>
              MoveSpot va mandater un prestataire pour apposer votre covering sur le véhicule. Vous
              serez notifié lorsque l'installation est confirmée et que la campagne est active.
            </Text>

            <Text style={mutedText}>
              Vous pouvez suivre l'avancement de votre campagne depuis votre tableau de bord.
            </Text>

            {dashboardUrl ? (
              <Section style={{ margin: "24px 0" }}>
                <Button style={buttonStyle} href={dashboardUrl}>
                  Suivre ma campagne →
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
      ? `🚗 Campagne lancée — brief « ${data.briefTitle} »`
      : "Votre campagne MoveSpot est en route",
  displayName: "Campagne confirmée (annonceur)",
  previewData: {
    advertiserName: "Marie Dupont",
    briefTitle: "Lancement boutique — Centre-ville",
    ownerName: "Jean-Pierre Martin",
    totalPrice: "390 €",
    startDate: "15/10/2026",
    endDate: "15/11/2026",
    dashboardUrl: "https://move-spot.com/advertiser",
  },
} satisfies TemplateEntry;
