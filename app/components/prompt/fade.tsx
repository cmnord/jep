import clsx from "clsx";
import * as React from "react";

/** Fade applies slide in and out animations on the component when it mounts and
 * unmounts. */
export function Fade({
  show,
  children,
}: {
  show: boolean;
  children: React.ReactNode;
}) {
  const [shouldRender, setRender] = React.useState(show);

  React.useEffect(() => {
    if (show) setRender(true);
  }, [show]);

  const onAnimationEnd = () => {
    if (!show) setRender(false);
  };

  return shouldRender ? (
    <div
      className={clsx("absolute top-0 left-0 w-screen", {
        "animate-slide-in-from-top-left": show,
        "animate-slide-out": !show,
      })}
      onAnimationEnd={onAnimationEnd}
    >
      {children}
    </div>
  ) : null;
}
