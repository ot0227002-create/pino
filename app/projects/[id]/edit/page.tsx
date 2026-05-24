export const runtime = "edge";

import { EditProjectClient } from "./EditProjectClient";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditProjectPage({ params }: Props) {
  const { id } = await params;
  return <EditProjectClient id={id} />;
}
