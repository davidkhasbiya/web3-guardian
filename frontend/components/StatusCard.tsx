type StatusCardProps = {
  title: string;
  status: string;
  description: string;
};

export default function StatusCard({
  title,
  status,
  description,
}: StatusCardProps) {
  return (
    <article className="rounded-xl border border-border bg-card p-5">
      <p className="text-sm text-muted">{title}</p>
      <p className="mt-2 font-mono text-lg text-accent">{status}</p>
      <p className="mt-3 text-sm leading-6 text-muted">{description}</p>
    </article>
  );
}
