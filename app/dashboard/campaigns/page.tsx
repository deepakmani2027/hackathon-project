"use client"

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { motion } from "framer-motion";
import {
 BookOpen,
 Beaker,
 PenTool,
 Building,
 Home,
 Users,
 Medal,
 Loader2,
 AlertTriangle,
} from "lucide-react";
import DashboardHeader from "@/components/dashboard-header";
import CampaignCard from "@/components/campaign-card";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";
import type { EwItem } from "@/lib/types";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import DashboardTabNav from "@/components/dashboard-tab-nav";
import { cn } from "@/lib/utils";
import styles from "@/components/gradient-scrollbar.module.css";

type Dept = EwItem["department"];

const DEPT_ICONS: Record<Dept, any> = {
 Engineering: BookOpen,
 Sciences: Beaker,
 Humanities: PenTool,
 Administration: Building,
 Hostel: Home,
 Other: Users,
};

// --- FIX: The entire page is now a single, self-contained component. ---
// It does NOT need to be wrapped in AuthProvider because the root layout does that.
export default function DashboardCampaignsPage() {
 const { user, isAuthenticated, loading: authLoading } = useAuth();
 const router = useRouter();
 const [items, setItems] = useState<EwItem[]>([]); // user items
 const [allItems, setAllItems] = useState<EwItem[]>([]); // global items for department scoreboard
 const bcRef = useRef<BroadcastChannel | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [joinedChallenge, setJoinedChallenge] = useState(false);
 const { ref: challengeRef, isInView: challengeInView } = useScrollAnimation();

 // This effect handles security and data fetching in a clear sequence.
 useEffect(() => {
    // First, wait for the main authentication check to complete.
  if (authLoading) {
   return; // Do nothing until auth is resolved
  }

    // If the check is done and the user is not authenticated, redirect.
  if (!isAuthenticated) {
   router.replace("/login");
   return;
  }

    // If the user is authenticated, fetch their data.
  const fetchItems = async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [userRes, allRes] = await Promise.all([
        fetch(`/api/items?userEmail=${encodeURIComponent(user.email)}`),
        fetch(`/api/all-items`)
      ]);
      if (!userRes.ok) throw new Error('Failed to fetch your items');
      if (!allRes.ok) throw new Error('Failed to fetch global items');
      const userData = await userRes.json();
      const globalData = await allRes.json();
      setItems(Array.isArray(userData) ? userData : []);
      setAllItems(Array.isArray(globalData) ? globalData : []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error fetching campaign data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
    fetchItems();

    // Setup BroadcastChannel for instant refresh when items change elsewhere
    if (typeof window !== 'undefined' && !bcRef.current) {
      bcRef.current = new BroadcastChannel('ew-items');
      bcRef.current.onmessage = (ev) => {
        if (ev.data?.type === 'updated') {
          fetchItems();
        }
      };
    }
    return () => {
      if (bcRef.current) {
        bcRef.current.onmessage = null;
      }
    }
 }, [user, authLoading, isAuthenticated, router]);

 const scoreboard = useMemo(() => {
  const byDept: Record<Dept, { count: number; points: number }> = {
    Engineering: { count: 0, points: 0 },
    Sciences: { count: 0, points: 0 },
    Humanities: { count: 0, points: 0 },
    Administration: { count: 0, points: 0 },
    Hostel: { count: 0, points: 0 },
    Other: { count: 0, points: 0 },
  };
  const mine = allItems.filter(i => i.createdBy === user?.email);
  mine.forEach(i => {
    if (i.classification) {
      byDept[i.department].count++;
      if (i.classification.type === 'Hazardous') byDept[i.department].points += 20;
      else if (i.classification.type === 'Reusable') byDept[i.department].points += 15;
      else if (i.classification.type === 'Recyclable') byDept[i.department].points += 10;
    }
  });
  return (Object.entries(byDept) as [Dept, { count: number; points: number }][])
    .filter(([, stats]) => stats.count > 0)
    .sort((a, b) => b[1].points - a[1].points);
 }, [allItems, user?.email]);

    // User-specific points (same weighting as scoreboard)
    const userStats = useMemo(() => {
      if (!user?.email) return { basePoints: 0, weeklyBonus: 0, weeklyItems: 0, itemsReported: 0, progress: 0 };
      let basePoints = 0;
      let itemsReported = 0;
      let weeklyItems = 0;
      const now = Date.now();
      allItems.forEach(i => {
        if (i.createdBy === user.email) {
          itemsReported++;
            if (i.classification?.type === 'Hazardous') basePoints += 20;
            else if (i.classification?.type === 'Reusable') basePoints += 15;
            else if (i.classification?.type === 'Recyclable') basePoints += 10;
            if (i.createdAt) {
              const t = new Date(i.createdAt).getTime();
              const days = (now - t) / 86400000;
              if (days <= 7) weeklyItems++;
            }
        }
      });
      const weeklyBonus = weeklyItems * 5;
      const progress = Math.min(basePoints, 100); // progress now reflects base points (matches scoreboard logic)
  return { basePoints, weeklyBonus, weeklyItems, itemsReported, progress, totalPoints: basePoints + weeklyBonus };
    }, [allItems, user?.email]);

    // Poll periodically to keep scoreboard & user points fresh when items added elsewhere
    useEffect(() => {
      if (!isAuthenticated || !user?.email) return;
      const interval = setInterval(async () => {
        try {
          const [userRes, allRes] = await Promise.all([
            fetch(`/api/items?userEmail=${encodeURIComponent(user.email)}`),
            fetch(`/api/all-items`)
          ]);
          if (userRes.ok) {
            const ud = await userRes.json();
            setItems(Array.isArray(ud) ? ud : []);
          }
            if (allRes.ok) {
            const gd = await allRes.json();
            setAllItems(Array.isArray(gd) ? gd : []);
          }
        } catch (e) {
          // silent
        }
      }, 10000); // 10s
      return () => clearInterval(interval);
    }, [isAuthenticated, user?.email]);


 if (authLoading || loading) {
 return (
 <div className="flex items-center justify-center h-screen bg-gray-50">
  <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
 </div>
 );
}

 return (
  <SidebarProvider>
   <div className="min-h-screen w-screen bg-gray-50 flex overflow-x-hidden">
    <AppSidebar />
    <SidebarInset className="flex-1 w-full">
      <DashboardHeader />
      <main className={cn("flex-1 w-full p-4 md:p-6 space-y-6 md:space-y-8", styles.gradientScroll)}>
        <DashboardTabNav className="mb-4" />
        {/* Campaigns feature info box (matches scheduling/analytics style) */}
  <div className="mb-5 md:mb-6">
          <div className="rounded-2xl border border-gray-200 shadow-sm overflow-hidden bg-white">
            <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-purple-600 px-7 py-4">
              <h3 className="text-white font-semibold text-lg tracking-wide">User Engagement & Awareness</h3>
            </div>
            <div className="px-8 py-3">
              <ul className="list-disc pl-5 text-gray-500 text-sm leading-relaxed space-y-2">
                <li>Run campaigns, challenges, and collection drives.</li>
                <li>Green scoreboard across departments.</li>
                <li>Student participation incentives.</li>
              </ul>
            </div>
          </div>
        </div>
        {/* Feature info box */}
  <div className="mb-8 space-y-5 md:space-y-6">
          <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden bg-white p-4 sm:p-5 space-y-5 md:space-y-6">
            <h2 className="text-xl font-semibold">Green Challenge — Month</h2>
            <p className="text-sm text-muted-foreground max-w-3xl">Report e‑waste from your lab or department. Earn points for each verified item and climb the green scoreboard!</p>
            <div className="rounded-lg p-4 sm:p-5 text-white bg-gradient-to-r from-lime-500 via-emerald-500 to-teal-500">
              <p className="text-sm opacity-90">Current Reward Pool</p>
              <p className="text-2xl font-semibold">Campus Tree Drive</p>
              <p className="text-sm opacity-90">Top 3 departments win a sponsored sapling plantation drive.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div className="rounded-lg border p-3 sm:p-4">
                <p className="text-xs text-muted-foreground">Your Points</p>
                <p className="text-xl sm:text-2xl font-semibold mt-1">{userStats.totalPoints}</p>
                {userStats.weeklyBonus > 0 && (
                  <p className="text-[11px] sm:text-[12px] text-emerald-600 font-medium mt-1">Base {userStats.basePoints} + {userStats.weeklyBonus} weekly bonus ({userStats.weeklyItems} recent)</p>
                )}
                <div className="mt-2 h-2 rounded-full bg-gray-200 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all" style={{width: userStats.progress + '%'}} />
                </div>
              </div>
              <div className="rounded-lg border p-3 sm:p-4">
                <p className="text-xs text-muted-foreground">Goal</p>
                <p className="text-xl sm:text-2xl font-semibold mt-1">100</p>
                <p className="text-xs text-muted-foreground mt-1">Earn by reporting real items</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              {!joinedChallenge ? (
                <button
                  onClick={() => setJoinedChallenge(true)}
                  aria-pressed={joinedChallenge}
                  className="relative overflow-hidden bg-gradient-to-r from-emerald-500 via-teal-500 to-purple-600 hover:from-emerald-600 hover:via-teal-600 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] rounded-lg px-5 py-3 text-sm font-medium w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-emerald-300"
                >
                  <div className="relative z-10 flex items-center">
                    <span className="mr-2">🎁</span> 🚀 Join Challenge
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
                </button>
              ) : (
                <button
                  disabled
                  aria-pressed="true"
                  className="flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold w-full sm:w-auto cursor-default select-none
                    bg-gradient-to-r from-emerald-100 via-teal-100 to-purple-200 text-emerald-800 shadow-inner border border-emerald-200"
                >
                  <span className="text-lg">🎁</span>
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-emerald-500 text-white text-xs font-bold shadow">✓</span>
                  <span>Joined!</span>
                </button>
              )}
              <button
                className="relative overflow-hidden rounded-lg px-5 py-3 text-sm font-medium bg-white/90 backdrop-blur-sm transition-all duration-300 w-full sm:w-auto shadow-md hover:shadow-lg hover:scale-[1.02]"
                style={{
                  background: 'linear-gradient(white, white) padding-box, linear-gradient(90deg, #10b981, #8b5cf6) border-box',
                  border: '2px solid transparent'
                }}
              >
                <span className="relative z-10 bg-gradient-to-r from-emerald-600 to-purple-600 bg-clip-text text-transparent font-semibold">📊 View Real Stats</span>
              </button>
            </div>
  </div>

  </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5"/>
            {error}
          </div>
        )}

        {!error && (
          <>
            <section className="mb-10">
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
                <h2 className="text-base sm:text-lg font-semibold px-5 sm:px-6 pt-5">Department Scoreboard</h2>
                {scoreboard.length === 0 ? (
                  <p className="text-gray-600 px-5 sm:px-6 pb-5 pt-4 text-sm">No data yet.</p>
                ) : (
                  <ul className="mt-3 sm:mt-4 pb-4">
                    {scoreboard.map(([dept, stats], idx) => {
                      const DeptIcon = DEPT_ICONS[dept] || Users;
                      return (
                        <li key={dept} className="mx-4 sm:mx-6 mb-3 last:mb-0">
                          <div className="flex items-center justify-between p-3 sm:p-3 rounded-lg border bg-gradient-to-r from-blue-50/50 to-purple-50/50 hover:from-blue-100/70 hover:to-purple-100/70 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-md">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                {idx < 3 ? (
                                  <Medal className="w-4 h-4 text-amber-500" />
                                ) : (
                                  <span className="w-4 h-4" aria-hidden />
                                )}
                                <DeptIcon className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{dept}</p>
                                <p className="text-[11px] sm:text-xs text-muted-foreground">{stats.count} item{stats.count !== 1 && 's'}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-mono font-bold text-emerald-600 text-sm sm:text-base">{stats.points} pts</p>
                              <p className="text-[11px] sm:text-xs text-muted-foreground">#{idx + 1}</p>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>

            {/* <section ref={challengeRef}>
  <h2 className="text-xl sm:text-2xl font-bold mb-4">Active Campaigns</h2>
  {items.length === 0 ? (
   <p className="text-gray-600">No active campaigns.</p>
  ) : (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
   <motion.div initial={{ opacity: 100, y: 20 }} animate={challengeInView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.1 }}>
         <CampaignCard campaign={{ id: 1, name: "Green Challenge", department: "Campus-Wide", participants: items.length, imageUrl: "https://placehold.co/600x400/16a34a/ffffff?text=Green+Challenge", description: "Earn points for every e-waste item you report and help your department climb the leaderboard!" }} />
       </motion.div>
       <motion.div initial={{ opacity: 100, y: 20 }} animate={challengeInView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.2 }}>
         <CampaignCard campaign={{ id: 2, name: "Battery Bounty", department: "Campus-Wide", participants: items.filter(i => i.category === 'Battery').length, imageUrl: "https://placehold.co/600x400/ef4444/ffffff?text=Battery+Bounty", description: "Safely dispose of old batteries and earn bonus points. Every battery counts towards a cleaner campus." }} />
       </motion.div>
   </div>
  )}
  </section> */}
          </>
        )}
      </main>
    </SidebarInset>
   </div>
  </SidebarProvider>
);
}
