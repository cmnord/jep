export default function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1 py-2 bg-slate-200 rounded-md text-sm">
      {children}
    </code>
  );
}

export function CodeBlock({ text }: { text: string }) {
  return (
    <pre>
      <code className="block overflow-auto p-4 mb-4 bg-slate-200 rounded-md text-sm">
        {text}
      </code>
    </pre>
  );
}
