export default function PlayersLoading() {
  return (
    <main className="page-container min-w-0 overflow-hidden py-7 md:py-10" aria-label="Carregando jogadores">
      <section className="mb-7">
        <div className="skeleton h-4 w-40 rounded-xl" />
        <div className="skeleton mt-3 h-12 w-80 max-w-full rounded-2xl" />
        <div className="skeleton mt-4 h-5 w-[42rem] max-w-full rounded-xl" />
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="rounded-2xl border bg-surface p-5">
            <div className="skeleton size-11 rounded-2xl" />
            <div className="skeleton mt-4 h-8 w-16 rounded-xl" />
            <div className="skeleton mt-2 h-4 w-24 rounded-xl" />
          </div>
        ))}
      </section>

      <section className="mt-8 rounded-2xl border bg-surface p-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="skeleton h-4 w-36 rounded-xl" />
            <div className="skeleton mt-3 h-8 w-64 max-w-full rounded-xl" />
          </div>
          <div className="skeleton h-7 w-24 rounded-full" />
        </div>
        <div className="mt-5 grid grid-flow-col gap-3 overflow-hidden">
          {Array.from({ length: 7 }, (_, index) => (
            <div key={index} className="skeleton h-64 w-36 rounded-2xl" />
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-5 xl:grid-cols-[18.5rem_minmax(0,1fr)]">
        <div className="rounded-[1.5rem] border bg-surface p-4">
          <div className="skeleton h-5 w-24 rounded-xl" />
          <div className="skeleton mt-4 h-12 rounded-2xl" />
          <div className="skeleton mt-4 h-12 rounded-2xl" />
          <div className="skeleton mt-4 h-36 rounded-2xl" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="skeleton h-64 rounded-[1.5rem]" />
          ))}
        </div>
      </section>

      <p className="sr-only" aria-live="polite">Carregando jogadores, aguarde.</p>
    </main>
  );
}
