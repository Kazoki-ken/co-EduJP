// ─── Vocabulary Types ─────────────────────────────────────────────────────────

export interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginatedMeta;
}

export interface Book {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  createdAt: string;
  _count: {
    topics: number;
    savedBooks: number;
  };
}

export interface Topic {
  id: string;
  name: string;
  bookId: string | null;
  book?: { id: string; title: string } | null;
  _count: {
    wordTopics: number;
  };
}

export interface WordTopic {
  topic: {
    id: string;
    name: string;
    book: { id: string; title: string } | null;
  };
}

export interface Word {
  id: string;
  japaneseWord: string;
  hiragana: string;
  meaning: string;
  exampleSentence: string | null;
  exampleTranslation: string | null;
  createdAt: string;
  isSaved: boolean;
  wordTopics: WordTopic[];
}

export interface WordListParams {
  search?: string;
  topicId?: string;
  bookId?: string;
  page?: number;
  limit?: number;
}
