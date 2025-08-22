// Route: /signup  (Signup Page)
"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { AuthProvider, useAuth } from "@/components/auth/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DotLottieReact } from '@lottiefiles/dotlottie-react'

export default function SignupPage() {
  // Wrap the screen with AuthProvider so descendants can use useAuth
  return (
    <AuthProvider>
      <SignupScreen />
    </AuthProvider>
  )
}

function SignupScreen() {
  // We can still use useAuth for checking if a user is already logged in
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [role, setRole] = useState<'user' | 'admin' | 'vendor'>('user') // New state for role
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  // If already authenticated, send to home
  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace("/")
    }
  }, [loading, isAuthenticated, router])

  // --- UPDATED SUBMIT FUNCTION ---
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError("Passwords do not match")
      return
    }
    setPending(true)

    try {
      // Send a POST request to our new API endpoint
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password, role }), // Include role in the request body
      });

      const data = await response.json();

      if (response.ok) {
        // --- REDIRECTION ON SUCCESS ---
        // Redirect to the login page with a query parameter to show a success message.
        router.push('/login?signup=success');
      } else {
        // If the server responds with an error, display it
        setError(data.message || 'An unexpected error occurred.');
      }
    } catch (err) {
      // Handle network errors or other exceptions
      setError('Failed to connect to the server. Please try again.');
      console.error('Signup fetch error:', err);
    } finally {
      setPending(false)
    }
  }

  /*
  --- HOW TO SHOW THE POP-UP ON YOUR LOGIN PAGE ---

  On your login page (e.g., /login), you would use the `useSearchParams` hook from Next.js
  to check for the 'signup=success' query parameter.

  Here's an example of what you'd add to your LoginPage component:

  import { useSearchParams } from 'next/navigation';
  import { useEffect, useState } from 'react';

  function LoginPage() {
    const searchParams = useSearchParams();
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
      if (searchParams.get('signup') === 'success') {
        setShowSuccess(true);
        // Optional: clear the message after a few seconds
        const timer = setTimeout(() => setShowSuccess(false), 5000);
        return () => clearTimeout(timer);
      }
    }, [searchParams]);

    return (
      <div>
        {showSuccess && (
          <Alert variant="success">
            <AlertDescription>Account Created. Please log in.</AlertDescription>
          </Alert>
        )}
        // ... rest of your login form ...
      </div>
    );
  }
  */

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(120deg, #a7f3d0 0%, #6d28d9 100%)' }}>
      <div className="max-w-[85%] container mx-auto flex min-h-screen items-center justify-center">
        {/* Left Side - Lottie Animation */}
        <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12">
          <div className="max-w-lg w-full">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-green-800 via-blue-800 to-purple-800 bg-clip-text text-transparent drop-shadow-2xl">
                Join E-Waste Portal
              </h1>
              <p className="text-xl text-gray-900 drop-shadow-lg font-bold tracking-wide bg-white/30 backdrop-blur-sm rounded-lg px-4 py-2">
                Start your sustainable technology journey today
              </p>
            </div>
            
            <div className="relative">
              <div>
                <DotLottieReact
                  src="https://lottie.host/ffab00a3-218e-4a6d-9634-6e38df3afa52/wi6M52EjDk.lottie"
                  loop
                  autoplay
                  className="w-full h-96"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Signup Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            {/* Mobile Logo */}
            <div className="lg:hidden text-center mb-8">
              <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-emerald-700 to-purple-800 bg-clip-text text-transparent drop-shadow-lg">
                E-Waste Portal
              </h1>
              <p className="text-gray-900 drop-shadow-md font-bold tracking-wider bg-white/40 backdrop-blur-sm rounded-lg px-3 py-1">Create your account</p>
            </div>

            <Card className="relative border-white/30 bg-white/20 backdrop-blur-lg text-gray-800 overflow-hidden shadow-2xl">
              {/* Card Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-white/10 opacity-50"></div>
              
              <CardHeader className="relative space-y-1 text-center">
                <CardTitle className="text-2xl font-bold text-black">
                  Create Account
                </CardTitle>
                <p className="text-black font-semibold text-lg tracking-wide">
                  Join the campus e‑waste initiative
                </p>
              </CardHeader>
              
              <CardContent className="relative">
                <form onSubmit={onSubmit} className="space-y-6">
                  {error && (
                    <Alert variant="destructive" className="bg-red-100 border-red-300 text-red-800">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-gray-800 font-medium">
                      Full Name
                    </Label>
                    <div className="relative">
                      <Input
                        id="name"
                        placeholder="Deepak Mani"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="bg-white/50 border-white/50 text-gray-800 placeholder:text-gray-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 h-12 transition-all duration-300 hover:bg-white/70"
                      />
                      <div className="absolute inset-0 rounded-md bg-gradient-to-r from-blue-500/0 via-blue-500/0 to-blue-500/0 hover:from-blue-500/10 hover:to-purple-500/10 transition-all duration-300 pointer-events-none"></div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-800 font-medium">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Input
                        id="email"
                        type="email"
                        placeholder="xyz@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="bg-white/50 border-white/50 text-gray-800 placeholder:text-gray-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 h-12 transition-all duration-300 hover:bg-white/70"
                      />
                      <div className="absolute inset-0 rounded-md bg-gradient-to-r from-blue-500/0 via-blue-500/0 to-blue-500/0 hover:from-blue-500/10 hover:to-purple-500/10 transition-all duration-300 pointer-events-none"></div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-gray-800 font-medium">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="bg-white/50 border-white/50 text-gray-800 placeholder:text-gray-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 h-12 transition-all duration-300 hover:bg-white/70"
                      />
                      <div className="absolute inset-0 rounded-md bg-gradient-to-r from-blue-500/0 via-blue-500/0 to-blue-500/0 hover:from-blue-500/10 hover:to-purple-500/10 transition-all duration-300 pointer-events-none"></div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm" className="text-gray-800 font-medium">
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirm"
                        type="password"
                        placeholder="••••••••"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        required
                        className="bg-white/50 border-white/50 text-gray-800 placeholder:text-gray-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 h-12 transition-all duration-300 hover:bg-white/70"
                      />
                      <div className="absolute inset-0 rounded-md bg-gradient-to-r from-blue-500/0 via-blue-500/0 to-blue-500/0 hover:from-blue-500/10 hover:to-purple-500/10 transition-all duration-300 pointer-events-none"></div>
                    </div>
                  </div>

                  {/* Role Selection Dropdown */}
                  <div className="space-y-2">
                    <Label htmlFor="role" className="text-gray-800 font-medium">
                      Account Type
                    </Label>
                    <Select value={role} onValueChange={(value: 'user' | 'admin' | 'vendor') => setRole(value)} disabled={pending}>
                      <SelectTrigger className="bg-white/50 border-white/50 text-gray-800 placeholder:text-gray-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 h-12 transition-all duration-300 hover:bg-white/70">
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="vendor">Vendor</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-gradient-to-r from-blue-600 via-purple-600 to-green-600 hover:from-blue-700 hover:via-purple-700 hover:to-green-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-blue-500/25 transition-all duration-300 transform hover:scale-[1.02] relative overflow-hidden group"
                    disabled={pending}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                    <span className="relative">
                      {pending ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span>Creating...</span>
                        </div>
                      ) : (
                        'Create Account'
                      )}
                    </span>
                  </Button>
                </form>

                <div className="mt-8 text-center">
                  <p className="text-gray-700">
                    Already have an account?{' '}
                    <Link 
                      href="/login" 
                      className="font-semibold text-blue-600 hover:text-blue-800 transition-colors duration-300 hover:underline"
                    >
                      Sign in
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
