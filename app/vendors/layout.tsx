"use client"

import { useEffect } from "react";
import { useAuth, AuthProvider } from "@/components/auth/auth-context";
import { useRouter } from "next/navigation";
import { VendorSidebar } from "@/components/vendor-sidebar"; // Import the new sidebar
import { Loader2 } from "lucide-react";
import { SidebarProvider } from "@/components/ui/sidebar";

// This component is the security gatekeeper for the vendor portal.
function VendorPortalLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait for the initial authentication check to complete
    if (authLoading) {
      return;
    }

    // If the check is done, verify the user's role
    if (!isAuthenticated) {
      // If not logged in at all, send to login page
      router.replace("/login");
    } else if (user?.role !== 'vendor') {
      // If logged in but NOT a vendor, send to the main user dashboard
      alert("Access Denied: This area is for vendors only.");
      router.replace("/dashboard/items"); 
    }
  }, [isAuthenticated, user, authLoading, router]);

  // While checking authentication or if the user is not a vendor, show a loading screen.
  if (authLoading || !isAuthenticated || user?.role !== 'vendor') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <Loader2 className="w-16 h-16 animate-spin text-gray-400" />
      </div>
    );
  }

  // If the user is a verified vendor, render the layout with the vendor sidebar.
  return (
    <SidebarProvider>
    <div className="flex min-h-screen">
      <VendorSidebar />
      <div className="flex-1">
        {children}
      </div>
    </div>
    </SidebarProvider>
  );
}


// The final export for the layout, wrapped in the necessary AuthProvider.
export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <VendorPortalLayout>{children}</VendorPortalLayout>
        </AuthProvider>
    )
}
