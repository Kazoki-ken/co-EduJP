'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Shield, ShieldOff, Trash2, ChevronDown, AlertCircle, UserCheck, Crown } from 'lucide-react';
import api, { errorMessage } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { cn, leagueIcon, formatDate } from '@/lib/utils';
import { Pagination } from '@/components/ui/Pagination';
import type { PremiumGrant } from '@/lib/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
  /** Stored tier. A past `premiumUntil` still reads PREMIUM here — the server
   *  treats it as FREE, and the nightly job tidies the column. */
  tier?: 'FREE' | 'PREMIUM';
  premiumUntil?: string | null;
  profile: {
    streak: number;
    xp: number;
    coins: number;
    league: string;
  } | null;
}

/** Whether a stored tier is still in force right now. */
const isPremiumNow = (u: AdminUser): boolean =>
  u.tier === 'PREMIUM' && (!u.premiumUntil || new Date(u.premiumUntil) > new Date());

interface UsersResponse {
  data: AdminUser[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

type RoleFilter = '' | 'USER' | 'ADMIN';

// ─── Premium Dialog ───────────────────────────────────────────────────────────

/** Preset durations. 0 months is how a lifetime grant is expressed. */
const DURATIONS = [
  { months: 1, label: '1 oy' },
  { months: 3, label: '3 oy' },
  { months: 6, label: '6 oy' },
  { months: 12, label: '1 yil' },
  { months: 0, label: 'Umrbod' },
];

/**
 * Manual premium granting — stage one of billing.
 *
 * Payment is collected outside the app (Payme/Click transfer, cash) and
 * recorded here. `amount` and `note` exist so the ledger can be reconciled
 * later; the Payme/Click webhooks will write the same rows automatically.
 */
function PremiumDialog({
  user, onClose, onDone,
}: {
  user: AdminUser;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [months, setMonths] = useState(1);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [grants, setGrants] = useState<PremiumGrant[]>([]);

  useEffect(() => {
    api.get<{ data: PremiumGrant[] }>(`/admin/users/${user.id}/premium`)
      .then(({ data }) => setGrants(data.data))
      .catch(() => {});
  }, [user.id]);

  const grant = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api.post(`/admin/users/${user.id}/premium`, {
        months,
        amount: amount ? Number(amount) : null,
        note: note.trim() || null,
      });
      onDone(`${user.username} — Premium berildi`);
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api.delete(`/admin/users/${user.id}/premium`);
      onDone(`${user.username} — Premium bekor qilindi`);
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="card-glass p-6 max-w-md w-full space-y-4 max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-xl bg-accent/15 border border-accent/30 flex items-center
                           justify-center text-accent shrink-0">
            <Crown size={17} />
          </span>
          <div className="min-w-0">
            <h2 className="font-bold text-text-primary">{user.username}</h2>
            <p className="text-xs text-text-muted truncate">{user.email}</p>
            <p className="text-xs mt-1">
              {isPremiumNow(user) ? (
                <span className="text-accent font-semibold">
                  {user.premiumUntil
                    ? `Premium — ${formatDate(user.premiumUntil)} gacha`
                    : 'Premium — umrbod'}
                </span>
              ) : (
                <span className="text-text-muted">Bepul tarif</span>
              )}
            </p>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Muddat
          </label>
          <div className="flex flex-wrap gap-2 mt-2">
            {DURATIONS.map((d) => (
              <button
                key={d.months}
                onClick={() => setMonths(d.months)}
                className={cn(
                  'text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors',
                  months === d.months
                    ? 'bg-accent/15 text-accent border-accent/40'
                    : 'border-border text-text-muted hover:text-text-primary',
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
          {isPremiumNow(user) && months > 0 && (
            <p className="text-[11px] text-text-muted mt-2">
              {"Mavjud muddat ustiga qo'shiladi — qolgan kunlar yo'qolmaydi."}
            </p>
          )}
        </div>

        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
          placeholder="To'langan summa, so'm (ixtiyoriy)"
          inputMode="numeric"
          className="input-field text-sm"
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Izoh — masalan: Payme orqali, 05.08 (ixtiyoriy)"
          className="input-field text-sm"
        />

        {err && <p className="text-danger text-sm">{err}</p>}

        <div className="flex gap-2">
          <button onClick={grant} disabled={busy} className="btn-primary text-sm flex-1 disabled:opacity-50">
            {busy ? '...' : months === 0 ? 'Umrbod berish' : `${months} oy berish`}
          </button>
          {isPremiumNow(user) && (
            <button
              onClick={revoke}
              disabled={busy}
              className="text-sm px-4 rounded-lg font-semibold text-danger hover:bg-danger/10 transition-colors"
            >
              Bekor qilish
            </button>
          )}
          <button onClick={onClose} className="btn-ghost text-sm px-4">Yopish</button>
        </div>

        {grants.length > 0 && (
          <div className="pt-3 border-t border-border/50">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
              Tarix
            </p>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {grants.map((g) => (
                <div key={g.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className={cn('text-text-secondary', g.revokedAt && 'line-through opacity-50')}>
                    {formatDate(g.createdAt)} ·{' '}
                    {g.expiresAt ? `${formatDate(g.expiresAt)} gacha` : 'umrbod'}
                    {g.amount ? ` · ${g.amount.toLocaleString('uz-UZ')} so'm` : ''}
                  </span>
                  <span className="text-text-muted shrink-0">
                    {g.grantedBy?.username ?? g.source}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({
  message, onConfirm, onCancel,
}: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="card-glass p-6 max-w-sm w-full space-y-4"
      >
        <div className="flex gap-3">
          <AlertCircle size={20} className="text-danger shrink-0 mt-0.5" />
          <p className="text-sm text-text-secondary leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-ghost flex-1 py-2 text-sm">Cancel</button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 rounded-lg text-sm font-semibold bg-danger text-white hover:bg-danger/80 transition-colors"
          >
            Confirm
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Users Page ───────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const { user: me } = useAuth();
  const [users,     setUsers]     = useState<AdminUser[]>([]);
  const [meta,      setMeta]      = useState<UsersResponse['meta'] | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [page,      setPage]      = useState(1);
  const [search,    setSearch]    = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('');
  const [premiumFor, setPremiumFor] = useState<AdminUser | null>(null);
  const [confirm,   setConfirm]   = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUsers = useCallback(async (pg = page) => {
    setLoading(true); setError(null);
    try {
      const { data } = await api.get<UsersResponse>('/admin/users', {
        params: { page: pg, limit: 20, ...(search && { search }), ...(roleFilter && { role: roleFilter }) },
      });
      setUsers(data.data);
      setMeta(data.meta);
    } catch { setError('Failed to load users.'); }
    finally { setLoading(false); }
  }, [page, search, roleFilter]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchUsers(1), search ? 350 : 0);
  }, [search, roleFilter]); // eslint-disable-line

  useEffect(() => { fetchUsers(); }, [page]); // eslint-disable-line

  const toast = (msg: string) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(null), 3000);
  };

  const changeRole = (userId: string, newRole: 'USER' | 'ADMIN') => {
    setConfirm({
      message: `Change this user's role to ${newRole}?`,
      onConfirm: async () => {
        setConfirm(null);
        try {
          await api.put(`/admin/users/${userId}/role`, { role: newRole });
          toast(`Role updated to ${newRole}`);
          fetchUsers();
        } catch { toast('Failed to update role.'); }
      },
    });
  };

  const deleteUser = (userId: string, username: string) => {
    setConfirm({
      message: `Permanently delete user "${username}" and all their data? This cannot be undone.`,
      onConfirm: async () => {
        setConfirm(null);
        try {
          await api.delete(`/admin/users/${userId}`);
          toast('User deleted.');
          fetchUsers();
        } catch (err: unknown) {
          const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
          toast(msg ?? 'Failed to delete user.');
        }
      },
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-text-primary mb-1">User Management</h1>
        <p className="text-text-muted text-sm">Manage roles and accounts for all registered users.</p>
      </div>

      {/* ── Filters ─────────────────────────────────────────────── */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search username or email…"
            className="input-field pl-9 text-sm"
          />
        </div>
        <div className="relative">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
            className="input-field pr-8 appearance-none cursor-pointer text-sm"
          >
            <option value="">All Roles</option>
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
          <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        </div>
      </div>

      {/* ── Toast ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {actionMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-3 rounded-xl bg-success/10 border border-success/30 text-success text-sm flex items-center gap-2"
          >
            <UserCheck size={14} /> {actionMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Table ───────────────────────────────────────────────── */}
      {error ? (
        <p className="text-danger text-sm">{error}</p>
      ) : loading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => <div key={i} className="h-14 skeleton rounded-xl" />)}
        </div>
      ) : (
        <>
          <div className="card-glass overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">User</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider hidden sm:table-cell">League</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider hidden md:table-cell">Joined</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Role</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Tarif</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-surface-2/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30
                                          flex items-center justify-center text-xs font-bold text-primary shrink-0">
                            {u.username[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-text-primary">
                              {u.username}
                              {u.id === me?.id && <span className="ml-1.5 text-xs text-primary">(you)</span>}
                            </p>
                            <p className="text-xs text-text-muted">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-sm">
                          {leagueIcon(u.profile?.league ?? 'BRONZE')} {u.profile?.league ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-text-muted">
                        {formatDate(u.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'badge-chip text-xs',
                          u.role === 'ADMIN'
                            ? 'bg-primary/20 text-primary border border-primary/30'
                            : 'bg-surface-2 text-text-muted border border-border',
                        )}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isPremiumNow(u) ? (
                          <span className="badge-chip text-xs bg-accent/15 text-accent border border-accent/30 whitespace-nowrap">
                            <Crown size={11} />
                            {u.premiumUntil
                              ? formatDate(u.premiumUntil)
                              : 'Umrbod'}
                          </span>
                        ) : (
                          <span className="badge-chip text-xs bg-surface-2 text-text-muted border border-border">
                            Bepul
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setPremiumFor(u)}
                            title="Premium boshqarish"
                            className={cn(
                              'p-1.5 rounded-lg transition-colors',
                              isPremiumNow(u)
                                ? 'text-accent hover:bg-accent/10'
                                : 'text-text-muted hover:text-accent hover:bg-accent/10',
                            )}
                          >
                            <Crown size={14} />
                          </button>
                          {u.id !== me?.id && (
                            <>
                              <button
                                onClick={() => changeRole(u.id, u.role === 'ADMIN' ? 'USER' : 'ADMIN')}
                                title={u.role === 'ADMIN' ? 'Demote to USER' : 'Promote to ADMIN'}
                                className={cn(
                                  'p-1.5 rounded-lg transition-colors',
                                  u.role === 'ADMIN'
                                    ? 'text-text-muted hover:text-danger hover:bg-danger/10'
                                    : 'text-text-muted hover:text-primary hover:bg-primary/10',
                                )}
                              >
                                {u.role === 'ADMIN' ? <ShieldOff size={14} /> : <Shield size={14} />}
                              </button>
                              <button
                                onClick={() => deleteUser(u.id, u.username)}
                                title="Delete user"
                                className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {meta && (
            <Pagination
              page={page}
              totalPages={meta.totalPages}
              total={meta.total}
              limit={meta.limit}
              onChange={setPage}
            />
          )}
        </>
      )}

      {/* ── Confirm Dialog ──────────────────────────────────────── */}
      <AnimatePresence>
        {confirm && (
          <ConfirmDialog
            message={confirm.message}
            onConfirm={confirm.onConfirm}
            onCancel={() => setConfirm(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Premium Dialog ──────────────────────────────────────── */}
      <AnimatePresence>
        {premiumFor && (
          <PremiumDialog
            user={premiumFor}
            onClose={() => setPremiumFor(null)}
            onDone={(msg) => {
              setPremiumFor(null);
              toast(msg);
              fetchUsers();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
