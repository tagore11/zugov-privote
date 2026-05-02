import { getPoll } from "@/lib/db";
import { notFound } from "next/navigation";
import PollClient from "./PollClient";

export const dynamic = "force-dynamic";

export default async function PollPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const poll = getPoll(id);
  if (!poll) notFound();
  return <PollClient poll={poll} />;
}
