"use client"

import { useMemo, useState, useEffect } from "react"
import qrClassStyles from "./qr-class.module.css"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowDownAZ, ArrowUpAZ, Download, QrCode, Loader2 } from 'lucide-react'
import QRCode from "qrcode"
import type { EwItem, Vendor, Pickup } from "@/lib/types"
import { useAuth } from "./auth/auth-context"

function normalizeEwItem(item: Partial<EwItem>): EwItem {
  return {
    _id: item._id || '',
    id: item.id || '',
    qrId: item.qrId || '',
    name: item.name || '',
    department: item.department || 'Other',
    category: item.category || 'Other',
    ageMonths: typeof item.ageMonths === 'number' ? item.ageMonths : 0,
    condition: item.condition || 'Good',
    notes: item.notes || '',
    status: item.status || 'Reported',
    createdAt: item.createdAt || new Date().toISOString(),
    classification: item.classification || { type: 'Recyclable' },
    createdBy: item.createdBy || '',
    pickupId: item.pickupId || '',
    auditTrail: item.auditTrail || [],
    disposalHistory: item.disposalHistory || [],
    disposedAt: item.disposedAt || '',
    disposedBy: item.disposedBy || '',
  }
}

export type EwStatus =
  | "Reported"
  | "Scheduled"
  | "Collected"
  | "Sorted"
  | "Processed"
  | "Recycled"
  | "Disposed"
  | "Decomposed"

export default function ItemTable({
  items = [],
  vendors = [],
  onUpdate,
  onScheduleQuick,
  onDelete,
}: {
  items: EwItem[]
  vendors: Vendor[]
  onUpdate: (item: EwItem) => Promise<void> | void
  onScheduleQuick: (pickup: Omit<Pickup, "_id" | "id" | "createdBy">) => void
  onDelete: (id: string) => void
}) {
  const { user } = useAuth()
  const [localItems, setLocalItems] = useState<EwItem[]>(items)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  useEffect(() => {
    setLocalItems(items)
  }, [items])

  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false)
  const [selectedItemForQr, setSelectedItemForQr] = useState<EwItem | null>(null)
  const [qrcodeDataURL, setQrcodeDataURL] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [sortAsc, setSortAsc] = useState(true)
  const [deptFilter, setDeptFilter] = useState<string>("All")
  const [classFilter, setClassFilter] = useState<string>("All")

  const filtered = useMemo(() => {
    const s = search.toLowerCase()
    return localItems
      .filter((i) => (deptFilter === "All" ? true : i.department === deptFilter))
      .filter((i) => (classFilter === "All" ? true : i.classification?.type === classFilter))
      .filter(
        (i) =>
          i.name.toLowerCase().includes(s) ||
          i.category.toLowerCase().includes(s) ||
          i.department.toLowerCase().includes(s) ||
          i._id.toLowerCase().includes(s)
      )
      .sort((a, b) =>
        sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
      )
  }, [localItems, search, sortAsc, deptFilter, classFilter])

  const handleShowQr = async (item: EwItem) => {
    const latestItem = localItems.find(i => i._id === item._id) || item
    setSelectedItemForQr(latestItem)
    
    const classificationType = latestItem.classification?.type || "N/A"
    const qrText = `ITEM: ${latestItem.name}\nID: ${latestItem._id}\nDEPT: ${latestItem.department}\nCLASS: ${classificationType}\nCATEGORY: ${latestItem.category}\nSTATUS: ${latestItem.status}`
    const url = await QRCode.toDataURL(qrText, { width: 512, margin: 2 })
    setQrcodeDataURL(url)
    
    setIsQrDialogOpen(true)
  }

  async function handleStatusUpdate(newStatus: EwStatus, stage: string) {
    if (!selectedItemForQr || updatingStatus) return

    setUpdatingStatus(true)
    const userName = user?.name || user?.email || "system"
    const now = new Date().toISOString()

    const updated: EwItem = {
      ...selectedItemForQr,
      status: newStatus,
      auditTrail: [
        ...(selectedItemForQr.auditTrail || []),
        { date: now, user: userName, stage, status: newStatus }
      ]
    }

    // Optimistic UI update
    setSelectedItemForQr(updated)
    setLocalItems(prev => prev.map(it => it._id === updated._id ? updated : it))

    try {
      // API call
      await fetch('/api/items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updated,
          id: updated._id,
          userEmail: user?.email || userName,
        }),
      })
      
      // Parent update after successful API call
      await onUpdate(updated)
    } catch (e) {
      console.error('Failed to persist item update', e)
      // Rollback on error
      setSelectedItemForQr(selectedItemForQr)
      setLocalItems(prev => prev.map(it => it._id === selectedItemForQr._id ? selectedItemForQr : it))
    } finally {
      setUpdatingStatus(false)
    }
  }

  function quickSchedule(item: EwItem) {
    if (!vendors || vendors.length === 0) {
      alert(
        "No vendors are available to schedule a pickup. Please add a vendor first."
      )
      return
    }
    const vendor = vendors.find((v) => v.certified) || vendors[0]

    const pickupPayload: Omit<Pickup, "_id" | "id" | "createdBy"> = {
      date: new Date(Date.now() + 3 * 24 * 3600 * 1000)
        .toISOString()
        .slice(0, 10),
      vendorId: vendor._id,
      itemIds: [item._id],
      notes: "Auto-scheduled from item table",
    }
    onScheduleQuick(pickupPayload)
  }

  const [disposeDialogOpen, setDisposeDialogOpen] = useState(false)
  const [selectedForDispose, setSelectedForDispose] = useState<EwItem | null>(null)

  function openDisposeDialog(item: EwItem) {
    if (item.status === "Decomposed") return
    setSelectedForDispose(item)
    setDisposeDialogOpen(true)
  }

  async function confirmDispose() {
    if (!selectedForDispose) return
    const item = selectedForDispose
    const currentUser = user?.name || user?.email || "System"
    const now = new Date().toISOString()
    const updated: EwItem = {
      ...item,
      status: "Decomposed",
      disposedAt: now,
      disposedBy: currentUser,
      disposalHistory: [
        ...(item.disposalHistory || []),
        { date: now, user: currentUser, action: "Decomposed" },
      ],
    }

    // Optimistic update
    setLocalItems(prev => prev.map(i => i._id === updated._id ? updated : i))
    setDisposeDialogOpen(false)
    setSelectedForDispose(null)
    
    try {
      await onUpdate(normalizeEwItem(updated))
    } catch (e) {
      console.error('Failed to update disposal status', e)
      // Rollback on error
      setLocalItems(prev => prev.map(i => i._id === item._id ? item : i))
    }
  }

  const normalizedFiltered = filtered.map(normalizeEwItem)

  return (
    <Card className="overflow-hidden mt-4">
      <CardHeader className="pb-2">
        <CardTitle>Inventory</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-12 gap-4 items-end">
          <div className="col-span-12 md:col-span-5 xl:col-span-4 min-w-0">
            <Label htmlFor="search" className="mb-1 block">
              Search
            </Label>
            <Input
              id="search"
              placeholder="Search item, category, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="col-span-6 sm:col-span-2 md:col-span-1">
            <Button
              variant="outline"
              onClick={() => setSortAsc((s) => !s)}
              className="w-full h-10"
            >
              {sortAsc ? (
                <ArrowDownAZ className="w-4 h-4" />
              ) : (
                <ArrowUpAZ className="w-4 h-4" />
              )}
            </Button>
          </div>
          <div className="col-span-12 sm:col-span-5 md:col-span-3">
            <Label className="mb-1 block">Filter Dept</Label>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="min-w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  "All",
                  "Engineering",
                  "Sciences",
                  "Humanities",
                  "Administration",
                  "Hostel",
                  "Other",
                ].map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-12 sm:col-span-5 md:col-span-3">
            <Label className="mb-1 block">Filter Class</Label>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="min-w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["All", "Recyclable", "Reusable", "Hazardous"].map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-md border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[56px]">QR</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {normalizedFiltered.map((it) => (
                <TableRow key={it._id}>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleShowQr(it)}
                    >
                      <QrCode className="w-4 h-4" />
                    </Button>
                  </TableCell>
                  <TableCell className="font-medium">{it.name}</TableCell>
                  <TableCell>{it.ageMonths > 0 ? `${it.ageMonths}m` : ''}</TableCell>
                  <TableCell>{it.category}</TableCell>
                  <TableCell>{it.department}</TableCell>
                  <TableCell>
                    {it.condition || "N/A"}
                  </TableCell>
                  <TableCell>
                    {it.classification ? (
                      <Badge
                        variant="outline"
                        className={
                          it.classification.type === "Hazardous"
                            ? "bg-rose-100 text-rose-700"
                            : it.classification.type === "Reusable"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }
                      >
                        {it.classification.type}
                      </Badge>
                    ) : (
                      <Badge variant="outline">N/A</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {it.status === "Collected" ? (
                      <Badge className="bg-blue-100 text-blue-700">Collected</Badge>
                    ) : it.status === "Scheduled" ? (
                      <Badge className="bg-yellow-100 text-yellow-700">Scheduled</Badge>
                    ) : it.status === "Sorted" ? (
                      <Badge className="bg-purple-100 text-purple-700">Sorted</Badge>
                    ) : (
                      it.status
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => quickSchedule(it)}
                          disabled={it.status !== "Reported"}
                        >
                          Schedule
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={it.status === "Decomposed"}
                          onClick={() => openDisposeDialog(it)}
                        >
                          {it.status === "Decomposed"
                            ? "Decomposed"
                            : "Decompose"}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            if (confirm("Delete this item permanently?")) {
                              onDelete(it._id)
                              setLocalItems(prev => prev.filter(i => i._id !== it._id))
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                      {it.disposedAt && (
                        <div className={`text-xs text-right mt-1 space-y-0.5 ${
                          it.status === "Decomposed" ? "" : "text-muted-foreground"
                        }`}>
                          <div>
                            <span className="font-semibold">Disposed At:</span>{" "}
                            {new Date(it.disposedAt).toLocaleString()}
                          </div>
                          <div>
                            <span className="font-semibold">Disposed By:</span>{" "}
                            {it.disposedBy}
                          </div>
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No items found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
          <DialogContent className="w-[420px] max-w-[95vw] flex flex-col items-center p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-left w-full">
                QR Code & Product Details
              </DialogTitle>
            </DialogHeader>
            {selectedItemForQr && (
              <div className="flex flex-col items-center w-full">
                <Image
                  src={qrcodeDataURL || ""}
                  alt="QR Code"
                  width={220}
                  height={220}
                  className="rounded-md border mb-3"
                />
                <Button
                  className="w-full mb-6"
                  onClick={() => {
                    if (!qrcodeDataURL) return
                    const a = document.createElement("a")
                    a.href = qrcodeDataURL
                    a.download = `${selectedItemForQr._id}-qr.png`
                    a.click()
                  }}
                >
                  <Download className="w-4 h-4 mr-2" /> Download QR Code
                </Button>
                <div className="flex flex-wrap gap-2 mb-4 w-full justify-center">
                  <Button 
                    size="sm" 
                    onClick={() => handleStatusUpdate("Collected", "Collected")}
                    disabled={selectedItemForQr.status === "Collected" || updatingStatus}
                    variant={selectedItemForQr.status === "Collected" ? "default" : "outline"}
                    className={
                      selectedItemForQr.status === "Collected" 
                        ? "bg-blue-600 hover:bg-blue-700 text-white" 
                        : ""
                    }
                  >
                    {updatingStatus ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : selectedItemForQr.status === "Collected" ? (
                      "✓ Collected"
                    ) : (
                      "Mark as Collected"
                    )}
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => handleStatusUpdate("Scheduled", "Pickup")}
                    disabled={selectedItemForQr.status === "Scheduled" || updatingStatus}
                    variant={selectedItemForQr.status === "Scheduled" ? "default" : "outline"}
                    className={
                      selectedItemForQr.status === "Scheduled" 
                        ? "bg-yellow-600 hover:bg-yellow-700 text-white" 
                        : ""
                    }
                  >
                    {updatingStatus ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : selectedItemForQr.status === "Scheduled" ? (
                      "✓ Scheduled"
                    ) : (
                      "Mark as Pickup"
                    )}
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => handleStatusUpdate("Sorted", "Sorting")}
                    disabled={selectedItemForQr.status === "Sorted" || updatingStatus}
                    variant={selectedItemForQr.status === "Sorted" ? "default" : "outline"}
                    className={
                      selectedItemForQr.status === "Sorted" 
                        ? "bg-purple-600 hover:bg-purple-700 text-white" 
                        : ""
                    }
                  >
                    {updatingStatus ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : selectedItemForQr.status === "Sorted" ? (
                      "✓ Sorted"
                    ) : (
                      "Mark as Sorted"
                    )}
                  </Button>
                </div>
                <div className="w-full text-center font-semibold text-lg mb-2 mt-2">
                  Product Information
                </div>
                <div className="w-full grid gap-2 text-sm border-t pt-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ID:</span>
                    <span className="font-semibold">{selectedItemForQr._id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="font-medium">{selectedItemForQr.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Category:</span>
                    <span>{selectedItemForQr.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Department:</span>
                    <span>{selectedItemForQr.department}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Condition:</span>
                    <span>{selectedItemForQr.condition || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Classification:</span>
                    <span className={
                      `${qrClassStyles["qr-class"]} ${
                        selectedItemForQr.classification?.type === "Reusable"
                          ? qrClassStyles["qr-class-reusable"]
                          : selectedItemForQr.classification?.type === "Recyclable"
                          ? qrClassStyles["qr-class-recyclable"]
                          : selectedItemForQr.classification?.type === "Hazardous"
                          ? qrClassStyles["qr-class-hazardous"]
                          : ""
                      }`
                    }>
                      {selectedItemForQr.classification?.type || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span className={
                      selectedItemForQr.status === "Collected" ? "text-blue-600 font-semibold" :
                      selectedItemForQr.status === "Scheduled" ? "text-yellow-600 font-semibold" :
                      selectedItemForQr.status === "Sorted" ? "text-purple-600 font-semibold" : ""
                    }>
                      {selectedItemForQr.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Age:</span>
                    <span>{selectedItemForQr.ageMonths} months</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created:</span>
                    <span>
                      {selectedItemForQr.createdAt
                        ? new Date(selectedItemForQr.createdAt).toLocaleDateString()
                        : ""}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={disposeDialogOpen} onOpenChange={setDisposeDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm Decomposition</DialogTitle>
            </DialogHeader>
            {selectedForDispose && (
              <div className="space-y-4 text-sm">
                <p>
                  You are about to mark{" "}
                  <span className="font-semibold">{selectedForDispose.name}</span>{" "}
                  as{" "}
                  <span className="font-semibold text-emerald-600">
                    Decomposed
                  </span>
                  .
                </p>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  <li>Status will change to Decomposed.</li>
                  <li>Timestamp and user recorded in disposal history.</li>
                  <li>
                    This action can be reversed only by editing the item manually.
                  </li>
                </ul>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setDisposeDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white"
                    onClick={confirmDispose}
                  >
                    Confirm
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}