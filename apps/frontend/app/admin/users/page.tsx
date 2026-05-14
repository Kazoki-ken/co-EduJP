'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Shield, ShieldOff, Trash2, ChevronDown, AlertCircle, UserCheck } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { cn, leagueIcon, formatDate } from '@/lib/utils';
import { Pagination } from '@/components/ui/Pagination';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
  profile: {
    streak: number;
    xp: number;
    coins: number;
    league: string;
  } | null;
}

interface UsersResponse {
  data: AdminUser[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

type RoleFilter = '' | 'USER' | 'ADMIN';

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
                        <div className="flex items-center justify-end gap-1">
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
    </div>
  );
}
