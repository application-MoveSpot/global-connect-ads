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
  budget?: string;
  zone?: string;
  dashboardUrl?: string;
  unsubscribeUrl?: string;
}

const Email = ({
  company,
  spotName,
  startDate,
  endDate,
  budget,
  zone,
  dashboardUrl,
  unsubscribeUrl,
}: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Brief reçu — notre équipe l'examine sous 48h ouvrées</Preview>
    <Body style={bodyStyle}>
      <Container style={{ maxWidth: "560px", margin: "32px auto" }}>
        <Container style={containerStyle}>
          <EmailHeader />

          <Section style={contentPadding}>
            {/* Status */}
            <Text
              style={{
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "1px",
                textTransform: "uppercase",
                color: "#6366f1",
                margin: "0 0 10px",
              }}
            >
              Confirmation de brief
            </Text>

            <Text style={h1Style}>Votre brief est bien reçu ✓</Text>

            <Text style={textStyle}>
              {company ? `Bonjour ${company},` : "Bonjour,"} merci d'avoir soumis votre demande de
              campagne sur MoveSpot. Notre équipe va vérifier la conformité de votre visuel et la
              disponibilité des véhicules dans votre zone.
            </Text>

            {/* Récapitulatif */}
            <InfoCard>
              {spotName ? <InfoRow label="Campagne" value={spotName} /> : null}
              {startDate && endDate ? (
                <InfoRow label="Période" value={`${startDate} → ${endDate}`} />
              ) : null}
              {budget ? <InfoRow label="Budget" value={budget} /> : null}
              {zone ? <InfoRow label="Zone ciblée" value={zone} /> : null}
              <InfoRow label="Délai d'examen" value="48h ouvrées" />
            </InfoCard>

            {/* Étapes suivantes */}
            <Text style={{ ...mutedText, marginTop: "4px" }}>
              <strong style={{ color: "#374151" }}>Ce qui se passe ensuite :</strong>
            </Text>
            {[
              "Notre équipe examine votre visuel et votre zone de diffusion.",
              "Vous recevez un email de validation ou de demande de correction.",
              "Dès validation, vos chauffeurs reçoivent leurs missions d'affichage.",
            ].map((step, i) => (
              <Text key={i} style={{ ...mutedText, paddingLeft: "4px" }}>
                {i + 1}. {step}
              </Text>
            ))}

            {dashboardUrl ? (
              <Section style={{ margin: "24px 0" }}>
                <Button style={buttonStyle} href={dashboardUrl}>
                  Suivre ma demande
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
    data.spotName ? `Brief reçu : « ${data.spotName} »` : "Votre brief MoveSpot est bien reçu",
  displayName: "Confirmation de brief",
  previewData: {
    company: "Rakoun Klub",
    spotName: "Lancement Été 2026 — Pointe-à-Pitre",
    startDate: "20/08/2026",
    endDate: "20/09/2026",
    budget: "450 €",
    zone: "Centre-ville Pointe-à-Pitre",
    dashboardUrl: "https://move-spot.com/annonceur",
  },
} satisfies TemplateEntry;
