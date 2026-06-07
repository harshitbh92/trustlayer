import { Injectable } from "@nestjs/common";
import { RedisService } from "../redis/redis.service";

interface QueueEntry {
  userId: string;
  sessionId: string;
}

/**
 * FIFO match queue keyed by (mood, topic, language). Falls back to a default
 * queue when no filters are supplied so users without preferences still
 * match each other.
 *
 * The reference MVP did matching with a `findFirst` on the database which is
 * race-prone under any meaningful concurrency. Redis lists give us atomic
 * push/pop semantics for free.
 */
@Injectable()
export class MatchQueueService {
  constructor(private readonly redis: RedisService) {}

  private key(filters: { mood?: string; topic?: string; language?: string }) {
    const m = (filters.mood ?? "any").toLowerCase();
    const t = (filters.topic ?? "any").toLowerCase();
    const l = (filters.language ?? "any").toLowerCase();
    return `trustlayer:match:${m}:${t}:${l}`;
  }

  async pop(filters: {
    mood?: string;
    topic?: string;
    language?: string;
  }): Promise<QueueEntry | null> {
    const raw = await this.redis.client.rpop(this.key(filters));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as QueueEntry;
    } catch {
      return null;
    }
  }

  async push(
    filters: { mood?: string; topic?: string; language?: string },
    entry: QueueEntry,
  ): Promise<void> {
    await this.redis.client.lpush(this.key(filters), JSON.stringify(entry));
  }

  async removeBySession(
    filters: { mood?: string; topic?: string; language?: string },
    sessionId: string,
  ): Promise<void> {
    const key = this.key(filters);
    const items = await this.redis.client.lrange(key, 0, -1);
    for (const raw of items) {
      try {
        const parsed = JSON.parse(raw) as QueueEntry;
        if (parsed.sessionId === sessionId) {
          await this.redis.client.lrem(key, 1, raw);
        }
      } catch {
        // ignore
      }
    }
  }
}
