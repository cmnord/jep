type InputProps = React.ComponentProps<"input">;

type Props = {
  fwdRef?: React.MutableRefObject<HTMLInputElement | null>;
} & InputProps;

export default function Input({ fwdRef, className, ...rest }: Props) {
  return (
    <input
      {...rest}
      ref={fwdRef}
      className={
        (className ?? "") +
        ` block w-full rounded-lg border border-slate-300 bg-slate-50 p-2
        text-sm text-slate-900 placeholder:text-sm focus:border-blue-500
        focus:ring-blue-500`
      }
    />
  );
}
