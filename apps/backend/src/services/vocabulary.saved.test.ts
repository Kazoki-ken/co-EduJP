import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../lib/prisma';
import { listTopics, getTopicsByBook, toggleSaveWord, toggleSaveTopic } from './vocabulary.service';

/**
 * The `isSaved` flag on a topic means "this learner has saved every word in
 * it". Computing it is the hottest query in the dictionary and is about to be
 * rewritten, so these tests pin the observable behaviour first.
 *
 * They run against the development database and clean up after themselves.
 */

let userId: string;
let otherUserId: string;
let bookId: string;
let fullTopicId: string;   // every word saved
let partialTopicId: string; // some words saved
let emptyTopicId: string;   // no words at all
const wordIds: string[] = [];
const suffix = String(Date.now());

beforeAll(async () => {
  const user = await prisma.user.create({
    data: { username: 'vt_user_' + suffix, profile: { create: {} } },
  });
  userId = user.id;
  const other = await prisma.user.create({
    data: { username: 'vt_other_' + suffix, profile: { create: {} } },
  });
  otherUserId = other.id;

  // Official content: authorId null is what the dictionary lists.
  const book = await prisma.book.create({ data: { title: 'VT book ' + suffix } });
  bookId = book.id;

  const mkTopic = async (name: string) =>
    (await prisma.topic.create({ data: { name: `${name} ${suffix}`, bookId } })).id;
  fullTopicId = await mkTopic('VT full');
  partialTopicId = await mkTopic('VT partial');
  emptyTopicId = await mkTopic('VT empty');

  // Three words in the full topic, two in the partial one.
  for (let i = 0; i < 5; i++) {
    const w = await prisma.word.create({
      data: { japaneseWord: `語${i}${suffix}`, meaning: `mano ${i}` },
    });
    wordIds.push(w.id);
  }
  await prisma.wordTopic.createMany({
    data: [
      ...wordIds.slice(0, 3).map((wordId) => ({ wordId, topicId: fullTopicId })),
      ...wordIds.slice(3, 5).map((wordId) => ({ wordId, topicId: partialTopicId })),
    ],
  });

  // Save all of the full topic, and only one word of the partial one.
  await prisma.savedWord.createMany({
    data: [...wordIds.slice(0, 3), wordIds[3]!].map((wordId) => ({ userId, wordId })),
  });
});

afterAll(async () => {
  await prisma.word.deleteMany({ where: { id: { in: wordIds } } });
  await prisma.topic.deleteMany({ where: { id: { in: [fullTopicId, partialTopicId, emptyTopicId] } } });
  await prisma.book.deleteMany({ where: { id: bookId } });
  await prisma.user.deleteMany({ where: { id: { in: [userId, otherUserId] } } });
  await prisma.$disconnect();
});

const find = <T extends { id: string }>(list: T[], id: string) => {
  const hit = list.find((t) => t.id === id);
  expect(hit, 'topic missing from listing').toBeDefined();
  return hit!;
};

describe('listTopics — the isSaved flag', () => {
  it('marks a topic saved only when every word in it is saved', async () => {
    const topics = (await listTopics(undefined, userId)) as { id: string; isSaved: boolean }[];
    expect(find(topics, fullTopicId).isSaved).toBe(true);
    expect(find(topics, partialTopicId).isSaved).toBe(false);
  });

  it('never marks an empty topic saved', async () => {
    // Nothing to save means nothing is saved — not "vacuously complete".
    const topics = (await listTopics(undefined, userId)) as { id: string; isSaved: boolean }[];
    expect(find(topics, emptyTopicId).isSaved).toBe(false);
  });

  it('reports everything unsaved for a different learner', async () => {
    const topics = (await listTopics(undefined, otherUserId)) as { id: string; isSaved: boolean }[];
    expect(find(topics, fullTopicId).isSaved).toBe(false);
  });

  it('reports everything unsaved when nobody is signed in', async () => {
    const topics = (await listTopics(undefined)) as { id: string; isSaved: boolean }[];
    expect(find(topics, fullTopicId).isSaved).toBe(false);
  });

  it('still returns the word count alongside the flag', async () => {
    const topics = (await listTopics(undefined, userId)) as
      { id: string; _count: { wordTopics: number } }[];
    expect(find(topics, fullTopicId)._count.wordTopics).toBe(3);
    expect(find(topics, emptyTopicId)._count.wordTopics).toBe(0);
  });

  it('filters to one book when asked', async () => {
    const topics = (await listTopics(bookId, userId)) as { id: string; isSaved: boolean }[];
    expect(topics.length).toBe(3);
    expect(find(topics, fullTopicId).isSaved).toBe(true);
  });
});

describe('getTopicsByBook — same rules', () => {
  it('agrees with listTopics on every flag', async () => {
    const byBook = (await getTopicsByBook(bookId, userId)) as { id: string; isSaved: boolean }[];
    expect(find(byBook, fullTopicId).isSaved).toBe(true);
    expect(find(byBook, partialTopicId).isSaved).toBe(false);
    expect(find(byBook, emptyTopicId).isSaved).toBe(false);
  });
});

describe('toggleSaveWord — keeps SavedTopic in step', () => {
  it('drops the topic from saved-topics when one word is unsaved', async () => {
    await toggleSaveWord(userId, wordIds[0]!); // unsave
    const topics = (await listTopics(undefined, userId)) as { id: string; isSaved: boolean }[];
    expect(find(topics, fullTopicId).isSaved).toBe(false);

    const row = await prisma.savedTopic.findUnique({
      where: { userId_topicId: { userId, topicId: fullTopicId } },
    });
    expect(row).toBeNull();
  });

  it('restores it when the word comes back', async () => {
    await toggleSaveWord(userId, wordIds[0]!); // save again
    const topics = (await listTopics(undefined, userId)) as { id: string; isSaved: boolean }[];
    expect(find(topics, fullTopicId).isSaved).toBe(true);

    const row = await prisma.savedTopic.findUnique({
      where: { userId_topicId: { userId, topicId: fullTopicId } },
    });
    expect(row).not.toBeNull();
  });
});

describe('toggleSaveTopic', () => {
  it('fills the missing words rather than toggling off a partial topic', async () => {
    const result = await toggleSaveTopic(userId, partialTopicId);
    expect(result.saved).toBe(true);

    const topics = (await listTopics(undefined, userId)) as { id: string; isSaved: boolean }[];
    expect(find(topics, partialTopicId).isSaved).toBe(true);
  });

  it('only unsaves once the topic is complete', async () => {
    const result = await toggleSaveTopic(userId, partialTopicId);
    expect(result.saved).toBe(false);

    const topics = (await listTopics(undefined, userId)) as { id: string; isSaved: boolean }[];
    expect(find(topics, partialTopicId).isSaved).toBe(false);
  });
});
