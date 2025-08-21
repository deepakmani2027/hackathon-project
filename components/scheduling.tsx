"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import dynamic from "next/dynamic"
import { useRef } from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ClipboardList, AlertTriangle } from 'lucide-react'
import { useAuth } from "./auth/auth-context"
import type { EwItem, Vendor, Pickup } from "@/lib/types";

const LeafletGeocoderMap = dynamic(() => import("./LeafletGeocoderMap"), { ssr: false });

export default function Scheduling() {
  const { user } = useAuth();
  const [items, setItems] = useState<EwItem[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  // Only show certified vendors
  const certifiedVendors = useMemo(() => vendors.filter(v => v.certified), [vendors]);
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [vendorId, setVendorId] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const addressTimeout = useRef<NodeJS.Timeout | null>(null);

  // clock for filtering
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  // fetch data
  const fetchData = async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }
    try {
      setError(null);
      setLoading(true);
      const response = await fetch(`/api/scheduling?userEmail=${encodeURIComponent(user.email)}`);
      if (!response.ok) throw new Error("Failed to load scheduling data.");

      const data = await response.json();
      setItems(data.schedulableItems || []);
      setVendors(data.vendors || []);
      setPickups(data.pickups || []);
      if (data.vendors && data.vendors.length > 0) {
        // Set default vendor to first certified vendor if available
        const firstCertified = data.vendors.find((v: Vendor) => v.certified);
        setVendorId(firstCertified ? firstCertified._id : "");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleSchedule = async () => {
    if (!vendorId || selectedIds.length === 0 || !deliveryAddress || !user?.email) return;

    const pickupData = {
      date, // full ISO datetime string
      vendorId,
      itemIds: selectedIds,
      notes: `${notes}\nPickup Address: ${deliveryAddress}`,
      createdBy: user.email,
    };

    await fetch('/api/scheduling', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pickupData),
    });

    setSelectedIds([]);
    setNotes("");
    setDeliveryAddress("");
    fetchData();
  };

  const selectable = useMemo(() => items.filter((i) => i.status === "Reported"), [items]);

  function toggle(id: string) {
    setSelectedIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function selectAll() {
    if (selectedIds.length === selectable.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(selectable.map(item => item._id));
    }
  }

  // ✅ Filter pickups so they disappear only after scheduled date+time has passed
  const upcomingPickups = useMemo(() => {
    return pickups.filter((p) => new Date(p.date) > now);
  }, [pickups, now]);

  if (loading) {
    return <div className="text-center py-12">Loading scheduling information...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-600">
        <AlertTriangle className="mx-auto h-12 w-12 mb-4" />
        <h3 className="text-lg font-medium mb-2">Could not load data</h3>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
  <div className="grid gap-6 lg:grid-cols-[1fr_1fr] mt-4">
      {/* Create Pickup */}
    <Card className="flex flex-col h-[800px]">
  <CardHeader className="shrink-0">
    <CardTitle>Create Pickup</CardTitle>
  </CardHeader>
  <CardContent className="flex flex-col flex-1 min-h-0 overflow-hidden">
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="delivery-address">Pickup Address <span className="text-red-500">*</span></Label>
          <div className="flex gap-2 items-center relative">
            <Input
              id="delivery-address"
              value={deliveryAddress}
              autoComplete="off"
              onChange={async (e) => {
                const value = e.target.value;
                setDeliveryAddress(value);
                setAddressSuggestions([]);
                if (addressTimeout.current) clearTimeout(addressTimeout.current);
                if (value.length < 3) return;
                setAddressLoading(true);
                addressTimeout.current = setTimeout(async () => {
                  try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=IN&q=${encodeURIComponent(value)}`);
                    const data = await res.json();
                    setAddressSuggestions(data.map((d: any) => d.display_name));
                  } catch {
                    setAddressSuggestions([]);
                  } finally {
                    setAddressLoading(false);
                  }
                }, 400);
              }}
              placeholder="Enter Pickup address"
              required
            />
            {addressLoading && <span className="absolute right-3 top-2 text-xs text-gray-400">Loading...</span>}
            {addressSuggestions.length > 0 && (
              <ul className="absolute z-10 left-0 right-0 top-12 bg-white border rounded shadow max-h-48 overflow-auto">
                {addressSuggestions.map((s, i) => (
                  <li
                    key={i}
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                    onClick={() => {
                      setDeliveryAddress(s);
                      setAddressSuggestions([]);
                    }}
                  >
                    {s}
                  </li>
                ))}
              </ul>
            )}
            <Button type="button" variant="outline" onClick={() => setShowMap((v) => !v)}>
              {showMap ? "Hide Map" : "Suggest via Map"}
            </Button>
          </div>
          <div className="sticky top-0 z-20" style={{ minHeight: showMap ? 320 : undefined }}>
            {showMap && (
              <LeafletGeocoderMap address={deliveryAddress} onSelect={(address) => { setDeliveryAddress(address); setShowMap(false); }} />
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="date">Pickup Date & Time</Label>
          <Input id="date" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Vendor</Label>
          <Select value={vendorId} onValueChange={setVendorId}>
            <SelectTrigger><SelectValue placeholder="Select certified vendor" /></SelectTrigger>
            <SelectContent>
              {certifiedVendors.length === 0 ? (
                <div className="px-4 py-2 text-gray-500">No certified vendors available</div>
              ) : (
                certifiedVendors.map((v) => (
                  <SelectItem key={v._id} value={v._id}>
                    {v.name} • Certified
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-2 mt-4">
        <Label>Notes</Label>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional instructions" />
      </div>
      <div className="space-y-2 flex flex-col flex-1 min-h-0 mt-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Select Items to Schedule ({selectedIds.length} selected)</Label>
          {selectable.length > 0 && (
            <Button type="button" variant="outline" size="sm" onClick={selectAll}>
              {selectedIds.length === selectable.length ? "Deselect All" : "Select All"}
            </Button>
          )}
        </div>
        <div className="rounded-md border flex-1 min-h-[120px] max-h-[260px] overflow-auto bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"><input type="checkbox" checked={selectable.length > 0 && selectedIds.length === selectable.length} onChange={selectAll} /></TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Dept</TableHead>
                <TableHead>Class</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectable.map((i) => (
                <TableRow key={i._id} className="cursor-pointer" onClick={() => toggle(i._id)}>
                  <TableCell><input type="checkbox" checked={selectedIds.includes(i._id)} readOnly /></TableCell>
                  <TableCell className="font-medium">{i.name}</TableCell>
                  <TableCell>{i.department}</TableCell>
                  <TableCell><Badge variant="outline">{i.classification?.type || 'N/A'}</Badge></TableCell>
                </TableRow>
              ))}
              {selectable.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No reported items available to schedule.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
    <div className="pt-4 mt-auto sticky bottom-0 bg-white border-t">
      <Button className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-purple-600 text-white border-0" onClick={handleSchedule} disabled={selectedIds.length === 0 || !vendorId || !deliveryAddress}>
        <ClipboardList className="w-4 h-4 mr-2" />
        Schedule Pickup ({selectedIds.length})
      </Button>
    </div>
  </CardContent>
</Card>

      {/* Upcoming Pickups */}
  <Card className="h-[800px]">
        <CardHeader><CardTitle>Upcoming Pickups</CardTitle></CardHeader>
        <CardContent className="max-h-[460px] overflow-y-auto pr-1">
          {upcomingPickups.length === 0 && <p className="text-sm text-muted-foreground">No pickups scheduled yet.</p>}
          <div className="flex flex-col gap-3 pr-5">
            {upcomingPickups.map((p) => {
              const vendor = vendors.find((v) => v._id === p.vendorId);
              return (
                <div key={p._id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{vendor?.name || "Unknown Vendor"}</div>
                    <Badge>{new Date(p.date).toLocaleString()}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{vendor?.contact}</p>
                  <p className="text-sm mt-1">Items: <span className="font-mono">{p.itemIds.length}</span></p>
                  {p.notes && <p className="text-sm mt-1">{p.notes}</p>}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
