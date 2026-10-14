import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  reference?: string;
  amount?: string;
  campaignName?: string;
}

const Email = ({ reference, amount, campaignName }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre virement bancaire a été reçu</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>MoveSpot</Text>
        <Heading style={h1}>✅ Virement reçu et validé</Heading>
        <Text style={text}>
          Nous avons bien réceptionné votre virement bancaire. Votre solde MoveSpot a été crédité.
        </Text>

        <Section style={card}>
          {amount ? (
            <Text style={row}>
              Montant : <strong>{amount}</strong>
            </Text>
          ) : null}
          {reference ? (
            <Text style={row}>
              Référence : <strong>{reference}</strong>
            </Text>
          ) : null}
          {campaignName ? (
            <Text style={row}>
              Campagne réglée : <strong>{campaignName}</strong>
            </Text>
          ) : null}
        </Section>

        <Text style={text}>
          {campaignName
            ? "Votre campagne est désormais payée : aucun autre règlement n'est nécessaire."
            : "Vous pouvez maintenant régler vos campagnes depuis votre portefeuille."}
        </Text>

        <Hr style={hr} />
        <Text style={footer}>
          MoveSpot — publicité mobile sur véhicules. Cet email confirme la réception de votre
          virement bancaire.
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: "✅ Votre virement MoveSpot a été validé",
  displayName: "Virement bancaire validé",
  previewData: {
    reference: "MS-LX9K2P-8F31",
    amount: "2 500,00 €",
    campaignName: "Food truck Basse-Terre",
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Helvetica, Arial, sans-serif" };
const container = { padding: "28px 24px", maxWidth: "560px" };
const brand = {
  fontSize: "13px",
  letterSpacing: "3px",
  textTransform: "uppercase" as const,
  color: "#6b7280",
  margin: "0 0 12px",
};
const h1 = { fontSize: "24px", lineHeight: "1.3", color: "#111827", margin: "0 0 16px" };
const text = { fontSize: "15px", lineHeight: "1.6", color: "#374151" };
const card = {
  backgroundColor: "#f4f6f8",
  borderRadius: "12px",
  padding: "16px 18px",
  margin: "20px 0",
};
const row = { fontSize: "14px", lineHeight: "1.5", color: "#111827", margin: "4px 0" };
const hr = { borderColor: "#e5e7eb", margin: "28px 0 16px" };
const footer = { fontSize: "12px", lineHeight: "1.5", color: "#6b7280" };
