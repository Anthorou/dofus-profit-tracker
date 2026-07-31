import Link from "next/link";

import { login } from "../actions";

type LoginPageProps = {
  searchParams: Promise<{ message?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { message } = await searchParams;

  return (
    <>
      <h1 className="text-3xl font-semibold">Connexion</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Retrouvez vos acquisitions, vos ventes et vos profits.
      </p>

      {message ? (
        <p
          role="status"
          className="mt-6 rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200"
        >
          {message}
        </p>
      ) : null}

      <form action={login} className="mt-8 space-y-5">
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
            autoComplete="current-password"
            minLength={8}
            required
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 outline-none transition focus:border-amber-400"
          />
        </label>

        <button
          type="submit"
          className="w-full rounded-lg bg-amber-400 px-4 py-2.5 font-semibold text-zinc-950 transition hover:bg-amber-300"
        >
          Se connecter
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-400">
        Aucun compte?{" "}
        <Link href="/signup" className="font-medium text-amber-400 hover:underline">
          Créer un compte
        </Link>
      </p>
    </>
  );
}
