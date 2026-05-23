"use client";
//as we will be using animations and capturing form inputs we make it a client side rendering component

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // FIXED: Swapped to React.SyntheticEvent to clear the deprecation warning
  const handleLogin = async (e: React.SyntheticEvent) => {
    e.preventDefault(); 
    setIsLoading(true);
    setError("");

    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/users/login`, {
        email,
        password,
      });

      const { token } = response.data;
      localStorage.setItem("wandrly_token", token);
      router.push("/dashboard");
      
    } catch (err: any) {
      // Widen the net to catch 'message', 'error', or fallback to the generic string
      const backendError = err.response?.data?.message || err.response?.data?.error || "Invalid credentials. Please try again.";
      setError(backendError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md z-10"
      >
        <Card className="border-zinc-200/50 shadow-xl backdrop-blur-sm bg-white/80 dark:bg-zinc-900/80">
          <CardHeader className="space-y-2 text-center pb-4">
            <CardTitle className="text-3xl font-bold tracking-tight">Welcome back</CardTitle>
            <CardDescription className="text-base text-zinc-500">
              Enter your credentials to access your Wandrly dashboard
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-6 pb-2">
              
              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-200">
                  {error}
                </div>
              )}

              <div className="space-y-3">
                <Label htmlFor="email" className="text-base">Email</Label>
                <div className="relative">
                  {/* FIXED: Vertically centered icon */}
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                  {/* FIXED: Taller input, larger text */}
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="suryansh@example.com" 
                    className="pl-10 h-12 text-base"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-base">Password</Label>
                  {/* FIXED: Premium subtle link hover state */}
                  <Link href="#" className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  {/* FIXED: Vertically centered icon */}
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••" 
                    className="pl-10 h-12 text-base"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            </CardContent>
            {/* FIXED: Added pt-4 to create breathing room above the button */}
            <CardFooter className="flex flex-col space-y-5 pt-4">
              <Button type="submit" className="w-full h-12 text-base font-medium group" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </Button>
              <div className="text-sm text-center text-zinc-500">
                Don't have an account?{" "}
                {/* FIXED: bolder create link with subtle underline offset */}
                <Link href="/register" className="font-semibold text-zinc-900 underline underline-offset-4 hover:text-blue-600 transition-colors">
                  Create one
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}