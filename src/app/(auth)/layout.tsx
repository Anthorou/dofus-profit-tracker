import Link from "next/link";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-12 text-zinc-100">
      <section className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl shadow-black/30">
        <Link
          href="/"
          className="mb-8 inline-block text-sm font-semibold tracking-wide text-amber-400"
        >
          DOFUS PROFIT TRACKER
        </Link>
        {children}
      </section>
    </main>
  );
}
