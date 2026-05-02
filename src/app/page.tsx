import Link from "next/link";
import { listPolls } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const polls = await listPolls();

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-mono">Active Polls</h1>
        <Link
          href="/polls/new"
          className="text-sm bg-amber-500 text-zinc-950 px-4 py-2 rounded font-medium hover:bg-amber-400"
        >
          + New Poll
        </Link>
      </div>

      {polls.length === 0 ? (
        <div className="border border-dashed border-zinc-800 rounded p-8 text-center text-zinc-500">
          No polls yet. Create the first one.
        </div>
      ) : (
        <ul className="space-y-3">
          {polls.map((p) => {
            const ended = Date.now() > p.endTime || p.status === "closed";
            return (
              <li key={p.id}>
                <Link
                  href={`/polls/${p.id}`}
                  className="block border border-zinc-800 hover:border-zinc-600 rounded p-4 bg-zinc-900/40"
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="font-medium">{p.title}</span>
                    <span
                      className={
                        "text-xs font-mono px-2 py-0.5 rounded " +
                        (ended
                          ? "bg-zinc-800 text-zinc-400"
                          : "bg-emerald-900/40 text-emerald-300")
                      }
                    >
                      {ended ? "closed" : "active"}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-400 mt-1 line-clamp-2">
                    {p.body}
                  </p>
                  <div className="text-xs text-zinc-500 mt-2 flex gap-4 font-mono">
                    <span>id {p.id}</span>
                    <span>ends {new Date(p.endTime).toLocaleString()}</span>
                    <span>
                      grounding{" "}
                      {p.groundingReport ? (
                        <span className="text-cyan-400">ready</span>
                      ) : (
                        <span className="text-zinc-500">pending</span>
                      )}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
