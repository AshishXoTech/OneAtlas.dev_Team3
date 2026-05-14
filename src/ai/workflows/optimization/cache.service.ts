import crypto from 'node:crypto';

interface CacheWrapResult<T> {
  data: T;
  cacheHit: boolean;
}

class CacheService {
  private readonly baseUrl: string;

  private readonly token: string;

  constructor() {
    this.baseUrl =
      process.env.UPSTASH_REDIS_REST_URL ?? '';

    this.token =
      process.env.UPSTASH_REDIS_REST_TOKEN ?? '';
  }

  buildKey(
    prompt: string,
    operationType: string,
  ): string {
    const normalized = prompt
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');

    const hash = crypto
      .createHash('sha256')
      .update(normalized)
      .digest('hex');

    return `gen:cache:${operationType}:${hash}`;
  }

  async get<T>(
    key: string,
  ): Promise<T | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/get/${key}`,
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
        },
      );

      if (!response.ok) {
        return null;
      }

      const payload = (await response.json()) as {
        result?: string | null;
      };

      if (!payload.result) {
        return null;
      }

      return JSON.parse(payload.result) as T;
    } catch {
      return null;
    }
  }

  async set(
    key: string,
    value: unknown,
    ttlSeconds: number,
  ): Promise<void> {
    try {
      await fetch(
        `${this.baseUrl}/set/${key}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            value: JSON.stringify(value),
            ex: ttlSeconds,
          }),
        },
      );
    } catch {
      return;
    }
  }

  async invalidate(
    pattern: string,
  ): Promise<void> {
    try {
      await fetch(
        `${this.baseUrl}/keys/${pattern}*`,
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
        },
      );
    } catch {
      return;
    }
  }

  async wrap<T>(
    key: string,
    ttl: number,
    fn: () => Promise<T>,
  ): Promise<CacheWrapResult<T>> {
    const cached =
      await this.get<T>(key);

    if (cached) {
      return {
        data: cached,
        cacheHit: true,
      };
    }

    const data = await fn();

    await this.set(
      key,
      data,
      ttl,
    );

    return {
      data,
      cacheHit: false,
    };
  }
}

export const cacheService =
  new CacheService();

export {
  CacheService,
};

export type {
  CacheWrapResult,
};