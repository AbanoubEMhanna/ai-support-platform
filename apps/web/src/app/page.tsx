import Link from "next/link";

export default function Home() {
  return (
    <div className="page-shell">
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-stretch">
        <div className="surface-dark relative overflow-hidden">
          <div className="absolute -right-20 -top-24 size-72 rounded-full bg-orange-500/20 blur-3xl" />
          <div className="absolute bottom-8 right-8 hidden rounded-full border border-orange-300/30 px-4 py-2 text-xs font-bold uppercase tracking-[0.28em] text-orange-200 md:block">
            Docker MVP
          </div>
          <div className="relative max-w-3xl space-y-8 py-8 md:py-14">
            <div className="eyebrow text-orange-300">AI Support Platform</div>
            <h1 className="text-5xl font-black leading-[0.92] tracking-[-0.06em] text-white md:text-7xl">
              A support desk that reads your docs first.
            </h1>
            <p className="max-w-xl text-base leading-7 text-stone-300">
              Multi-tenant NestJS backend, async document ingestion, pgvector
              retrieval, RAG chat, and escalation tickets in one local portfolio
              SaaS.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                className="btn-primary bg-orange-600 hover:bg-orange-500"
                href="/register"
              >
                Create account
              </Link>
              <Link
                className="btn-secondary border-stone-700 bg-stone-900/60 text-white hover:bg-stone-800"
                href="/login"
              >
                Login
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          {[
            [
              "01",
              "Upload knowledge",
              "Drop TXT/PDF files and let the worker chunk and embed them.",
            ],
            [
              "02",
              "Ask with citations",
              "Chat answers are grounded in retrieved chunks and saved with sources.",
            ],
            [
              "03",
              "Escalate cleanly",
              "Turn conversations into tickets with priority and status tracking.",
            ],
          ].map(([step, title, body]) => (
            <div key={step} className="surface">
              <div className="mb-5 flex items-center justify-between">
                <span className="pill">{step}</span>
                <span className="h-px flex-1 bg-stone-300/80" />
              </div>
              <h2 className="text-2xl font-black tracking-[-0.04em]">
                {title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
