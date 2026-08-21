import { getOptionalRequestContext } from "@cloudflare/next-on-pages";

/** D1 データベースを取得。Cloudflare 環境外では undefined */
export function getDB(): D1Database | undefined {
  return getOptionalRequestContext()?.env.DB;
}

/** R2 バケットを取得。未設定なら undefined */
export function getBucket(): R2Bucket | undefined {
  return getOptionalRequestContext()?.env.BUCKET;
}
