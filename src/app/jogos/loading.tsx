export default function GamesLoading() {
  return (
    <main className="page-container py-7 md:py-10" aria-label="Carregando agenda de jogos">
      <div className="mb-7">
        <div className="skeleton h-4 w-36 rounded-xl" />
        <div className="skeleton mt-3 h-12 w-80 max-w-full rounded-2xl" />
        <div className="skeleton mt-4 h-5 w-[38rem] max-w-full rounded-xl" />
      </div>

      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="rounded-[1.2rem] border bg-surface p-4">
            <div className="skeleton h-4 w-16 rounded-xl" />
            <div className="skeleton mt-4 h-8 w-12 rounded-xl" />
            <div className="skeleton mt-2 h-4 w-28 rounded-xl" />
          </div>
        ))}
      </section>

      <section className="rounded-[1.5rem] border bg-surface p-4 md:p-5">
        <div className="skeleton h-4 w-32 rounded-xl" />
        <div className="skeleton mt-3 h-7 w-64 max-w-full rounded-xl" />
        <div className="mt-5 grid grid-flow-col gap-3 overflow-hidden">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="skeleton h-64 w-80 rounded-2xl" />
          ))}
        </div>
      </section>

      <section className="mt-8">
        <div className="skeleton h-4 w-36 rounded-xl" />
        <div className="skeleton mt-3 h-8 w-56 rounded-xl" />
        <div className="mt-5 grid gap-2">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="skeleton h-14 rounded-2xl" />
          ))}
        </div>
      </section>

      <p className="sr-only" aria-live="polite">Carregando agenda de jogos, aguarde.</p>
    </main>
  );
}
