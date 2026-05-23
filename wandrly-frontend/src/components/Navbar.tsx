"use client";
import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/70 border-b border-zinc-100">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-emerald-600">Wandrly</Link>
        <div className="flex gap-6 items-center">
          <Link href="/login" className="text-sm font-medium text-zinc-600 hover:text-emerald-600 transition">Login</Link>
          <Link href="/register" className="text-sm font-medium bg-zinc-900 text-white px-5 py-2 rounded-full hover:bg-zinc-800 transition">
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}