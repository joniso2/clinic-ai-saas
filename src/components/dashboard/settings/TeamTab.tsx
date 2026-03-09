'use client';

import { useEffect, useState } from 'react';
import { Users, UserPlus, Trash2, Crown, Shield, User, Loader2, CheckCircle2, AlertCircle, Mail } from 'lucide-react';

type TeamMember = {
  user_id: string;
  email: string;
  role: string;
};

const ROLES = [
  { value: 'owner',  label: 'Owner',  icon: Crown,  color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/50' },
  { value: 'admin',  label: 'Admin',  icon: Shield, color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/50' },
  { value: 'member', label: 'Member', icon: User,   color: 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600' },
];

function RoleBadge({ role }: { role: string }) {
  const r = ROLES.find((x) => x.value === role) ?? ROLES[2];
  const Icon = r.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${r.color}`}>
      <Icon className="h-3 w-3" />
      {r.label}
    </span>
  );
}

export function TeamTab() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviting, setInviting] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [inviteError, setInviteError] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function fetchMembers() {
    setLoading(true);
    try {
      const res = await fetch('/api/team');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMembers(Array.isArray(data) ? data : []);
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchMembers(); }, []);

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteStatus('idle');
    setInviteError('');
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Invite failed');
      setInviteEmail('');
      setInviteStatus('success');
      await fetchMembers();
      setTimeout(() => setInviteStatus('idle'), 3000);
    } catch (err) {
      setInviteError((err as Error).message);
      setInviteStatus('error');
      setTimeout(() => setInviteStatus('idle'), 4000);
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove(userId: string) {
    setRemovingId(userId);
    try {
      await fetch('/api/team', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Member list */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
        <div className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-700/60 px-5 py-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Team members</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Users with access to this clinic.</p>
          </div>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {loading ? (
            <div className="flex items-center gap-2 px-5 py-4 text-sm text-slate-400 dark:text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading members…
            </div>
          ) : members.length === 0 ? (
            <div className="px-5 py-6 text-center">
              <p className="text-sm text-slate-400 dark:text-slate-500">No team members found.</p>
            </div>
          ) : (
            members.map((member) => (
              <div key={member.user_id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  {member.email.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-50 truncate">{member.email}</p>
                </div>
                <RoleBadge role={member.role} />
                <button
                  type="button"
                  onClick={() => handleRemove(member.user_id)}
                  disabled={removingId === member.user_id}
                  className="rounded-lg p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors disabled:opacity-40"
                  title="Remove member"
                >
                  {removingId === member.user_id
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Trash2 className="h-4 w-4" />}
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Invite form */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
        <div className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-700/60 px-5 py-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900">
            <UserPlus className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Invite member</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Send an invitation email to add someone to your team.</p>
          </div>
        </div>
        <div className="px-5 py-5 space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-48 relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => { setInviteEmail(e.target.value); setInviteStatus('idle'); }}
                placeholder="colleague@example.com"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700/50 pl-9 pr-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/40 transition-colors"
              />
            </div>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700/50 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-50 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/40 transition-colors"
            >
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          {inviteStatus === 'error' && (
            <p className="flex items-center gap-1.5 text-xs text-red-500 dark:text-red-400">
              <AlertCircle className="h-3.5 w-3.5" /> {inviteError || 'Failed to invite. Please try again.'}
            </p>
          )}

          <div className="flex items-center gap-3">
            {inviteStatus === 'success' && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" /> Invitation sent
              </span>
            )}
            <button
              type="button"
              onClick={handleInvite}
              disabled={inviting || !inviteEmail.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-slate-100 px-5 py-2.5 text-sm font-semibold text-white dark:text-slate-900 shadow-sm hover:bg-slate-800 dark:hover:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 transition-colors disabled:opacity-50"
            >
              {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              {inviting ? 'Sending…' : 'Send invite'}
            </button>
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-500">
            An email invitation will be sent. The user can set their password and will gain immediate access to this clinic.
          </p>
        </div>
      </div>

      {/* Role descriptions */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Role permissions</h3>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {[
            { role: 'owner', desc: 'Full access. Can manage billing, team, and all settings.' },
            { role: 'admin', desc: 'Can manage leads, settings, and team members. Cannot manage billing.' },
            { role: 'member', desc: 'Can view and manage leads and calendar. Read-only settings.' },
          ].map(({ role, desc }) => (
            <div key={role} className="flex items-start gap-3 px-5 py-3.5">
              <RoleBadge role={role} />
              <p className="text-xs text-slate-500 dark:text-slate-400">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
