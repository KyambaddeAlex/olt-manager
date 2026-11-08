import React, { useState } from 'react';
import { KeyRound, Lock, Radio, ShieldCheck, UserPlus } from 'lucide-react';
import { registerWithEmailPassword, signInWithEmailPassword } from '../services/firebaseAuth';
import { AuthenticatedOperator } from '../types/auth';

interface AccessCodeLoginProps {
  onLoginSuccess: (operator: AuthenticatedOperator) => void;
  initialError?: string;
  notice?: string;
  onRegistrationComplete: (message: string) => void;
}

export const AccessCodeLogin: React.FC<AccessCodeLoginProps> = ({
  onLoginSuccess,
  initialError = '',
  notice = '',
  onRegistrationComplete,
}) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState(initialError);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      if (isRegistering) {
        await registerWithEmailPassword(email.trim(), password, displayName.trim());
        setPassword('');
        setEmail('');
        setDisplayName('');
        setIsRegistering(false);
        onRegistrationComplete('Account created. Check your email and verify the address before signing in.');
        setIsSubmitting(false);
        return;
      }
      const operator = await signInWithEmailPassword(email.trim(), password);
      onLoginSuccess(operator);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Sign-in failed. Check your Firebase configuration.');
      setIsSubmitting(false);
    }
  };

  return (
    <div
      data-testid="login-screen"
      className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-blue-950/30 via-slate-950 to-slate-950 pointer-events-none" />
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-3 mb-6 pb-5 border-b border-slate-800">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white">OLT CORE MANAGER</h1>
                <Radio className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-xs text-slate-400 font-mono">SECURE OPERATOR SIGN-IN</p>
            </div>
          </div>

          {isRegistering && (
            <p className="mb-4 text-xs text-cyan-200 bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
              Field accounts can make configuration changes after email verification. The designated administrator can review accounts and the audit history.
            </p>
          )}
          {notice && !isRegistering && (
            <p role="status" className="mb-4 text-xs text-emerald-200 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
              {notice}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegistering && (
              <div>
                <label htmlFor="login-name" className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Full name
                </label>
                <input
                  id="login-name"
                  type="text"
                  autoComplete="name"
                  required
                  maxLength={80}
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl py-2.5 px-3 text-sm text-slate-100 outline-none"
                />
              </div>
            )}
            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl py-2.5 px-3 text-sm text-slate-100 outline-none"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete={isRegistering ? 'new-password' : 'current-password'}
                required
                minLength={isRegistering ? 12 : undefined}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl py-2.5 px-3 text-sm text-slate-100 outline-none"
              />
            </div>

            {errorMessage && (
              <p role="alert" className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg p-3">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-slate-950 font-bold text-xs tracking-wide shadow-md shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>{isSubmitting ? 'PLEASE WAIT…' : isRegistering ? 'CREATE ACCOUNT' : 'SIGN IN'}</span>
            </button>
          </form>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              setIsRegistering((registering) => !registering);
              setPassword('');
              setErrorMessage('');
            }}
            className="mt-3 w-full py-2 px-4 rounded-xl border border-slate-700 hover:border-cyan-500/60 text-slate-300 hover:text-cyan-300 text-xs font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {isRegistering ? <Lock className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            <span>{isRegistering ? 'BACK TO SIGN IN' : 'CREATE FIELD ACCOUNT'}</span>
          </button>

          <div className="mt-5 pt-4 border-t border-slate-800 flex items-start gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
            <p>Register a field account here. Firebase verifies each email before granting access to network records.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
