export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-4xl font-bold">TinyWins</h1>
      <p className="text-slate-400">
        Scaffold is alive. Person B replaces this page with the Today screen.
      </p>
      <a href="/api/health" className="text-sm text-cyan-400 underline">
        /api/health
      </a>
    </main>
  );
}
