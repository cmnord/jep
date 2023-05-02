export default function Input({
  fwdRef,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & {
  fwdRef?: React.MutableRefObject<HTMLInputElement | null>;
}) {
  return (
    <input
      ref={fwdRef}
      {...rest}
      className={
        rest.className +
        ` block w-full rounded-lg border border-slate-300 bg-slate-50 p-2
        text-sm text-slate-900 placeholder:text-sm focus:border-blue-500
        focus:ring-blue-500`
      }
    />
  );
}
