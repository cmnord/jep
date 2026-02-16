export default function Main({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <main
      className={
        (className ?? "") +
        " mx-auto max-w-screen-md px-4 pt-8 pb-16 text-slate-700 md:pt-16"
      }
    >
      {children}
    </main>
  );
}
