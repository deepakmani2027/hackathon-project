"use client"

import { AuthProvider } from "@/components/auth/auth-context";
import Scheduling from "@/components/scheduling"; // Adjust path if necessary
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import DashboardHeader from "@/components/dashboard-header";
import DashboardTabNav from "@/components/dashboard-tab-nav";
import { cn } from "@/lib/utils";
import styles from "@/components/gradient-scrollbar.module.css";

// This component provides the layout for the scheduling page
function SchedulingPageLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader />
        <main className={cn("flex-1 p-4 md:p-6", styles.gradientScroll)}>
          <DashboardTabNav className="mb-4" />
          {/* Scheduling feature info box */}
          <div className="mb-6">
            <div className="rounded-2xl border border-gray-200 shadow-sm overflow-hidden bg-white">
              <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-purple-600 px-7 py-4">
                <h3 className="text-white font-semibold text-lg tracking-wide">Smart Scheduling</h3>
              </div>
              <div className="px-8 py-3">
                <ul className="list-disc pl-5 text-gray-500 text-sm leading-relaxed space-y-2">
                  <li>Plan pickups with registered vendors.</li>
                  <li>Filter by classification or department.</li>
                  <li>Attach items to pickups and update their status.</li>
                </ul>
              </div>
            </div>
          </div>
          {/* The Scheduling component is now self-contained */}
          <Scheduling />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

// The main export for the page, wrapped in the AuthProvider
export default function DashboardSchedulingPage() {
  return (
    <AuthProvider>
      <SchedulingPageLayout />
    </AuthProvider>
  );
}
