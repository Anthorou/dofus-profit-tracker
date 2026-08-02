import Link from "next/link";

import { requestPasswordReset } from "../actions";

type ForgotPasswordPageProps = {
  searchParams: Promise<{ message?: string }>;
};

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const { message } = await searchParams;

  return (
    <>
      <p className="eyebrow text-sm text-[var(--color-lime)]">Récupération</p>
      <h1 className="font-display mt-2 text-5xl font-bold uppercase tracking-tight text-white sm:text-6xl">
        Mot de passe oublié
      </h1>
      <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
        Entre ton courriel et nous t’enverrons un lien pour choisir un nouveau mot de passe.
      </p>

      {message ? (
        <p role="status" className="mt-6 rounded-2xl border border-[var(--color-lime)]/25 bg-[var(--color-lime)]/8 px-4 py-3 text-sm leading-6 text-[var(--color-lime-soft)]">
          {message}
        </p>
      ) : null}

      <form action={requestPasswordReset} className="mt-9 space-y-5">
        <label className="block">
          <span className="eyebrow mb-2 block text-xs text-white">Courriel</span>
          <input name="email" type="email" autoComplete="email" placeholder="vous@exemple.com" required autoFocus className="w-full rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3.5 text-white outline-none transition placeholder:text-zinc-600 focus:border-[var(--color-lime)] focus:ring-4 focus:ring-[var(--color-lime)]/10" />
        </label>

        <button type="submit" className="w-full rounded-full bg-[var(--color-lime)] px-5 py-3.5 font-semibold text-black transition hover:bg-[var(--color-lime-soft)]">
          Envoyer le lien
        </button>
      </form>

      <p className="mt-7 text-center text-sm text-[var(--color-muted)]">
        <Link href="/login" className="font-semibold text-white underline decoration-[var(--color-lime)] decoration-2 underline-offset-4">
          Retour à la connexion
        </Link>
      </p>
    </>
  );
}
