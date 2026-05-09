import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
import type { AdapterAccountType } from "next-auth/adapters";

// ── Users ──────────────────────────────────────────────
export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').unique(),
  emailVerified: integer('emailVerified', { mode: 'timestamp_ms' }),
  image: text('image'),
  
  username: text('username').unique(),
  displayName: text('display_name').default(''),
  role: text('role').notNull().default('user'),
  bio: text('bio').default(''),
  photoUrl: text('photo_url').default(''),
  coverUrl: text('cover_url').default(''),
  displayNameUpdatedAt: integer('display_name_updated_at').notNull().default(0),
  usernameEditsLeft: integer('username_edits_left').notNull().default(1),
  followersCount: integer('followers_count').notNull().default(0),
  followingCount: integer('following_count').notNull().default(0),
  createdAt: integer('created_at').notNull().$defaultFn(() => Date.now()),
});

export const accounts = sqliteTable("accounts", {
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").$type<AdapterAccountType>().notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("providerAccountId").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
}, (account) => ({
  compoundKey: primaryKey({ columns: [account.provider, account.providerAccountId] }),
}));

export const sessions = sqliteTable("sessions", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
});

export const verificationTokens = sqliteTable("verificationTokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
}, (verificationToken) => ({
  compositePk: primaryKey({ columns: [verificationToken.identifier, verificationToken.token] }),
}));

// ── Follows ────────────────────────────────────────────
export const follows = sqliteTable('follows', {
  followerId: text('follower_id').notNull().references(() => users.id),
  followingId: text('following_id').notNull().references(() => users.id),
  createdAt: integer('created_at').notNull(),
});

// ── Blocks ─────────────────────────────────────────────
export const blocks = sqliteTable('blocks', {
  blockerId: text('blocker_id').notNull().references(() => users.id),
  blockedId: text('blocked_id').notNull().references(() => users.id),
  createdAt: integer('created_at').notNull(),
});

// ── Posts ───────────────────────────────────────────────
export const posts = sqliteTable('posts', {
  id: text('id').primaryKey(),
  authorId: text('author_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  imageUrl: text('image_url').default(''),
  likesCount: integer('likes_count').notNull().default(0),
  repliesCount: integer('replies_count').notNull().default(0),
  mentions: text('mentions').default('[]'), // JSON array of user IDs
  isEdited: integer('is_edited', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at'),
});

// ── Post Likes ─────────────────────────────────────────
export const postLikes = sqliteTable('post_likes', {
  postId: text('post_id').notNull().references(() => posts.id),
  userId: text('user_id').notNull().references(() => users.id),
  createdAt: integer('created_at').notNull(),
});

// ── Replies ────────────────────────────────────────────
export const replies = sqliteTable('replies', {
  id: text('id').primaryKey(),
  postId: text('post_id').notNull().references(() => posts.id),
  authorId: text('author_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  imageUrl: text('image_url').default(''),
  mentions: text('mentions').default('[]'), // JSON array of user IDs
  createdAt: integer('created_at').notNull(),
});

// ── Hashtags ───────────────────────────────────────────
export const hashtags = sqliteTable('hashtags', {
  name: text('name').primaryKey(),
  count: integer('count').notNull().default(0),
  lastUsedAt: integer('last_used_at').notNull(),
  createdAt: integer('created_at').notNull(),
});

// ── Chats ──────────────────────────────────────────────
export const chats = sqliteTable('chats', {
  id: text('id').primaryKey(),
  updatedAt: integer('updated_at').notNull(),
  lastMessage: text('last_message').default(''),
});

// ── Chat Participants ──────────────────────────────────
export const chatParticipants = sqliteTable('chat_participants', {
  chatId: text('chat_id').notNull().references(() => chats.id),
  userId: text('user_id').notNull().references(() => users.id),
});

// ── Messages ───────────────────────────────────────────
export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  chatId: text('chat_id').notNull().references(() => chats.id),
  authorId: text('author_id').notNull().references(() => users.id),
  content: text('content').default(''),
  imageUrl: text('image_url').default(''),
  createdAt: integer('created_at').notNull(),
});
