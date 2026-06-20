export default function SpecialMarketLoading() {
  return (
    <main className="page-container py-7 md:py-10" aria-label="Carregando palpite final">
      <div className="mb-7">
        <div className="skeleton h-4 w-36 rounded-xl" />
        <div className="skeleton mt-3 h-12 w-80 max-w-full rounded-2xl" />
      </div>

      <section className="card-dark rounded-[2rem] p-5 md:p-6 lg:p-7">
        <div className="skeleton h-8 w-40 rounded-full" />
        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)] lg:items-center">
          <div>
            <div className="skeleton h-8 w-44 rounded-full" />
            <div className="skeleton mt-5 h-14 w-4/5 rounded-2xl" />
            <div className="skeleton mt-3 h-14 w-3/5 rounded-2xl" />
            <div className="skeleton mt-6 h-5 w-full rounded-xl" />
            <div className="skeleton mt-2 h-5 w-3/4 rounded-xl" />
          </div>
          <div className="rounded-[1.7rem] border border-white/15 bg-white/10 p-5">
            <div className="flex items-center justify-between">
              <div className="skeleton h-4 w-36 rounded-xl" />
              <div className="skeleton h-6 w-20 rounded-full" />
            </div>
            <div className="skeleton mt-5 h-24 w-full rounded-[1.35rem]" />
            <div className="skeleton mt-4 h-12 w-full rounded-2xl" />
          </div>
        </div>
      </section>

      <section className="mt-7 grid items-start gap-5 lg:grid-cols-[1.25fr_0.95fr]">
        <div className="card p-5">
          <div className="skeleton h-4 w-40 rounded-xl" />
          <div className="skeleton mt-3 h-8 w-56 rounded-xl" />
          <div className="skeleton mt-5 h-72 w-full rounded-[1.5rem]" />
        </div>
        <div className="card p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="skeleton h-4 w-64 max-w-full rounded-xl" />
              <div className="skeleton mt-3 h-8 w-64 max-w-full rounded-xl" />
            </div>
            <div className="skeleton h-7 w-24 rounded-full" />
          </div>
          <div className="mt-5 grid gap-3">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="skeleton h-24 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </section>

      <p className="sr-only" aria-live="polite">Carregando palpite final, aguarde.</p>
    </main>
  );
}
