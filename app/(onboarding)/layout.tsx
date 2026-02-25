export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Minimal header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/60 bg-white/80 backdrop-blur-sm">
        <span className="font-black text-indigo-700 text-xl tracking-tight">kyra</span>
        <a href="/agency" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
          Skip setup →
        </a>
      </div>
      <main className="flex items-center justify-center min-h-[calc(100vh-65px)] p-4">
        {children}
      </main>
    </div>
  );
}
