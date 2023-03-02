import { Textfit } from "react-textfit";

export function Category({ category }: { category: string }) {
  return (
    <th className="p-4 h-full bg-blue-1000 border-black border-8 border-b-12">
      <Textfit
        className="w-full h-20 flex items-center justify-center font-bold font-impact uppercase text-shadow-md"
        mode="multi"
      >
        {category}
      </Textfit>
    </th>
  );
}
