import NewProposalForm from "./NewProposalForm";
import { listCommunities } from "@/lib/db";
import { DropCap } from "@/components/DropCap";

export const dynamic = "force-dynamic";

export default async function NewProposalPage() {
  const communities = await listCommunities();
  return (
    <>
      <section className="relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-16 pb-10">
          <div className="grid md:grid-cols-12 gap-6 lg:gap-10 items-end">
            <div className="md:col-span-3 reveal-1">
              <DropCap letter="Δ" />
            </div>
            <div className="md:col-span-9 reveal-2">
              <p className="marginalia text-iron mb-4">
                Submit · a new question
              </p>
              <h1 className="font-display font-normal leading-[1.0] text-ink">
                Bring a question
                <br />
                <span className="italic">to the assembly.</span>
              </h1>
              <p className="mt-6 text-[16px] sm:text-[17px] text-ink leading-[1.65] max-w-2xl">
                Once submitted, the Grounding Engine reads your proposal —
                surfaces assumptions, sources, dissents. Voters decide{" "}
                <em className="text-iron not-italic">after</em>, not before.
              </p>
            </div>
          </div>
        </div>
      </section>

<section className="py-8 sm:py-12 pb-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <NewProposalForm communities={communities} />
        </div>
      </section>
    </>
  );
}
