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
  trackerUrl?: string;
  simulatorUrl?: string;
  unsubscribeUrl?: string;
}

const statStyle = {
  textAlign: "center" as const,
  padding: "0 12px",
};

const statNumber = {
  fontSize: "26px",
  fontWeight: 700,
  color: "#0f172a",
  margin: "0 0 4px",
  lineHeight: "1.2",
};

const statLabel = {
  fontSize: "11px",
  color: "#6b7280",
  margin: 0,
  textTransform: "uppercase" as const,
  letterSpacing: "0.4px",
};

const Email = ({ firstName, trackerUrl, simulatorUrl, unsubscribeUrl }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>
      {firstName ? `${firstName}, votre` : "Votre"} campagne MoveSpot peut démarrer dès aujourd'hui
    </Preview>
    <Body style={bodyStyle}>
      <Container style={{ maxWidth: "560px", margin: "32px auto" }}>
        <Container style={containerStyle}>
          <EmailHeader />

          <Section style={contentPadding}>
            <Text style={{ ...h1Style, marginTop: "16px" }}>
              {firstName ? `${firstName}, vous` : "Vous"} n'avez pas encore lancé votre campagne…
            </Text>

            <Text style={textStyle}>
              On comprend — vous avez peut-être des questions sur le suivi. Voici ce que nos
              annonceurs voient en temps réel une fois leur campagne lancée&nbsp;:
            </Text>

            <Section
              style={{
                backgroundColor: "#0f172a",
                borderRadius: "10px",
                padding: "20px 18px",
                margin: "20px 0",
              }}
            >
              <Text
                style={{
                  fontSize: "11px",
                  color: "#94a3b8",
                  fontWeight: 600,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.6px",
                  margin: "0 0 16px",
                  textAlign: "center" as const,
                }}
              >
                Tableau de bord tracker en direct
              </Text>
              <table width="100%" cellPadding={0} cellSpacing={0}>
                <tr>
                  <td style={statStyle}>
                    <Text style={{ ...statNumber, color: "#6366f1" }}>2 847</Text>
                    <Text style={{ ...statLabel, color: "#64748b" }}>km parcourus</Text>
                  </td>
                  <td
                    style={{
                      borderLeft: "1px solid #1e293b",
                      borderRight: "1px solid #1e293b",
                      ...statStyle,
                    }}
                  >
                    <Text style={{ ...statNumber, color: "#10b981" }}>94&nbsp;%</Text>
                    <Text style={{ ...statLabel, color: "#64748b" }}>dans votre zone</Text>
                  </td>
                  <td style={statStyle}>
                    <Text style={{ ...statNumber, color: "#f59e0b" }}>12 300</Text>
                    <Text style={{ ...statLabel, color: "#64748b" }}>impressions est.</Text>
                  </td>
                </tr>
              </table>
            </Section>

            <Text style={textStyle}>
              Le tracker GPS MoveSpot vous montre précisément où circulent vos véhicules, combien de
              temps ils restent dans votre zone cible, et l'estimation d'impressions quotidienne.{" "}
              <strong>Transparent, sans surprise.</strong>
            </Text>

            <Text style={mutedText}>
              Votre première campagne peut démarrer en moins de 10 minutes. Choisissez votre zone,
              sélectionnez votre durée et recevez des propositions de flottes locales.
            </Text>

            <Section style={{ margin: "28px 0 8px" }}>
              <Button style={buttonStyle} href={simulatorUrl ?? "https://move-spot.com/commencer"}>
                Simuler ma première campagne
              </Button>
            </Section>

            {trackerUrl ? (
              <Text style={{ ...mutedText, marginTop: "12px" }}>
                Ou explorez le tracker en avant-première :{" "}
                <a href={trackerUrl} style={{ color: "#6366f1" }}>
                  voir la démo
                </a>
              </Text>
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
    data.firstName
      ? `${data.firstName}, votre campagne MoveSpot vous attend — démarrez dès aujourd'hui`
      : "Votre campagne MoveSpot vous attend — démarrez dès aujourd'hui",
  displayName: "Annonceur J+3 — relance campagne",
  previewData: {
    firstName: "Sophie",
    simulatorUrl: "https://move-spot.com/commencer",
    trackerUrl: "https://move-spot.com/advertiser/tracking",
  },
} satisfies TemplateEntry;
