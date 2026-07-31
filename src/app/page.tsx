import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-zinc-100">
      <div className="max-w-2xl text-center">
        <p className="text-sm font-semibold tracking-wide text-amber-400">
          DOFUS PROFIT TRACKER
        </p>
        <h1 className="mt-5 text-5xl font-semibold tracking-tight">
          Vos crafts. Vos ventes. Vos vrais profits.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-zinc-400">
          Suivez précisément la rentabilité de vos crafts et de vos achats-reventes.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link
            href="/login"
            className="rounded-lg bg-amber-400 px-5 py-3 font-semibold text-zinc-950 transition hover:bg-amber-300"
          >
            Se connecter
          </Link>
          <Link
            href="/signup"
            className="rounded-lg border border-zinc-700 px-5 py-3 font-semibold transition hover:border-zinc-500 hover:bg-zinc-900"
          >
            Créer un compte
          </Link>
        </div>
      </div>
    </main>
  );
}
