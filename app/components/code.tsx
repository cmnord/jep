export default function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1 py-2 bg-gray-200 rounded-md text-sm">{children}</code>
  );
}

export function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre className="p-4 mb-4 bg-gray-200 rounded-md text-sm">{children}</pre>
  );
}
