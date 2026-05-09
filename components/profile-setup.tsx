'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { setupUserProfile } from '@/lib/actions/user.actions';
import { Loader2 } from 'lucide-react';

export function ProfileSetup() {
  const { user, refreshDbUser } = useAuth();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('unset');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setErrorMsg('');
    try {
      await setupUserProfile(user.id, {
        username,
        displayName,
        role,
        bio,
      });
      await refreshDbUser();
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during setup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-8 shadow-xl">
        <h2 className="mb-6 text-2xl font-bold text-white">Setup your Node</h2>
        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/50 rounded-xl text-rose-500 text-sm">
            {errorMsg}
          </div>
        )}
        
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-400">Username</label>
            <input required minLength={3} maxLength={30} value={username} onChange={e => setUsername(e.target.value)} className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-white focus:border-rose-500 focus:outline-none" placeholder="nexus_bound" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-400">Display Name</label>
            <input required minLength={1} maxLength={50} value={displayName} onChange={e => setDisplayName(e.target.value)} className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-white focus:border-rose-500 focus:outline-none" placeholder="Nexus Bound" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-400">Dynamic</label>
            <select value={role} onChange={e => setRole(e.target.value)} className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-white focus:border-rose-500 focus:outline-none">
              <option value="unset">Prefer not to say</option>
              <option value="dom">Dominant / Top</option>
              <option value="sub">Submissive / Bottom</option>
              <option value="switch">Switch</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-400">Bio (Optional)</label>
            <textarea maxLength={160} rows={3} value={bio} onChange={e => setBio(e.target.value)} className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-white focus:border-rose-500 focus:outline-none" placeholder="A brief whisper..." />
          </div>
          <button disabled={loading} type="submit" className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 py-3 font-bold text-white hover:bg-rose-600 disabled:opacity-50">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Enter the Grid'}
          </button>
        </div>
      </form>
    </div>
  );
}
