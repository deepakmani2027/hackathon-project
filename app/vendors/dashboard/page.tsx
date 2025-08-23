"use client"

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Package, CalendarCheck, Handshake } from "lucide-react";
import { cn } from "@/lib/utils";

// This is the main component for the Vendor Dashboard page.
// It fetches and displays the vendor's key stats.
export default function VendorDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    auctionsWon: 0,
    pickupsScheduled: 0,
    activeBids: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?._id) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const response = await fetch(`/api/vendors/stats?vendorId=${user._id}`);
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        } else {
          console.error("Failed to fetch vendor stats.");
        }
      } catch (error) {
        console.error("Error fetching vendor stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Welcome, {user?.name || 'Vendor'}!</h1>
        <p className="text-muted-foreground mt-1">
          Here's a summary of your activity on the e-waste portal.
        </p>
      </header>

      {/* KPI Cards Section */}
      <div className="grid gap-8 md:gap-12 grid-cols-1 sm:grid-cols-4 xl:grid-cols-6">
        <KpiCard title="Auctions Won" value={stats.auctionsWon} icon={<Handshake className="w-8 h-8" />} gradient="from-green-500 to-green-600" />
        <KpiCard title="Active Bids" value={stats.activeBids} icon={<Package className="w-8 h-8" />} gradient="from-blue-500 to-blue-600" />
        <KpiCard title="Scheduled Pickups" value={stats.pickupsScheduled} icon={<CalendarCheck className="w-8 h-8" />} gradient="from-orange-500 to-orange-600" />
      </div>

      {/* Placeholder for future content */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Your recent bids and won items will appear here.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// A reusable KPI Card component for the dashboard
function KpiCard({ title, value, icon, gradient }: { title: string; value: number | string; icon: React.ReactNode; gradient: string }) {
  return (
    <Card className={cn("text-white border-0", `bg-gradient-to-br ${gradient}`)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-90">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className="opacity-80">{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}
