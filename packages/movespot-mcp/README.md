# movespot-mcp

Serveur MCP (Model Context Protocol) pour [MoveSpot](https://move-spot.com) — connecte Claude et d'autres assistants IA à votre compte annonceur.

## Outils disponibles

| Outil | Description |
|-------|-------------|
| `get_wallet` | Solde du portefeuille |
| `list_briefs` | Lister vos briefs publicitaires |
| `create_brief` | Créer un nouveau brief |
| `list_proposals` | Voir les propositions reçues pour un brief |
| `accept_proposal` | Accepter une proposition |

## Prérequis

1. Un compte annonceur sur [move-spot.com](https://move-spot.com)
2. Une clé API générée sur `/annonceur/profil` (format `ms_…`)

---

## Installation — Claude Desktop

Ajoutez ceci dans votre fichier de configuration Claude Desktop :

**macOS** : `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows** : `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "movespot": {
      "command": "npx",
      "args": ["-y", "movespot-mcp"],
      "env": {
        "MOVESPOT_API_KEY": "ms_votre_cle_ici"
      }
    }
  }
}
```

Redémarrez Claude Desktop. Les outils MoveSpot apparaissent automatiquement.

---

## Installation — Claude Code (CLI)

```bash
claude mcp add movespot -e MOVESPOT_API_KEY=ms_votre_cle_ici -- npx -y movespot-mcp
```

---

## Utilisation

Une fois connecté, vous pouvez demander à Claude :

> "Crée un brief publicitaire pour lancer ma marque de café à Paris, 500€ de budget, du 1er au 28 février, sur des taxis."

> "Montre-moi les propositions reçues pour mon dernier brief."

> "Quel est mon solde MoveSpot ?"

---

## Variables d'environnement

| Variable | Requis | Défaut | Description |
|----------|--------|--------|-------------|
| `MOVESPOT_API_KEY` | ✅ | — | Clé API `ms_…` |
| `MOVESPOT_API_URL` | Non | `https://move-spot.com/api/v1` | URL de l'API (pour tests) |

---

## Licence

MIT
