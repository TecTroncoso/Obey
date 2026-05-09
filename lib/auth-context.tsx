'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useSession, signOut as nextAuthSignOut, SessionProvider } from 'next-auth/react';
import {
  getUser,
  getBlockedUserIds,
  getBlockedByUserIds,
  getFollowingUserIds,
} from '@/lib/actions/user.actions';

interface AuthContextType {
  user: any | null;
  dbUser: any | null;
  blockedUserIds: string[];
  blockedByUserIds: string[];
  followingUserIds: string[];
  loading: boolean;
  signOut: () => Promise<void>;
  refreshDbUser: () => Promise<void>;
  refreshBlocks: () => Promise<void>;
  refreshFollows: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  dbUser: null,
  blockedUserIds: [],
  blockedByUserIds: [],
  followingUserIds: [],
  loading: true,
  signOut: async () => {},
  refreshDbUser: async () => {},
  refreshBlocks: async () => {},
  refreshFollows: async () => {},
});

function AuthProviderInner({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [dbUser, setDbUser] = useState<any | null>(null);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [blockedByUserIds, setBlockedByUserIds] = useState<string[]>([]);
  const [followingUserIds, setFollowingUserIds] = useState<string[]>([]);
  
  const [dbLoading, setDbLoading] = useState(true);

  const fetchBlocks = useCallback(async (uid: string) => {
    try {
      const [blocked, blockedBy] = await Promise.all([
        getBlockedUserIds(uid),
        getBlockedByUserIds(uid),
      ]);
      setBlockedUserIds(blocked);
      setBlockedByUserIds(blockedBy);
    } catch (err) {
      console.error(err);
      setBlockedUserIds([]);
      setBlockedByUserIds([]);
    }
  }, []);

  const fetchFollows = useCallback(async (uid: string) => {
    try {
      const following = await getFollowingUserIds(uid);
      setFollowingUserIds(following);
    } catch (err) {
      console.error(err);
      setFollowingUserIds([]);
    }
  }, []);

  const fetchDbUser = useCallback(async (uid: string) => {
    try {
      const userData = await getUser(uid);
      setDbUser(userData);
      await fetchBlocks(uid);
      await fetchFollows(uid);
    } catch (err) {
      console.error(err);
      setDbUser(null);
    }
  }, [fetchBlocks, fetchFollows]);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      fetchDbUser(session.user.id).finally(() => setDbLoading(false));
    } else if (status === 'unauthenticated') {
      setDbUser(null);
      setDbLoading(false);
    }
  }, [status, session, fetchDbUser]);

  const handleSignOut = async () => {
    await nextAuthSignOut();
  };

  const refreshDbUser = async () => {
    if (session?.user?.id) await fetchDbUser(session.user.id);
  };

  const refreshBlocks = async () => {
    if (session?.user?.id) await fetchBlocks(session.user.id);
  };

  const refreshFollows = async () => {
    if (session?.user?.id) await fetchFollows(session.user.id);
  };

  const loading = status === 'loading' || (status === 'authenticated' && dbLoading);
  const user = session?.user || null;

  return (
    <AuthContext.Provider value={{ user, dbUser, blockedUserIds, blockedByUserIds, followingUserIds, loading, signOut: handleSignOut, refreshDbUser, refreshBlocks, refreshFollows }}>
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthProviderInner>{children}</AuthProviderInner>
    </SessionProvider>
  );
}

export const useAuth = () => useContext(AuthContext);
