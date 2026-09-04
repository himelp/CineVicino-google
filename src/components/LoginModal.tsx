import React, { useState } from 'react';
import { X, User, Mail, Key, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { Language, translations } from '../utils/i18n';

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
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Credenziali non valide');
        return;
      }

      if (data.token) {
        localStorage.setItem('cinevicino_token', data.token);
      }
      setSuccessMsg('Accesso effettuato con successo!');
      setTimeout(() => {
        onLoginSuccess(data.user);
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(`Errore di rete: ${err.message}`);
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
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, name: name.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Errore durante la registrazione');
        return;
      }

      if (data.token) {
        localStorage.setItem('cinevicino_token', data.token);
      }
      setSuccessMsg('Account creato con successo!');
      setTimeout(() => {
        onLoginSuccess(data.user);
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(`Errore di rete: ${err.message}`);
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
      const res = await fetch('/api/auth/reset-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });

      const data = await res.json();
      setSuccessMsg(data.message || 'Se l\'email è registrata riceverai un link di ripristino.');
    } catch (err: any) {
      setErrorMsg(`Errore di rete: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (targetEmail: string, targetPass: string) => {
    setEmail(targetEmail);
    setPassword(targetPass);
    setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl text-center relative text-neutral-200"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white text-neutral-400 hover:text-black transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] flex items-center justify-center mx-auto mb-4">
          <User className="w-6 h-6" />
        </div>

        <h2 className="text-2xl font-serif font-bold text-white">
          {tab === 'login' ? 'Accedi a CineVicino' : tab === 'register' ? 'Crea il tuo Profilo' : 'Recupero Password'}
        </h2>
        <p className="text-xs text-neutral-400 mt-1 mb-6">
          Salva i tuoi cinema del cuore, sincronizza i tuoi film e ricevi notifiche sulle novità in sala.
        </p>

        {/* Tab switch */}
        <div className="flex rounded-full bg-white/5 p-1 mb-6 border border-white/10 text-xs">
          <button
            type="button"
            onClick={() => { setTab('login'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-1.5 rounded-full font-medium transition-colors ${
              tab === 'login' ? 'bg-[#D4AF37] text-black font-bold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Accedi
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-1.5 rounded-full font-medium transition-colors ${
              tab === 'register' ? 'bg-[#D4AF37] text-black font-bold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Registrati
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
              <Mail className="w-4 h-4 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nome@esempio.it"
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
                placeholder="Password (min. 6 caratteri)"
                className="w-full pl-11 pr-4 py-2.5 bg-black border border-white/20 rounded-full text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#D4AF37] transition-colors"
              />
            </div>

            <div className="text-right">
              <button
                type="button"
                onClick={() => { setTab('forgot'); setErrorMsg(''); setSuccessMsg(''); }}
                className="text-[11px] text-neutral-400 hover:text-[#D4AF37] transition-colors"
              >
                Password dimenticata?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-full bg-[#D4AF37] hover:bg-white text-black font-bold uppercase tracking-wider text-xs transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Accesso in corso...' : 'Accedi'}
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
              <div className="relative flex justify-center text-[10px] uppercase text-neutral-500 bg-[#0a0a0a] px-3 font-mono tracking-widest">oppure credenziali test</div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-left">
              <button
                type="button"
                onClick={() => handleQuickFill('mario.rossi@cinefilo.it', 'CinefiloPass2026!')}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 text-[11px] border border-white/10 transition-colors"
              >
                <span className="block font-semibold text-white">Utente Demo</span>
                <span className="text-[10px] text-neutral-500 font-mono">mario.rossi</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('admin@cinevicino.it', 'CineVicinoAdmin2026!')}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 text-[11px] border border-white/10 transition-colors"
              >
                <span className="block font-semibold text-[#D4AF37]">Admin Test</span>
                <span className="text-[10px] text-neutral-500 font-mono">admin@cinevicino</span>
              </button>
            </div>
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
                placeholder="Il tuo nome o nickname"
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
                placeholder="nome@esempio.it"
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
                placeholder="Crea password (min. 8 caratteri)"
                className="w-full pl-11 pr-4 py-2.5 bg-black border border-white/20 rounded-full text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#D4AF37] transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-full bg-[#D4AF37] hover:bg-white text-black font-bold uppercase tracking-wider text-xs transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Creazione in corso...' : 'Registrati Gratuitamente'}
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
                placeholder="nome@esempio.it"
                className="w-full pl-11 pr-4 py-2.5 bg-black border border-white/20 rounded-full text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#D4AF37] transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-full bg-[#D4AF37] hover:bg-white text-black font-bold uppercase tracking-wider text-xs transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Invio in corso...' : 'Invia Link di Recupero'}
            </button>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => { setTab('login'); setErrorMsg(''); setSuccessMsg(''); }}
                className="text-xs text-neutral-400 hover:text-white transition-colors"
              >
                Torna al Login
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
