"use client"

import { createContext } from "vm"
import { jwtVerify, SignJWT } from "jose"
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import React from "react"

export type AuthUser = {
  id: string
  email: string
  name?: string
}

type AuthContextType = {
  user: AuthUser | null
  token: string | null
  loading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ ok: true, user: AuthUser } | { ok: false; message: string }>
  signup: (name: string, email: string, password: string) => Promise<{ ok: true } | { ok: false; message: string }>
  logout: () => void
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined)

const AUTH_STORAGE_KEY = "ew:auth_token"

// This secret should ideally be an environment variable for security
const SECRET = new TextEncoder().encode(
  process.env.NEXT_PUBLIC_JWT_SECRET || "DEMO_ONLY_CHANGE_ME_32+_BYTES_SECRET_FOR_JWT_SIGNING_2025_EWASTE"
)

async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as AuthUser
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null)
  const [token, setToken] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)

  // --- Initialize auth state from token in localStorage ---
  React.useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem(AUTH_STORAGE_KEY)
      if (storedToken) {
        const verifiedUser = await verifyToken(storedToken)
        if (verifiedUser) {
          setUser(verifiedUser)
          setToken(storedToken)
        } else {
          localStorage.removeItem(AUTH_STORAGE_KEY)
        }
      }
      setLoading(false)
    }
    initializeAuth()
  }, [])

  // --- UPDATED LOGIN FUNCTION ---
  const login = React.useCallback(async (email: string, password: string) => {
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { ok: false as const, message: data.message || "Login failed." };
      }
      
      // On successful login, the API returns a user object and a token
      const { user: loggedInUser, token: newToken } = data;
      
      setUser(loggedInUser);
      setToken(newToken);
      localStorage.setItem(AUTH_STORAGE_KEY, newToken);

      return { ok: true as const, user: loggedInUser };

    } catch (error) {
      console.error("Login API call failed:", error);
      return { ok: false as const, message: "A network error occurred." };
    }
  }, []);

  // --- UPDATED SIGNUP FUNCTION ---
  const signup = React.useCallback(async (name: string, email: string, password: string) => {
    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { ok: false as const, message: data.message || "Signup failed." };
      }
      
      // After successful signup, automatically log the user in
      await login(email, password);

      return { ok: true as const };
    } catch (error) {
      console.error("Signup API call failed:", error);
      return { ok: false as const, message: "A network error occurred." };
    }
  }, [login]);

  const logout = React.useCallback(() => {
    setUser(null)
    setToken(null)
    localStorage.removeItem(AUTH_STORAGE_KEY)
  }, [])

  const value = React.useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: !!user && !!token,
      login,
      signup,
      logout,
    }),
    [user, token, loading, login, signup, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
