'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [localError, setLocalError] = useState('');
  
  const { login, error, isLoading, isAuthenticated, initialize } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (!email || !password) {
      setLocalError('Please fill in all fields.');
      return;
    }

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setLocalError(err.message || 'Incorrect email or password.');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Title */}
      <div className="space-y-2 text-center lg:text-left">
        <h1 className="text-2xl font-black tracking-widest text-white font-orbitron uppercase">
          SECURE LOG IN
        </h1>
        <p className="text-xs text-slate-400 font-rajdhani font-semibold tracking-wider">
          Establish encrypted connection socket to EmbedMind AI.
        </p>
      </div>

      {/* Error alert */}
      {(localError || error) && (
        <div className="p-3.5 rounded border border-[#e10600]/40 bg-[#c1121f]/10 text-rose-300 text-xs font-mono">
          [ALARM] {localError || error}
        </div>
      )}

      {/* Main Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4 font-rajdhani">
        
        {/* Email Address */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono" htmlFor="email">
            User Identification (Email)
          </label>
          <input
            id="email"
            type="email"
            placeholder="engineer@embedmind.ai"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            className="w-full px-4 py-3 rounded border border-[#2a0000] bg-[#050505] text-white placeholder-slate-700 focus:outline-none focus:border-[#e10600] focus:ring-1 focus:ring-[#e10600]/30 transition duration-150 text-sm shadow-neon-red-inset"
            required
          />
        </div>

        {/* Security Password */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono" htmlFor="password">
            Security Cipher Key
          </label>
          <input
            id="password"
            type="password"
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            className="w-full px-4 py-3 rounded border border-[#2a0000] bg-[#050505] text-white placeholder-slate-700 focus:outline-none focus:border-[#e10600] focus:ring-1 focus:ring-[#e10600]/30 transition duration-150 text-sm shadow-neon-red-inset"
            required
          />
        </div>

        {/* Remember me & Forgot password */}
        <div className="flex justify-between items-center text-xs">
          <label className="flex items-center gap-2 text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={isLoading}
              className="rounded bg-[#050505] border-[#2a0000] text-[#e10600] focus:ring-0 focus:ring-offset-0"
            />
            <span>Hold Session</span>
          </label>
          <a
            href="#forgot"
            onClick={(e) => {
              e.preventDefault();
              alert("Contact systems administrator to retrieve key credentials.");
            }}
            className="text-[#e10600] hover:text-[#c1121f] font-semibold transition"
          >
            Retrieve Cipher?
          </a>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={isLoading}
          className="relative w-full py-3.5 rounded font-black text-white bg-gradient-to-r from-[#c1121f] to-[#e10600] hover:from-[#e10600] hover:to-[#ff2a24] shadow-neon-red transition duration-200 flex items-center justify-center gap-2 cursor-pointer border border-[#e10600]/30 text-xs uppercase tracking-widest font-orbitron"
        >
          {isLoading ? (
            <>
              <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></span>
              <span>SYNCHRONIZING SYNC PORTAL...</span>
            </>
          ) : (
            'AUTHENTICATE TERMINAL'
          )}
        </button>

      </form>

      {/* Divider */}
      <div className="flex items-center my-6">
        <div className="flex-grow border-t border-[#2a0000]/60"></div>
        <span className="px-3 text-[9px] font-mono text-slate-600 uppercase tracking-widest">or initialize via</span>
        <div className="flex-grow border-t border-[#2a0000]/60"></div>
      </div>

      {/* OAuth Buttons */}
      <div className="grid grid-cols-2 gap-3.5 font-rajdhani">
        <button
          type="button"
          onClick={() => alert("Google Identity connection link established.")}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded border border-[#2a0000] bg-[#050505] hover:bg-[#101010] hover:border-[#e10600]/40 text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer"
        >
          <svg className="w-4 h-4 text-[#e10600]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-6.887 4.114-4.68 0-8.5-3.82-8.5-8.5s3.82-8.5 8.5-8.5c2.1 0 4 .77 5.5 2.03l3.21-3.21C18.06 1.83 15.36 1 12.24 1 5.48 1 0 6.48 0 13.24s5.48 12.24 12.24 12.24c6.8 0 12.24-5.44 12.24-12.24 0-.76-.08-1.5-.24-2.24H12.24z" />
          </svg>
          Google Node
        </button>
        <button
          type="button"
          onClick={() => alert("GitHub Enterprise credential tunnel open.")}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded border border-[#2a0000] bg-[#050505] hover:bg-[#101010] hover:border-[#e10600]/40 text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer"
        >
          <svg className="w-4 h-4 text-[#e10600]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
          </svg>
          GitHub
        </button>
      </div>

      {/* Register new link */}
      <div className="text-center text-xs text-slate-500 pt-2 border-t border-[#2a0000]/60 font-rajdhani">
        New node deployment?{' '}
        <Link href="/signup" className="text-[#e10600] hover:text-[#ff2a24] font-semibold transition ml-1">
          Deploy New Terminal
        </Link>
      </div>

    </div>
  );
}
