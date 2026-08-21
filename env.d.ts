// Cloudflare D1 / R2 の型（workers-types全体importはDOM型と競合するため個別宣言）
declare global {
  interface D1Database {
    prepare(query: string): D1PreparedStatement;
    exec(query: string): Promise<D1ExecResult>;
  }

  interface D1PreparedStatement {
    bind(...values: unknown[]): D1PreparedStatement;
    first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
    all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
    run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  }

  interface D1Result<T = Record<string, unknown>> {
    results: T[];
    success: boolean;
    meta: Record<string, unknown>;
    error?: string;
  }

  interface D1ExecResult {
    count: number;
    duration: number;
  }

  interface R2Bucket {
    get(key: string): Promise<R2ObjectBody | null>;
    put(
      key: string,
      value: ArrayBuffer | ArrayBufferView | ReadableStream | null,
      options?: { httpMetadata?: { contentType?: string; cacheControl?: string } }
    ): Promise<R2Object>;
    delete(key: string): Promise<void>;
  }

  interface R2Object {
    key: string;
    httpMetadata?: { contentType?: string; cacheControl?: string };
  }

  interface R2ObjectBody extends R2Object {
    body: ReadableStream;
  }

  interface CloudflareEnv {
    DB: D1Database;
    BUCKET?: R2Bucket;
    APP_PASSWORD: string;
    APP_SESSION_SECRET: string;
  }
}

export {};
