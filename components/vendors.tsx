"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PlusCircle, Building2, Phone, CheckCircle, XCircle, Edit, Trash2, AlertTriangle } from 'lucide-react'
import { useStaggeredAnimation } from "@/hooks/use-scroll-animation"
import type { EwItem, Vendor, Pickup } from "@/lib/types";
// The Vendor type should expect `_id` from MongoDB

export default function Vendors() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // State for API errors
  
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)
  const [editForm, setEditForm] = useState({ name: '', contact: '' })

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newVendorForm, setNewVendorForm] = useState({ name: '', contact: '' });

  const { ref: overviewRef, visibleItems: visibleOverview } = useStaggeredAnimation(3, 150)
  // --- FIX: Removed the complex staggered animation for the vendor list ---

  const fetchVendors = async () => {
    try {
      setError(null); // Clear previous errors
      setLoading(true);
      const response = await fetch('/api/vendors');
      if (!response.ok) {
        throw new Error("Failed to fetch vendors. Please try again later.");
      }
      const data = await response.json();
      setVendors(data);
    } catch (err: any) {
      console.error("An error occurred while fetching vendors:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const handleAddVendor = async () => {
    if (!newVendorForm.name.trim() || !newVendorForm.contact.trim()) return;

    await fetch('/api/vendors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newVendorForm.name,
        contact: newVendorForm.contact,
        certified: false
      }),
    });
    setNewVendorForm({ name: '', contact: '' });
    setIsAddDialogOpen(false);
    fetchVendors();
  };

  const handleUpdateVendor = async (vendorToUpdate: Vendor) => {
    await fetch('/api/vendors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vendorToUpdate),
    });
    fetchVendors();
  };

  const handleRemoveVendor = async (vendorId: string) => {
    if (window.confirm("Are you sure you want to delete this vendor? This action cannot be undone.")) {
        await fetch(`/api/vendors?id=${vendorId}`, { method: 'DELETE' });
        fetchVendors();
    }
  };

  const openEditDialog = (vendor: Vendor) => {
    setEditingVendor(vendor)
    setEditForm({ name: vendor.name, contact: vendor.contact })
  }

  const closeEditDialog = () => {
    setEditingVendor(null)
    setEditForm({ name: '', contact: '' })
  }

  const handleSaveEdit = () => {
    if (editingVendor && editForm.name.trim() && editForm.contact.trim()) {
      handleUpdateVendor({
        ...editingVendor,
        name: editForm.name.trim(),
        contact: editForm.contact.trim()
      })
      closeEditDialog()
    }
  }

  const toggleCertification = (vendor: Vendor) => {
    handleUpdateVendor({ ...vendor, certified: !vendor.certified })
  }

  return (
    <div className="space-y-6">
      {/* Vendors Overview Cards */}
      <div 
        ref={overviewRef as any}
        className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-3"
      >
        {[
          { title: "Total Vendors", value: vendors.length, icon: <Building2 className="h-8 w-8 opacity-80" />, gradient: "from-blue-500 to-blue-600" },
          { title: "Certified", value: vendors.filter(v => v.certified).length, icon: <CheckCircle className="h-8 w-8 opacity-80" />, gradient: "from-green-500 to-green-600" },
          { title: "Unverified", value: vendors.filter(v => !v.certified).length, icon: <XCircle className="h-8 w-8 opacity-80" />, gradient: "from-orange-500 to-orange-600" }
        ].map((card, index) => (
          <Card 
            key={card.title}
            className={`bg-gradient-to-br ${card.gradient} text-white border-0 transition-all duration-500 ease-out ${
              visibleOverview.includes(index)
                ? 'opacity-100 translate-y-0 scale-100'
                : 'opacity-0 translate-y-6 scale-95'
            }`}
            style={{ transitionDelay: `${index * 150}ms` }}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">{card.title}</p>
                  <p className="text-2xl font-bold">{card.value}</p>
                </div>
                {card.icon}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Vendors Management Section */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold">Registered Vendors</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Manage your certified e-waste collection and recycling partners
              </p>
            </div>
            <Button
              className="bg-gradient-to-r from-emerald-600 via-teal-600 to-purple-600 text-white border-0 gap-2"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <PlusCircle className="w-4 h-4" />
              Add Vendor
            </Button>
          </div>

          {loading && <div className="text-center py-12 text-muted-foreground">Loading vendors...</div>}
          
          {error && (
            <div className="text-center py-12 text-red-600">
              <AlertTriangle className="mx-auto h-12 w-12 mb-4" />
              <h3 className="text-lg font-medium mb-2">Could not load vendors</h3>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {!loading && !error && vendors.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No vendors registered</h3>
              <p className="text-sm text-muted-foreground mb-4">Get started by adding your first e-waste vendor</p>
              <Button onClick={() => setIsAddDialogOpen(true)} variant="outline">
                <PlusCircle className="w-4 h-4 mr-2" />
                Add Your First Vendor
              </Button>
            </div>
          )}

          {!loading && !error && vendors.length > 0 && (
            // --- FIX: Simplified animation on the container ---
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-in fade-in-0 duration-500">
              {vendors.map((vendor) => (
                <Card key={vendor._id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-base truncate">{vendor.name}</h4>
                        <div className="flex items-center gap-1 mt-1">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground truncate">{vendor.contact}</p>
                        </div>
                      </div>
                      <Badge 
                        variant={vendor.certified ? "default" : "outline"}
                        className={vendor.certified ? "bg-green-500" : ""}
                      >
                        {vendor.certified ? "Certified" : "Unverified"}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" className="flex-1" onClick={() => toggleCertification(vendor)}>
                        {vendor.certified ? <><XCircle className="w-3 h-3 mr-1" />Revoke</> : <><CheckCircle className="w-3 h-3 mr-1" />Certify</>}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openEditDialog(vendor)}>
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleRemoveVendor(vendor._id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Vendor Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Vendor</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-name">Vendor Name</Label>
              <Input id="new-name" value={newVendorForm.name} onChange={(e) => setNewVendorForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Enter vendor name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-contact">Contact Information</Label>
              <Input id="new-contact" value={newVendorForm.contact} onChange={(e) => setNewVendorForm(prev => ({ ...prev, contact: e.target.value }))} placeholder="Enter email or phone number" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddVendor} disabled={!newVendorForm.name.trim() || !newVendorForm.contact.trim()} className="bg-gradient-to-r from-emerald-600 via-teal-600 to-purple-600 text-white border-0">Add Vendor</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Vendor Dialog */}
      <Dialog open={!!editingVendor} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Vendor</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Vendor Name</Label>
              <Input id="edit-name" value={editForm.name} onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Enter vendor name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-contact">Contact Information</Label>
              <Input id="edit-contact" value={editForm.contact} onChange={(e) => setEditForm(prev => ({ ...prev, contact: e.target.value }))} placeholder="Enter email or phone number" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeEditDialog}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={!editForm.name.trim() || !editForm.contact.trim()} className="bg-gradient-to-r from-emerald-600 via-teal-600 to-purple-600 text-white border-0">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
