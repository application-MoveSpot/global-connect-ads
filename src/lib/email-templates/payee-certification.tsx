import * as React from "react";
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  fullName?: string;
  certified?: boolean;
  notes?: string;
  spaceUrl?: string;
}

const Email = ({ fullName, certified = true, notes, spaceUrl }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>
      {certified
        ? "Votre certification MoveSpot est validée — vous pouvez recevoir des missions"
        : "Votre certification MoveSpot a été refusée — consultez le motif"}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>MoveSpot</Text>
        <Heading style={h1}>
          {certified ? "Certification validée ✅" : "Certification refusée ❌"}
        </Heading>
        <Text style={text}>
          {fullName ? `Bonjour ${fullName},` : "Bonjour,"}{" "}
          {certified
            ? "votre profil poseur a été examiné et validé par notre équipe. Vous êtes maintenant certifié MoveSpot et recevrez des notifications pour chaque nouvelle mission de pose disponible."
            : "votre profil poseur n'a pas pu être certifié en l'état. Veuillez consulter le motif ci-dessous et mettre à jour votre dossier."}
        </Text>
        {!certified && notes && (
          <Section style={notesBox}>
            <Text style={notesText}>Motif : {notes}</Text>
          </Section>
        )}
        {spaceUrl && (
          <Button style={button} href={spaceUrl}>
            {certified ? "Voir mes missions disponibles" : "Mettre à jour mon profil"}
          </Button>
        )}
        <Hr style={hr} />
        <Text style={footer}>
          MoveSpot — publicité mobile sur véhicules. Vous recevez cet email car vous avez soumis une demande de certification poseur.
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: (data: Record<string, unknown>) =>
    data.certified
      ? "✅ Certification MoveSpot validée — bienvenue parmi nos poseurs"
      : "❌ Certification MoveSpot refusée — action requise",
  displayName: "Certification poseur (accordée / refusée)",
  previewData: {
    fullName: "Jean Dupont",
    certified: true,
    spaceUrl: "https://move-spot.com/chauffeur/espace",
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Helvetica, Arial, sans-serif" };
const container = { padding: "28px 24px", maxWidth: "560px" };
const brand = { fontSize: "13px", letterSpacing: "3px", textTransform: "uppercase" as const, color: "#6b7280", margin: "0 0 12px" };
const h1 = { fontSize: "24px", lineHeight: "1.3", color: "#111827", margin: "0 0 16px" };
const text = { fontSize: "15px", lineHeight: "1.6", color: "#374151" };
const notesBox = { backgroundColor: "#fef2f2", borderRadius: "10px", padding: "14px 18px", margin: "16px 0", borderLeft: "4px solid #ef4444" };
const notesText = { fontSize: "14px", lineHeight: "1.5", color: "#7f1d1d", margin: 0 };
const button = { backgroundColor: "#111827", color: "#ffffff", borderRadius: "10px", padding: "12px 20px", fontSize: "15px", fontWeight: 600, textDecoration: "none", display: "inline-block", marginTop: "8px" };
const hr = { borderColor: "#e5e7eb", margin: "28px 0 16px" };
const footer = { fontSize: "12px", lineHeight: "1.5", color: "#6b7280" };
