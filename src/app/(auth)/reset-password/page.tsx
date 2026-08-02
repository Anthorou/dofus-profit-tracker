import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { updatePassword } from "../actions";

type ResetPasswordPageProps = {
  searchParams: Promise<{ message?: string }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const { message } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Le lien de récupération est invalide ou expiré.");
  }

  return (
    <>
      <p className="eyebrow text-sm text-[var(--color-lime)]">Sécurité</p>
      <h1 className="font-display mt-2 text-5xl font-bold uppercase tracking-tight text-white sm:text-6xl">
        Nouveau mot de passe
      </h1>
      <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
        Choisis un nouveau mot de passe d’au moins huit caractères.
      </p>

      {message ? (
        <p role="alert" className="mt-6 rounded-2xl border border-[var(--color-orange)]/25 bg-[var(--color-orange)]/8 px-4 py-3 text-sm text-[var(--color-orange)]">
          {message}
        </p>
      ) : null}

      <form action={updatePassword} className="mt-9 space-y-5">
        <label className="block">
          <span className="eyebrow mb-2 block text-xs text-white">Nouveau mot de passe</span>
          <input name="password" type="password" autoComplete="new-password" placeholder="••••••••" minLength={8} required autoFocus className="w-full rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3.5 text-white outline-none transition placeholder:text-zinc-600 focus:border-[var(--color-lime)] focus:ring-4 focus:ring-[var(--color-lime)]/10" />
        </label>

        <label className="block">
          <span className="eyebrow mb-2 block text-xs text-white">Confirmer le mot de passe</span>
          <input name="passwordConfirmation" type="password" autoComplete="new-password" placeholder="••••••••" minLength={8} required className="w-full rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3.5 text-white outline-none transition placeholder:text-zinc-600 focus:border-[var(--color-lime)] focus:ring-4 focus:ring-[var(--color-lime)]/10" />
        </label>

        <button type="submit" className="w-full rounded-full bg-[var(--color-lime)] px-5 py-3.5 font-semibold text-black transition hover:bg-[var(--color-lime-soft)]">
          Modifier le mot de passe
        </button>
      </form>
    </>
  );
}
