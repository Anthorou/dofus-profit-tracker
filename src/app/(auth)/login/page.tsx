import Link from "next/link";

import { login } from "../actions";

type LoginPageProps = {
  searchParams: Promise<{ message?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { message } = await searchParams;

  return (
    <>
      <p className="eyebrow text-sm text-[var(--color-lime)]">Bon retour</p>
      <h1 className="font-display mt-2 text-6xl font-bold uppercase tracking-tight text-white">
        Connexion
      </h1>
      <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
        Retrouvez vos acquisitions, vos ventes et vos profits.
      </p>

      {message ? (
        <p
          role="status"
          className="mt-6 rounded-2xl border border-[var(--color-lime)]/25 bg-[var(--color-lime)]/8 px-4 py-3 text-sm text-[var(--color-lime-soft)]"
        >
          {message}
        </p>
      ) : null}

      <form action={login} className="mt-9 space-y-5">
        <label className="block">
          <span className="eyebrow mb-2 block text-xs text-white">Courriel</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="vous@exemple.com"
            required
            className="w-full rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3.5 text-white outline-none transition placeholder:text-zinc-600 focus:border-[var(--color-lime)] focus:ring-4 focus:ring-[var(--color-lime)]/10"
          />
        </label>

        <label className="block">
          <span className="eyebrow mb-2 block text-xs text-white">
            Mot de passe
          </span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            minLength={8}
            required
            className="w-full rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3.5 text-white outline-none transition placeholder:text-zinc-600 focus:border-[var(--color-lime)] focus:ring-4 focus:ring-[var(--color-lime)]/10"
          />
        </label>

        <button
          type="submit"
          className="w-full rounded-full bg-[var(--color-lime)] px-5 py-3.5 font-semibold text-black transition hover:bg-[var(--color-lime-soft)]"
        >
          Se connecter
        </button>
      </form>

      <p className="mt-7 text-center text-sm text-[var(--color-muted)]">
        Aucun compte?{" "}
        <Link
          href="/signup"
          className="font-semibold text-white underline decoration-[var(--color-lime)] decoration-2 underline-offset-4"
        >
          Créer un compte
        </Link>
      </p>
    </>
  );
}
