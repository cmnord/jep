import classNames from "classnames";
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
      className={classNames("fixed left-0 top-0 w-screen", {
        "animate-slideIn": show,
        "animate-slideOut": !show,
      })}
      onAnimationEnd={onAnimationEnd}
    >
      {children}
    </div>
  ) : null;
}
