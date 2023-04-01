export default function ShinyText({ text }: { text: string }) {
  return (
    <div className="grid grid-cols-1 text-center font-black uppercase">
      <div className="shiny-text shiny-text-bg">{text}</div>
      <div className="shiny-text shiny-text-fg">{text}</div>
    </div>
  );
}
