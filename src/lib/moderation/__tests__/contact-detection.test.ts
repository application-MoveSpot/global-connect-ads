import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { detectContact } from "../contact-detection.ts";

describe("detectContact — téléphone", () => {
  it("détecte un numéro mobile 06", () => {
    assert.deepEqual(detectContact("Appelez-moi au 06 12 34 56 78"), {
      kind: "phone",
      label: "numéro de téléphone",
    });
  });

  it("détecte un numéro mobile 07", () => {
    const result = detectContact("07.89.12.34.56");
    assert.equal(result?.kind, "phone");
  });

  it("détecte un numéro international +33 6", () => {
    const result = detectContact("+33 6 12 34 56 78");
    assert.equal(result?.kind, "phone");
  });

  it("ne détecte pas un code postal 75013", () => {
    assert.equal(detectContact("Je suis à Paris 75013"), null);
  });

  it("détecte un numéro fixe 01", () => {
    assert.equal(detectContact("01 42 56 78 90")?.kind, "phone");
  });
});

describe("detectContact — email", () => {
  it("détecte une adresse email standard", () => {
    const result = detectContact("Contactez-moi : john@example.com");
    assert.equal(result?.kind, "email");
  });

  it("détecte un email avec sous-domaine", () => {
    const result = detectContact("Pro : jane.doe@corp.fr");
    assert.equal(result?.kind, "email");
  });

  it("ne détecte pas un @ sans domaine valide", () => {
    assert.equal(detectContact("instagram @movespot"), null);
  });
});

describe("detectContact — URL / lien externe", () => {
  it("détecte un lien https://", () => {
    assert.equal(detectContact("Plus d'infos : https://monsite.fr")?.kind, "url");
  });

  it("détecte www.", () => {
    assert.equal(detectContact("Voir www.example.com")?.kind, "url");
  });

  it("détecte un lien Telegram t.me/", () => {
    assert.equal(detectContact("Rejoignez t.me/mongroupe")?.kind, "url");
  });

  it("détecte un lien WhatsApp wa.me/", () => {
    assert.equal(detectContact("Contact wa.me/33612345678")?.kind, "url");
  });

  it("ne détecte pas un texte normal sans URL", () => {
    assert.equal(detectContact("Belle campagne publicitaire sur véhicule"), null);
  });
});

describe("detectContact — IBAN", () => {
  it("détecte un IBAN français", () => {
    // FR14 2004 1010 0505 0013 M026 06 — ne contient pas de séquence 06/07 mobile
    assert.equal(detectContact("Mon IBAN : FR14 2004 1010 0505 0013 M026 06")?.kind, "iban");
  });

  it("détecte un IBAN allemand", () => {
    assert.equal(detectContact("DE89 3704 0044 0532 0130 00")?.kind, "iban");
  });

  it("ne détecte pas un code postal DOM 97100", () => {
    assert.equal(detectContact("Guadeloupe 97100"), null);
  });
});

describe("detectContact — texte propre", () => {
  it("retourne null pour une description de brief sans données personnelles", () => {
    const clean =
      "Nous cherchons à promouvoir notre marque de boissons premium sur 10 véhicules en Île-de-France pendant 3 semaines.";
    assert.equal(detectContact(clean), null);
  });

  it("retourne null pour une chaîne vide", () => {
    assert.equal(detectContact(""), null);
  });
});
