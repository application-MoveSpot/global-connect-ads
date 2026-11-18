import * as React from "react";
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { h1Style, textStyle, mutedText, buttonStyle } from "./_base";

interface Props {
  vehicleName?: string;
  incidentType?: string;
  reporterEmail?: string;
  description?: string;
  createdAt?: string;
}

const Email = ({ vehicleName, incidentType, reporterEmail, description, createdAt }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Nouveau signalement d’incident véhicule — MoveSpot</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={mutedText}>MoveSpot</Text>
        <Heading style={h1Style}>Nouveau signalement d’incident</Heading>
        <Text style={textStyle}>Véhicule : {vehicleName ?? "Non renseigné"}</Text>
        <Text style={textStyle}>Type : {incidentType ?? "Non renseigné"}</Text>
        {reporterEmail ? <Text style={textStyle}>Signalé par : {reporterEmail}</Text> : null}
        {createdAt ? <Text style={textStyle}>Date : {createdAt}</Text> : null}
        {description ? <Text style={textStyle}>{description}</Text> : null}
        <Button href="https://move-spot.com/admin/dashboard" style={buttonStyle}>
          Consulter le signalement
        </Button>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: "⚠️ Nouveau signalement d’incident — MoveSpot",
  displayName: "Alerte incident admin",
  to: "rakounklub@gmail.com",
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Helvetica, Arial, sans-serif" };
const container = { padding: "28px 24px", maxWidth: "560px" };