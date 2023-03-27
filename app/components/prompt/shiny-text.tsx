export default function ShinyText({ text }: { text: string }) {
  return (
    <div
      className="grid text-center font-black uppercase mx-auto"
      style={{
        // a bit of a hack to keep the text from going to maxFontSize
        // (like 100vw + padding)
        maxWidth: "90%",
      }}
    >
      <div className="shiny-text shiny-text-bg">{text}</div>
      <div className="shiny-text shiny-text-fg">{text}</div>
    </div>
  );
}
