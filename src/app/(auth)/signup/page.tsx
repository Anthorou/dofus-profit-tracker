import Link from "next/link";

import { signup } from "../actions";

type SignupPageProps = {
  searchParams: Promise<{ message?: string }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const { message } = await searchParams;

  return (
    <>
      <h1 className="text-3xl font-semibold">Créer un compte</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Commencez à suivre vos profits Dofus.
      </p>

      {message ? (
        <p
          role="alert"
          className="mt-6 rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200"
        >
          {message}
        </p>
      ) : null}

      <form action={signup} className="mt-8 space-y-5">
        <label className="block">
          <span className="mb-2 block text-sm font-medium">Courriel</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 outline-none transition focus:border-amber-400"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium">Mot de passe</span>
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 outline-none transition focus:border-amber-400"
          />
          <span className="mt-2 block text-xs text-zinc-500">
            Minimum de 8 caractères.
          </span>
        </label>

        <button
          type="submit"
          className="w-full rounded-lg bg-amber-400 px-4 py-2.5 font-semibold text-zinc-950 transition hover:bg-amber-300"
        >
          Créer mon compte
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-400">
        Déjà inscrit?{" "}
        <Link href="/login" className="font-medium text-amber-400 hover:underline">
          Se connecter
        </Link>
      </p>
    </>
  );
}
