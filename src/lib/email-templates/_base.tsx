/**
 * Shared layout primitives for all MoveSpot transactional emails.
 * Import EmailHeader, EmailFooter, and the style constants from here.
 */
import * as React from "react";
import { Column, Container, Hr, Img, Link, Row, Section, Text } from "@react-email/components";

const BASE_URL = "https://move-spot.com";

// ─── Header ──────────────────────────────────────────────────────────────────

export function EmailHeader() {
  return (
    <>
      {/* Top accent bar */}
      <Section style={{ backgroundColor: "#0f172a", padding: "0" }}>
        <Container style={{ maxWidth: "560px", padding: "0 24px" }}>
          <Row>
            <Column style={{ padding: "18px 0" }}>
              <Text style={logoText}>MoveSpot</Text>
            </Column>
            <Column align="right" style={{ padding: "18px 0" }}>
              <Text style={logoTagline}>Publicité mobile sur véhicules</Text>
            </Column>
          </Row>
        </Container>
      </Section>
      {/* Accent line */}
      <Section style={{ backgroundColor: "#6366f1", padding: "3px 0" }} />
    </>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────────────

export function EmailFooter({ unsubscribeUrl }: { unsubscribeUrl?: string }) {
  return (
    <>
      <Hr style={hrStyle} />
      <Section style={{ padding: "0 24px 24px" }}>
        <Text style={footerTitle}>MoveSpot</Text>
        <Text style={footerText}>
          RAKOUN KLUB — 1 Lot, Immeuble Sud Jarry, ZAC de Houelbourg, 97122 Baie-Mahault
          (Guadeloupe, France)
        </Text>
        <Row style={{ marginTop: "10px" }}>
          <Column>
            <Link href={`${BASE_URL}/confidentialite`} style={footerLink}>
              Confidentialité
            </Link>
            {" · "}
            <Link href={`${BASE_URL}/cgv`} style={footerLink}>
              CGV
            </Link>
            {" · "}
            <Link href={`${BASE_URL}/mentions-legales`} style={footerLink}>
              Mentions légales
            </Link>
            {unsubscribeUrl ? (
              <>
                {" · "}
                <Link href={unsubscribeUrl} style={footerLink}>
                  Se désabonner
                </Link>
              </>
            ) : null}
          </Column>
        </Row>
        <Text style={{ ...footerText, marginTop: "8px", color: "#9ca3af" }}>
          Cet email est envoyé depuis notify.move-spot.com. Il ne contient aucun pixel de traçage.
        </Text>
      </Section>
    </>
  );
}

// ─── Info card ───────────────────────────────────────────────────────────────

export function InfoCard({ children }: { children: React.ReactNode }) {
  return <Section style={infoCard}>{children}</Section>;
}

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Row style={{ marginBottom: "6px" }}>
      <Column style={{ width: "140px" }}>
        <Text style={infoLabel}>{label}</Text>
      </Column>
      <Column>
        <Text style={infoValue}>{value}</Text>
      </Column>
    </Row>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

export function StatusBadge({
  color,
  children,
}: {
  color: "green" | "amber" | "blue" | "red";
  children: string;
}) {
  const colors = {
    green: { bg: "#dcfce7", text: "#166534" },
    amber: { bg: "#fef9c3", text: "#854d0e" },
    blue: { bg: "#dbeafe", text: "#1e40af" },
    red: { bg: "#fee2e2", text: "#991b1b" },
  };
  return (
    <Text
      style={{
        display: "inline-block",
        backgroundColor: colors[color].bg,
        color: colors[color].text,
        borderRadius: "20px",
        padding: "4px 14px",
        fontSize: "12px",
        fontWeight: 600,
        letterSpacing: "0.4px",
        textTransform: "uppercase",
      }}
    >
      {children}
    </Text>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

export const bodyStyle = {
  backgroundColor: "#f8fafc",
  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
};
export const containerStyle = {
  backgroundColor: "#ffffff",
  maxWidth: "560px",
  borderRadius: "0 0 12px 12px",
  overflow: "hidden" as const,
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
};
export const contentPadding = { padding: "28px 28px 0" };

export const h1Style = {
  fontSize: "22px",
  lineHeight: "1.35",
  color: "#0f172a",
  fontWeight: 700,
  margin: "0 0 12px",
};
export const textStyle = {
  fontSize: "15px",
  lineHeight: "1.65",
  color: "#374151",
  margin: "0 0 16px",
};
export const mutedText = {
  fontSize: "13px",
  lineHeight: "1.6",
  color: "#6b7280",
  margin: "0 0 8px",
};

export const buttonStyle = {
  backgroundColor: "#0f172a",
  color: "#ffffff",
  borderRadius: "8px",
  padding: "13px 22px",
  fontSize: "15px",
  fontWeight: 600,
  textDecoration: "none",
  display: "inline-block",
};

const logoText = {
  fontSize: "16px",
  fontWeight: 700,
  letterSpacing: "2px",
  textTransform: "uppercase" as const,
  color: "#ffffff",
  margin: 0,
};
const logoTagline = { fontSize: "11px", color: "#94a3b8", margin: 0, letterSpacing: "0.3px" };
const hrStyle = { borderColor: "#e5e7eb", margin: "24px 0 0" };

const infoCard = {
  backgroundColor: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  padding: "16px 18px",
  margin: "20px 0",
};
const infoLabel = {
  fontSize: "12px",
  color: "#6b7280",
  fontWeight: 600,
  textTransform: "uppercase" as const,
  letterSpacing: "0.4px",
  margin: 0,
};
const infoValue = { fontSize: "14px", color: "#111827", fontWeight: 500, margin: 0 };

const footerTitle = {
  fontSize: "13px",
  fontWeight: 700,
  color: "#374151",
  margin: "0 0 4px",
  letterSpacing: "1px",
  textTransform: "uppercase" as const,
};
const footerText = { fontSize: "11px", lineHeight: "1.6", color: "#6b7280", margin: "0 0 2px" };
const footerLink = { fontSize: "11px", color: "#6b7280", textDecoration: "underline" };
