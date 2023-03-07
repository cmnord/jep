import useFitText from "use-fit-text";

export function Category({ category }: { category: string }) {
  const { fontSize, ref } = useFitText({ maxFontSize: 300 });

  return (
    <th className="p-4 h-full bg-blue-1000 border-black border-8 border-b-12">
      <p
        style={{ fontSize }}
        ref={ref}
        className="w-full h-20 flex items-center justify-center font-bold font-impact uppercase text-shadow-md"
      >
        {category}
      </p>
    </th>
  );
}
