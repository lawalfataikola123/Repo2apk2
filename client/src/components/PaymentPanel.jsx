import { useCallback, useEffect, useState } from 'react';
import { CreditCard, LogIn, UserPlus, Wallet, Loader2 } from 'lucide-react';
import { authApi, paymentApi } from '../utils/api.js';

export default function PaymentPanel({ onCreditsChange }) {
  const [config, setConfig] = useState(null);
  const [credits, setCredits] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadCredits = useCallback(async () => {
    if (!localStorage.getItem('token')) { setCredits(null); onCreditsChange?.(0); return; }
    try {
      const result = await paymentApi.getCredits();
      setCredits(result.credits);
      onCreditsChange?.(result.credits);
    } catch (e) {
      setCredits(null);
      onCreditsChange?.(0);
      setError(e.message);
    }
  }, [onCreditsChange]);

  useEffect(() => {
    paymentApi.getConfig().then(setConfig).catch(e => setError(e.message));
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') setMessage('Payment verified. Your build credit is ready.');
    if (params.get('payment') === 'failed') setError('Payment was not confirmed. You were not given a build credit.');
    loadCredits();
  }, [loadCredits]);

  const authenticate = async (e) => {
    e.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      const result = mode === 'register'
        ? await authApi.register(email.trim(), password)
        : await authApi.login(email.trim(), password);
      localStorage.setItem('token', result.token);
      setMessage(mode === 'register' ? 'Account created and signed in.' : 'Signed in successfully.');
      await loadCredits();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const checkout = async () => {
    setBusy(true); setError('');
    try {
      const result = await paymentApi.checkout();
      window.location.assign(result.checkoutUrl);
    } catch (e) { setError(e.message); setBusy(false); }
  };

  const signOut = () => {
    localStorage.removeItem('token');
    setCredits(null);
    onCreditsChange?.(0);
    setMessage('Signed out.');
  };

  return (
    <section className="glass-panel rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
            <Wallet size={15} className="text-neon-green" /> Build credits
          </h2>
          <p className="text-xs text-gray-500 mt-1">Pay securely with Flutterwave. One payment unlocks one build.</p>
        </div>
        {config && <span className="text-sm font-semibold text-neon-green whitespace-nowrap">{config.currency} {Number(config.amount).toLocaleString()}</span>}
      </div>

      {localStorage.getItem('token') ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-gray-300">{credits === null ? 'Checking credit balance…' : `Available credits: ${credits}`}</p>
          <button type="button" onClick={signOut} className="text-xs text-gray-500 hover:text-gray-200">Sign out</button>
        </div>
      ) : (
        <form onSubmit={authenticate} className="space-y-3">
          <div className="flex gap-2">
            <button type="button" onClick={() => setMode('login')} className={`flex-1 rounded-lg py-2 text-xs ${mode === 'login' ? 'bg-neon-green/10 text-neon-green' : 'bg-white/5 text-gray-500'}`}><LogIn size={13} className="inline mr-1"/> Sign in</button>
            <button type="button" onClick={() => setMode('register')} className={`flex-1 rounded-lg py-2 text-xs ${mode === 'register' ? 'bg-neon-green/10 text-neon-green' : 'bg-white/5 text-gray-500'}`}><UserPlus size={13} className="inline mr-1"/> Create account</button>
          </div>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" autoComplete="email" className="w-full rounded-lg bg-surface-800 border border-white/10 px-3 py-3 text-sm text-white outline-none focus:border-neon-green/40"/>
          <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="Password (8+ characters)" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} className="w-full rounded-lg bg-surface-800 border border-white/10 px-3 py-3 text-sm text-white outline-none focus:border-neon-green/40"/>
          <button disabled={busy} className="btn-secondary w-full text-sm" type="submit">{busy ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Sign in'}</button>
        </form>
      )}

      {localStorage.getItem('token') && (
        <button type="button" onClick={checkout} disabled={busy || !config} className="btn-primary w-full flex items-center justify-center gap-2 text-sm">
          {busy ? <Loader2 size={15} className="animate-spin"/> : <CreditCard size={15}/>}
          {busy ? 'Opening checkout…' : 'Buy 1 build credit'}
        </button>
      )}
      {message && <p className="text-xs text-neon-green">{message}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
      <p className="text-[11px] text-gray-600">Payments are confirmed by the backend before credit is added. Test Flutterwave keys first.</p>
    </section>
  );
}
