export default function Home() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">AI Support Platform</h1>
      <p className="text-sm text-zinc-600">
        Local Docker MVP showcasing multi-tenancy, async document processing, RAG chat, and tickets.
      </p>
      <div className="flex gap-3">
        <a className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white" href="/register">
          Create account
        </a>
        <a className="rounded-md border px-4 py-2 text-sm" href="/login">
          Login
        </a>
      </div>
    </div>
  );
}
