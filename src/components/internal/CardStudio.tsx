import { useEffect, useState } from 'react';
import { Download, FileDown, CreditCard, Square, RotateCcw, Check, Loader2, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cardDimensions, type CardFormat, type CardSide } from '@/lib/promo/card-format';
import { renderCard, createCardPdf, downloadCard, type CardDetails } from '@/lib/promo/render-card';
import { cn } from '@/lib/utils';
import './card-studio.css';

const defaults: CardDetails = { name: 'PALERME Garry', role: '', phone: '', email: 'contact@move-spot.com', website: 'move-spot.com', tagline: 'La publicité mobile qui prend la route.' };

export function CardStudio() {
  const [details, setDetails] = useState(defaults);
  const [format, setFormat] = useState<CardFormat>('business');
  const [side, setSide] = useState<CardSide>('front');
  const [result, setResult] = useState<{ front: Blob; back?: Blob; pdf: Blob; frontUrl: string; backUrl?: string }>();
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    setBusy(true); setError('');
    const timer = setTimeout(async () => {
      try {
        const style = getComputedStyle(document.documentElement);
        const palette = { dark: style.getPropertyValue('--promo-dark').trim(), orange: style.getPropertyValue('--promo-orange').trim(), white: style.getPropertyValue('--promo-white').trim(), muted: style.getPropertyValue('--promo-muted').trim() };
        const front = await renderCard(details, format, 'front', palette);
        const back = format === 'business' ? await renderCard(details, format, 'back', palette) : undefined;
        const pdf = await createCardPdf(front.blob, back?.blob, format);
        if (!cancelled) { setResult({ front: front.blob, back: back?.blob, pdf, frontUrl: front.dataUrl, backUrl: back?.dataUrl }); setBusy(false); }
      } catch { if (!cancelled) { setError('La carte n’a pas pu être préparée. Réessayez après avoir vérifié votre connexion.'); setBusy(false); } }
    }, 220);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [details, format]);
  const size = cardDimensions(format);
  const update = (field: keyof CardDetails, value: string) => setDetails(current => ({ ...current, [field]: value }));
  const exportPng = () => {
    if (!result || busy) return;
    const blob = side === 'back' && format === 'business' ? result.back : result.front;
    if (blob) downloadCard(blob, `movespot-${format}-${format === 'digital' ? 'digital' : side === 'front' ? 'recto' : 'verso'}-HD.png`);
  };
  return <main className="card-studio min-h-screen bg-background text-foreground">
    <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-7">
        <div><div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-primary"><LockKeyhole className="size-3.5"/>Atelier interne</div><h1 className="text-3xl font-bold tracking-normal sm:text-4xl">Cartes MoveSpot</h1></div>
        <span className="flex items-center gap-2 text-sm text-muted-foreground"><Check className="size-4 text-primary"/>Aucune publication</span>
      </div>
      <div className="grid gap-10 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-7">
          <section><h2 className="mb-3 text-sm font-semibold">Format</h2><div className="grid grid-cols-2 gap-2">
            <Button variant={format === 'business' ? 'default' : 'outline'} className="h-auto flex-col gap-2 py-4" onClick={() => { setFormat('business'); setSide('front'); }}><CreditCard/><span>Carte de visite</span><span className="text-xs font-normal">85 × 55 mm</span></Button>
            <Button variant={format === 'digital' ? 'default' : 'outline'} className="h-auto flex-col gap-2 py-4" onClick={() => { setFormat('digital'); setSide('front'); }}><Square/><span>Promotion digitale</span><span className="text-xs font-normal">1080 × 1080 px</span></Button>
          </div></section>
          <section className="space-y-4"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Vos informations</h2><Button variant="ghost" size="icon" aria-label="Réinitialiser les informations" title="Réinitialiser les informations" onClick={() => setDetails(defaults)}><RotateCcw/></Button></div>
            {([['name', 'Nom', 'Votre nom'], ['role', 'Fonction', 'Votre fonction'], ['phone', 'Téléphone', 'Facultatif'], ['email', 'E-mail', 'contact@move-spot.com'], ['website', 'Site internet', 'move-spot.com']] as const).map(([field, label, placeholder]) => <div key={field} className="space-y-2"><Label htmlFor={`card-${field}`}>{label}</Label><Input id={`card-${field}`} type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'} value={details[field]} maxLength={field === 'role' ? 70 : 90} placeholder={placeholder} onChange={event => update(field, event.target.value)}/></div>)}
            <div className="space-y-2"><Label htmlFor="card-tagline">Accroche</Label><Textarea id="card-tagline" value={details.tagline} maxLength={120} rows={3} onChange={event => update('tagline', event.target.value)}/></div>
          </section>
        </aside>
        <section className="min-w-0">
          <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-sm font-semibold">Votre carte</h2>{format === 'business' && <div className="flex gap-1 rounded-md border border-border p-1">{(['front', 'back'] as const).map(value => <Button key={value} size="sm" variant={side === value ? 'secondary' : 'ghost'} onClick={() => setSide(value)} aria-pressed={side === value}>{value === 'front' ? 'Recto' : 'Verso'}</Button>)}</div>}</div>
          <div className={cn('studio-preview flex min-h-[340px] items-center justify-center border-y border-border px-4 py-10 sm:px-8', format === 'digital' && 'min-h-[560px]')}>
            {result ? <img className={cn('w-full shadow-elevated', format === 'digital' ? 'max-w-[510px]' : 'max-w-[820px]')} src={side === 'back' && format === 'business' ? result.backUrl : result.frontUrl} alt={`Carte MoveSpot — ${side === 'back' ? 'verso' : 'recto'}`} width={size.width} height={size.height}/> : <Loader2 className="size-8 animate-spin text-primary"/>}
          </div>
          <div className="my-4 flex flex-wrap justify-between gap-3 text-xs text-muted-foreground"><span>{size.width} × {size.height} px · {format === 'business' ? '300 ppp · PDF 85 × 55 mm, 2 pages' : 'PDF 1 page'}</span><span>{busy ? 'Préparation…' : error ? 'Export indisponible' : 'Prêt à télécharger'}</span></div>
          {error && <p role="alert" className="mb-4 text-sm text-destructive">{error}</p>}
          <div className="flex flex-wrap gap-3"><Button size="lg" disabled={busy || Boolean(error) || !result} onClick={exportPng}><Download/>Télécharger en PNG HD</Button><Button size="lg" variant="outline" disabled={busy || Boolean(error) || !result} onClick={() => { if (result) downloadCard(result.pdf, `movespot-${format}.pdf`); }}><FileDown/>Exporter en PDF</Button></div>
        </section>
      </div>
    </div>
  </main>;
}