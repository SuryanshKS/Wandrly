"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Lock, User, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  
  // 1. Expanded State for Registration
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.SyntheticEvent) => {
    e.preventDefault(); 
    setIsLoading(true);
    setError("");

    try {
      // 2. Point to the register endpoint
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/users/register`, {
        name,
        email,
        password,
      });

      // 3. Store token and redirect
      const { token } = response.data;
      localStorage.setItem("wandrly_token", token);
      router.push("/dashboard");
      
    } catch (err: any) {
      setError(err.response?.data?.message || "Could not create account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4 relative overflow-hidden">
      {/* Ambient Orbs (Flipped colors for visual variety from Login) */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md z-10"
      >
        <Card className="border-zinc-200/50 shadow-xl backdrop-blur-sm bg-white/80 dark:bg-zinc-900/80">
          <CardHeader className="space-y-2 text-center pb-5">
            <CardTitle className="text-3xl font-bold tracking-tight">Create an account</CardTitle>
            <CardDescription className="text-base text-zinc-500">
              Start documenting your journeys with Wandrly
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleRegister}>
            <CardContent className="space-y-6 pb-6">
              
              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-200">
                  {error}
                </div>
              )}

              {/* NEW: Name Field */}
              <div className="space-y-3">
                <Label htmlFor="name" className="text-base">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                  <Input 
                    id="name" 
                    type="text" 
                    placeholder="Suryansh Kumar" 
                    className="pl-10 h-12 text-base"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="email" className="text-base">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
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
                <Label htmlFor="password" className="text-base">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••" 
                    className="pl-10 h-12 text-base"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col space-y-5 pt-6">
              <Button type="submit" className="w-full h-12 text-base font-medium group" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </Button>
              <div className="text-sm text-center text-zinc-500">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-zinc-900 underline underline-offset-4 hover:text-blue-600 transition-colors">
                  Sign in
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}