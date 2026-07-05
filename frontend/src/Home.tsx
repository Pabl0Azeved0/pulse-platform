import { Link } from 'react-router-dom';
import PulseWave from './components/PulseWave';
import Feed from './Feed';
import { useAuth } from './context/AuthContext';

const features = [
  {
    title: 'Real-time feed',
    body: 'Posts appear the moment they are shared — no refresh, no waiting.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    ),
  },
  {
    title: 'Follow the people you care about',
    body: 'Build your circle and switch between a global and a following-only feed.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4z"
      />
    ),
  },
  {
    title: 'Conversations that thread',
    body: 'Reply, like, and follow a discussion without losing the plot.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M7 8h10M7 12h6m-6 8l-3-3H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-6l-3 3z"
      />
    ),
  },
];

export default function Home() {
  const { user } = useAuth();

  if (user) {
    return <Feed />;
  }

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* soft ambient glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-32 mx-auto h-72 w-[42rem] max-w-full rounded-full bg-accent/10 blur-3xl"
        />
        <div className="relative max-w-3xl mx-auto px-4 pt-32 pb-16 text-center">
          <div className="mb-8 flex justify-center opacity-90">
            <PulseWave />
          </div>

          <span className="badge mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            Real-time social, minus the noise
          </span>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-ink leading-[1.05]">
            Feel the <span className="text-accent">pulse</span> of your community
          </h1>

          <p className="mt-6 text-lg text-ink-muted max-w-xl mx-auto leading-relaxed">
            Share what's happening, follow the people you care about, and keep up with conversations
            as they unfold — all in real time.
          </p>

          <div className="mt-9 flex flex-col sm:flex-row justify-center gap-3">
            <Link to="/register" className="btn-primary px-7 py-3 text-base">
              Get started — it's free
            </Link>
            <Link to="/login" className="btn-secondary px-7 py-3 text-base">
              I already have an account
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 pb-24">
        <div className="grid gap-4 sm:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="card p-6">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent/[0.12] text-accent mb-4">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  {f.icon}
                </svg>
              </span>
              <h3 className="text-base font-semibold text-ink">{f.title}</h3>
              <p className="mt-2 text-sm text-ink-muted leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
