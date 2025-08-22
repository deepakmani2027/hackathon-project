"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowDownAZ, ArrowUpAZ, Download, QrCode, Gavel, CalendarDays, Trash2 } from 'lucide-react'
import QRCode from "qrcode";
import type { EwItem, Vendor, Pickup } from "@/lib/types";
import { useAuth } from "./auth/auth-context"

export default function ItemTable({
 items = [],
 vendors = [],
 onUpdate,
  onScheduleQuick,
  onDelete,
}: {
 items: EwItem[];
 vendors: Vendor[];
  // --- FIX: The onUpdate prop now correctly handles async functions ---
 onUpdate: (item: EwItem) => Promise<void> | void;
  onScheduleQuick: (pickup: Omit<Pickup, '_id' | 'id' | 'createdBy'>) => void;
  onDelete: (id: string) => void;
}) {
  const { user } = useAuth();
 const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
 const [selectedItemForQr, setSelectedItemForQr] = useState<EwItem | null>(null);
 const [qrcodeDataURL, setQrcodeDataURL] = useState<string | null>(null);

 const [search, setSearch] = useState("");
 const [sortAsc, setSortAsc] = useState(true);
 const [deptFilter, setDeptFilter] = useState<string>("All");
 const [classFilter, setClassFilter] = useState<string>("All");

 const filtered = useMemo(() => {
  const s = search.toLowerCase();
  return items
   .filter((i) => (deptFilter === "All" ? true : i.department === deptFilter))
   .filter((i) => (classFilter === "All" ? true : i.classification?.type === classFilter))
   .filter(
    (i) =>
     i.name.toLowerCase().includes(s) ||
     i.category.toLowerCase().includes(s) ||
     i.department.toLowerCase().includes(s) ||
     i._id.toLowerCase().includes(s)
   )
   .sort((a, b) => (sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)));
 }, [items, search, sortAsc, deptFilter, classFilter]);

 const handleShowQr = async (item: EwItem) => {
  const classificationType = item.classification?.type || 'N/A';
  const qrText = `ITEM: ${item.name}\nID: ${item._id}\nDEPT: ${item.department}\nCATEGORY: ${item.category}\nSTATUS: ${item.status}`;
  const url = await QRCode.toDataURL(qrText, { width: 512, margin: 2 });
  
  setQrcodeDataURL(url);
  setSelectedItemForQr(item);
  setIsQrDialogOpen(true);
 };

  const handleEndAuction = (item: EwItem) => {
    if (window.confirm(`Are you sure you want to end the auction for "${item.name}"? The current highest bid will be the winner.`)) {
        const updatedItem = { ...item, biddingStatus: "closed" as "closed" };
        onUpdate(updatedItem);
    }
  }
  
  function quickSchedule(item: EwItem) {
    if (!vendors || vendors.length === 0) {
        alert("No vendors are available to schedule a pickup. Please add a vendor first.");
        return;
    }
    const vendor = vendors.find((v) => v.certified) || vendors[0];

    const pickupPayload: Omit<Pickup, '_id' | 'id' | 'createdBy'> = {
      date: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      vendorId: vendor._id,
      itemIds: [item._id],
      notes: "Auto-scheduled from item table",
    };
    onScheduleQuick(pickupPayload);
  }

 return (
  <Card className="overflow-hidden mt-4">
   <CardHeader className="pb-2">
    <CardTitle>My Listed Items</CardTitle>
   </CardHeader>
   <CardContent className="space-y-3">
    <div className="grid grid-cols-12 gap-4 items-end">
     <div className="col-span-12 md:col-span-5 xl:col-span-4 min-w-0">
      <Label htmlFor="search" className="mb-1 block">Search</Label>
      <Input id="search" placeholder="Search item, category, or ID..." value={search} onChange={(e) => setSearch(e.target.value)} />
     </div>
     <div className="col-span-6 sm:col-span-2 md:col-span-1">
      <Button variant="outline" onClick={() => setSortAsc((s) => !s)} className="w-full h-10">
       {sortAsc ? <ArrowDownAZ className="w-4 h-4" /> : <ArrowUpAZ className="w-4 h-4" />}
      </Button>
     </div>
     <div className="col-span-12 sm:col-span-5 md:col-span-3">
      <Label className="mb-1 block">Filter Dept</Label>
      <Select value={deptFilter} onValueChange={setDeptFilter}>
       <SelectTrigger><SelectValue /></SelectTrigger>
       <SelectContent>{["All","Engineering","Sciences","Humanities","Administration","Hostel","Other"].map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
      </Select>
     </div>
     <div className="col-span-12 sm:col-span-5 md:col-span-3">
      <Label className="mb-1 block">Filter Class</Label>
      <Select value={classFilter} onValueChange={setClassFilter}>
       <SelectTrigger><SelectValue /></SelectTrigger>
       <SelectContent>{["All","Recyclable","Reusable","Hazardous"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
      </Select>
     </div>
    </div>

    <div className="rounded-md border overflow-auto">
     <Table>
      <TableHeader>
       <TableRow>
        <TableHead className="w-[56px]">QR</TableHead>
        <TableHead>Name</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Highest Bid</TableHead>
        <TableHead>Top Bidder</TableHead>
        <TableHead>Auction Ends</TableHead>
        <TableHead className="text-right">Actions</TableHead>
       </TableRow>
      </TableHeader>
      <TableBody>
       {filtered.map((it) => {
                const winningVendor = vendors.find(v => v._id === it.winningBidderId);
                return (
                    <TableRow key={it._id}>
                        <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => handleShowQr(it)}>
                            <QrCode className="w-4 h-4" />
                        </Button>
                        </TableCell>
                        <TableCell className="font-medium">{it.name}</TableCell>
                        <TableCell>
                            <Badge variant={it.biddingStatus === 'open' ? 'default' : 'secondary'} className={it.biddingStatus === 'open' ? 'bg-green-600' : ''}>
                                {it.biddingStatus}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            {it.biddingStatus !== 'draft' ? `₹${it.currentHighestBid}` : 'N/A'}
                        </TableCell>
                        <TableCell>
                            {winningVendor ? winningVendor.name : (it.biddingStatus !== 'draft' ? 'No bids yet' : 'N/A')}
                        </TableCell>
                        <TableCell>
                            {it.biddingEndDate ? new Date(it.biddingEndDate).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                                {it.biddingStatus === 'open' && (
                                    <Button variant="destructive" size="sm" onClick={() => handleEndAuction(it)}>
                                        <Gavel className="w-4 h-4 mr-2"/>
                                        End Auction
                                    </Button>
                                )}
                                {it.biddingStatus === 'closed' && it.winningBidderId && (
                                    <Button variant="secondary" size="sm" onClick={() => quickSchedule(it)}>
                                        <CalendarDays className="w-4 h-4 mr-2"/>
                                        Schedule Pickup
                                    </Button>
                                )}
                                <Button variant="destructive" size="sm" onClick={() => { if (confirm("Delete this item permanently?")) { onDelete(it._id) } }}>
                                    <Trash2 className="w-4 h-4"/>
                                </Button>
                            </div>
                        </TableCell>
                    </TableRow>
                )
              })}
       {filtered.length === 0 && (
        <TableRow>
         <TableCell colSpan={7} className="text-center text-muted-foreground">No items found.</TableCell>
        </TableRow>
       )}
      </TableBody>
     </Table>
    </div>
   </CardContent>
   
   <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
    <DialogContent className="w-[520px] max-w-[92vw]">
     <DialogHeader><DialogTitle>QR Code & Product Details</DialogTitle></DialogHeader>
     {selectedItemForQr && (
      <div className="flex flex-col gap-5">
       <div className="flex flex-col items-center justify-center gap-3 self-center">
        <Image src={qrcodeDataURL || ""} alt="QR Code" width={220} height={220} className="rounded-md border"/>
        <Button className="w-full" onClick={() => { if (!qrcodeDataURL) return; const a = document.createElement("a"); a.href = qrcodeDataURL; a.download = `${selectedItemForQr._id}-qr.png`; a.click(); }}>
         <Download className="w-4 h-4 mr-2" /> Download
        </Button>
       </div>
       <div className="border-t pt-4 grid gap-2 text-sm">
         <div className="flex justify-between"><span className="text-muted-foreground">ID:</span><span className="font-semibold">{selectedItemForQr._id}</span></div>
         <div className="flex justify-between"><span className="text-muted-foreground">Name:</span><span className="font-medium">{selectedItemForQr.name}</span></div>
         <div className="flex justify-between"><span className="text-muted-foreground">Category:</span><span>{selectedItemForQr.category}</span></div>
         <div className="flex justify-between"><span className="text-muted-foreground">Department:</span><span>{selectedItemForQr.department}</span></div>
         <div className="flex justify-between"><span className="text-muted-foreground">Status:</span><span>{selectedItemForQr.status}</span></div>
       </div>
      </div>
     )}
    </DialogContent>
   </Dialog>
  </Card>
 )
}
