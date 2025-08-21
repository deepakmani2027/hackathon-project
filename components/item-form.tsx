"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { PlusCircle, Upload, Camera } from 'lucide-react'
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

  // AI image recognition states
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])
  const [matchedLabelInfo, setMatchedLabelInfo] = useState<{category: string|null, department: string|null}>({category: null, department: null})
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const { ref, isInView } = useScrollAnimation()

  async function submit() {
    if (!name.trim()) {
      setError("Item name is required.");
      return;
    }
    
    if (!user?.email) {
      setError("You must be logged in to add an item.");
      return;
    }
    
    setError(null);
    setPending(true);

    try {
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
          createdBy: user.email,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to add item.");
      }

      // Reset form
      setName("")
      setDepartment("Engineering")
      setCategory("Computer")
      setAgeMonths(12)
      setCondition("Fair")
      setNotes("")
      setAiSuggestions([])
      setMatchedLabelInfo({category: null, department: null})
      setPreviewUrl(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      
      refreshItems();

    } catch (err: any) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  // AI image recognition handler using Imagga API
  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    setAiError(null);
    setAiLoading(true);
    setAiSuggestions([]);
    setMatchedLabelInfo({category: null, department: null});
    
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      
      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setAiError("Image size must be less than 5MB");
        return;
      }
      
      // Create preview
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      
      // Create form data for Imagga API
      const formData = new FormData();
      formData.append('image', file);
      
      // Use the correct API credentials
      const apiKey = 'acc_ecdcac04b616eb7';
      const apiSecret = '7ef947c769332701aed7df794108bf8a';
      const authHeader = 'Basic ' + btoa(`${apiKey}:${apiSecret}`);
      
      // Call Imagga API for image tagging with proper authentication
      const response = await fetch('https://api.imagga.com/v2/tags', {
        method: 'POST',
        headers: {
          'Authorization': authHeader
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Imagga API error: ${response.status} ${response.statusText}. ${errorText}`);
      }
      
      const data = await response.json();
      
      if (data.result && data.result.tags) {
        const tags = data.result.tags;
        
        // Enhanced mapping with more synonyms and related terms
        const categoryMap: { [key: string]: Category } = {
          // Computers
          "computer": "Computer",
          "laptop": "Computer",
          "desktop": "Computer",
          "pc": "Computer",
          "notebook": "Computer",
          "monitor": "Computer",
          "screen": "Computer",
          "cpu": "Computer",
          "workstation": "Computer",
          "server": "Computer",
          "macbook": "Computer",
          "imac": "Computer",
          "chromebook": "Computer",
          "lenovo": "Computer",
          "dell": "Computer",
          "hp": "Computer",
          "asus": "Computer",
          "acer": "Computer",
          "toshiba": "Computer",
          
          // Projectors
          "projector": "Projector",
          "beamer": "Projector",
          "epson": "Projector",
          "benq": "Projector",
          "optoma": "Projector",
          "sharp": "Projector",
          "nec": "Projector",
          
          // Mobile Devices
          "phone": "Mobile Device",
          "smartphone": "Mobile Device",
          "mobile": "Mobile Device",
          "cellphone": "Mobile Device",
          "tablet": "Mobile Device",
          "ipad": "Mobile Device",
          "iphone": "Mobile Device",
          "samsung": "Mobile Device",
          "galaxy": "Mobile Device",
          "oppo": "Mobile Device",
          "vivo": "Mobile Device",
          "realme": "Mobile Device",
          "oneplus": "Mobile Device",
          "xiaomi": "Mobile Device",
          "nokia": "Mobile Device",
          "google pixel": "Mobile Device",
          "android": "Mobile Device",
          
          // Batteries
          "battery": "Battery",
          "powerbank": "Battery",
          "accumulator": "Battery",
          "lithium": "Battery",
          "ion battery": "Battery",
          "cell battery": "Battery",
          "aa battery": "Battery",
          "aaa battery": "Battery",
          
          // Accessories
          "charger": "Accessory",
          "cable": "Accessory",
          "wire": "Accessory",
          "mouse": "Accessory",
          "keyboard": "Accessory",
          "speaker": "Accessory",
          "printer": "Accessory",
          "scanner": "Accessory",
          "webcam": "Accessory",
          "pendrive": "Accessory",
          "usb": "Accessory",
          "harddisk": "Accessory",
          "ssd": "Accessory",
          "hdd": "Accessory",
          "headphone": "Accessory",
          "headset": "Accessory",
          "adapter": "Accessory",
          "router": "Accessory",
          "switch": "Accessory",
          "modem": "Accessory",
          
          // Lab Equipment
          "equipment": "Lab Equipment",
          "lab": "Lab Equipment",
          "instrument": "Lab Equipment",
          "multimeter": "Lab Equipment",
          "oscilloscope": "Lab Equipment",
          "analyzer": "Lab Equipment",
          "microscope": "Lab Equipment",
          "centrifuge": "Lab Equipment",
          "spectrometer": "Lab Equipment",
          "transformer": "Lab Equipment",
          "generator": "Lab Equipment",
          "oscillator": "Lab Equipment",
          "power supply": "Lab Equipment",
        };
        
        const departmentMap: { [key: string]: Department } = {
          // Science/Engineering
          "lab": "Sciences",
          "science": "Sciences",
          "scientific": "Sciences",
          "physics": "Sciences",
          "chemistry": "Sciences",
          "biology": "Sciences",
          "engineering": "Engineering",
          "engineer": "Engineering",
          "technical": "Engineering",
          "technology": "Engineering",
          "computer": "Engineering",
          "electronic": "Engineering",
          "electrical": "Engineering",
          "mechanical": "Engineering",
          "civil": "Engineering",
          "software": "Engineering",
          "hardware": "Engineering",
          "it": "Engineering",
          "programming": "Engineering",
          
          // Admin/office
          "admin": "Administration",
          "administration": "Administration",
          "office": "Administration",
          "staff": "Administration",
          "management": "Administration",
          "account": "Administration",
          "finance": "Administration",
          "hr": "Administration",
          "human resources": "Administration",
          
          // Hostel
          "hostel": "Hostel",
          "dorm": "Hostel",
          "dormitory": "Hostel",
          "residence": "Hostel",
          "room": "Hostel",
          "bed": "Hostel",
          "mattress": "Hostel",
          "furniture": "Hostel",
          
          // Humanities
          "humanities": "Humanities",
          "arts": "Humanities",
          "art": "Humanities",
          "literature": "Humanities",
          "language": "Humanities",
          "history": "Humanities",
          "philosophy": "Humanities",
          "psychology": "Humanities",
          "sociology": "Humanities",
          "music": "Humanities",
          "drama": "Humanities",
          "theater": "Humanities",
        };
        
        let detectedCategory: Category = "Other";
        let detectedDepartment: Department = "Other";
        let bestCategoryScore = 0;
        let bestDepartmentScore = 0;
        let bestCategoryLabel = "";
        let bestDepartmentLabel = "";
        
        // Process tags for category and department detection
        for (const tag of tags) {
          const tagName = tag.tag.en.toLowerCase();
          const confidence = tag.confidence;
          
          // Check for category matches
          for (const key in categoryMap) {
            if (tagName.includes(key) && confidence > bestCategoryScore) {
              detectedCategory = categoryMap[key];
              bestCategoryScore = confidence;
              bestCategoryLabel = tag.tag.en;
            }
          }
          
          // Check for department matches
          for (const key in departmentMap) {
            if (tagName.includes(key) && confidence > bestDepartmentScore) {
              detectedDepartment = departmentMap[key];
              bestDepartmentScore = confidence;
              bestDepartmentLabel = tag.tag.en;
            }
          }
        }
        
        // Update form fields
        setCategory(detectedCategory);
        setDepartment(detectedDepartment);
        
        // Set item name based on detected tags if available
        if (tags.length > 0 && !name) {
          // Use the most confident tag as the name
          setName(tags[0].tag.en);
        }
        
        // Show top 3 tag suggestions to user
        setAiSuggestions(tags.slice(0, 3).map(t => `${t.tag.en} (${t.confidence.toFixed(0)}%)`));
        
        // Show matched tag/confidence for transparency
        setMatchedLabelInfo({
          category: detectedCategory !== "Other" ? `${bestCategoryLabel} (${bestCategoryScore.toFixed(0)}%)` : null,
          department: detectedDepartment !== "Other" ? `${bestDepartmentLabel} (${bestDepartmentScore.toFixed(0)}%)` : null
        });
      } else {
        throw new Error("No tags found in the response");
      }
      
    } catch (err: any) {
      console.error("AI recognition error:", err);
      setAiError(err.message || "AI recognition is temporarily unavailable. Please enter details manually.");
    } finally {
      setAiLoading(false);
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

        {/* Image upload and AI recognition */}
        <div className="grid gap-3">
          <Label htmlFor="item-image" className="text-lg font-semibold flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Item Image (AI Recognition)
          </Label>
          
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 transition-colors hover:border-emerald-500">
            {previewUrl ? (
              <div className="mb-4 relative">
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="max-h-48 rounded-md object-contain"
                />
                <button 
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                  onClick={() => {
                    setPreviewUrl(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  ×
                </button>
              </div>
            ) : (
              <Upload className="w-12 h-12 text-gray-400 mb-4" />
            )}
            
            <Input
              id="item-image"
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleImageChange}
              disabled={aiLoading || pending}
              className="hidden"
            />
            
            <Label 
              htmlFor="item-image" 
              className={`cursor-pointer px-4 py-2 rounded-md ${aiLoading ? 'bg-gray-400' : 'bg-emerald-600 hover:bg-emerald-700'} text-white flex items-center gap-2`}
            >
              {aiLoading ? 'Analyzing...' : 'Upload Image'}
            </Label>
            
            <p className="text-sm text-gray-500 mt-2">
              Upload a clear photo of the item for AI recognition
            </p>
          </div>
          
          {aiLoading && (
            <div className="flex items-center justify-center gap-2 text-blue-600">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span>Analyzing image...</span>
            </div>
          )}
          
          {aiError && (
            <Alert variant="destructive" className="my-2">
              <AlertDescription>{aiError}</AlertDescription>
            </Alert>
          )}
          
          {aiSuggestions.length > 0 && (
            <div className="text-sm text-gray-700 mt-2 p-3 bg-gray-50 rounded-md">
              <span className="font-medium">AI detected: </span>
              {aiSuggestions.map((s, i) => (
                <span key={i} className="inline-block bg-gray-200 rounded px-2 py-1 mr-2 mb-1">{s}</span>
              ))}
            </div>
          )}
          
          {(matchedLabelInfo.category || matchedLabelInfo.department) && (
            <Alert className="bg-emerald-50 border-emerald-200 mt-2">
              <AlertDescription className="text-emerald-800">
                {matchedLabelInfo.category && <div className="font-medium">Suggested category: {matchedLabelInfo.category}</div>}
                {matchedLabelInfo.department && <div className="font-medium">Suggested department: {matchedLabelInfo.department}</div>}
              </AlertDescription>
            </Alert>
          )}
        </div>
        
        <div className="grid gap-3">
          <Label htmlFor="name" className="text-lg font-semibold">Item Name</Label>
          <Input 
            id="name" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            placeholder="e.g. HP EliteBook 840 G5" 
            disabled={pending}
            className="py-2 px-4 text-lg"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="grid gap-3">
            <Label className="text-lg font-semibold">Department</Label>
            <Select value={department} onValueChange={(v: Department) => setDepartment(v)} disabled={pending}>
              <SelectTrigger className="py-2 px-4 text-lg h-12">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {["Engineering","Sciences","Humanities","Administration","Hostel","Other"].map((d) => (
                  <SelectItem key={d} value={d} className="text-lg py-2">{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-3">
            <Label className="text-lg font-semibold">Category</Label>
            <Select value={category} onValueChange={(v: Category) => setCategory(v)} disabled={pending}>
              <SelectTrigger className="py-2 px-4 text-lg h-12">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {["Computer","Projector","Lab Equipment","Mobile Device","Battery","Accessory","Other"].map((c) => (
                  <SelectItem key={c} value={c} className="text-lg py-2">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="grid gap-3">
            <Label htmlFor="age" className="text-lg font-semibold">Age (months)</Label>
            <Input 
              id="age" 
              type="number" 
              min={0} 
              value={ageMonths} 
              onChange={(e) => setAgeMonths(Number(e.target.value))} 
              disabled={pending}
              className="py-2 px-4 text-lg"
            />
          </div>
          
          <div className="grid gap-3">
            <Label className="text-lg font-semibold">Condition</Label>
            <Select value={condition} onValueChange={(v: any) => setCondition(v)} disabled={pending}>
              <SelectTrigger className="py-2 px-4 text-lg h-12">
                <SelectValue placeholder="Condition" />
              </SelectTrigger>
              <SelectContent>
                {["Good","Fair","Poor","Dead"].map((c) => (
                  <SelectItem key={c} value={c} className="text-lg py-2">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="grid gap-3">
          <Label htmlFor="notes" className="text-lg font-semibold">Notes</Label>
          <Textarea 
            id="notes" 
            rows={4} 
            value={notes} 
            onChange={(e) => setNotes(e.target.value)} 
            placeholder="Model number, serial number, specific issues, hazards, etc." 
            disabled={pending}
            className="py-2 px-4 text-lg"
          />
        </div>
        
        <Button 
          className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-purple-600 text-white border-0 py-3 text-lg font-semibold mt-4" 
          onClick={submit} 
          disabled={pending || aiLoading}
        >
          <PlusCircle className="w-5 h-5 mr-2" />
          {pending ? 'Adding Item...' : 'Add Item'}
        </Button>
      </CardContent>
    </Card>
  )
}