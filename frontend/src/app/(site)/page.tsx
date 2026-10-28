import Link from "next/link";
import { SmileScore } from "@/components/smile-score";
import type { Smile } from "@/lib/smile";

const EXAMPLE: Smile = { status: "done", face_found: true, smile_left: 0.71, smile_right: 0.74, score: 72.5 };

const STEPS = [
  {
    title: "Upload a photo",
    body: "Drag in a JPG, PNG, WEBP or GIF up to 10 MB. It's encrypted in your browser before it leaves your device.",
  },
  {
    title: "We read the smile",
    body: "Google's MediaPipe Face Landmarker finds the face and measures how far each corner of the mouth is pulled up.",
  },
  {
    title: "Get a score you can check",
    body: "A 0–100 score with the two numbers behind it and the exact sum, so you can see how it was reached.",
  },
];

const BANDS = [
  { range: "0–19", label: "No smile", width: "w-[20%]" },
  { range: "20–49", label: "Slight smile", width: "w-[50%]" },
  { range: "50–79", label: "Smiling", width: "w-[80%]" },
  { range: "80–100", label: "Big smile", width: "w-full" },
];

const FEATURES = [
  {
    title: "Explainable, not a black box",
    body: "Every score shows mouthSmileLeft, mouthSmileRight and the calculation. Both raw values are stored with it.",
    icon: <path d="M9 12h6M9 16h6M7 4h10a2 2 0 0 1 2 2v14l-3-2-2 2-2-2-2 2-2-2-3 2V6a2 2 0 0 1 2-2z" />,
  },
  {
    title: "Encrypted on the way",
    body: "Requests, responses and the images themselves travel encrypted, and only decrypt in your browser to be shown.",
    icon: (
      <>
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </>
    ),
  },
  {
    title: "Your history in one place",
    body: "Every upload and its score in a grid, with a details page for each and a delete button when you're done.",
    icon: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
        <path d="M3 3v5h5M12 7v5l3 2" />
      </>
    ),
  },
  {
    title: "No waiting around",
    body: "Uploads return straight away and the score fills in moments later. Re-uploading the same image reuses its result.",
    icon: <path d="M13 3 4 14h7l-1 7 9-11h-7l1-7z" />,
  },
];

const GOOD_TO_KNOW = [
  ["Best photos", "Front-on, well lit, with the whole face in view. Sunglasses and heavy shadows make faces harder to read."],
  ["One face per photo", "If there are several, only the first face MediaPipe finds is scored."],
  ["No face, no score", "If no face is found, the upload is kept but marked “No face found”."],
  ["What it measures", "How much someone is smiling, from the shape of the mouth. It isn't a judgement of teeth or dental health."],
];

const primaryButton =
  "rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]";
const secondaryButton =
  "rounded-full border border-black/[.08] px-5 py-2.5 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.06]";

export default function Home() {
  return (
    <main className="flex-1 font-sans">
      <section className="grid w-full items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="text-sm font-medium text-zinc-500">Powered by MediaPipe Face Landmarker</p>
          <h1 className="mt-3 max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Measure a smile, and see exactly how it was scored.
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Upload a photo and Smile Scoring rates the smile from 0 to 100, with the measurements and the maths shown
            alongside every result.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className={primaryButton}>
              Get started
            </Link>
            <Link href="/login" className={secondaryButton}>
              Log in
            </Link>
          </div>
        </div>

        <ExampleResult />
      </section>

      <Section eyebrow="How it works" title="Three steps, a few seconds">
        <ol className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="rounded-2xl border border-black/[.08] p-6 dark:border-white/[.145]">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
                {i + 1}
              </span>
              <h3 className="mt-4 font-medium">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{step.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section eyebrow="The score" title="How the number is worked out">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-4 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            <p>
              MediaPipe rates dozens of facial expressions from 0 (not at all) to 1 (fully). Smile Scoring uses two of
              them: <code className="text-foreground">mouthSmileLeft</code> and{" "}
              <code className="text-foreground">mouthSmileRight</code>, how far each corner of the mouth is raised.
            </p>
            <p>The score is their average, scaled to 100:</p>
            <p className="rounded-xl bg-black/[.03] px-4 py-3 font-mono text-[13px] text-foreground dark:bg-white/[.05]">
              (left + right) / 2 × 100
              <br />
              <span className="text-zinc-500">e.g. (0.71 + 0.74) / 2 × 100 = 72.5</span>
            </p>
            <p>A lopsided smile still counts both sides, so one raised corner gives a middling score.</p>
          </div>

          <div className="rounded-2xl border border-black/[.08] p-6 dark:border-white/[.145]">
            <h3 className="text-sm font-medium">What the score means</h3>
            <ul className="mt-4 flex flex-col gap-4">
              {BANDS.map((band) => (
                <li key={band.label}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium">{band.label}</span>
                    <span className="tabular-nums text-zinc-500">{band.range}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/[.06] dark:bg-white/[.1]">
                    <div className={`h-full rounded-full bg-foreground ${band.width}`} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section eyebrow="Features" title="What you get">
        <ul className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <li key={feature.title} className="flex gap-4 rounded-2xl border border-black/[.08] p-6 dark:border-white/[.145]">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/[.04] dark:bg-white/[.08]">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {feature.icon}
                </svg>
              </span>
              <div>
                <h3 className="font-medium">{feature.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{feature.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section eyebrow="Good to know" title="Getting a good reading">
        <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
          {GOOD_TO_KNOW.map(([term, description]) => (
            <div key={term}>
              <dt className="text-sm font-medium">{term}</dt>
              <dd className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{description}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <section className="w-full px-4 pt-4 pb-24 sm:px-6">
        <div className="flex flex-col items-start gap-6 rounded-3xl bg-foreground px-8 py-10 text-background sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Ready to score a smile?</h2>
            <p className="mt-2 text-sm opacity-70">Create an account with just an email and password.</p>
          </div>
          <Link
            href="/register"
            className="rounded-full bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-opacity hover:opacity-90"
          >
            Get started
          </Link>
        </div>
      </section>
    </main>
  );
}

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section className="w-full px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-sm font-medium text-zinc-500">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
      <div className="mt-8">{children}</div>
    </section>
  );
}

// A sample of what a result looks like, built from the same component the app uses.
function ExampleResult() {
  return (
    <div className="w-full max-w-md rounded-3xl border border-black/[.08] bg-background p-4 shadow-xl lg:justify-self-end dark:border-white/[.145]">
      <div className="relative flex aspect-[4/3] items-end overflow-hidden rounded-2xl bg-gradient-to-br from-amber-100 via-rose-100 to-sky-100 p-3 dark:from-amber-950 dark:via-rose-950 dark:to-sky-950">
        <svg className="absolute inset-0 m-auto h-28 w-28 text-zinc-800/70 dark:text-zinc-200/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M8 14.5c1 1.5 2.4 2.2 4 2.2s3-.7 4-2.2" />
          <path d="M9 9.5h.01M15 9.5h.01" strokeWidth="2.2" />
        </svg>
        <span className="relative rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">72 · Smiling</span>
      </div>
      <div className="px-2 pt-4 pb-2">
        <p className="text-sm font-medium">example-photo.jpg</p>
        <p className="text-xs text-zinc-500">Sample result</p>
        <div className="mt-3">
          <SmileScore smile={EXAMPLE} />
        </div>
      </div>
    </div>
  );
}
