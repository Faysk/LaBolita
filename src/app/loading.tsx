export default function Loading() {
  return (
    <main className="page-container py-7 md:py-10" aria-label="Carregando conteúdo">
      <div className="skeleton h-10 w-56 rounded-2xl" />
      <div className="skeleton mt-4 h-5 w-80 max-w-full rounded-xl" />
      <section className="mt-8 grid gap-4 md:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="card p-5">
            <div className="skeleton size-11 rounded-2xl" />
            <div className="skeleton mt-6 h-6 w-2/3 rounded-xl" />
            <div className="skeleton mt-3 h-4 w-1/2 rounded-xl" />
            <div className="skeleton mt-6 h-11 w-full rounded-2xl" />
          </div>
        ))}
      </section>
      <p className="sr-only" aria-live="polite">Carregando, aguarde.</p>
    </main>
  );
}
