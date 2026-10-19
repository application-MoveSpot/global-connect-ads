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
  firstName?: string;
  eventLabel?: string;
  ownerName?: string;
  vehicleType?: string;
  zone?: string;
  proposedPrice?: string;
  startDate?: string;
  daysUntilEvent?: number;
  dashboardUrl?: string;
  unsubscribeUrl?: string;
}

const Email = ({
  firstName,
  eventLabel,
  ownerName,
  vehicleType,
  zone,
  proposedPrice,
  startDate,
  daysUntilEvent,
  dashboardUrl,
  unsubscribeUrl,
}: Props) => {
  const urgentSoon =
    typeof daysUntilEvent === "number" && daysUntilEvent >= 0 && daysUntilEvent <= 7;

  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>
        Un véhicule est disponible pour votre {eventLabel ?? "événement"} — répondez vite !
      </Preview>
      <Body style={bodyStyle}>
        <Container style={{ maxWidth: "560px", margin: "32px auto" }}>
          <Container style={containerStyle}>
            <EmailHeader />

            <Section style={contentPadding}>
              <StatusBadge color="blue">Véhicule disponible 🎉</StatusBadge>

              <Text style={{ ...h1Style, marginTop: "16px" }}>
                Bonne nouvelle — un véhicule a répondu à votre annonce !
              </Text>

              <Text style={textStyle}>
                {firstName ? `Bonjour ${firstName} !` : "Bonjour !"} Un propriétaire de véhicule a
                vu votre annonce{eventLabel ? ` pour votre ${eventLabel}` : ""} et vous soumet une
                proposition.
              </Text>

              {urgentSoon && typeof daysUntilEvent === "number" && (
                <Section
                  style={{
                    backgroundColor: "#fef3c7",
                    border: "1px solid #f59e0b",
                    borderRadius: "8px",
                    padding: "12px 16px",
                    margin: "16px 0",
                  }}
                >
                  <Text
                    style={{
                      color: "#92400e",
                      fontSize: "14px",
                      fontWeight: "600",
                      margin: 0,
                    }}
                  >
                    ⏰ Votre événement est dans{" "}
                    {daysUntilEvent === 0
                      ? "moins d'1 jour"
                      : `${daysUntilEvent} jour${daysUntilEvent > 1 ? "s" : ""}`}{" "}
                    — répondez rapidement pour sécuriser votre véhicule !
                  </Text>
                </Section>
              )}

              <InfoCard>
                {eventLabel ? <InfoRow label="Votre événement" value={eventLabel} /> : null}
                {ownerName ? <InfoRow label="Propriétaire" value={ownerName} /> : null}
                {vehicleType ? <InfoRow label="Type de véhicule" value={vehicleType} /> : null}
                {zone ? <InfoRow label="Zone de diffusion" value={zone} /> : null}
                {proposedPrice ? <InfoRow label="Tarif proposé" value={proposedPrice} /> : null}
                {startDate ? <InfoRow label="Date de début" value={startDate} /> : null}
              </InfoCard>

              <Text style={textStyle}>
                Vous pouvez accepter ou refuser cette proposition directement depuis votre espace
                MoveSpot. Si la proposition vous convient, un seul clic suffit pour confirmer votre
                véhicule et sécuriser votre publicité pour l'événement.
              </Text>

              <Text style={mutedText}>
                Cette proposition est réservée pendant 48h. Ne laissez pas votre créneau passer !
              </Text>

              {dashboardUrl ? (
                <Section style={{ margin: "24px 0" }}>
                  <Button style={buttonStyle} href={dashboardUrl}>
                    Voir la proposition →
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
};

export const template = {
  component: Email,
  subject: (data: Record<string, unknown>) => {
    const eventLabel = data.eventLabel as string | undefined;
    if (eventLabel) return `Un véhicule disponible pour votre ${eventLabel} — répondez vite !`;
    return "Un véhicule a répondu à votre annonce MoveSpot 🎉";
  },
  displayName: "Proposition reçue (particulier)",
  previewData: {
    firstName: "Sophie",
    eventLabel: "mariage",
    ownerName: "Taxi Karib",
    vehicleType: "Taxi",
    zone: "Pointe-à-Pitre centre",
    proposedPrice: "79 €",
    startDate: "15/09/2026",
    daysUntilEvent: 5,
    dashboardUrl: "https://move-spot.com/advertiser",
  },
} satisfies TemplateEntry;
