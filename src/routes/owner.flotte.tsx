import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
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
import type mapboxgl from "mapbox-gl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapConsentGate } from "@/components/app/MapConsentGate";
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

export const Route = createFileRoute("/owner/flotte")({
  head: () => ({ meta: [{ title: "Ma flotte — MoveSpot" }] }),
  component: FleetPage,
  errorComponent: ({ error }: { error: Error }) => {
    const { t } = useTranslation();
    return <div className="p-8 text-center text-destructive">{t("errors.prefix")} : {error.message}</div>;
  },
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
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language;
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
  const activeNow = positions.length;
  const occupancyRate = approvedCount > 0 ? Math.round((activeCampaigns.length / approvedCount) * 100) : 0;
  const monthlyRevenue = activeCampaigns.reduce((s, c) => s + (c.total_price ?? 0), 0);

  // Map
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const mglRef = useRef<typeof mapboxgl | null>(null);

  // Dynamic import defers the ~800 KB Mapbox bundle until fleet page loads
  useEffect(() => {
    if (!tokenData?.token || !mapContainer.current || mapRef.current) return;
    (async () => {
      await import("mapbox-gl/dist/mapbox-gl.css");
      const mgl = (await import("mapbox-gl")).default;
      mglRef.current = mgl;
      mgl.accessToken = tokenData.token;
      mapRef.current = new mgl.Map({
        container: mapContainer.current!,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [2.3522, 48.8566],
        zoom: 10,
      });
      mapRef.current.addControl(new mgl.NavigationControl(), "top-right");
    })();
  }, [tokenData]);

  useEffect(() => {
    const map = mapRef.current;
    const mgl = mglRef.current;
    if (!map || !mgl) return;
    const update = () => {
      const seen = new Set<string>();
      const bounds = new mgl.LngLatBounds();
      let hasAny = false;
      for (const p of positions) {
        seen.add(p.vehicle_id);
        const v = vehicles.find((x) => x.id === p.vehicle_id);
        const label = v?.name ?? t("owner.flotte.vehicle_fallback");
        let m = markersRef.current.get(p.vehicle_id);
        if (!m) {
          const el = document.createElement("div");
          el.className = "rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow-lg border-2 border-white";
          el.style.width = "28px";
          el.style.height = "28px";
          el.textContent = (v?.name ?? "?").slice(0, 2).toUpperCase();
          m = new mgl.Marker({ element: el })
            .setLngLat([p.lng, p.lat])
            .setPopup(new mgl.Popup({ offset: 16 }).setHTML(`<strong>${label}</strong><br/>${new Date(p.recorded_at).toLocaleTimeString(dateLocale)}`))
            .addTo(map);
          markersRef.current.set(p.vehicle_id, m);
        } else {
          m.setLngLat([p.lng, p.lat]);
          m.setPopup(new mgl.Popup({ offset: 16 }).setHTML(`<strong>${label}</strong><br/>${new Date(p.recorded_at).toLocaleTimeString(dateLocale)}`));
        }
        bounds.extend([p.lng, p.lat]);
        hasAny = true;
      }
      for (const [id, m] of markersRef.current) {
        if (!seen.has(id)) { m.remove(); markersRef.current.delete(id); }
      }
      if (hasAny && !bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 60, maxZoom: 13, duration: 600 });
      }
    };
    if (map.isStyleLoaded()) update();
    else map.once("load", update);
  }, [positions, vehicles, t, dateLocale]);

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
        toast.success(t("owner.flotte.toast_driver_updated"));
      } else {
        await createFn({ data: payload });
        toast.success(t("owner.flotte.toast_driver_created"));
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
    if (!confirm(t("owner.flotte.confirm_delete_driver"))) return;
    try {
      await deleteFn({ data: { id } });
      toast.success(t("owner.flotte.toast_driver_deleted"));
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

  // suppress unused lint warning for driversById — used externally via map
  void driversById;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <LogoLink />
            <h1 className="font-display text-2xl font-bold mt-1">{t("owner.flotte.title")}</h1>
          </div>
          <Link to="/owner" className="text-sm text-muted-foreground hover:text-foreground">{t("owner.flotte.back")}</Link>
        </div>
      </header>

      <main id="main-content" className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Kpi icon={<Truck className="h-4 w-4" />} label={t("owner.flotte.kpi_approved")} value={approvedCount} />
          <Kpi icon={<Activity className="h-4 w-4" />} label={t("owner.flotte.kpi_active")} value={activeNow} />
          <Kpi icon={<Users className="h-4 w-4" />} label={t("owner.flotte.kpi_occupancy")} value={`${occupancyRate}%`} />
          <Kpi icon={<Euro className="h-4 w-4" />} label={t("owner.flotte.kpi_revenue")} value={`${monthlyRevenue.toLocaleString(dateLocale)} €`} />
        </div>

        {/* Map */}
        <Card>
          <CardHeader>
            <CardTitle>{t("owner.flotte.map_title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <MapConsentGate className="h-[420px]">
              <div ref={mapContainer} className="h-[420px] w-full rounded-md border" />
            </MapConsentGate>
            <p className="mt-2 text-xs text-muted-foreground">
              {t("owner.flotte.map_positions", { count: positions.length })}
            </p>
          </CardContent>
        </Card>

        {/* Vehicles table */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>{t("owner.flotte.vehicles_title", { filtered: filteredVehicles.length, total: vehicles.length })}</CardTitle>
              <Link to="/owner/vehicules/nouveau" className="text-sm text-primary hover:underline">{t("owner.flotte.vehicles_add")}</Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
              <Input placeholder={t("owner.flotte.filter_search")} value={search} onChange={(e) => setSearch(e.target.value)} />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue placeholder={t("owner.flotte.col_status")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("owner.flotte.filter_status_all")}</SelectItem>
                  <SelectItem value="approved">{t("owner.flotte.filter_status_approved")}</SelectItem>
                  <SelectItem value="pending">{t("owner.flotte.filter_status_pending")}</SelectItem>
                  <SelectItem value="rejected">{t("owner.flotte.filter_status_rejected")}</SelectItem>
                  <SelectItem value="paused">{t("owner.flotte.filter_status_paused")}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={formatFilter} onValueChange={setFormatFilter}>
                <SelectTrigger><SelectValue placeholder={t("owner.flotte.col_format")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("owner.flotte.filter_format_all")}</SelectItem>
                  {formats.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={driverFilter} onValueChange={setDriverFilter}>
                <SelectTrigger><SelectValue placeholder={t("owner.flotte.col_driver")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("owner.flotte.filter_driver_all")}</SelectItem>
                  <SelectItem value="none">{t("owner.flotte.filter_driver_none")}</SelectItem>
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
                    <TableHead>{t("owner.flotte.col_vehicle")}</TableHead>
                    <TableHead>{t("owner.flotte.col_format")}</TableHead>
                    <TableHead>{t("owner.flotte.col_status")}</TableHead>
                    <TableHead>{t("owner.flotte.col_driver")}</TableHead>
                    <TableHead>{t("owner.flotte.col_campaign")}</TableHead>
                    <TableHead>{t("owner.flotte.col_position")}</TableHead>
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
                              <SelectItem value="none">{t("owner.flotte.no_driver")}</SelectItem>
                              {drivers.filter((d) => d.status === "active").map((d) => (
                                <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-xs">
                          {camp ? (
                            <Link to="/advertiser/suivi/$campaignId" params={{ campaignId: camp.id }} className="text-primary hover:underline">
                              {camp.company} · {camp.spot_name}
                            </Link>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {pos ? (
                            <span className="text-green-600">● {new Date(pos.recorded_at).toLocaleTimeString(dateLocale)}</span>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredVehicles.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">{t("owner.flotte.no_vehicles")}</TableCell></TableRow>
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
              <CardTitle>{t("owner.flotte.drivers_title", { count: drivers.length })}</CardTitle>
              <Dialog open={driverOpen} onOpenChange={(o) => { setDriverOpen(o); if (!o) setEditingDriver(null); }}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" /> {t("owner.flotte.driver_new_btn")}</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingDriver ? t("owner.flotte.driver_dialog_edit") : t("owner.flotte.driver_dialog_create")}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={(e) => { e.preventDefault(); saveDriver(new FormData(e.currentTarget)); }} className="space-y-3">
                    <div>
                      <label className="text-xs font-medium">{t("owner.flotte.driver_name_label")}</label>
                      <Input name="full_name" required defaultValue={editingDriver?.full_name ?? ""} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-medium">{t("owner.flotte.driver_phone_label")}</label>
                        <Input name="phone" defaultValue={editingDriver?.phone ?? ""} />
                      </div>
                      <div>
                        <label className="text-xs font-medium">{t("owner.flotte.driver_email_label")}</label>
                        <Input name="email" type="email" defaultValue={editingDriver?.email ?? ""} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium">{t("owner.flotte.driver_status_label")}</label>
                      <select name="status" defaultValue={editingDriver?.status ?? "active"} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                        <option value="active">{t("owner.flotte.driver_status_active")}</option>
                        <option value="inactive">{t("owner.flotte.driver_status_inactive")}</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium">{t("owner.flotte.driver_notes_label")}</label>
                      <Input name="notes" defaultValue={editingDriver?.notes ?? ""} />
                    </div>
                    <DialogFooter>
                      <Button type="submit">{editingDriver ? t("owner.flotte.driver_save") : t("owner.flotte.driver_create")}</Button>
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
                    <TableHead>{t("owner.flotte.col_name")}</TableHead>
                    <TableHead>{t("owner.flotte.col_contact")}</TableHead>
                    <TableHead>{t("owner.flotte.col_status")}</TableHead>
                    <TableHead>{t("owner.flotte.col_assigned")}</TableHead>
                    <TableHead className="text-right">{t("owner.flotte.col_actions")}</TableHead>
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
                            {d.status === "active" ? t("owner.flotte.driver_status_active") : t("owner.flotte.driver_status_inactive")}
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
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">{t("owner.flotte.no_drivers")}</TableCell></TableRow>
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
  const { t } = useTranslation();
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: t("owner.flotte.status_pending"), cls: "bg-secondary text-foreground" },
    approved: { label: t("owner.flotte.status_approved"), cls: "bg-green-500/15 text-green-700" },
    rejected: { label: t("owner.flotte.status_rejected"), cls: "bg-destructive/15 text-destructive" },
    paused: { label: t("owner.flotte.status_paused"), cls: "bg-muted text-muted-foreground" },
  };
  const x = map[status] ?? { label: status, cls: "bg-secondary" };
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${x.cls}`}>{x.label}</span>;
}
