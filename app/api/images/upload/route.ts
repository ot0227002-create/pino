export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { getBucket } from "@/lib/db-server";

// POST /api/images/upload — R2 に画像を保存
export async function POST(req: NextRequest) {
  const bucket = getBucket();
  if (!bucket) {
    return NextResponse.json({ error: "R2 not configured" }, { status: 503 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const key = `images/${crypto.randomUUID()}.${ext}`;

  await bucket.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });

  return NextResponse.json({ key, url: `/api/images/${encodeURIComponent(key)}` });
}
