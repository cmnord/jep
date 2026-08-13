export default function Main({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-screen-md grow px-4 pt-8 pb-16 text-slate-700 md:pt-16">
      {children}
    </main>
  );
}
