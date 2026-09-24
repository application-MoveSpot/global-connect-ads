import * as React from "react";
import { Body, Button, Container, Head, Html, Preview, Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import {
  EmailHeader, EmailFooter, InfoCard, InfoRow, StatusBadge,
  bodyStyle, containerStyle, contentPadding,
  h1Style, textStyle, mutedText, buttonStyle,
} from "./_base";

interface Props {
  advertiserName?: string;
  briefTitle?: string;
  vehicleTypes?: string;
  startDate?: string;
  endDate?: string;
  budgetMax?: string;
  dashboardUrl?: string;
  unsubscribeUrl?: string;
}

const Email = ({
  advertiserName, briefTitle, vehicleTypes,
  startDate, endDate, budgetMax, dashboardUrl, unsubscribeUrl,
}: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre brief est en ligne — les propriétaires vont le recevoir</Preview>
    <Body style={bodyStyle}>
      <Container style={{ maxWidth: "560px", margin: "32px auto" }}>
        <Container style={containerStyle}>
          <EmailHeader />

          <Section style={contentPadding}>
            <StatusBadge color="blue">Brief publié 📋</StatusBadge>

            <Text style={{ ...h1Style, marginTop: "16px" }}>
              Votre brief est en ligne !
            </Text>

            <Text style={textStyle}>
              {advertiserName ? `Bonjour ${advertiserName},` : "Bonjour,"} votre brief{briefTitle ? ` « ${briefTitle} »` : ""} a été publié avec succès. Les propriétaires de véhicules dans votre zone vont recevoir votre demande et pourront vous soumettre leurs propositions.
            </Text>

            <InfoCard>
              {briefTitle ? <InfoRow label="Brief" value={briefTitle} /> : null}
              {vehicleTypes ? <InfoRow label="Véhicules recherchés" value={vehicleTypes} /> : null}
              {startDate && endDate ? <InfoRow label="Période" value={`${startDate} → ${endDate}`} /> : null}
              {budgetMax ? <InfoRow label="Budget max" value={budgetMax} /> : null}
            </InfoCard>

            <Text style={textStyle}>
              Dès qu'un propriétaire soumet une proposition, vous recevrez un email. Vous pouvez consulter et gérer vos propositions depuis votre tableau de bord.
            </Text>

            <Text style={mutedText}>
              En général, les premières propositions arrivent dans les 24 à 48 heures.
            </Text>

            {dashboardUrl ? (
              <Section style={{ margin: "24px 0" }}>
                <Button style={buttonStyle} href={dashboardUrl}>
                  Voir mon brief →
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
      ? `📋 Brief publié — « ${data.briefTitle} »`
      : "Votre brief MoveSpot est en ligne",
  displayName: "Brief créé (annonceur)",
  previewData: {
    advertiserName: "Marie Dupont",
    briefTitle: "Lancement boutique — Centre-ville",
    vehicleTypes: "Taxi, VTC",
    startDate: "15/10/2026",
    endDate: "15/11/2026",
    budgetMax: "500 €",
    dashboardUrl: "https://move-spot.com/annonceur/briefs",
  },
} satisfies TemplateEntry;
