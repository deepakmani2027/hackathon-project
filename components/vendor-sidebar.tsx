"use client"

import { useEffect, useState } from "react"
import { LayoutDashboard, Package, CalendarCheck, UserCircle, LogOut } from 'lucide-react'
import {
Sidebar,
SidebarContent,
SidebarGroup,
SidebarGroupContent,
SidebarGroupLabel,
SidebarHeader,
SidebarMenu,
SidebarMenuButton,
SidebarMenuItem,
SidebarFooter,
} from "@/components/ui/sidebar"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "./auth/auth-context" // Import useAuth

// Define the navigation items for the vendor sidebar
type Item = { title: string; url: string; icon: React.ComponentType<any> }
const items: Item[] = [
 { title: "Dashboard", url: "/vendors/dashboard", icon: LayoutDashboard },
 { title: "Available Items", url: "/vendors/items", icon: Package },
 { title: "My Pickups", url: "/vendors/scheduling", icon: CalendarCheck },
 { title: "My Profile", url: "/vendors/profile", icon: UserCircle },
]

export function VendorSidebar() {
  const { user, logout } = useAuth(); // Get user and logout function
 const pathname = usePathname();
 const router = useRouter();
 const [active, setActive] = useState(pathname)

 useEffect(() => {
  setActive(pathname);
 }, [pathname]);

 const handleNavigation = (url: string) => {
  router.push(url);
 }
  
  const handleLogout = () => {
    logout();
    window.location.href = "/"; // Force a full page reload to the homepage
  }

 return (
  <Sidebar collapsible="icon" className="border-r flex flex-col">
   <SidebarHeader className="mt-6">
    <SidebarGroup>
     <SidebarGroupLabel className="text-base font-bold">Vendor Portal</SidebarGroupLabel>
    </SidebarGroup>
   </SidebarHeader>

      <SidebarContent className="flex-1">
        <SidebarMenu className="gap-4">
          {items.map((item, index) => {
            const Icon = item.icon
            const isActive = active === item.url
            return (
              <SidebarMenuItem key={item.title} className={`relative ${index > 0 ? 'mt-3' : ''}`}>
                <span
                  aria-hidden
                  className={`pointer-events-none absolute left-0 top-0 bottom-0 h-full w-1 rounded-r-full transition-all group-data-[collapsible=icon]:hidden ${
                    isActive ? "bg-gradient-to-b from-blue-500 to-indigo-600 opacity-100" : "opacity-0"
                  }`}
                />
                <SidebarMenuButton asChild tooltip={item.title}>
                  <Link
                    href={item.url}
                    onClick={(e) => {
                      e.preventDefault();
                      handleNavigation(item.url);
                    }}
                    className={`relative w-full rounded-r-xl rounded-l-sm transition-all duration-200 py-3 px-4 mr-2 hover:!bg-transparent ${isActive ? "text-blue-600" : "text-foreground"}`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon className={`h-6 w-6 shrink-0 ${isActive ? "text-blue-600" : ""}`} />
                    <span className="hidden md:inline ml-4 text-base font-medium">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarContent>

      {/* --- FIX: Added a beautiful logout button in the footer --- */}
      <SidebarFooter>
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton 
                    onClick={handleLogout}
                    className="w-full justify-start hover:bg-red-50 hover:text-red-600"
                    tooltip="Logout"
                >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-sm font-semibold text-gray-700">
                        {(user?.name || user?.email || 'U')[0].toUpperCase()}
                    </div>
                    <div className="hidden md:flex flex-col items-start ml-3">
                        <span className="text-sm font-medium">{user?.name || "Vendor"}</span>
                        <span className="text-xs text-muted-foreground">Logout</span>
                    </div>
                    <LogOut className="h-5 w-5 ml-auto hidden md:inline text-muted-foreground" />
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
  </Sidebar>
 )
}
