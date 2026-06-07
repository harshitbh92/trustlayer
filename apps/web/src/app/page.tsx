import Link from "next/link";

export default function Landing() {
  return (
    <div className="space-y-10">
      <section className="surface-elevated p-8 sm:p-12">
        <p className="label">A trust and compatibility layer</p>
        <h1 className="mt-3 text-3xl sm:text-5xl font-semibold tracking-tight">
          Conversation, measured by how it <em className="text-accent not-italic">feels</em> —
          not by likes or scores.
        </h1>
        <p className="mt-5 max-w-2xl text-muted sm:text-lg">
          TrustLayer combines a public social identity, anonymous discovery,
          and a reputation system built around interaction quality. There is
          no public number rating you. There are only tags that describe how
          people experience a conversation with you.
        </p>
        <div className="mt-7 flex gap-3">
          <Link href="/register" className="btn-primary">
            Create an account
          </Link>
          <Link href="/login" className="btn-ghost">
            Sign in
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Pillar
          title="Public identity"
          body="A profile, a feed, and connections — built on tags like Respectful, Curious Mind, Easy to Talk To."
        />
        <Pillar
          title="Anonymous discovery"
          body="Meet strangers as aliases. Real identity stays hidden, accountability stays intact."
        />
        <Pillar
          title="Feel-based feedback"
          body="After a chat we ask how it felt — not how the person rates. Negative signals stay internal."
        />
      </section>
    </div>
  );
}

function Pillar({ title, body }: { title: string; body: string }) {
  return (
    <div className="surface p-5">
      <h3 className="text-sm font-semibold text-accent">{title}</h3>
      <p className="mt-2 text-sm text-muted">{body}</p>
    </div>
  );
}
