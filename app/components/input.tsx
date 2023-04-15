export default function Input(props: JSX.IntrinsicElements["input"]) {
  return (
    <input
      {...props}
      className={
        props.className +
        ` block w-full rounded-lg border border-slate-300 bg-slate-50 p-2
        text-sm text-slate-900 placeholder:text-sm focus:border-blue-500
        focus:ring-blue-500`
      }
    />
  );
}
