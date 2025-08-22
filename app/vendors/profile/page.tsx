"use client"

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, User, CheckCircle, XCircle, Upload, FileCheck2, AlertTriangle } from "lucide-react";
import type { Vendor } from "@/lib/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

// This is now the complete, self-contained page component.
// It assumes it will be rendered within the /vendors/layout.tsx,
// which provides the AuthContext, Sidebar, and Header.
export default function VendorProfilePage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // State for the edit form
  const [editForm, setEditForm] = useState({ name: '', contact: '' });

  // State for the fake file upload
  const [fileName, setFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchVendorProfile = async () => {
      // Ensure we have a user ID before fetching
      if (!user?._id) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        // --- FIX: Convert the user.id object to a string before sending it in the URL ---
         const response = await fetch(`/api/vendors/profile?vendorId=${user.id.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setVendor(data);
          setEditForm({ name: data.name, contact: data.contact || '' });
        } else {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to load your profile data.");
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    // Fetch data only after the main auth check is complete and we have a user
    if (!authLoading && isAuthenticated) {
      fetchVendorProfile();
    }
  }, [user, authLoading, isAuthenticated]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!vendor) return;

    try {
        const response = await fetch('/api/vendors/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vendorId: vendor._id, ...editForm }),
        });
        const data = await response.json();
        if (response.ok) {
            setMessage({ type: 'success', text: data.message });
            setVendor(data.vendor);
        } else {
            throw new Error(data.message);
        }
    } catch (err: any) {
        setMessage({ type: 'error', text: err.message });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        setFileName(file.name);
        setIsUploading(true);
        setMessage(null);
        // Simulate an upload process that takes 2 seconds
        setTimeout(() => {
            setIsUploading(false);
            setMessage({ type: 'success', text: `"${file.name}" has been submitted for verification.` });
        }, 2000);
    }
  };

  // The main loading state covers both auth and data fetching
  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-80px)]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 md:p-6 text-center text-red-600">
        <AlertTriangle className="mx-auto h-12 w-12 mb-4" />
        <h3 className="text-lg font-medium mb-2">Could not load profile</h3>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account details and certification status.
        </p>
      </header>
      
      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className={`mb-6 ${message.type === 'success' ? 'bg-green-100 border-green-300 text-green-800' : ''}`}>
            <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name</Label>
                <Input id="name" value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact">Contact Info (Email/Phone)</Label>
                <Input id="contact" value={editForm.contact} onChange={(e) => setEditForm({...editForm, contact: e.target.value})} />
              </div>
              <Button type="submit">Save Changes</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Certification Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={cn('flex items-center gap-3 p-4 rounded-md', vendor?.certified ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800')}>
              {vendor?.certified ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
              <div>
                <p className="font-semibold">{vendor?.certified ? "Verified Recycler" : "Verification Pending"}</p>
                <p className="text-sm">{vendor?.certified ? "You are eligible to bid on all items." : "Please upload your certification for review."}</p>
              </div>
            </div>
            
            {!vendor?.certified && (
                <div className="pt-4 border-t">
                    <Label htmlFor="certificate-upload" className="font-semibold">Upload Certificate</Label>
                    <p className="text-xs text-muted-foreground mb-2">Submit your official e-waste recycling certificate (PDF, JPG, PNG).</p>
                    <input type="file" id="certificate-upload" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept=".pdf,.jpg,.jpeg,.png"/>
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                        <Upload className="w-4 h-4 mr-2"/>
                        {isUploading ? "Uploading..." : "Choose File"}
                    </Button>
                    {fileName && !isUploading && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                            <FileCheck2 size={16}/>
                            <span>{fileName}</span>
                        </div>
                    )}
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
