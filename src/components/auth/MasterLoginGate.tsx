import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, KeyRound, AlertCircle, Sparkles } from 'lucide-react';
import { verifyMasterPassword, getLockoutSecondsRemaining } from '../../services/authService';

interface MasterLoginGateProps {
  onUnlock: () => void;
}

export const MasterLoginGate: React.FC<MasterLoginGateProps> = ({ onUnlock }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  useEffect(() => {
    const remaining = getLockoutSecondsRemaining();
    setLockoutSeconds(remaining);

    if (remaining > 0) {
      const interval = setInterval(() => {
        setLockoutSeconds(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setError(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || isVerifying || lockoutSeconds > 0) return;

    setIsVerifying(true);
    setError(null);

    try {
      const result = await verifyMasterPassword(password, rememberDevice);
      if (result.success) {
        onUnlock();
      } else {
        setError(result.error || 'Incorrect password');
        const remaining = getLockoutSecondsRemaining();
        if (remaining > 0) {
          setLockoutSeconds(remaining);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication error');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#04070A] p-4 text-white overflow-hidden selection:bg-emerald-500/30">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-emerald-600/5 rounded-full blur-[90px] pointer-events-none" />

      {/* Main card */}
      <div className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8  shadow-2xl shadow-black/80">
        
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-inner">
            <Lock className="h-7 w-7 text-emerald-400" />
            <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500">
              <Sparkles className="h-2.5 w-2.5 text-black" />
            </div>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            GreenDream
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Vault
            </span>
          </h1>
          <p className="text-xs text-white/60 mt-1 max-w-[240px]">
            Personal Life Management &amp; Habits. Enter master password to unlock.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-white/70 uppercase tracking-wider flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
              Master Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password..."
                disabled={lockoutSeconds > 0 || isVerifying}
                autoFocus
                className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder-white/30 transition focus:border-emerald-500/50 focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition p-1"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember device toggle */}
          <label className="flex items-center gap-2.5 cursor-pointer text-xs text-white/70 select-none py-1">
            <input
              type="checkbox"
              checked={rememberDevice}
              onChange={e => setRememberDevice(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-white/10 text-emerald-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-emerald-500"
            />
            <span>Remember this device</span>
          </label>

          {/* Error / Lockout alert */}
          {(error || lockoutSeconds > 0) && (
            <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3.5 py-2.5 text-xs text-red-400 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                {lockoutSeconds > 0
                  ? `Too many attempts. Locked for ${lockoutSeconds}s`
                  : error}
              </span>
            </div>
          )}

          {/* Unlock Button */}
          <button
            type="submit"
            disabled={!password.trim() || isVerifying || lockoutSeconds > 0}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-sm font-semibold text-black shadow-lg shadow-emerald-500/20 transition hover:brightness-110 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
          >
            {isVerifying ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Unlocking...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                Unlock GreenDream
              </span>
            )}
          </button>
        </form>

        {/* Secure vault access notice */}
        <div className="mt-5 pt-4 border-t border-white/5 text-center">
          <p className="text-[11px] text-white/40">
            Encrypted client-side with SHA-256 vault protection
          </p>
        </div>
      </div>
    </div>
  );
};
