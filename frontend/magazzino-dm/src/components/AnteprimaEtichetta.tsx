type Props = {
  descrizione: string;
};

// Stessa logica di word-wrap del backend Python
function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  if (!text.trim()) return [];

  const words = text.replace(/-/g, "- ").split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (let word of words) {
    // Parole più lunghe del limite: spezzale
    while (word.length > maxChars) {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = "";
      }
      lines.push(word.slice(0, maxChars));
      word = word.slice(maxChars);
    }

    const testLine = currentLine ? `${currentLine} ${word}` : word;

    if (testLine.length <= maxChars) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) lines.push(currentLine);

  return lines.slice(0, maxLines);
}

export default function AnteprimaEtichetta({ descrizione }: Props) {
  const lines = wrapText(descrizione, 22, 8);

  return (
    <div className="w-[200px] h-[180px] bg-white border-2 border-gray-300 rounded flex flex-col items-center justify-center p-2 select-none">
      {/* Righe descrizione */}
      <div className="flex-1 flex flex-col items-center justify-center gap-0.5">
        {lines.length > 0 ? (
          lines.map((line, i) => (
            <span key={i} className="text-xs font-mono font-bold text-center leading-tight">
              {line}
            </span>
          ))
        ) : (
          <span className="text-xs text-gray-300 italic">Anteprima</span>
        )}
      </div>
    </div>
  );
}