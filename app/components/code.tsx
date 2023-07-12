export default function Code({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <code className={(className ?? "") + " rounded-md bg-slate-200 px-1 py-2"}>
      {children}
    </code>
  );
}

export function CodeBlock({ text }: { text: string }) {
  return (
    <pre>
      <code className="mb-4 block overflow-auto rounded-md bg-slate-200 p-4 text-sm">
        {text}
      </code>
    </pre>
  );
}
