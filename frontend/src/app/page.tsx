import Link from 'next/link';
import { CheckCircle2, ArrowRight, ShieldCheck, Zap, Layers, Users } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Navigation Bar */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-sm shadow-indigo-200">
              H
            </div>
            <span className="font-semibold text-lg tracking-tight text-slate-900">
              Hairdrama Task Manager
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 px-3.5 py-2 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-lg shadow-sm transition-colors"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-medium mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
          Phase 1 Initialized — Next.js & Flask Stack
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 max-w-3xl leading-[1.15]">
          Collaborative Task Management with{' '}
          <span className="text-indigo-600">Enterprise Rigor</span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl leading-relaxed">
          Streamline your team&apos;s workflow with granular assignment, real-time activity auditing, and rigorous backend authorization built on Next.js, Flask, and Supabase.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-all text-sm"
          >
            Launch Dashboard
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors text-sm"
          >
            View Repository Architecture
          </a>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 text-left w-full">
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900 text-base">Backend Authorization</h3>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">
              Strict RBAC enforced at the Flask REST API layer, safeguarding data through verified Supabase JWTs.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900 text-base">Audit Trail & History</h3>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">
              Every status change, assignment, and update is tracked chronologically in an immutable activity log.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900 text-base">Team Delegation</h3>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">
              Assign tasks effortlessly to registered team members with real-time filtering, priorities, and deadlines.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>Hairdrama Task Manager Web • Collaborative Platform</div>
          <div className="flex items-center gap-4">
            <span>Next.js 16</span>
            <span>•</span>
            <span>Flask REST API</span>
            <span>•</span>
            <span>Supabase PostgreSQL</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
