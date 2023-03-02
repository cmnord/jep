export default function Toggle({
  name,
  checked,
  setChecked,
}: {
  name: string;
  checked: boolean;
  setChecked: (checked: boolean) => void;
}) {
  return (
    <div className="relative inline-flex items-center">
      <label className="sr-only" htmlFor={name + "-toggle"}>
        {name}
      </label>
      <input
        id={name + "-toggle"}
        type="checkbox"
        checked={checked}
        readOnly
        className="sr-only peer"
      />
      <button
        id={name}
        name={name}
        onClick={() => {
          setChecked(!checked);
        }}
        className={
          "w-11 h-6 bg-gray-200 " +
          "focus:outline-none focus:ring-4 focus:ring-blue-300 " +
          "rounded-full peer " +
          "peer-checked:after:translate-x-full peer-checked:after:border-white peer-checked:bg-blue-600 " +
          "after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"
        }
      />
      <label className="sr-only" htmlFor={name}>
        {name}
      </label>
    </div>
  );
}
