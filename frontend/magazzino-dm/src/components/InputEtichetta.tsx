type Props = {
    value: string;
    onChange: (value:string) => void;
};

export default function InputEtichetta({ value, onChange }: Props) {
    return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      maxLength={100}
      rows={2}
      placeholder="Descrizione etichetta..."
      className="field-sizing-content min-h-[40px] md:min-h-[60px] w-full border border-gray-300 rounded-lg px-3 py-2 resize-none ..."
    />
  );
}