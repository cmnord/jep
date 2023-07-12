import useFitText from "use-fit-text";

export function Category({ name, note }: { name: string; note?: string }) {
  const { fontSize, ref } = useFitText({ maxFontSize: 300 });

  return (
    <th className="h-full border-2 border-b-4 border-black bg-blue-1000 leading-none sm:border-8 sm:border-b-12 sm:p-4">
      <p
        style={{ fontSize }}
        ref={ref}
        className="flex h-20 w-full flex-col items-center justify-center"
      >
        <span className="fond-bold text-shadow-md sm:text-shadow-lg font-impact uppercase">
          {name}
        </span>
      </p>
      {note ? (
        <span className="text-xs font-normal leading-none text-slate-300 sm:text-sm">
          Note: {note}
        </span>
      ) : null}
    </th>
  );
}
