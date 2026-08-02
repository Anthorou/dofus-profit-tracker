import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";

const activity = [
  { day: "Lun", height: "38%", color: "bg-white" },
  { day: "Mar", height: "68%", color: "bg-[var(--color-lime)]" },
  { day: "Mer", height: "48%", color: "bg-[var(--color-orange)]" },
  { day: "Jeu", height: "82%", color: "bg-[var(--color-lime)]" },
  { day: "Ven", height: "57%", color: "bg-white" },
  { day: "Sam", height: "92%", color: "bg-[var(--color-orange)]" },
  { day: "Dim", height: "72%", color: "bg-[var(--color-lime)]" },
];

export default function Home() {
  return (
    <main className="app-shell">
      <div className="mx-auto flex min-h-[calc(100vh-26px)] max-w-[1440px] flex-col px-5 py-5 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between gap-5">
          <BrandMark />
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="rounded-full bg-[var(--color-surface)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-surface-soft)] sm:px-6"
            >
              Connexion
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-[var(--color-lime)] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[var(--color-lime-soft)] sm:px-6"
            >
              Créer un compte
            </Link>
          </nav>
        </header>

        <section className="grid flex-1 items-center gap-14 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:py-20">
          <div className="max-w-2xl">
            <p className="eyebrow text-sm text-[var(--color-lime)]">
              Le profit, sans approximation
            </p>
            <h1 className="font-display mt-5 text-6xl leading-[0.88] font-bold uppercase tracking-[-0.03em] text-white sm:text-7xl lg:text-[6.5rem]">
              Vos crafts.
              <br />
              Vos ventes.
              <br />
              <span className="text-[var(--color-lime)]">Vos profits.</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-[var(--color-muted)] sm:text-lg">
              Un espace clair pour suivre vos crafts, vos achats-reventes et ce
              qu’ils vous rapportent réellement.
            </p>
          </div>

          <div className="relative">
            <div className="absolute -inset-10 -z-10 rounded-full bg-[var(--color-lime)]/8 blur-3xl" />
            <div className="grid gap-4 sm:grid-cols-2">
              <article className="surface-card rounded-[28px] p-6 sm:col-span-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="eyebrow text-xs text-[var(--color-muted)]">
                      Profit potentiel
                    </p>
                    <p className="font-display mt-2 text-5xl font-bold text-white">
                      12 480 000 <span className="text-2xl text-[var(--color-lime)]">K</span>
                    </p>
                  </div>
                  <span className="rounded-full bg-[var(--color-lime)]/15 px-3 py-1 text-xs font-semibold text-[var(--color-lime)]">
                    Aperçu
                  </span>
                </div>
                <div className="mt-8 flex h-36 items-end gap-3">
                  {activity.map((item) => (
                    <div
                      key={item.day}
                      className="flex h-full flex-1 flex-col items-center justify-end gap-3"
                    >
                      <div
                        className={`w-full max-w-9 rounded-full ${item.color}`}
                        style={{ height: item.height }}
                      />
                      <span className="text-[10px] text-[var(--color-muted)]">
                        {item.day}
                      </span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="surface-card rounded-[28px] p-6">
                <span className="flex size-10 items-center justify-center rounded-full bg-[var(--color-lime)] text-lg text-black">
                  ↗
                </span>
                <p className="eyebrow mt-8 text-xs text-[var(--color-muted)]">
                  Ventes actives
                </p>
                <p className="font-display mt-1 text-4xl font-bold text-white">
                  24 objets
                </p>
              </article>

              <article className="surface-card rounded-[28px] p-6">
                <span className="flex size-10 items-center justify-center rounded-full bg-[var(--color-orange)] text-lg text-black">
                  ◆
                </span>
                <p className="eyebrow mt-8 text-xs text-[var(--color-muted)]">
                  Suivi précis
                </p>
                <p className="font-display mt-1 text-4xl font-bold text-white">
                  Craft + Achat
                </p>
              </article>
            </div>
          </div>
        </section>

        <footer className="flex items-center justify-between border-t border-white/8 py-5 text-xs text-[var(--color-muted)]">
          <p>Conçu pour les joueurs qui veulent connaître leurs vrais chiffres.</p>
          <span className="hidden sm:inline">DOFUS PROFIT TRACKER</span>
        </footer>
      </div>
    </main>
  );
}
