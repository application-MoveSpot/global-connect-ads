# @movespot/mcp

Serveur MCP (Model Context Protocol) pour [MoveSpot](https://move-spot.com) — connecte **Claude** à votre compte annonceur.

## Compatibilité

| Assistant IA | Méthode | Support |
|---|---|---|
| Claude Desktop / Claude Code | MCP natif | ✅ |
| Gemini (Google) | Function calling via API | ⚠️ Pas de plugin OpenAPI pour les utilisateurs Gemini Advanced |
| Le Chat (Mistral) | Agents via API | ⚠️ Pas d'import OpenAPI pour les utilisateurs finaux |
| ChatGPT | Actions / Plugins | ⚠️ Non supporté (pas de MCP) |
| Perplexity | Aucun système de plugins | ❌ Pas possible côté utilisateur |
| DeepSeek | Aucun plugin MCP natif | ⚠️ Accessible via proxy MCP ou script wrapper |
| Qwen (Alibaba) | Aucun plugin MCP natif | ⚠️ Accessible via proxy MCP ou script wrapper |
| Kimi (Moonshot AI) | Aucun plugin MCP natif | ⚠️ Accessible via proxy MCP ou script wrapper |
| GLM / Z.ai (Zhipu AI) | Aucun plugin MCP natif | ⚠️ Accessible via proxy MCP ou script wrapper |
| Manus (Butterfly Effect) | Aucun plugin MCP natif | ⚠️ Accessible via proxy MCP ou script wrapper |

### Solutions de contournement (pour les assistants sans support natif)

| Approche | Difficulté | Pour qui |
|---|---|---|
| **Client intermédiaire** (ex: open-webui, LibreChat) | Facile | Tous les utilisateurs |
| **Passerelle / Proxy MCP** (ex: mcp-proxy, mcpx) | Intermédiaire | Accès via API |
| **Script wrapper** avec librairie MCP | Avancé | Développeurs |

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
      "args": ["-y", "@movespot/mcp"],
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
claude mcp add movespot -e MOVESPOT_API_KEY=ms_votre_cle_ici -- npx -y @movespot/mcp
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
