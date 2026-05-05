'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { recordAuditLog } from '@/lib/audit';
import { Loader2, Lock, User, LogIn, MonitorCheck, Store } from 'lucide-react';

interface POSConfig { id: number; name: string; }

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading: authLoading, sessionId } = useAuth();

  const db = process.env.NEXT_PUBLIC_ODOO_DB || 'odoo';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 2: POS session selection
  const [step, setStep] = useState<'login' | 'session'>('login');
  const [configs, setConfigs] = useState<POSConfig[]>([]);
  const [openingConfig, setOpeningConfig] = useState<number | null>(null);
  const [sessionError, setSessionError] = useState('');

  // If already authenticated, check for active session
  useEffect(() => {
    if (!authLoading && isAuthenticated && sessionId) {
      checkAndProceed(sessionId);
    }
  }, [authLoading, isAuthenticated, sessionId]);

  const checkAndProceed = async (sid: string) => {
    try {
      const res = await fetch(`/api/odoo/pos-session?session_id=${sid}`);
      const data = await res.json();
      if (data.hasActiveSession) {
        router.push('/');
      } else {
        setConfigs(data.configs || []);
        setStep('session');
      }
    } catch {
      router.push('/'); // fallback
    }
  };

  if (!authLoading && isAuthenticated && step === 'login') return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(db, username, password);
      await recordAuditLog({
        action: 'opened',
        entityType: 'session',
        entityName: 'Session POS',
        actor: username,
        details: `Utilisateur ${username} s'est connecté`,
      });
      // checkAndProceed fires via useEffect after sessionId is set
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenSession = async (configId: number) => {
    setOpeningConfig(configId);
    setSessionError('');
    try {
      const res = await fetch(`/api/odoo/pos-session?session_id=${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configId }),
      });
      const data = await res.json();
      if (data.success) {
        router.push('/');
      } else {
        setSessionError(data.error || "Erreur lors de l'ouverture de la session.");
      }
    } catch {
      setSessionError('Erreur réseau.');
    } finally {
      setOpeningConfig(null);
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-red-950 to-slate-950 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-red-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-rose-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md mx-4">
        <div className="backdrop-blur-xl bg-white/[0.07] border border-white/[0.12] rounded-2xl shadow-2xl p-8">

          {step === 'login' ? (
            <>
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600 to-orange-500 shadow-lg shadow-red-500/25 mb-4">
                  <LogIn className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white tracking-tight">COMPANY</h1>
                <p className="text-sm text-red-200/60 mt-1">Sign in to your Odoo account</p>
              </div>

              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] mb-6">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-red-200/50 truncate">{process.env.NEXT_PUBLIC_ODOO_URL || 'http://localhost:8069'}</span>
              </div>

              {error && (
                <div className="mb-5 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-red-200/70 uppercase tracking-wider">Username</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-300/40" />
                    <input id="pos-username" type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white placeholder:text-red-200/30 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40 transition-all"
                      placeholder="e.g. admin" required autoComplete="username" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-red-200/70 uppercase tracking-wider">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-300/40" />
                    <input id="pos-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white placeholder:text-red-200/30 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40 transition-all"
                      placeholder="••••••••" required autoComplete="current-password" />
                  </div>
                </div>
                <button id="pos-login-btn" type="submit" disabled={isLoading || !username || !password}
                  className="w-full py-3 mt-2 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-semibold text-sm shadow-lg transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2">
                  {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Connexion...</> : <><LogIn className="w-4 h-4" />Se connecter</>}
                </button>
              </form>
            </>
          ) : (
            <>
              {/* Step 2: POS Session */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-500 shadow-lg shadow-emerald-500/25 mb-4">
                  <MonitorCheck className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Ouvrir la Caisse</h1>
                <p className="text-sm text-red-200/60 mt-1">Sélectionnez une caisse pour commencer</p>
              </div>

              {sessionError && (
                <div className="mb-5 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{sessionError}</div>
              )}

              {configs.length === 0 ? (
                <div className="text-center py-8 text-white/40">
                  <Store className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Aucune caisse disponible.</p>
                  <p className="text-xs mt-1">Vérifiez la configuration Odoo.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {configs.map((config) => (
                    <button key={config.id} onClick={() => handleOpenSession(config.id)}
                      disabled={openingConfig !== null}
                      className="w-full flex items-center justify-between px-5 py-4 rounded-xl bg-white/[0.06] border border-white/[0.1] hover:bg-white/[0.12] hover:border-emerald-400/40 text-white transition-all disabled:opacity-60">
                      <div className="flex items-center gap-3">
                        <Store className="h-5 w-5 text-emerald-400" />
                        <span className="font-semibold">{config.name}</span>
                      </div>
                      {openingConfig === config.id
                        ? <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                        : <span className="text-xs text-white/30">Ouvrir →</span>}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        <p className="text-center text-xs text-red-200/30 mt-6">Powered by Odoo 18 &middot; Point of Sale</p>
      </div>
    </div>
  );
}
