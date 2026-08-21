declare global {
  interface CloudflareEnv {
    DB: D1Database;
    BUCKET?: R2Bucket;
    APP_PASSWORD: string;
    APP_SESSION_SECRET: string;
  }
}

export {};
