"use client";
import { motion } from "framer-motion";
import { Calculator, ShieldCheck, MapPin } from "lucide-react";
import Navbar from "@/components/Navbar";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section */}
      <section className="py-24 px-6 text-center">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-5xl md:text-7xl font-bold tracking-tight text-zinc-900 mb-6"
        >
          Travel Smarter, <br />
          <span className="text-emerald-600">Together.</span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-xl text-zinc-600 max-w-2xl mx-auto mb-10"
        >
          Manage expenses, itineraries, and collaborative planning so you can focus on the memories, not the math.
        </motion.p>
      </section>

      {/* Feature Grid */}
      <section className="py-20 bg-zinc-50 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
          {[
            { icon: Calculator, title: "Smart Splitting", desc: "Automated debt settlement using our custom greedy algorithm." },
            { icon: ShieldCheck, title: "Secure Payments", desc: "Razorpay-backed transactions with HMAC verification." },
            { icon: MapPin, title: "Dynamic Itineraries", desc: "Real-time updates and location-aware trip planning." }
          ].map((feature, i) => (
            <motion.div 
              key={i} 
              whileHover={{ y: -5 }}
              className="p-8 bg-white rounded-2xl border border-zinc-100 shadow-sm"
            >
              <feature.icon className="h-8 w-8 text-emerald-600 mb-4" />
              <h3 className="text-lg font-semibold mb-3">{feature.title}</h3>
              <p className="text-zinc-600 text-sm">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </main>
  );
}