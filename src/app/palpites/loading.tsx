export default function PredictionsLoading() {
  return (
    <main className="page-container py-7 md:py-10" aria-label="Carregando palpites">
      <div className="mb-7">
        <div className="skeleton h-4 w-36 rounded-xl" />
        <div className="skeleton mt-3 h-12 w-80 max-w-full rounded-2xl" />
        <div className="skeleton mt-4 h-5 w-[40rem] max-w-full rounded-xl" />
      </div>

      <section className="rounded-[1.5rem] border bg-surface p-4 md:p-5">
        <div className="skeleton h-4 w-32 rounded-xl" />
        <div className="skeleton mt-3 h-8 w-56 rounded-xl" />
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="skeleton h-24 rounded-2xl" />
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-[1.5rem] border bg-surface p-4 md:p-5">
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="skeleton h-10 w-28 rounded-2xl" />
          ))}
        </div>
        <div className="mt-5 grid gap-3">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="skeleton h-52 rounded-2xl" />
          ))}
        </div>
      </section>

      <p className="sr-only" aria-live="polite">Carregando palpites, aguarde.</p>
    </main>
  );
}
