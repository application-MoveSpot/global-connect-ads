// Buffer GPS local + envoi par lots (équivalent web du GpsTrackingManager Flutter).
// - collecte les points en local (filtre de distance ~10 m)
// - envoie un lot toutes les 5 minutes
// - en cas d'échec réseau (zone blanche), réinsère le lot pour le cycle suivant

export type GpsPoint = {
  lat: number;
  lng: number;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  recordedAt: string;
};

const SYNC_INTERVAL_MS = 5 * 60_000;
const DISTANCE_FILTER_M = 10;
const MAX_BUFFER = 2000;

function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export class GpsBatchBuffer {
  private buffer: GpsPoint[] = [];
  private lastPoint: GpsPoint | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private sending = false;

  constructor(
    private readonly send: (points: GpsPoint[]) => Promise<void>,
    private readonly onResult?: (r: { sent: number; failed: boolean; pending: number }) => void,
    private readonly storageKey?: string,
  ) {
    if (storageKey && typeof localStorage !== "undefined") {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) this.buffer = JSON.parse(raw) as GpsPoint[];
      } catch {
        // ignore
      }
    }
  }

  get pending() {
    return this.buffer.length;
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => void this.flush(), SYNC_INTERVAL_MS);
  }

  /** Ajoute un point si le déplacement dépasse le filtre de distance. */
  add(point: GpsPoint) {
    if (this.lastPoint && distanceMeters(this.lastPoint, point) < DISTANCE_FILTER_M) return false;
    this.lastPoint = point;
    this.buffer.push(point);
    if (this.buffer.length > MAX_BUFFER) this.buffer.splice(0, this.buffer.length - MAX_BUFFER);
    this.persist();
    return true;
  }

  async flush() {
    if (this.sending || this.buffer.length === 0) return;
    this.sending = true;
    // Copie locale + réinitialisation immédiate pour éviter les pertes
    const dataToSend = this.buffer.slice();
    this.buffer = [];
    this.persist();
    try {
      await this.send(dataToSend);
      this.onResult?.({ sent: dataToSend.length, failed: false, pending: this.buffer.length });
    } catch {
      // Zone blanche : on remet le lot en tête de file pour le prochain cycle
      this.buffer = [...dataToSend, ...this.buffer];
      this.persist();
      this.onResult?.({ sent: 0, failed: true, pending: this.buffer.length });
    } finally {
      this.sending = false;
    }
  }

  async stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.lastPoint = null;
    await this.flush(); // dernier envoi avant coupure
  }

  private persist() {
    if (!this.storageKey || typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.buffer));
    } catch {
      // ignore
    }
  }
}
