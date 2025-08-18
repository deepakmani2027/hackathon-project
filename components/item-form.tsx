"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { PlusCircle } from 'lucide-react'
import { useScrollAnimation } from "@/hooks/use-scroll-animation"
import type { AuthUser } from "./auth/auth-context"
import { Alert, AlertDescription } from "@/components/ui/alert"

export type Department = "Engineering" | "Sciences" | "Humanities" | "Administration" | "Hostel" | "Other"
export type Category =
  | "Computer"
  | "Projector"
  | "Lab Equipment"
  | "Mobile Device"
  | "Battery"
  | "Accessory"
  | "Other"

// --- FIX: Updated the component's props to accept 'user' and 'refreshItems' ---
export default function ItemForm({
  refreshItems,
  user,
}: {
  refreshItems: () => void;
  user: AuthUser | null;
}) {
  const [name, setName] = useState("")
  const [department, setDepartment] = useState<Department>("Engineering")
  const [category, setCategory] = useState<Category>("Computer")
  const [ageMonths, setAgeMonths] = useState(12)
  const [condition, setCondition] = useState<"Good" | "Fair" | "Poor" | "Dead">("Fair")
  const [notes, setNotes] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { ref, isInView } = useScrollAnimation()

  async function submit() {
    if (!name.trim()) {
      setError("Item name is required.");
      return;
    }
    // --- FIX: Check if a user is logged in before submitting ---
    if (!user?.email) {
      setError("You must be logged in to add an item.");
      return;
    }
    setError(null);
    setPending(true);

    try {
      // --- FIX: Add 'createdBy' field to the request body using the user prop ---
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          department,
          category,
          ageMonths: Number(ageMonths),
          condition,
          notes,
          createdBy: user.email, // Include the user's email
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to add item.");
      }

      // --- Clear form on success ---
      setName("")
      setAgeMonths(12)
      setCondition("Fair")
      setNotes("")
      
      // --- Tell the parent component to refresh the item list ---
      refreshItems();

    } catch (err: any) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Card 
      ref={ref as any}
      className={`mt-4 transition-all duration-700 ease-out ${
        isInView 
          ? 'opacity-100 translate-y-0 scale-100' 
          : 'opacity-0 translate-y-8 scale-95'
      }`}
    >
      <CardHeader>
        <CardTitle>Add E‑Waste Item</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
            <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}
        
        <div className="grid gap-3">
          <Label htmlFor="name">Item name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. HP EliteBook 840" />
        </div>
        <div className="grid gap-3">
          <Label>Department</Label>
          <Select value={department} onValueChange={(v: Department) => setDepartment(v)}>
            <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
            <SelectContent>
              {["Engineering","Sciences","Humanities","Administration","Hostel","Other"].map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-3">
          <Label>Category</Label>
          <Select value={category} onValueChange={(v: Category) => setCategory(v)}>
            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>
              {["Computer","Projector","Lab Equipment","Mobile Device","Battery","Accessory","Other"].map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-3">
            <Label htmlFor="age">Age (months)</Label>
            <Input id="age" type="number" min={0} value={ageMonths} onChange={(e) => setAgeMonths(Number(e.target.value))} />
          </div>
          <div className="grid gap-3">
            <Label>Condition</Label>
            <Select value={condition} onValueChange={(v: any) => setCondition(v)}>
              <SelectTrigger><SelectValue placeholder="Condition" /></SelectTrigger>
              <SelectContent>
                {["Good","Fair","Poor","Dead"].map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-3">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Model, serial, hazards, etc." />
        </div>
        <Button className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-purple-600 text-white border-0" onClick={submit} disabled={pending}>
          <PlusCircle className="w-4 h-4 mr-2" />
          {pending ? 'Adding...' : 'Add Item'}
        </Button>
      </CardContent>
    </Card>
  )
}
