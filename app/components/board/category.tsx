import useFitText from "use-fit-text";

export function Category({ name, note }: { name: string; note?: string }) {
  const { fontSize, ref } = useFitText({ maxFontSize: 300 });

  return (
    <th className="sm:p-4 h-full bg-blue-1000 border-black border-2 sm:border-8 border-b-4 sm:border-b-12 leading-none">
      <p
        style={{ fontSize }}
        ref={ref}
        className="w-full h-20 flex flex-col items-center justify-center"
      >
        <span className="font-impact fond-bold uppercase text-shadow-md sm:text-shadow-lg">
          {name}
        </span>
      </p>
      {note ? (
        <span className="text-slate-300 text-xs sm:text-sm font-normal leading-none">
          Note: {note}
        </span>
      ) : null}
    </th>
  );
}
