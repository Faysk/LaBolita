export default function LiveLoading() {
  return (
    <main className="page-container py-7 md:py-10">
      <section className="hero-panel rounded-[2rem] px-5 py-6 md:px-8 md:py-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div>
            <div className="skeleton h-7 w-40 rounded-full" />
            <div className="skeleton mt-5 h-12 w-full max-w-2xl rounded-2xl md:h-16" />
            <div className="skeleton mt-4 h-5 w-full max-w-xl rounded-full" />
            <div className="skeleton mt-2 h-5 w-3/4 max-w-lg rounded-full" />
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-[1.5rem] border border-white/15 bg-white/10 p-4">
            <div className="skeleton h-20 rounded-2xl" />
            <div className="skeleton h-20 rounded-2xl" />
            <div className="skeleton h-20 rounded-2xl" />
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.8fr)]">
        <div className="rounded-[1.5rem] border bg-surface p-5">
          <div className="skeleton h-7 w-52 rounded-full" />
          <div className="skeleton mt-5 h-40 rounded-[1.35rem]" />
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="skeleton h-28 rounded-2xl" />
            <div className="skeleton h-28 rounded-2xl" />
            <div className="skeleton h-28 rounded-2xl" />
          </div>
        </div>
        <div className="rounded-[1.5rem] border bg-surface p-5">
          <div className="skeleton h-7 w-40 rounded-full" />
          <div className="mt-5 space-y-2">
            <div className="skeleton h-16 rounded-2xl" />
            <div className="skeleton h-16 rounded-2xl" />
            <div className="skeleton h-16 rounded-2xl" />
            <div className="skeleton h-16 rounded-2xl" />
          </div>
        </div>
      </section>
    </main>
  );
}
