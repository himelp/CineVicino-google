import React, { useState } from 'react';
import { X, User, Mail, Key, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { Language, translations } from '../utils/i18n';
import { safeFetchJson } from '../utils/api';

interface LoginModalProps {
  lang: Language;
  onClose: () => void;
  onLoginSuccess: (user: any) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ lang, onClose, onLoginSuccess }) => {
  const t = translations[lang];
  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>('login');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    try {
      setLoading(true);
      const parsed = await safeFetchJson<any>('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });

      if (!parsed.ok) {
        setErrorMsg(parsed.error || (lang === 'it' ? 'Credenziali non valide' : 'Invalid credentials'));
        return;
      }

      const data = parsed.data;
      if (data?.token) {
        localStorage.setItem('cinevicino_token', data.token);
      }
      setSuccessMsg(lang === 'it' ? 'Accesso effettuato con successo!' : 'Logged in successfully!');
      setTimeout(() => {
        onLoginSuccess(data?.user);
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(lang === 'it' ? `Errore di rete: ${err.message || err}` : `Network error: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    try {
      setLoading(true);
      const parsed = await safeFetchJson<any>('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, name: name.trim() })
      });

      if (!parsed.ok) {
        setErrorMsg(parsed.error || (lang === 'it' ? 'Errore durante la registrazione' : 'Registration error'));
        return;
      }

      const data = parsed.data;
      if (data?.token) {
        localStorage.setItem('cinevicino_token', data.token);
      }
      setSuccessMsg(lang === 'it' ? 'Account creato con successo!' : 'Account created successfully!');
      setTimeout(() => {
        onLoginSuccess(data?.user);
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(lang === 'it' ? `Errore di rete: ${err.message || err}` : `Network error: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    try {
      setLoading(true);
      const parsed = await safeFetchJson<any>('/api/auth/reset-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });

      if (!parsed.ok) {
        setErrorMsg(parsed.error || (lang === 'it' ? 'Impossibile inviare la richiesta di ripristino' : 'Unable to send password reset request'));
        return;
      }

      const data = parsed.data;
      setSuccessMsg(data?.message || (lang === 'it' ? "Se l'email è registrata riceverai un link di ripristino." : 'If the email is registered, you will receive a reset link.'));
    } catch (err: any) {
      setErrorMsg(lang === 'it' ? `Errore di rete: ${err.message || err}` : `Network error: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto min-h-[100dvh]">
      <div 
        className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-3xl p-5 sm:p-8 shadow-2xl text-center relative text-neutral-200 my-auto pb-safe"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label={t.close}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-white/5 hover:bg-white text-neutral-400 hover:text-black transition-colors cursor-pointer active:scale-95"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] flex items-center justify-center mx-auto mb-4">
          <User className="w-6 h-6" />
        </div>

        <h2 className="text-xl sm:text-2xl font-serif font-bold text-white">
          {tab === 'login' 
            ? (lang === 'it' ? 'Accedi a CineVicino' : 'Sign in to CineVicino') 
            : tab === 'register' 
              ? (lang === 'it' ? 'Crea il tuo Profilo' : 'Create your Profile') 
              : (lang === 'it' ? 'Recupero Password' : 'Password Recovery')}
        </h2>
        <p className="text-xs text-neutral-400 mt-1 mb-6">
          {lang === 'it'
            ? 'Salva i tuoi cinema del cuore, sincronizza i tuoi film e ricevi notifiche sulle novità in sala.'
            : 'Bookmark favorite cinemas, sync saved movies, and receive updates on new theater releases.'}
        </p>

        {/* Tab switch */}
        <div className="flex rounded-full bg-white/5 p-1 mb-6 border border-white/10 text-xs">
          <button
            type="button"
            onClick={() => { setTab('login'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 min-h-[38px] flex items-center justify-center rounded-full font-medium transition-colors cursor-pointer active:scale-95 ${
              tab === 'login' ? 'bg-[#D4AF37] text-black font-bold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            {lang === 'it' ? 'Accedi' : 'Sign In'}
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 min-h-[38px] flex items-center justify-center rounded-full font-medium transition-colors cursor-pointer active:scale-95 ${
              tab === 'register' ? 'bg-[#D4AF37] text-black font-bold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            {lang === 'it' ? 'Registrati' : 'Register'}
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 mb-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs text-left flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 mb-4 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-medium flex items-center gap-2 text-left">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {tab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-3.5">
            <div className="relative text-left">
              <Mail className="w-4 h-4 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={lang === 'it' ? 'nome@esempio.it' : 'name@example.com'}
                className="w-full pl-11 pr-4 py-2.5 bg-black border border-white/20 rounded-full text-base sm:text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#D4AF37] transition-colors"
              />
            </div>

            <div className="relative text-left">
              <Key className="w-4 h-4 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={lang === 'it' ? 'Password (min. 6 caratteri)' : 'Password (min. 6 characters)'}
                className="w-full pl-11 pr-4 py-2.5 bg-black border border-white/20 rounded-full text-base sm:text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#D4AF37] transition-colors"
              />
            </div>

            <div className="text-right">
              <button
                type="button"
                onClick={() => { setTab('forgot'); setErrorMsg(''); setSuccessMsg(''); }}
                className="text-xs text-neutral-400 hover:text-[#D4AF37] transition-colors py-1 cursor-pointer"
              >
                {lang === 'it' ? 'Password dimenticata?' : 'Forgot password?'}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px] py-2.5 rounded-full bg-[#D4AF37] hover:bg-white text-black font-bold uppercase tracking-wider text-xs transition-colors shadow-sm disabled:opacity-50 cursor-pointer active:scale-95"
            >
              {loading ? (lang === 'it' ? 'Accesso in corso...' : 'Signing in...') : (lang === 'it' ? 'Accedi' : 'Sign In')}
            </button>
          </form>
        )}

        {tab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div className="relative text-left">
              <User className="w-4 h-4 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={lang === 'it' ? 'Il tuo nome o nickname' : 'Your name or nickname'}
                className="w-full pl-11 pr-4 py-2.5 bg-black border border-white/20 rounded-full text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#D4AF37] transition-colors"
              />
            </div>

            <div className="relative text-left">
              <Mail className="w-4 h-4 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={lang === 'it' ? 'nome@esempio.it' : 'name@example.com'}
                className="w-full pl-11 pr-4 py-2.5 bg-black border border-white/20 rounded-full text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#D4AF37] transition-colors"
              />
            </div>

            <div className="relative text-left">
              <Key className="w-4 h-4 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={lang === 'it' ? 'Crea password (min. 8 caratteri)' : 'Create password (min. 8 characters)'}
                className="w-full pl-11 pr-4 py-2.5 bg-black border border-white/20 rounded-full text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#D4AF37] transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-full bg-[#D4AF37] hover:bg-white text-black font-bold uppercase tracking-wider text-xs transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {loading ? (lang === 'it' ? 'Creazione in corso...' : 'Creating account...') : (lang === 'it' ? 'Registrati Gratuitamente' : 'Register Free')}
            </button>
          </form>
        )}

        {tab === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-3.5">
            <div className="relative text-left">
              <Mail className="w-4 h-4 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={lang === 'it' ? 'nome@esempio.it' : 'name@example.com'}
                className="w-full pl-11 pr-4 py-2.5 bg-black border border-white/20 rounded-full text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#D4AF37] transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-full bg-[#D4AF37] hover:bg-white text-black font-bold uppercase tracking-wider text-xs transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {loading ? (lang === 'it' ? 'Invio in corso...' : 'Sending...') : (lang === 'it' ? 'Invia Link di Recupero' : 'Send Recovery Link')}
            </button>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => { setTab('login'); setErrorMsg(''); setSuccessMsg(''); }}
                className="text-xs text-neutral-400 hover:text-white transition-colors"
              >
                {lang === 'it' ? 'Torna al Login' : 'Back to Sign In'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
