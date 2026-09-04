import React, { useState } from 'react';
import { X, User, Mail, Sparkles, CheckCircle2, Shield } from 'lucide-react';
import { Language, translations } from '../utils/i18n';

interface LoginModalProps {
  lang: Language;
  onClose: () => void;
  onLoginSuccess: (user: any) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ lang, onClose, onLoginSuccess }) => {
  const t = translations[lang];
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      setLoading(true);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        setSuccessMsg(true);
        setTimeout(() => {
          onLoginSuccess(data.user);
          onClose();
        }, 1200);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'mario.rossi@cinefilo.it' })
      });
      if (res.ok) {
        const data = await res.json();
        onLoginSuccess(data.user);
        onClose();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
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

        <h2 className="text-2xl font-serif font-bold text-white">Accedi a CineVicino</h2>
        <p className="text-xs text-neutral-400 mt-1 mb-6">
          Salva i tuoi cinema del cuore, sincronizza i tuoi film e ricevi avvisi personalizzati sulle uscite in sala.
        </p>

        {successMsg ? (
          <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-medium flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Accesso effettuato! Benvenuto su CineVicino.</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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
              {loading ? 'Accesso in corso...' : 'Continua con Email'}
            </button>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
              <div className="relative flex justify-center text-[10px] uppercase text-neutral-500 bg-[#0a0a0a] px-3 font-mono tracking-widest">oppure</div>
            </div>

            <button
              type="button"
              onClick={handleDemoLogin}
              className="w-full py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white font-medium text-xs border border-white/10 transition-colors cursor-pointer"
            >
              Accesso Rapido Demo (Cinefilo Ospite)
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
