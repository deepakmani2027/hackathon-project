"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ClipboardList, AlertTriangle } from 'lucide-react'
import { useAuth } from "./auth/auth-context"
import type { EwItem, Vendor, Pickup } from "@/lib/types";

export default function Scheduling() {
  const { user } = useAuth();
  const [items, setItems] = useState<EwItem[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [vendorId, setVendorId] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");

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
        setVendorId(data.vendors[0]._id);
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
      <Card className="flex flex-col h-[640px]">
        <CardHeader className="shrink-0"><CardTitle>Create Pickup</CardTitle></CardHeader>
        <CardContent className="space-y-4 flex flex-col overflow-hidden">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="delivery-address">Pickup Address <span className="text-red-500">*</span></Label>
              <Input id="delivery-address" value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} placeholder="Enter Pickup address" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="date">Pickup Date & Time</Label>
              <Input id="date" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Vendor</Label>
              <Select value={vendorId} onValueChange={setVendorId}>
                <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v._id} value={v._id}>
                      {v.name} {v.certified ? "• Certified" : "• Unverified"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional instructions" />
          </div>
          <div className="space-y-2 flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Select Items to Schedule ({selectedIds.length} selected)</Label>
              {selectable.length > 0 && (
                <Button type="button" variant="outline" size="sm" onClick={selectAll}>
                  {selectedIds.length === selectable.length ? "Deselect All" : "Select All"}
                </Button>
              )}
            </div>
            <div className="rounded-md border flex-1 overflow-auto">
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
          <Button className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-purple-600 text-white border-0" onClick={handleSchedule} disabled={selectedIds.length === 0 || !vendorId || !deliveryAddress}>
            <ClipboardList className="w-4 h-4 mr-2" />
            Schedule Pickup ({selectedIds.length})
          </Button>
        </CardContent>
      </Card>

      {/* Upcoming Pickups */}
      <Card>
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
