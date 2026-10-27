// The copy on this page is placeholder text. Swap it out once we know
// exactly how we want to describe Smile Scoring.
const details = [
  {
    title: "Detail one",
    body: "A sentence or two about the first thing people should know.",
  },
  {
    title: "Detail two",
    body: "A sentence or two about the second thing people should know.",
  },
  {
    title: "Detail three",
    body: "A sentence or two about the third thing people should know.",
  },
];

export default function Home() {
  return (
    <main className="flex-1 font-sans">
      <section className="w-full max-w-5xl px-4 py-20 sm:px-6 sm:py-28">
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">Smile Scoring</h1>
        <p className="mt-4 max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          A short introduction to Smile Scoring goes here. Explain what it is and who it&apos;s for in a line or
          two.
        </p>
      </section>

      <section className="grid w-full max-w-5xl gap-4 px-4 pb-24 sm:grid-cols-3 sm:px-6">
        {details.map((detail) => (
          <div
            key={detail.title}
            className="rounded-2xl border border-black/[.08] p-6 dark:border-white/[.145]"
          >
            <h2 className="font-medium">{detail.title}</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{detail.body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
