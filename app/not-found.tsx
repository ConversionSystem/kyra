import Link from 'next/link';
import { Zap } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-lg">
        <div className="flex items-center justify-center gap-2 font-black text-2xl mb-8 text-gray-900">
          <Zap className="h-6 w-6 text-blue-600" />
          Kyra
        </div>
        <h1 className="text-7xl font-black text-blue-600/20 mb-2">404</h1>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Page not found</h2>
        <p className="text-gray-500 mb-8">This page doesn&apos;t exist. Maybe the AI ate it.</p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl transition">
            Go Home
          </Link>
          <Link href="/try/dental" className="bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 px-6 py-3 rounded-xl transition text-sm shadow-sm">
            Try Live Demo
          </Link>
        </div>
      </div>
    </div>
  );
}
