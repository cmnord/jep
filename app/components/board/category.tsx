import Popover from "~/components/popover";
import useFitText from "~/utils/use-fit-text";

export function Category({
  name,
  note,
  hidden,
  allAnswered,
}: {
  name: string;
  note?: string;
  hidden?: boolean;
  allAnswered?: boolean;
}) {
  const { fontSize, ref } = useFitText<HTMLSpanElement>({
    maxFontSize: 80,
  });

  const isCompleted = allAnswered && !hidden;
  const isHidden = hidden || isCompleted;

  const nameContent = (
    <span
      style={{
        fontSize,
        visibility: isHidden ? "hidden" : "visible",
        opacity: fontSize ? 1 : 0,
      }}
      ref={ref}
      className="flex h-20 w-full flex-col items-center justify-center transition-opacity duration-150"
    >
      <span className="font-inter font-bold uppercase text-shadow-md sm:text-shadow-lg">
        {name}
      </span>
    </span>
  );

  return (
    <th className="h-full border-2 border-blue-925 bg-black/30 leading-none sm:p-4">
      {isCompleted ? (
        <Popover
          content={
            <p>
              <span className="uppercase">{name}</span>
              {note ? (
                <>
                  <br />
                  <span className="text-xs">{note}</span>
                </>
              ) : null}
            </p>
          }
        >
          <button
            type="button"
            className="w-full"
            aria-label="Show completed category"
          >
            {nameContent}
          </button>
        </Popover>
      ) : (
        <>
          {nameContent}
          {note && !hidden ? (
            <span className="text-xs leading-none font-normal text-slate-300 sm:text-sm">
              Note: {note}
            </span>
          ) : null}
        </>
      )}
    </th>
  );
}
