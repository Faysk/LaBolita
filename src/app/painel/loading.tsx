export default function Loading() {
  return (
    <main className="page-container py-7 md:py-10" aria-label="Carregando painel">
      <div className="skeleton h-10 w-48 rounded-2xl" />
      <div className="skeleton mt-4 h-5 w-96 max-w-full rounded-xl" />
      <section className="mt-6 grid gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="rounded-[1.25rem] border bg-surface p-4">
            <div className="skeleton size-9 rounded-xl" />
            <div className="skeleton mt-4 h-7 w-20 rounded-xl" />
            <div className="skeleton mt-2 h-4 w-32 rounded-xl" />
          </div>
        ))}
      </section>
      <section className="mt-6 rounded-[1.8rem] border bg-surface p-5 md:p-7">
        <div className="skeleton h-5 w-28 rounded-xl" />
        <div className="skeleton mt-5 h-12 w-80 max-w-full rounded-2xl" />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="skeleton h-28 rounded-2xl" />
          <div className="skeleton h-28 rounded-2xl" />
          <div className="skeleton h-28 rounded-2xl" />
        </div>
      </section>
      <p className="sr-only" aria-live="polite">Carregando painel, aguarde.</p>
    </main>
  );
}
