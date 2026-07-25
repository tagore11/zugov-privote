import { getPoll, getCommunity } from "@/lib/db";
import { notFound } from "next/navigation";
import ProposalClient from "./ProposalClient";

export const dynamic = "force-dynamic";

export default async function ProposalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const poll = await getPoll(id);
  if (!poll) notFound();
  const community = await getCommunity(poll.communityId);
  return <ProposalClient poll={poll} community={community} />;
}
