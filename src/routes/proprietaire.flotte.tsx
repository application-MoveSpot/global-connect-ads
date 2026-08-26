import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getFleetOverview,
  listDrivers,
  createDriver,
  updateDriver,
  deleteDriver,
  assignDriverToVehicle,
} from "@/lib/fleet/fleet.functions";
import { getMapboxToken } from "@/lib/geo/mapbox.functions";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Truck, Users, Activity, Euro, Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { LogoLink } from "@/components/app/LogoLink";

export const Route = createFileRoute("/proprietaire/flotte")({
  head: () => ({ meta: [{ title: "Ma flotte — MoveSpot" }] }),
  component: FleetPage,
  errorComponent: ({ error }: { error: Error }) => (
    <div className="p-8 text-center text-destructive">Erreur : {error.message}</div>
  ),
});

type Vehicle = {
  id: string;
  name: string;
  type: string;
  format_publicitaire: string;
  price_per_day: number;
  status: string;
  driver_id: string | null;
  photos: string[] | null;
};
type Driver = {
  id: string;
  full_name: string;
  phone: string | null;
  email?: string | null;
  status: string;
  notes?: string | null;
  user_id?: string | null;
};
type Position = { vehicle_id: string; lat: number; lng: number; speed: number | null; heading: number | null; recorded_at: string };
type Campaign = { id: string; vehicle_id: string; spot_name: string; company: string; start_date: string; end_date: string; total_price: number | null; status: string };

function FleetPage() {
  const qc = useQueryClient();
  const fetchOverview = useServerFn(getFleetOverview);
  const fetchDrivers = useServerFn(listDrivers);
  const fetchToken = useServerFn(getMapboxToken);

  const { data: overview } = useQuery({
    queryKey: ["fleet-overview"],
    queryFn: () => fetchOverview(),
    refetchInterval: 30_000,
  });
  const { data: driversData } = useQuery({
    queryKey: ["fleet-drivers"],
    queryFn: () => fetchDrivers(),
  });
  const { data: tokenData } = useQuery({
    queryKey: ["mapbox-token"],
    queryFn: () => fetchToken(),
  });

  const vehicles = (overview?.vehicles ?? []) as Vehicle[];
  const drivers = (driversData?.drivers ?? overview?.drivers ?? []) as Driver[];
  const positions = (overview?.positions ?? []) as Position[];
  const activeCampaigns = (overview?.activeCampaigns ?? []) as Campaign[];

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [formatFilter, setFormatFilter] = useState<string>("all");
  const [driverFilter, setDriverFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      if (statusFilter !== "all" && v.status !== statusFilter) return false;
      if (formatFilter !== "all" && v.format_publicitaire !== formatFilter) return false;
      if (driverFilter !== "all") {
        if (driverFilter === "none" && v.driver_id) return false;
        if (driverFilter !== "none" && v.driver_id !== driverFilter) return false;
      }
      if (search && !v.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [vehicles, statusFilter, formatFilter, driverFilter, search]);

  const formats = useMemo(() => Array.from(new Set(vehicles.map((v) => v.format_publicitaire).filter(Boolean))), [vehicles]);
  const driversById = useMemo(() => new Map(drivers.map((d) => [d.id, d] as const)), [drivers]);
  const campaignByVehicle = useMemo(() => {
    const m = new Map<string, Campaign>();
    for (const c of activeCampaigns) m.set(c.vehicle_id, c);
    return m;
  }, [activeCampaigns]);
  const positionByVehicle = useMemo(() => {
    const m = new Map<string, Position>();
    for (const p of positions) if (!m.has(p.vehicle_id)) m.set(p.vehicle_id, p);
    return m;
  }, [positions]);

  // KPIs
  const approvedCount = vehicles.filter((v) => v.status === "approved").length;
  const activeNow = positions.length; // dernières 30 min
  const occupancyRate = approvedCount > 0 ? Math.round((activeCampaigns.length / approvedCount) * 100) : 0;
  const monthlyRevenue = activeCampaigns.reduce((s, c) => s + (c.total_price ?? 0), 0);

  // Map
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());

  useEffect(() => {
    if (!tokenData?.token || !mapContainer.current || mapRef.current) return;
    mapboxgl.accessToken = tokenData.token;
    mapRef.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [2.3522, 48.8566],
      zoom: 10,
    });
    mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-right");
  }, [tokenData]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const update = () => {
      const seen = new Set<string>();
      const bounds = new mapboxgl.LngLatBounds();
      let hasAny = false;
      for (const p of positions) {
        seen.add(p.vehicle_id);
        const v = vehicles.find((x) => x.id === p.vehicle_id);
        const label = v?.name ?? "Véhicule";
        let m = markersRef.current.get(p.vehicle_id);
        if (!m) {
          const el = document.createElement("div");
          el.className = "rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow-lg border-2 border-white";
          el.style.width = "28px";
          el.style.height = "28px";
          el.textContent = (v?.name ?? "?").slice(0, 2).toUpperCase();
          m = new mapboxgl.Marker({ element: el })
            .setLngLat([p.lng, p.lat])
            .setPopup(new mapboxgl.Popup({ offset: 16 }).setHTML(`<strong>${label}</strong><br/>${new Date(p.recorded_at).toLocaleTimeString("fr-FR")}`))
            .addTo(map);
          markersRef.current.set(p.vehicle_id, m);
        } else {
          m.setLngLat([p.lng, p.lat]);
          m.setPopup(new mapboxgl.Popup({ offset: 16 }).setHTML(`<strong>${label}</strong><br/>${new Date(p.recorded_at).toLocaleTimeString("fr-FR")}`));
        }
        bounds.extend([p.lng, p.lat]);
        hasAny = true;
      }
      // remove stale
      for (const [id, m] of markersRef.current) {
        if (!seen.has(id)) { m.remove(); markersRef.current.delete(id); }
      }
      if (hasAny && !bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 60, maxZoom: 13, duration: 600 });
      }
    };
    if (map.isStyleLoaded()) update();
    else map.once("load", update);
  }, [positions, vehicles]);

  // Driver dialog
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [driverOpen, setDriverOpen] = useState(false);
  const createFn = useServerFn(createDriver);
  const updateFn = useServerFn(updateDriver);
  const deleteFn = useServerFn(deleteDriver);
  const assignFn = useServerFn(assignDriverToVehicle);

  async function saveDriver(form: FormData) {
    const payload = {
      full_name: String(form.get("full_name") || ""),
      phone: (String(form.get("phone") || "") || null) as string | null,
      email: (String(form.get("email") || "") || null) as string | null,
      status: (String(form.get("status") || "active") as "active" | "inactive"),
      notes: (String(form.get("notes") || "") || null) as string | null,
    };
    try {
      if (editingDriver) {
        await updateFn({ data: { id: editingDriver.id, ...payload } });
        toast.success("Chauffeur mis à jour");
      } else {
        await createFn({ data: payload });
        toast.success("Chauffeur ajouté");
      }
      setDriverOpen(false);
      setEditingDriver(null);
      qc.invalidateQueries({ queryKey: ["fleet-drivers"] });
      qc.invalidateQueries({ queryKey: ["fleet-overview"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function removeDriver(id: string) {
    if (!confirm("Supprimer ce chauffeur ?")) return;
    try {
      await deleteFn({ data: { id } });
      toast.success("Chauffeur supprimé");
      qc.invalidateQueries({ queryKey: ["fleet-drivers"] });
      qc.invalidateQueries({ queryKey: ["fleet-overview"] });
    } catch (e) { toast.error((e as Error).message); }
  }

  async function assignDriver(vehicleId: string, driverId: string) {
    try {
      await assignFn({ data: { vehicleId, driverId: driverId === "none" ? null : driverId } });
      qc.invalidateQueries({ queryKey: ["fleet-overview"] });
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <LogoLink />
            <h1 className="font-display text-2xl font-bold mt-1">Ma flotte</h1>
          </div>
          <Link to="/proprietaire" className="text-sm text-muted-foreground hover:text-foreground">← Tableau de bord</Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Kpi icon={<Truck className="h-4 w-4" />} label="Véhicules approuvés" value={approvedCount} />
          <Kpi icon={<Activity className="h-4 w-4" />} label="Actifs (30 dernières min)" value={activeNow} />
          <Kpi icon={<Users className="h-4 w-4" />} label="Taux d'occupation" value={`${occupancyRate}%`} />
          <Kpi icon={<Euro className="h-4 w-4" />} label="Revenus campagnes actives" value={`${monthlyRevenue.toLocaleString("fr-FR")} €`} />
        </div>

        {/* Map */}
        <Card>
          <CardHeader>
            <CardTitle>Carte temps réel</CardTitle>
          </CardHeader>
          <CardContent>
            <div ref={mapContainer} className="h-[420px] w-full rounded-md border" />
            <p className="mt-2 text-xs text-muted-foreground">
              {positions.length} véhicule(s) avec position récente · refresh auto 30s
            </p>
          </CardContent>
        </Card>

        {/* Vehicles table */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>Véhicules ({filteredVehicles.length}/{vehicles.length})</CardTitle>
              <Link to="/proprietaire/vehicules/nouveau" className="text-sm text-primary hover:underline">+ Ajouter</Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
              <Input placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue placeholder="Statut" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous statuts</SelectItem>
                  <SelectItem value="approved">Approuvé</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="rejected">Refusé</SelectItem>
                  <SelectItem value="paused">En pause</SelectItem>
                </SelectContent>
              </Select>
              <Select value={formatFilter} onValueChange={setFormatFilter}>
                <SelectTrigger><SelectValue placeholder="Format" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous formats</SelectItem>
                  {formats.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={driverFilter} onValueChange={setDriverFilter}>
                <SelectTrigger><SelectValue placeholder="Chauffeur" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous chauffeurs</SelectItem>
                  <SelectItem value="none">Sans chauffeur</SelectItem>
                  {drivers.map((d) => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Véhicule</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Chauffeur</TableHead>
                    <TableHead>Campagne active</TableHead>
                    <TableHead>Dernière position</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVehicles.map((v) => {
                    const pos = positionByVehicle.get(v.id);
                    const camp = campaignByVehicle.get(v.id);
                    return (
                      <TableRow key={v.id}>
                        <TableCell>
                          <div className="font-medium">{v.name}</div>
                          <div className="text-xs text-muted-foreground">{v.type} · {v.price_per_day}€/j</div>
                        </TableCell>
                        <TableCell className="text-xs">{v.format_publicitaire}</TableCell>
                        <TableCell><StatusBadge status={v.status} /></TableCell>
                        <TableCell>
                          <Select value={v.driver_id ?? "none"} onValueChange={(val) => assignDriver(v.id, val)}>
                            <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">— Non assigné —</SelectItem>
                              {drivers.filter((d) => d.status === "active").map((d) => (
                                <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-xs">
                          {camp ? (
                            <Link to="/annonceur/suivi/$campaignId" params={{ campaignId: camp.id }} className="text-primary hover:underline">
                              {camp.company} · {camp.spot_name}
                            </Link>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {pos ? (
                            <span className="text-green-600">● {new Date(pos.recorded_at).toLocaleTimeString("fr-FR")}</span>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredVehicles.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Aucun véhicule</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Drivers */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Chauffeurs ({drivers.length})</CardTitle>
              <Dialog open={driverOpen} onOpenChange={(o) => { setDriverOpen(o); if (!o) setEditingDriver(null); }}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nouveau</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingDriver ? "Modifier" : "Nouveau chauffeur"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={(e) => { e.preventDefault(); saveDriver(new FormData(e.currentTarget)); }} className="space-y-3">
                    <div>
                      <label className="text-xs font-medium">Nom complet *</label>
                      <Input name="full_name" required defaultValue={editingDriver?.full_name ?? ""} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-medium">Téléphone</label>
                        <Input name="phone" defaultValue={editingDriver?.phone ?? ""} />
                      </div>
                      <div>
                        <label className="text-xs font-medium">Email</label>
                        <Input name="email" type="email" defaultValue={editingDriver?.email ?? ""} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium">Statut</label>
                      <select name="status" defaultValue={editingDriver?.status ?? "active"} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                        <option value="active">Actif</option>
                        <option value="inactive">Inactif</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium">Notes</label>
                      <Input name="notes" defaultValue={editingDriver?.notes ?? ""} />
                    </div>
                    <DialogFooter>
                      <Button type="submit">{editingDriver ? "Enregistrer" : "Créer"}</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Véhicules assignés</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers.map((d) => {
                    const assigned = vehicles.filter((v) => v.driver_id === d.id);
                    return (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">{d.full_name}</TableCell>
                        <TableCell className="text-xs">
                          {d.phone && <div>{d.phone}</div>}
                          {d.email && <div className="text-muted-foreground">{d.email}</div>}
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${d.status === "active" ? "bg-green-500/15 text-green-700" : "bg-muted text-muted-foreground"}`}>
                            {d.status === "active" ? "Actif" : "Inactif"}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">
                          {assigned.length === 0 ? <span className="text-muted-foreground">—</span> : assigned.map((v) => v.name).join(", ")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => { setEditingDriver(d); setDriverOpen(true); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => removeDriver(d.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {drivers.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Aucun chauffeur — ajoutez votre premier pour assigner un véhicule.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon} {label}</div>
        <div className="mt-2 font-display text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "En attente", cls: "bg-secondary text-foreground" },
    approved: { label: "Approuvé", cls: "bg-green-500/15 text-green-700" },
    rejected: { label: "Refusé", cls: "bg-destructive/15 text-destructive" },
    paused: { label: "Pause", cls: "bg-muted text-muted-foreground" },
  };
  const x = map[status] ?? { label: status, cls: "bg-secondary" };
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${x.cls}`}>{x.label}</span>;
}
