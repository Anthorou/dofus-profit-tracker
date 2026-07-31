import { redirect } from "next/navigation";

import { logout } from "@/app/(auth)/actions";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-12 text-zinc-100">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between gap-6">
          <div>
            <p className="text-sm font-semibold tracking-wide text-amber-400">
              DOFUS PROFIT TRACKER
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Tableau de bord</h1>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium transition hover:border-zinc-500 hover:bg-zinc-900"
            >
              Se déconnecter
            </button>
          </form>
        </header>

        <section className="mt-12 rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
          <h2 className="text-xl font-semibold">Authentification réussie</h2>
          <p className="mt-3 text-zinc-400">
            Connecté avec <span className="text-zinc-200">{user.email}</span>.
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            Les fonctionnalités de suivi seront ajoutées dans les prochains
            commits.
          </p>
        </section>
      </div>
    </main>
  );
}
