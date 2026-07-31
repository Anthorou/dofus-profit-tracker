import { BrandMark } from "@/components/brand-mark";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="app-shell">
      <div className="grid min-h-[calc(100vh-26px)] lg:grid-cols-[0.8fr_1.2fr]">
        <aside className="relative hidden overflow-hidden border-r border-white/8 p-10 lg:flex lg:flex-col">
          <BrandMark />
          <div className="my-auto max-w-lg">
            <p className="eyebrow text-sm text-[var(--color-lime)]">
              Votre économie, maîtrisée
            </p>
            <h2 className="font-display mt-5 text-7xl leading-[0.9] font-bold uppercase text-white">
              Chaque kama
              <br />
              <span className="text-[var(--color-lime)]">compte.</span>
            </h2>
            <p className="mt-6 max-w-md leading-7 text-[var(--color-muted)]">
              Centralisez vos acquisitions et vos ventes dans un outil pensé
              pour prendre de meilleures décisions.
            </p>
          </div>

          <div className="surface-card rounded-[26px] p-5">
            <div className="flex items-center justify-between">
              <span className="eyebrow text-xs text-[var(--color-muted)]">
                Bientôt dans votre dashboard
              </span>
              <span className="size-2 rounded-full bg-[var(--color-lime)]" />
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              {["Profits", "Ventes", "Tendances"].map((label, index) => (
                <div key={label} className="rounded-2xl bg-black/35 p-4">
                  <span
                    className={`block size-2 rounded-full ${
                      index === 1
                        ? "bg-[var(--color-orange)]"
                        : "bg-[var(--color-lime)]"
                    }`}
                  />
                  <p className="mt-6 text-xs text-[var(--color-muted)]">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="flex items-center justify-center px-5 py-10 sm:px-10">
          <div className="w-full max-w-md">
            <div className="mb-12 lg:hidden">
              <BrandMark />
            </div>
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
