export default function SpecialPredictionsLoading() {
  return (
    <main className="page-container py-7 md:py-10" aria-label="Carregando palpites finais">
      <div className="mb-7">
        <div className="skeleton h-4 w-32 rounded-xl" />
        <div className="skeleton mt-3 h-12 w-80 max-w-full rounded-2xl" />
        <div className="skeleton mt-4 h-5 w-[30rem] max-w-full rounded-xl" />
      </div>

      <section className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
        <div className="card-dark rounded-[1.8rem] p-6">
          <div className="flex gap-2">
            <div className="skeleton h-7 w-28 rounded-full" />
            <div className="skeleton h-7 w-32 rounded-full" />
          </div>
          <div className="skeleton mt-6 h-12 w-4/5 rounded-2xl" />
          <div className="skeleton mt-3 h-12 w-3/5 rounded-2xl" />
          <div className="skeleton mt-6 h-5 w-full rounded-xl" />
          <div className="skeleton mt-2 h-5 w-2/3 rounded-xl" />
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="rounded-2xl border border-white/15 bg-white/10 p-3">
                <div className="skeleton h-3 w-16 rounded-xl" />
                <div className="skeleton mt-2 h-6 w-20 rounded-xl" />
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="skeleton h-4 w-28 rounded-xl" />
              <div className="skeleton mt-3 h-7 w-44 rounded-xl" />
            </div>
            <div className="skeleton size-9 rounded-2xl" />
          </div>
          <div className="skeleton mt-6 h-5 w-full rounded-xl" />
          <div className="skeleton mt-2 h-5 w-4/5 rounded-xl" />
          <div className="skeleton mt-6 h-12 w-full rounded-2xl" />
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="card p-5">
            <div className="flex items-start justify-between">
              <div className="skeleton size-11 rounded-2xl" />
              <div className="skeleton h-6 w-24 rounded-full" />
            </div>
            <div className="skeleton mt-7 h-4 w-24 rounded-xl" />
            <div className="skeleton mt-3 h-7 w-48 rounded-xl" />
            <div className="skeleton mt-4 h-5 w-full rounded-xl" />
            <div className="skeleton mt-2 h-5 w-3/4 rounded-xl" />
            <div className="skeleton mt-7 h-5 w-32 rounded-xl" />
          </div>
        ))}
      </section>

      <p className="sr-only" aria-live="polite">Carregando especiais, aguarde.</p>
    </main>
  );
}
