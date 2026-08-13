import { useId } from "react";

/** Heroicon name: solid/arrow-top-right-on-square */
export function ArrowTopRightOnSquare({
  className,
  title,
}: {
  className?: string;
  title?: string;
}) {
  const titleId = useId();
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      focusable="false"
      role={title ? "img" : undefined}
      aria-labelledby={title ? titleId : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title id={titleId}>{title}</title> : null}
      <path
        fillRule="evenodd"
        d="M15.75 2.25H21a.75.75 0 01.75.75v5.25a.75.75 0 01-1.5 0V4.81l-8.72 8.72a.75.75 0 11-1.06-1.06l8.72-8.72h-3.44a.75.75 0 010-1.5zm-12 4.5a3 3 0 013-3h4.5a.75.75 0 010 1.5h-4.5a1.5 1.5 0 00-1.5 1.5v10.5a1.5 1.5 0 001.5 1.5h10.5a1.5 1.5 0 001.5-1.5v-4.5a.75.75 0 011.5 0v4.5a3 3 0 01-3 3H6.75a3 3 0 01-3-3V6.75z"
        clipRule="evenodd"
      />
    </svg>
  );
}
