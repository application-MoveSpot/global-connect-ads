import { createFileRoute, notFound } from '@tanstack/react-router';
import { CardStudio } from '@/components/internal/CardStudio';
import { cardStudioAvailable } from '@/lib/promo/preview-access.functions';

export const Route = createFileRoute('/outils/cartes')({
  beforeLoad: async () => { if (!await cardStudioAvailable()) throw notFound(); },
  head: () => ({ meta: [
    { title: 'Atelier de cartes interne — MoveSpot' },
    { name: 'description', content: 'Atelier interne MoveSpot pour préparer des cartes personnalisées et leurs exports haute qualité.' },
    { property: 'og:title', content: 'Atelier de cartes interne — MoveSpot' },
    { property: 'og:description', content: 'Cartes de visite et cartes promotionnelles MoveSpot.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
    { name: 'robots', content: 'noindex, nofollow' },
  ] }),
  component: CardStudio,
});