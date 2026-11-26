import { useCallback, useEffect, useState } from 'react';
import { CreditCard, LogIn, UserPlus, ShieldCheck, Loader2 } from 'lucide-react';
import { authApi, paymentApi } from '../utils/api.js';

function money(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

export default function PaymentPanel() {
  const [plans, setPlans] = useState([]);
  const [entitlement, setEntitlement] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadEntitlement = useCallback(async () => {
    if (!localStorage.getItem('token')) { setEntitlement(null); return; }
    try {
      const result = await paymentApi.getEntitlement();
      setEntitlement(result.entitlement);
    } catch (e) {
      setEntitlement(null);
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    paymentApi.getConfig().then(result => setPlans(result.plans || [])).catch(e => setError(e.message));
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') setMessage('Payment verified. Your plan is active.');
    if (params.get('payment') === 'failed') setError('Payment was not confirmed. Your plan was not activated.');
    loadEntitlement();
    const refresh = () => loadEntitlement();
    window.addEventListener('repo2apk:entitlement-refresh', refresh);
    return () => window.removeEventListener('repo2apk:entitlement-refresh', refresh);
  }, [loadEntitlement]);

  const authenticate = async (e) => {
    e.preventDefault();
    setBusy('auth'); setError(''); setMessage('');
    try {
      const result = mode === 'register'
        ? await authApi.register(email.trim(), password)
        : await authApi.login(email.trim(), password);
      localStorage.setItem('token', result.token);
      setMessage(mode === 'register' ? 'Account created and signed in.' : 'Signed in successfully.');
      await loadEntitlement();
    } catch (e) { setError(e.message); }
    finally { setBusy(''); }
  };

  const checkout = async (planId) => {
    setBusy(planId); setError('');
    try {
      const result = await paymentApi.checkout(planId);
      window.location.assign(result.checkoutUrl);
    } catch (e) { setError(e.message); setBusy(''); }
  };

  const signOut = () => {
    localStorage.removeItem('token');
    setEntitlement(null);
    setMessage('Signed out.');
  };

  return (
    <section className="glass-panel rounded-2xl p-5 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
          <ShieldCheck size={15} className="text-neon-green" /> Repo2APK plans
        </h2>
        <p className="text-xs text-gray-500 mt-1">Choose a plan to unlock APK builds.</p>
      </div>

      {localStorage.getItem('token') ? (
        <div className="rounded-lg bg-white/5 border border-white/5 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-gray-200">
              {entitlement?.active
                ? entitlement.lifetime ? 'Lifetime access active' : 'Monthly access active'
                : 'No active plan'}
            </p>
            <button type="button" onClick={signOut} className="text-xs text-gray-500 hover:text-gray-200">Sign out</button>
          </div>
          {entitlement?.expiresAt && <p className="text-xs text-gray-500 mt-1">Expires {new Date(entitlement.expiresAt).toLocaleDateString()}</p>}
        </div>
      ) : (
        <form onSubmit={authenticate} className="space-y-3">
          <div className="flex gap-2">
            <button type="button" onClick={() => setMode('login')} className={`flex-1 rounded-lg py-2 text-xs ${mode === 'login' ? 'bg-neon-green/10 text-neon-green' : 'bg-white/5 text-gray-500'}`}><LogIn size={13} className="inline mr-1"/> Sign in</button>
            <button type="button" onClick={() => setMode('register')} className={`flex-1 rounded-lg py-2 text-xs ${mode === 'register' ? 'bg-neon-green/10 text-neon-green' : 'bg-white/5 text-gray-500'}`}><UserPlus size={13} className="inline mr-1"/> Create account</button>
          </div>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" autoComplete="email" className="w-full rounded-lg bg-surface-800 border border-white/10 px-3 py-3 text-sm text-white outline-none focus:border-neon-green/40"/>
          <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="Password (8+ characters)" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} className="w-full rounded-lg bg-surface-800 border border-white/10 px-3 py-3 text-sm text-white outline-none focus:border-neon-green/40"/>
          <button disabled={!!busy} className="btn-secondary w-full text-sm" type="submit">{busy ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Sign in'}</button>
        </form>
      )}

      <div className="grid grid-cols-1 gap-2">
        {plans.map(plan => (
          <button key={plan.id} type="button" onClick={() => checkout(plan.id)} disabled={!!busy || !localStorage.getItem('token') || entitlement?.lifetime} className="btn-primary w-full flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2"><CreditCard size={15}/>{plan.id === 'monthly' ? 'Monthly · 30 days' : 'Lifetime'}</span>
            <span className="flex items-center gap-2">{money(plan.amount, plan.currency)} {busy === plan.id && <Loader2 size={14} className="animate-spin"/>}</span>
          </button>
        ))}
      </div>
      {!localStorage.getItem('token') && <p className="text-[11px] text-gray-500">Sign in or create an account to purchase a plan.</p>}
      {entitlement?.lifetime && <p className="text-xs text-neon-green">Lifetime plan already active. No further payment is required.</p>}
      {message && <p className="text-xs text-neon-green">{message}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
      <p className="text-[11px] text-gray-600">Flutterwave confirms the payment server-side before access is activated. Use test-mode credentials before going live.</p>
    </section>
  );
}
