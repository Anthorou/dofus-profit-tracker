import Link from "next/link";

import { signup } from "../actions";

type SignupPageProps = {
  searchParams: Promise<{ message?: string }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const { message } = await searchParams;

  return (
    <>
      <p className="eyebrow text-sm text-[var(--color-orange)]">
        Nouveau départ
      </p>
      <h1 className="font-display mt-2 text-6xl font-bold uppercase tracking-tight text-white">
        Créer un compte
      </h1>
      <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
        Commencez à suivre vos profits Dofus au même endroit.
      </p>

      {message ? (
        <p
          role="alert"
          className="mt-6 rounded-2xl border border-[var(--color-orange)]/25 bg-[var(--color-orange)]/8 px-4 py-3 text-sm text-orange-100"
        >
          {message}
        </p>
      ) : null}

      <form action={signup} className="mt-9 space-y-5">
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
            autoComplete="new-password"
            placeholder="8 caractères minimum"
            minLength={8}
            required
            className="w-full rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3.5 text-white outline-none transition placeholder:text-zinc-600 focus:border-[var(--color-lime)] focus:ring-4 focus:ring-[var(--color-lime)]/10"
          />
          <span className="mt-2 block text-xs text-[var(--color-muted)]">
            Utilisez au minimum 8 caractères.
          </span>
        </label>

        <button
          type="submit"
          className="w-full rounded-full bg-[var(--color-lime)] px-5 py-3.5 font-semibold text-black transition hover:bg-[var(--color-lime-soft)]"
        >
          Créer mon compte
        </button>
      </form>

      <p className="mt-7 text-center text-sm text-[var(--color-muted)]">
        Déjà inscrit?{" "}
        <Link
          href="/login"
          className="font-semibold text-white underline decoration-[var(--color-lime)] decoration-2 underline-offset-4"
        >
          Se connecter
        </Link>
      </p>
    </>
  );
}
