'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const { signup, login, isLoading, error, isAuthenticated, initialize } = useAuthStore();
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

    if (!email || !password || !confirmPassword) {
      setLocalError('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    try {
      await signup(email, password);
      setSuccess(true);
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setLocalError(err.message || 'Registration failed.');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Title */}
      <div className="space-y-2 text-center lg:text-left">
        <h1 className="text-2xl font-black tracking-widest text-white font-orbitron uppercase">
          PROVISION NODE
        </h1>
        <p className="text-xs text-slate-400 font-rajdhani font-semibold tracking-wider">
          Allocate local workspace resources on EmbedMind system.
        </p>
      </div>

      {/* Error alert */}
      {(localError || error) && (
        <div className="p-3.5 rounded border border-[#e10600]/40 bg-[#c1121f]/10 text-rose-300 text-xs font-mono">
          [ALARM] {localError || error}
        </div>
      )}

      {/* Success alert */}
      {success && (
        <div className="p-3.5 rounded border border-emerald-500/40 bg-emerald-950/20 text-emerald-300 text-xs font-mono">
          [READY] Provisioning node logic. Syncing directory...
        </div>
      )}

      {/* Main Signup Form */}
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
            Choose Cipher Key
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

        {/* Verify Password */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono" htmlFor="confirm-password">
            Confirm Cipher Key
          </label>
          <input
            id="confirm-password"
            type="password"
            placeholder="••••••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isLoading}
            className="w-full px-4 py-3 rounded border border-[#2a0000] bg-[#050505] text-white placeholder-slate-700 focus:outline-none focus:border-[#e10600] focus:ring-1 focus:ring-[#e10600]/30 transition duration-150 text-sm shadow-neon-red-inset"
            required
          />
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
              <span>ALLOCATING CYBER LOGIC...</span>
            </>
          ) : (
            'PROVISION NODE LINK'
          )}
        </button>

      </form>

      {/* Redirect back to login */}
      <div className="text-center text-xs text-slate-500 pt-2 border-t border-[#2a0000]/60 font-rajdhani">
        Already provisioned?{' '}
        <Link href="/login" className="text-[#e10600] hover:text-[#ff2a24] font-semibold transition ml-1">
          Sign In to Terminal
        </Link>
      </div>

    </div>
  );
}
