import * as React from "react";
import { Body, Container, Head, Html, Preview, Section, Text } from "@react-email/components";
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
} from "./_base";

interface Props {
  contactName?: string;
  company?: string;
  siret?: string;
  email?: string;
  phone?: string;
  budgetRange?: string;
  message?: string;
  leadId?: string;
  unsubscribeUrl?: string;
}

const Email = ({
  contactName,
  company,
  siret,
  email,
  phone,
  budgetRange,
  message,
  leadId,
}: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>{`Nouveau lead Grand Compte — ${company ?? contactName ?? "Prospect"}`}</Preview>
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
                textTransform: "uppercase" as const,
                color: "#F05A28",
                margin: "0 0 10px",
              }}
            >
              Nouveau lead · Grand Compte
            </Text>
            <Text style={h1Style}>Demande de devis reçue</Text>
            <Text style={textStyle}>
              Un prospect vient de soumettre une demande via la page Tarifs. Voici les informations
              collectées.
            </Text>
            <InfoCard>
              <InfoRow label="Contact" value={contactName ?? "—"} />
              {company ? <InfoRow label="Entreprise" value={company} /> : null}
              {siret ? <InfoRow label="SIRET" value={siret} /> : null}
              <InfoRow label="Email" value={email ?? "—"} />
              {phone ? <InfoRow label="Téléphone" value={phone} /> : null}
              {budgetRange ? <InfoRow label="Budget estimé" value={budgetRange} /> : null}
              {leadId ? <InfoRow label="Ref. lead" value={leadId} /> : null}
            </InfoCard>
            {message ? (
              <>
                <Text style={{ ...mutedText, fontWeight: 600, marginTop: "16px" }}>Message :</Text>
                <Text
                  style={{
                    ...textStyle,
                    background: "#f8fafc",
                    borderLeft: "3px solid #6366f1",
                    padding: "12px 16px",
                    borderRadius: "6px",
                  }}
                >
                  {message}
                </Text>
              </>
            ) : null}
            <Text style={{ ...mutedText, marginTop: "20px" }}>
              Objectif : rappeler sous <strong>24h ouvrées</strong>. Statut à mettre à jour dans le
              dashboard admin.
            </Text>
          </Section>
          <EmailFooter />
        </Container>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: (data: Record<string, unknown>) =>
    `[Lead Grand Compte] ${data.company ?? data.contactName ?? "Nouveau prospect"}`,
  to: "contact@move-spot.com",
  displayName: "Notif interne — lead Grand Compte",
  previewData: {
    contactName: "Marie Dupont",
    company: "Caraïbes Distribution SARL",
    siret: "12345678900012",
    email: "m.dupont@caraibesdistrib.fr",
    phone: "+596 696 12 34 56",
    budgetRange: "10 000 – 30 000 € / an",
    message:
      "Nous avons une flotte de 15 véhicules utilitaires et souhaitons couvrir la Martinique.",
    leadId: "lead-abc123",
  },
} satisfies TemplateEntry;
