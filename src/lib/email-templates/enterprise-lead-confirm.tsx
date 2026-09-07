import * as React from "react";
import { Body, Container, Head, Html, Preview, Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import {
  EmailHeader, EmailFooter, InfoCard, InfoRow,
  bodyStyle, containerStyle, contentPadding,
  h1Style, textStyle, mutedText,
} from "./_base";

interface Props {
  contactName?: string;
  company?: string;
  budgetRange?: string;
  unsubscribeUrl?: string;
}

const Email = ({ contactName, company, budgetRange, unsubscribeUrl }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre demande de devis est bien reçue — nous vous recontactons sous 24h</Preview>
    <Body style={bodyStyle}>
      <Container style={{ maxWidth: "560px", margin: "32px auto" }}>
        <Container style={containerStyle}>
          <EmailHeader />
          <Section style={contentPadding}>
            <Text style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase" as const, color: "#6366f1", margin: "0 0 10px" }}>
              Demande reçue ✓
            </Text>
            <Text style={h1Style}>
              Merci {contactName ? `, ${contactName}` : ""} !
            </Text>
            <Text style={textStyle}>
              Votre demande de devis Grand Compte{company ? ` pour ${company}` : ""} a bien été enregistrée. Un membre de notre équipe commerciale vous contactera <strong>sous 24h ouvrées</strong> pour construire ensemble une offre adaptée à vos besoins.
            </Text>
            <InfoCard>
              {company ? <InfoRow label="Entreprise" value={company} /> : null}
              {budgetRange ? <InfoRow label="Budget indiqué" value={budgetRange} /> : null}
              <InfoRow label="Délai de rappel" value="24h ouvrées" />
              <InfoRow label="Contact commercial" value="contact@move-spot.com" />
            </InfoCard>
            <Text style={{ ...textStyle, marginTop: "20px" }}>
              En attendant, vous pouvez explorer notre plateforme :
            </Text>
            {[
              "Consultez notre grille tarifaire complète sur move-spot.com/tarifs",
              "Découvrez comment fonctionne la publicité mobile sur véhicules",
              "Posez vos questions à notre chatbot disponible 24h/24",
            ].map((step, i) => (
              <Text key={i} style={{ ...mutedText, paddingLeft: "4px" }}>
                {i + 1}. {step}
              </Text>
            ))}
          </Section>
          <EmailFooter unsubscribeUrl={unsubscribeUrl} />
        </Container>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: "Votre demande de devis MoveSpot est bien reçue",
  displayName: "Confirmation prospect — lead Grand Compte",
  previewData: {
    contactName: "Marie",
    company: "Caraïbes Distribution SARL",
    budgetRange: "10 000 – 30 000 € / an",
  },
} satisfies TemplateEntry;
