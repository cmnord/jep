import useFitText from "use-fit-text";

export default function ShinyText({ text }: { text: string }) {
  const { ref, fontSize } = useFitText({ minFontSize: 20, maxFontSize: 600 });

  return (
    <div
      className="grid text-center font-black uppercase mx-auto"
      ref={ref}
      style={{
        // a bit of a hack to keep the text from going to maxFontSize
        // (like 100vw + padding)
        maxWidth: "90%",
        fontSize,
      }}
    >
      <div className="shiny-text shiny-text-bg">{text}</div>
      <div className="shiny-text shiny-text-fg">{text}</div>
    </div>
  );
}
