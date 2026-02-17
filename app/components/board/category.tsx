import useFitText from "~/utils/use-fit-text";

export function Category({
  name,
  note,
  hidden,
}: {
  name: string;
  note?: string;
  hidden?: boolean;
}) {
  const { fontSize, ref } = useFitText<HTMLParagraphElement>({
    maxFontSize: 80,
  });

  return (
    <th className="h-full border-2 border-blue-925 bg-black/30 leading-none sm:p-4">
      <p
        style={{
          fontSize,
          visibility: hidden ? "hidden" : "visible",
          opacity: fontSize ? 1 : 0,
        }}
        ref={ref}
        className="flex h-20 w-full flex-col items-center justify-center transition-opacity duration-150"
      >
        <span className="font-inter font-bold uppercase text-shadow-md sm:text-shadow-lg">
          {name}
        </span>
      </p>
      {note && !hidden ? (
        <span className="text-xs leading-none font-normal text-slate-300 sm:text-sm">
          Note: {note}
        </span>
      ) : null}
    </th>
  );
}
