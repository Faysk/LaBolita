export default function AdminLoading() {
  return (
    <main className="page-container py-7 md:py-10" aria-label="Carregando administração">
      <div className="mb-8">
        <div className="skeleton h-4 w-24 rounded-xl" />
        <div className="skeleton mt-3 h-12 w-80 max-w-full rounded-2xl md:h-14" />
        <div className="skeleton mt-4 h-5 w-[38rem] max-w-full rounded-xl" />
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="card p-5">
            <div className="skeleton size-9 rounded-xl" />
            <div className="skeleton mt-4 h-4 w-24 rounded-xl" />
            <div className="skeleton mt-3 h-6 w-40 max-w-full rounded-xl" />
          </div>
        ))}
      </section>

      <section className="card mt-7 overflow-hidden">
        <div className="border-b bg-surface-muted/70 p-5 md:p-6">
          <div className="skeleton h-4 w-32 rounded-xl" />
          <div className="skeleton mt-3 h-8 w-72 max-w-full rounded-xl" />
          <div className="skeleton mt-4 h-5 w-[42rem] max-w-full rounded-xl" />
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="rounded-2xl border bg-surface p-4">
              <div className="skeleton h-4 w-28 rounded-xl" />
              <div className="skeleton mt-4 h-8 w-16 rounded-xl" />
              <div className="skeleton mt-3 h-4 w-32 rounded-xl" />
            </div>
          ))}
        </div>
      </section>

      <section className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
        <div className="card p-5 md:p-6">
          <div className="skeleton h-5 w-36 rounded-xl" />
          <div className="skeleton mt-4 h-9 w-72 max-w-full rounded-xl" />
          <div className="mt-6 grid gap-3">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="skeleton h-20 rounded-2xl" />
            ))}
          </div>
        </div>
        <div className="card p-5 md:p-6">
          <div className="skeleton h-5 w-32 rounded-xl" />
          <div className="skeleton mt-4 h-9 w-56 rounded-xl" />
          <div className="mt-6 space-y-3">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="skeleton h-16 rounded-2xl" />
            ))}
          </div>
        </div>
      </section>

      <p className="sr-only" aria-live="polite">Carregando administração, aguarde.</p>
    </main>
  );
}
