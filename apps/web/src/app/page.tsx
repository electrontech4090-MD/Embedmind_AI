'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthToken } from '@/lib/api';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#07070a] text-slate-400">
      <div className="flex flex-col items-center gap-3">
        <div className="relative flex h-10 w-10 items-center justify-center">
          <div className="absolute h-full w-full rounded-full border-2 border-violet-600/30"></div>
          <div className="absolute h-full w-full rounded-full border-t-2 border-r-2 border-violet-500 animate-spin"></div>
        </div>
        <span className="text-xs font-mono text-violet-400 tracking-wider">SYNCING BOOTLOADER...</span>
      </div>
    </div>
  );
}
