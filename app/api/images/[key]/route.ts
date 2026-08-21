export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { getBucket } from "@/lib/db-server";

// GET /api/images/[key] — R2 から画像を配信
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const bucket = getBucket();
  if (!bucket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { key } = await params;
  const obj = await bucket.get(decodeURIComponent(key));
  if (!obj) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const headers = new Headers();
  headers.set("Content-Type", obj.httpMetadata?.contentType ?? "image/jpeg");
  headers.set("Cache-Control", "public, max-age=31536000, immutable");

  return new NextResponse(obj.body, { headers });
}

// DELETE /api/images/[key] — R2 から画像を削除
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const bucket = getBucket();
  if (!bucket) return NextResponse.json({ error: "R2 not configured" }, { status: 503 });

  const { key } = await params;
  await bucket.delete(decodeURIComponent(key));
  return NextResponse.json({ success: true });
}
