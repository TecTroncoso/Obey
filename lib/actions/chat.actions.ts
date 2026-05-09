'use server';

import { db } from '@/lib/db';
import { chats, chatParticipants, messages } from '@/lib/db/schema';
import { eq, and, asc, desc } from 'drizzle-orm';

function generateId() {
  return crypto.randomUUID();
}

export async function getUserChats(userId: string) {
  // Get chat IDs where user is participant
  const participantRows = await db.select({ chatId: chatParticipants.chatId })
    .from(chatParticipants).where(eq(chatParticipants.userId, userId));

  if (participantRows.length === 0) return [];

  const chatIds = participantRows.map(r => r.chatId);
  const result: any[] = [];

  for (const chatId of chatIds) {
    const chatRows = await db.select().from(chats).where(eq(chats.id, chatId)).limit(1);
    if (!chatRows[0]) continue;

    const participants = await db.select({ userId: chatParticipants.userId })
      .from(chatParticipants).where(eq(chatParticipants.chatId, chatId));

    result.push({
      ...chatRows[0],
      participants: participants.map(p => p.userId),
    });
  }

  result.sort((a, b) => b.updatedAt - a.updatedAt);
  return result;
}

export async function getOrCreateChat(userIdA: string, userIdB: string) {
  const chatId = [userIdA, userIdB].sort().join('_');

  const existing = await db.select().from(chats).where(eq(chats.id, chatId)).limit(1);
  if (existing[0]) return chatId;

  await db.insert(chats).values({
    id: chatId,
    updatedAt: Date.now(),
    lastMessage: '',
  });

  await db.insert(chatParticipants).values([
    { chatId, userId: userIdA },
    { chatId, userId: userIdB },
  ]);

  return chatId;
}

export async function getChatMessages(chatId: string) {
  return db.select().from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(asc(messages.createdAt));
}

export async function sendMessage(data: {
  chatId: string;
  authorId: string;
  content: string;
  imageUrl?: string;
}) {
  const id = generateId();
  const now = Date.now();

  await db.insert(messages).values({
    id,
    chatId: data.chatId,
    authorId: data.authorId,
    content: data.content.trim(),
    imageUrl: data.imageUrl || '',
    createdAt: now,
  });

  const lastMsg = data.imageUrl && !data.content.trim() ? 'Photo' : data.content.trim();
  await db.update(chats).set({ updatedAt: now, lastMessage: lastMsg }).where(eq(chats.id, data.chatId));

  return id;
}
