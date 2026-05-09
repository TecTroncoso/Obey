'use server';

import { db } from '@/lib/db';
import { posts, postLikes, replies, hashtags } from '@/lib/db/schema';
import { eq, and, desc, asc, inArray } from 'drizzle-orm';
import { extractHashtags } from '@/lib/hashtags';

function generateId() {
  return crypto.randomUUID();
}

// ── Posts ───────────────────────────────────────────────

export async function getPosts() {
  return db.select().from(posts).orderBy(desc(posts.createdAt));
}

export async function getPostsByAuthor(authorId: string) {
  return db.select().from(posts)
    .where(eq(posts.authorId, authorId))
    .orderBy(desc(posts.createdAt));
}

export async function getPost(postId: string) {
  const result = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
  return result[0] ?? null;
}

export async function createPost(data: {
  authorId: string;
  content: string;
  imageUrl?: string;
  mentions?: string[];
}) {
  const id = generateId();
  const now = Date.now();

  await db.insert(posts).values({
    id,
    authorId: data.authorId,
    content: data.content.trim(),
    imageUrl: data.imageUrl || '',
    likesCount: 0,
    repliesCount: 0,
    mentions: JSON.stringify(data.mentions || []),
    isEdited: false,
    createdAt: now,
  });

  // Upsert hashtags
  const tags = extractHashtags(data.content);
  for (const tag of tags) {
    const existing = await db.select().from(hashtags).where(eq(hashtags.name, tag)).limit(1);
    if (existing[0]) {
      await db.update(hashtags).set({ count: existing[0].count + 1, lastUsedAt: now }).where(eq(hashtags.name, tag));
    } else {
      await db.insert(hashtags).values({ name: tag, count: 1, lastUsedAt: now, createdAt: now });
    }
  }

  return id;
}

export async function updatePost(postId: string, data: {
  content: string;
  imageUrl?: string;
  mentions?: string[];
}) {
  await db.update(posts).set({
    content: data.content.trim(),
    imageUrl: data.imageUrl || '',
    mentions: JSON.stringify(data.mentions || []),
    isEdited: true,
    updatedAt: Date.now(),
  }).where(eq(posts.id, postId));
}

export async function deletePost(postId: string) {
  // Delete likes and replies first
  await db.delete(postLikes).where(eq(postLikes.postId, postId));
  await db.delete(replies).where(eq(replies.postId, postId));
  await db.delete(posts).where(eq(posts.id, postId));
}

// ── Likes ──────────────────────────────────────────────

export async function hasUserLikedPost(postId: string, userId: string) {
  const result = await db.select().from(postLikes)
    .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)))
    .limit(1);
  return result.length > 0;
}

export async function toggleLike(postId: string, userId: string) {
  const liked = await hasUserLikedPost(postId, userId);
  const post = await getPost(postId);
  if (!post) return;

  if (liked) {
    await db.delete(postLikes).where(
      and(eq(postLikes.postId, postId), eq(postLikes.userId, userId))
    );
    await db.update(posts).set({ likesCount: Math.max(0, post.likesCount - 1) }).where(eq(posts.id, postId));
  } else {
    await db.insert(postLikes).values({ postId, userId, createdAt: Date.now() });
    await db.update(posts).set({ likesCount: post.likesCount + 1 }).where(eq(posts.id, postId));
  }
  return !liked;
}

export async function getLikedPostIds(userId: string) {
  const result = await db.select({ postId: postLikes.postId })
    .from(postLikes).where(eq(postLikes.userId, userId));
  return result.map(r => r.postId);
}

export async function getLikedPosts(userId: string) {
  const likedIds = await getLikedPostIds(userId);
  if (likedIds.length === 0) return [];
  return db.select().from(posts).where(inArray(posts.id, likedIds)).orderBy(desc(posts.createdAt));
}

// ── Replies ────────────────────────────────────────────

export async function getReplies(postId: string) {
  return db.select().from(replies)
    .where(eq(replies.postId, postId))
    .orderBy(asc(replies.createdAt));
}

export async function getRepliesByAuthor(authorId: string) {
  return db.select().from(replies)
    .where(eq(replies.authorId, authorId))
    .orderBy(desc(replies.createdAt));
}

export async function createReply(data: {
  postId: string;
  authorId: string;
  content: string;
  imageUrl?: string;
  mentions?: string[];
}) {
  const id = generateId();
  const now = Date.now();

  await db.insert(replies).values({
    id,
    postId: data.postId,
    authorId: data.authorId,
    content: data.content.trim(),
    imageUrl: data.imageUrl || '',
    mentions: JSON.stringify(data.mentions || []),
    createdAt: now,
  });

  // Increment reply count
  const post = await getPost(data.postId);
  if (post) {
    await db.update(posts).set({ repliesCount: post.repliesCount + 1 }).where(eq(posts.id, data.postId));
  }

  // Upsert hashtags
  const tags = extractHashtags(data.content);
  for (const tag of tags) {
    const existing = await db.select().from(hashtags).where(eq(hashtags.name, tag)).limit(1);
    if (existing[0]) {
      await db.update(hashtags).set({ count: existing[0].count + 1, lastUsedAt: now }).where(eq(hashtags.name, tag));
    } else {
      await db.insert(hashtags).values({ name: tag, count: 1, lastUsedAt: now, createdAt: now });
    }
  }

  return id;
}

export async function updateReply(replyId: string, data: { content: string; mentions?: string[] }) {
  await db.update(replies).set({
    content: data.content.trim(),
    mentions: JSON.stringify(data.mentions || []),
  }).where(eq(replies.id, replyId));
}

export async function deleteReply(replyId: string, postId: string) {
  await db.delete(replies).where(eq(replies.id, replyId));
  const post = await getPost(postId);
  if (post) {
    await db.update(posts).set({ repliesCount: Math.max(0, post.repliesCount - 1) }).where(eq(posts.id, postId));
  }
}

// ── Hashtags / Trends ──────────────────────────────────

export async function getTrends(limitCount = 5) {
  return db.select().from(hashtags).orderBy(desc(hashtags.count)).limit(limitCount);
}
