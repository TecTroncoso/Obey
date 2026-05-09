'use server';

import { db } from '@/lib/db';
import { users, blocks, follows } from '@/lib/db/schema';
import { eq, and, like } from 'drizzle-orm';

export async function getUser(userId: string) {
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result[0] ?? null;
}

export async function createUser(data: {
  id: string;
  username: string;
  displayName: string;
  role: string;
  bio: string;
}) {
  const now = Date.now();
  await db.insert(users).values({
    id: data.id,
    username: data.username.toLowerCase().replace(/[^a-z0-9_]/g, ''),
    displayName: data.displayName || data.username,
    role: data.role,
    bio: data.bio,
    photoUrl: '',
    coverUrl: '',
    displayNameUpdatedAt: now,
    usernameEditsLeft: 1,
    followersCount: 0,
    followingCount: 0,
    createdAt: now,
  });
  return getUser(data.id);
}

export async function setupUserProfile(userId: string, data: {
  username: string;
  displayName: string;
  role: string;
  bio: string;
}) {
  const patch = {
    username: data.username.toLowerCase().replace(/[^a-z0-9_]/g, ''),
    displayName: data.displayName || data.username,
    role: data.role,
    bio: data.bio,
    displayNameUpdatedAt: Date.now(),
  };
  await db.update(users).set(patch).where(eq(users.id, userId));
  return getUser(userId);
}

export async function updateUserProfile(userId: string, updates: {
  displayName?: string;
  username?: string;
  bio?: string;
  photoUrl?: string;
  coverUrl?: string;
}) {
  const current = await getUser(userId);
  if (!current) return null;

  const patch: Record<string, any> = {};

  if (updates.bio !== undefined) patch.bio = updates.bio;
  if (updates.photoUrl !== undefined) patch.photoUrl = updates.photoUrl;
  if (updates.coverUrl !== undefined) patch.coverUrl = updates.coverUrl;

  if (updates.displayName && updates.displayName !== current.displayName) {
    const cooldown = 1209600000; // 14 days
    if (Date.now() >= current.displayNameUpdatedAt + cooldown) {
      patch.displayName = updates.displayName;
      patch.displayNameUpdatedAt = Date.now();
    }
  }

  if (updates.username && updates.username !== current.username) {
    if (current.usernameEditsLeft > 0) {
      patch.username = updates.username.toLowerCase().replace(/[^a-z0-9_]/g, '');
      patch.usernameEditsLeft = current.usernameEditsLeft - 1;
    }
  }

  if (Object.keys(patch).length > 0) {
    await db.update(users).set(patch).where(eq(users.id, userId));
  }

  return getUser(userId);
}

// ── Blocks ─────────────────────────────────────────────

export async function getBlockedUserIds(userId: string) {
  const result = await db.select({ blockedId: blocks.blockedId })
    .from(blocks).where(eq(blocks.blockerId, userId));
  return result.map(r => r.blockedId);
}

export async function getBlockedByUserIds(userId: string) {
  const result = await db.select({ blockerId: blocks.blockerId })
    .from(blocks).where(eq(blocks.blockedId, userId));
  return result.map(r => r.blockerId);
}

export async function blockUser(blockerId: string, blockedId: string) {
  await db.insert(blocks).values({ blockerId, blockedId, createdAt: Date.now() });
}

export async function unblockUser(blockerId: string, blockedId: string) {
  await db.delete(blocks).where(
    and(eq(blocks.blockerId, blockerId), eq(blocks.blockedId, blockedId))
  );
}

// ── Follows ────────────────────────────────────────────

export async function getFollowingUserIds(userId: string) {
  const result = await db.select({ followingId: follows.followingId })
    .from(follows).where(eq(follows.followerId, userId));
  return result.map(r => r.followingId);
}

export async function toggleFollow(followerId: string, followingId: string) {
  const existing = await db.select().from(follows)
    .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)))
    .limit(1);

  if (existing.length > 0) {
    // Unfollow
    await db.delete(follows).where(
      and(eq(follows.followerId, followerId), eq(follows.followingId, followingId))
    );
    await db.update(users).set({ followingCount: Math.max(0, (await getUser(followerId))!.followingCount - 1) }).where(eq(users.id, followerId));
    await db.update(users).set({ followersCount: Math.max(0, (await getUser(followingId))!.followersCount - 1) }).where(eq(users.id, followingId));
    return false; // now unfollowed
  } else {
    // Follow
    await db.insert(follows).values({ followerId, followingId, createdAt: Date.now() });
    await db.update(users).set({ followingCount: (await getUser(followerId))!.followingCount + 1 }).where(eq(users.id, followerId));
    await db.update(users).set({ followersCount: (await getUser(followingId))!.followersCount + 1 }).where(eq(users.id, followingId));
    return true; // now following
  }
}

// ── Search ─────────────────────────────────────────────

export async function searchUsers(query: string) {
  if (!query) return [];
  const results = await db.select().from(users)
    .where(like(users.username, `${query.toLowerCase()}%`))
    .limit(5);
  return results;
}

export async function resolveUsernamesToIds(usernames: string[]) {
  if (usernames.length === 0) return [];
  const ids: string[] = [];
  for (const username of usernames) {
    const result = await db.select({ id: users.id }).from(users)
      .where(eq(users.username, username)).limit(1);
    if (result[0]) ids.push(result[0].id);
  }
  return ids;
}

export async function getBlockedUsers(userId: string) {
  const blockedIds = await getBlockedUserIds(userId);
  if (blockedIds.length === 0) return [];
  const result: any[] = [];
  for (const id of blockedIds) {
    const u = await getUser(id);
    if (u) result.push(u);
  }
  return result;
}
