'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Save, Eye, EyeOff, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

// ─── Known config keys ───────────────────────────────────────────────────────

const KNOWN_KEYS: { key: string; label: string; desc: string; sensitive: boolean; placeholder: string }[] = [
  {
    key:         'gemini_api_key',
    label:       'Gemini API Key',
    desc:        'Google Gemini API key for the AI Chat feature. Leave empty to use the .env fallback.',
    sensitive:   true,
    placeholder: 'AIza…',
  },
  {
    key:         'site_name',
    label:       'Site Name',
    desc:        'Display name shown in metadata and emails.',
    sensitive:   false,
    placeholder: 'VocabJP',
  },
  {
    key:         'site_announcement',
    label:       'Site Announcement',
    desc:        'Optional banner message shown to all users.',
    sensitive:   false,
    placeholder: 'Welcome to VocabJP!',
  },
];

// ─── Config Row ───────────────────────────────────────────────────────────────

function ConfigRow({
  configKey, value, onSave, onDelete,
}: {
  configKey: string; value: string;
  onSave: (k: string, v: string) => Promise<void>;
  onDelete: (k: string) => Promise<void>;
}) {
  const meta        = KNOWN_KEYS.find((k) => k.key === configKey);
  const [val,       setVal]       = useState(value);
  const [show,      setShow]      = useState(!meta?.sensitive);
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState(false);
  const [saved,     setSaved]     = useState(false);
  const isDirty = val !== value;

  const handleSave = async () => {
    setSaving(true);
    await onSave(configKey, val);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(configKey);
  };

  return (
    <div className="card-glass p-5 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-text-primary text-sm">
            {meta?.label ?? configKey}
            {meta?.sensitive && (
              <span className="ml-2 text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
                Sensitive
              </span>
            )}
          </p>
          <p className="text-xs text-text-muted font-mono mt-0.5">{configKey}</p>
          {meta?.desc && <p className="text-xs text-text-muted mt-1 leading-relaxed">{meta.desc}</p>}
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={meta?.sensitive && !show ? 'password' : 'text'}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder={meta?.placeholder ?? ''}
            className={cn('input-field text-sm pr-10', meta?.sensitive && 'font-mono')}
          />
          {meta?.sensitive && (
            <button
              onClick={() => setShow((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
            >
              {show ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={!isDirty || saving}
          className={cn(
            'px-3 py-2 rounded-lg text-sm font-medium border transition-all shrink-0',
            isDirty
              ? 'bg-primary border-primary text-white hover:bg-primary-hover shadow-glow-sm'
              : 'border-border text-text-muted opacity-50 cursor-not-allowed',
          )}
        >
          {saving
            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : saved
              ? <CheckCircle size={14} className="text-success" />
              : <Save size={14} />
          }
        </button>

        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-3 py-2 rounded-lg text-sm border border-border text-text-muted hover:text-danger hover:border-danger/50 transition-all shrink-0"
        >
          {deleting
            ? <div className="w-4 h-4 border-2 border-text-muted/30 border-t-danger rounded-full animate-spin" />
            : <Trash2 size={14} />
          }
        </button>
      </div>
    </div>
  );
}

// ─── Config Page ──────────────────────────────────────────────────────────────

export default function AdminConfigPage() {
  const [config,    setConfig]    = useState<Record<string, string>>({});
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [toast,     setToast]     = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // New key form
  const [newKey,    setNewKey]    = useState('');
  const [newVal,    setNewVal]    = useState('');
  const [addingNew, setAddingNew] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchConfig = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { data } = await api.get<Record<string, string>>('/admin/config');
      setConfig(data);
    } catch { setError('Failed to load configuration.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleSave = async (key: string, value: string) => {
    try {
      const { data } = await api.put<Record<string, string>>('/admin/config', { [key]: value });
      setConfig(data);
      showToast(`"${key}" saved.`);
    } catch {
      showToast(`Failed to save "${key}".`, 'error');
    }
  };

  const handleDelete = async (key: string) => {
    try {
      await api.delete(`/admin/config/${key}`);
      setConfig((prev) => { const n = { ...prev }; delete n[key]; return n; });
      showToast(`"${key}" removed.`);
    } catch {
      showToast(`Failed to delete "${key}".`, 'error');
    }
  };

  const handleAddNew = async () => {
    if (!newKey.trim() || !newVal.trim()) return;
    setAddingNew(true);
    try {
      const { data } = await api.put<Record<string, string>>('/admin/config', { [newKey.trim()]: newVal.trim() });
      setConfig(data);
      setNewKey(''); setNewVal(''); setShowNewForm(false);
      showToast(`"${newKey.trim()}" added.`);
    } catch {
      showToast('Failed to add key.', 'error');
    } finally { setAddingNew(false); }
  };

  // Merge: show known keys first (even if not yet set), then extra keys from DB
  const knownKeysInDb    = KNOWN_KEYS.filter((k) => k.key in config);
  const unknownKeysInDb  = Object.keys(config).filter((k) => !KNOWN_KEYS.find((m) => m.key === k));
  const knownKeysNotInDb = KNOWN_KEYS.filter((k) => !(k.key in config));

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary mb-1">Site Configuration</h1>
          <p className="text-text-muted text-sm">Manage dynamic settings stored in the database.</p>
        </div>
        <button onClick={fetchConfig} disabled={loading} className="p-2 rounded-lg border border-border text-text-muted hover:text-primary hover:border-primary/50 transition-all">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className={cn(
              'flex items-center gap-2 p-3 rounded-xl border text-sm',
              toast.type === 'success'
                ? 'bg-success/10 border-success/30 text-success'
                : 'bg-danger/10 border-danger/30 text-danger',
            )}
          >
            {toast.type === 'success'
              ? <CheckCircle size={14} /> : <AlertCircle size={14} />
            }
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {error && <p className="text-danger text-sm">{error}</p>}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-28 skeleton rounded-xl" />)}
        </div>
      ) : (
        <>
          {/* Known keys that ARE set */}
          {knownKeysInDb.map(({ key }) => (
            <ConfigRow key={key} configKey={key} value={config[key]!} onSave={handleSave} onDelete={handleDelete} />
          ))}

          {/* Unknown keys from DB */}
          {unknownKeysInDb.map((key) => (
            <ConfigRow key={key} configKey={key} value={config[key]!} onSave={handleSave} onDelete={handleDelete} />
          ))}

          {/* Known keys NOT yet set (ghost state) */}
          {knownKeysNotInDb.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-text-muted uppercase tracking-widest font-semibold">Not configured yet</p>
              {knownKeysNotInDb.map(({ key, label, desc, placeholder, sensitive }) => (
                <div key={key} className="card-glass p-5 opacity-60 border-dashed space-y-3">
                  <div>
                    <p className="font-semibold text-text-primary text-sm">{label}</p>
                    <p className="text-xs text-text-muted font-mono mt-0.5">{key}</p>
                    {desc && <p className="text-xs text-text-muted mt-1">{desc}</p>}
                  </div>
                  <button
                    onClick={() => { setNewKey(key); setShowNewForm(true); }}
                    className="text-xs text-primary hover:underline"
                  >
                    + Set this value
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add new key form */}
          <div>
            {!showNewForm ? (
              <button
                onClick={() => setShowNewForm(true)}
                className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
              >
                <Plus size={14} /> Add custom key
              </button>
            ) : (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="card-glass p-5 space-y-3"
              >
                <p className="font-semibold text-text-primary text-sm">New Configuration Key</p>
                <input
                  type="text"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="key_name (snake_case)"
                  className="input-field text-sm font-mono"
                />
                <input
                  type="text"
                  value={newVal}
                  onChange={(e) => setNewVal(e.target.value)}
                  placeholder="Value…"
                  className="input-field text-sm"
                />
                <div className="flex gap-2">
                  <button onClick={() => setShowNewForm(false)} className="btn-ghost flex-1 py-2 text-sm">Cancel</button>
                  <button
                    onClick={handleAddNew}
                    disabled={!newKey.trim() || !newVal.trim() || addingNew}
                    className="btn-primary flex-1 py-2 text-sm flex items-center justify-center gap-2"
                  >
                    {addingNew
                      ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <><Save size={13} /> Save</>
                    }
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
