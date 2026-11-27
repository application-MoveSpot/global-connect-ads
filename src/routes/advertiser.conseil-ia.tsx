import { createFileRoute } from "@tanstack/react-router";
import { LLMCouncilPanel } from "@/components/advertiser/LLMCouncilPanel";

export const Route = createFileRoute("/advertiser/conseil-ia")({
  head: () => ({
    meta: [
      { title: "Conseil IA Multi-Modèles — MoveSpot" },
      { name: "description", content: "Analysez votre brief publicitaire avec un comité de trois experts IA (Claude, GPT-4o, Gemini) et une synthèse Chairman." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ConseillAIPage,
});

function ConseillAIPage() {
  return (
    <div className="container max-w-4xl px-4 py-6">
      <LLMCouncilPanel />
    </div>
  );
}
