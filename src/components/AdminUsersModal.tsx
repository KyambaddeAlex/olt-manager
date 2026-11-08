import React, { useEffect, useState } from 'react';
import { Activity, ShieldCheck, Users, X } from 'lucide-react';
import { AuditEntry, OperatorProfile } from '../types/auth';
import { ADMIN_EMAIL } from '../services/firebaseAuth';
import { subscribeToAuditEntries, subscribeToOperatorProfiles } from '../services/firebaseRtdb';

interface AdminUsersModalProps {
  onClose: () => void;
}

export const AdminUsersModal: React.FC<AdminUsersModalProps> = ({ onClose }) => {
  const [profiles, setProfiles] = useState<OperatorProfile[]>([]);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'accounts' | 'activity'>('accounts');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const handleError = (reason: Error) => {
      if (active) setError(`Could not load admin data: ${reason.message}`);
    };
    const stopProfiles = subscribeToOperatorProfiles(setProfiles, handleError);
    const stopAudit = subscribeToAuditEntries(setAuditEntries, handleError);
    return () => {
      active = false;
      stopProfiles();
      stopAudit();
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-console-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 backdrop-blur-sm sm:p-6"
    >
      <section className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950/70 px-5 py-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-cyan-400" />
            <div>
              <h2 id="admin-console-title" className="text-base font-bold text-white">Operator Admin</h2>
              <p className="text-[11px] text-slate-400">Registered accounts and configuration audit trail</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Close admin console">
            <X className="h-5 w-5" />
          </button>
        </header>

        <nav className="flex gap-2 border-b border-slate-800 px-5 py-3">
          <button
            onClick={() => setActiveTab('accounts')}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${activeTab === 'accounts' ? 'bg-cyan-500/15 text-cyan-300' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <Users className="h-4 w-4" /> Accounts ({profiles.length})
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${activeTab === 'activity' ? 'bg-cyan-500/15 text-cyan-300' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <Activity className="h-4 w-4" /> Changes ({auditEntries.length})
          </button>
        </nav>

        {error && <p role="alert" className="mx-5 mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">{error}</p>}

        <div className="overflow-auto p-5">
          {activeTab === 'accounts' ? (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full min-w-[620px] text-left text-xs">
                <thead className="bg-slate-950 text-[10px] uppercase tracking-wide text-slate-400">
                  <tr><th className="px-4 py-3">Operator</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Access</th><th className="px-4 py-3">Account created</th><th className="px-4 py-3">Last sign-in</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {profiles.map((profile) => {
                    const isAdmin = profile.email.toLowerCase() === ADMIN_EMAIL;
                    return (
                      <tr key={profile.uid} className="text-slate-300">
                        <td className="px-4 py-3 font-medium text-white">{profile.displayName || 'Field operator'}</td>
                        <td className="px-4 py-3">{profile.email}</td>
                        <td className="px-4 py-3"><span className={`rounded-full border px-2 py-1 text-[10px] ${isAdmin ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300' : 'border-slate-700 text-slate-400'}`}>{isAdmin ? 'ADMIN' : 'FIELD OPERATOR'}</span></td>
                        <td className="px-4 py-3">{formatDate(profile.createdAt)}</td>
                        <td className="px-4 py-3">{formatDate(profile.lastSeenAt)}</td>
                      </tr>
                    );
                  })}
                  {!profiles.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No registered accounts yet.</td></tr>}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="bg-slate-950 text-[10px] uppercase tracking-wide text-slate-400">
                  <tr><th className="px-4 py-3">When</th><th className="px-4 py-3">Operator</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Site</th><th className="px-4 py-3">Configuration changes</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {auditEntries.slice(0, 250).map((entry) => (
                    <tr key={entry.id} className="text-slate-300">
                      <td className="whitespace-nowrap px-4 py-3">{formatDate(entry.timestamp)}</td>
                      <td className="px-4 py-3"><span className="block font-medium text-white">{entry.actorName}</span><span className="text-[10px] text-slate-400">{entry.actorEmail}</span></td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[10px] ${entry.action === 'DELETE' ? 'bg-rose-500/10 text-rose-300' : entry.action === 'CREATE' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>{entry.action}</span></td>
                      <td className="px-4 py-3">{entry.siteName}</td>
                      <td className="px-4 py-3"><span className="block font-medium text-white">{entry.summary}</span><span className="mt-1 block max-w-xl whitespace-normal text-[11px] text-slate-400">{entry.details || 'Detailed field changes are unavailable for this older entry.'}</span></td>
                    </tr>
                  ))}
                  {!auditEntries.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No edits have been recorded since audit logging was enabled.</td></tr>}
                </tbody>
              </table>
              {auditEntries.length > 250 && <p className="border-t border-slate-800 px-4 py-3 text-[11px] text-slate-400">Showing the latest 250 of {auditEntries.length} changes.</p>}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

function formatDate(value: AuditEntry['timestamp'] | OperatorProfile['createdAt']): string {
  const date = new Date(typeof value === 'object' ? Date.now() : value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}
