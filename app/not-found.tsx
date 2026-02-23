import Link from 'next/link';
import { Zap } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center px-4">
      <div className="text-center max-w-lg">
        <div className="flex items-center justify-center gap-2 font-black text-2xl mb-8">
          <Zap className="h-6 w-6 text-indigo-400" />
          Kyra
        </div>
        <h1 className="text-6xl font-black text-indigo-400 mb-4">404</h1>
        <h2 className="text-2xl font-bold mb-3">Page not found</h2>
        <p className="text-slate-400 mb-8">This page doesn&apos;t exist. Maybe the AI ate it.</p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl transition">
            Go Home
          </Link>
          <Link href="/try/dental" className="bg-white/10 hover:bg-white/15 border border-white/10 text-white px-6 py-3 rounded-xl transition text-sm">
            Try Live Demo
          </Link>
        </div>
      </div>
    </div>
  );
}
