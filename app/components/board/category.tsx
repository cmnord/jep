import useFitText from "use-fit-text";

export function Category({ category }: { category: string }) {
  const { fontSize, ref } = useFitText({ maxFontSize: 300 });

  return (
    <th className="sm:p-4 h-full bg-blue-1000 border-black border-2 sm:border-8 border-b-4 sm:border-b-12">
      <p
        style={{ fontSize }}
        ref={ref}
        className="w-full h-20 flex items-center justify-center font-bold font-impact uppercase text-shadow-lg"
      >
        {category}
      </p>
    </th>
  );
}
