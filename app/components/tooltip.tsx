export default function Tooltip({
  content,
  children,
}: {
  content: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex flex-col items-center group">
      {children}
      <div
        className={
          "absolute bottom-0 flex flex-col items-center opacity-0 mb-6 " +
          "group-hover:opacity-100 group-active:opacity-100 group-focus:opacity-100 transition"
        }
      >
        <span
          className={
            "relative z-10 p-2 bg-gray-700 shadow-lg rounded-md " +
            "text-xs text-white whitespace-nowrap"
          }
        >
          {content}
        </span>
        <div className="w-3 h-3 -mt-2 rotate-45 bg-gray-700"></div>
      </div>
    </div>
  );
}
