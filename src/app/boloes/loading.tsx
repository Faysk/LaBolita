export default function PoolsLoading() {
  return (
    <main className="page-container py-7 md:py-10" aria-label="Carregando bolões">
      <div className="mb-7">
        <div className="skeleton h-4 w-36 rounded-xl" />
        <div className="skeleton mt-3 h-12 w-80 max-w-full rounded-2xl" />
        <div className="skeleton mt-4 h-5 w-[38rem] max-w-full rounded-xl" />
      </div>

      <section className="rounded-[1.5rem] border bg-surface p-4 md:p-5">
        <div className="skeleton h-4 w-32 rounded-xl" />
        <div className="skeleton mt-3 h-8 w-56 rounded-xl" />
        <div className="mt-5 grid grid-flow-col gap-3 overflow-hidden">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="skeleton h-40 w-72 rounded-2xl" />
          ))}
        </div>
      </section>

      <section className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="rounded-[1.5rem] border bg-surface p-4">
          <div className="skeleton h-5 w-28 rounded-xl" />
          <div className="skeleton mt-4 h-24 rounded-2xl" />
          <div className="skeleton mt-3 h-24 rounded-2xl" />
        </div>
        <div className="rounded-[1.5rem] border bg-surface p-4">
          <div className="skeleton h-5 w-36 rounded-xl" />
          <div className="mt-5 grid gap-2">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="skeleton h-16 rounded-2xl" />
            ))}
          </div>
        </div>
      </section>

      <p className="sr-only" aria-live="polite">Carregando bolões, aguarde.</p>
    </main>
  );
}
