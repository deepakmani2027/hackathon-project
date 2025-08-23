"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarX, Package, MapPin, AlertTriangle, Loader2 } from 'lucide-react'
import { useAuth } from "./auth/auth-context"
import type { EwItem, Vendor, Pickup } from "@/lib/types";

// The API populates itemIds, so we need a type for the populated data
interface PopulatedPickup extends Omit<Pickup, 'itemIds'> {
  itemIds: Pick<EwItem, '_id' | 'name'>[];
}

// This component is now a read-only view of scheduled pickups.
export default function Scheduling() {
 const { user, isAuthenticated, loading: authLoading } = useAuth();
 const [pickups, setPickups] = useState<PopulatedPickup[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
  const fetchData = async () => {
   if (!user?.email) {
    setLoading(false);
    return;
   }
   try {
    setError(null);
    setLoading(true);
    const response = await fetch(`/api/scheduling?userEmail=${encodeURIComponent(user.email)}`);
    if (!response.ok) {
     throw new Error("Failed to load scheduling data.");
    }
    const data = await response.json();
    setPickups(data.pickups || []);
        setVendors(data.vendors || []);
   } catch (err: any) {
    setError(err.message);
   } finally {
    setLoading(false);
   }
  };

    if (!authLoading && isAuthenticated) {
      fetchData();
    } else if (!authLoading) {
        setLoading(false);
    }
 }, [user, isAuthenticated, authLoading]);

 if (loading || authLoading) {
  return <div className="text-center py-12"><Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400"/></div>;
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
    // --- FIX: The layout is now a single column to better display the list ---
  <div className="w-full max-w-4xl mx-auto">
   <Card>
    <CardHeader>
     <CardTitle>Upcoming Pickups</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
     {pickups.length === 0 && (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                <CalendarX size={48} className="mx-auto mb-4"/>
                <h3 className="text-xl font-semibold">No Pickups Scheduled</h3>
                <p>Items you schedule for pickup will appear here.</p>
            </div>
     )}
     <div className="space-y-6">
      {pickups.map((p) => {
              // --- FIX: Convert vendor._id to string for reliable comparison ---
       const vendor = vendors.find((v) => v._id.toString() === p.vendorId);
       return (
        <PickupCard key={p._id} pickup={p} vendorName={vendor?.name || "Unknown Vendor"} />
       )
      })}
     </div>
    </CardContent>
   </Card>
  </div>
 )
}

function PickupCard({ pickup, vendorName }: { pickup: PopulatedPickup, vendorName: string }) {
    const notesParts = pickup.notes?.split('\nDelivery Address: ');
    const mainNotes = notesParts?.[0];
    const deliveryAddress = notesParts?.[1];
  
    return (
      <Card className="shadow-md">
        <CardHeader className="flex flex-row items-center justify-between border-b p-4">
          <CardTitle className="text-lg">{vendorName}</CardTitle>
          <Badge>{new Date(pickup.date).toLocaleDateString()}</Badge>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {deliveryAddress && (
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-md">
              <MapPin className="w-5 h-5 text-gray-500 mt-1"/>
              <div>
                <p className="font-semibold">Delivery Address</p>
                <p className="text-muted-foreground">{deliveryAddress}</p>
              </div>
            </div>
          )}
          {mainNotes && (
            <div>
              <h4 className="font-semibold mb-2">Notes</h4>
              <p className="text-sm text-muted-foreground p-3 bg-gray-50 rounded-md whitespace-pre-wrap">{mainNotes}</p>
            </div>
          )}
          <div>
            <h4 className="font-semibold mb-2">Items to Collect</h4>
            <ul className="space-y-2">
              {pickup.itemIds.map(item => (
                <li key={item._id} className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded-md">
                  <Package size={16} className="text-gray-500"/>
                  <span>{item.name}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    )
  }
