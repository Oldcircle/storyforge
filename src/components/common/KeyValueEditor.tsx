interface KeyValueRow {
  key: string;
  value: string;
}

interface KeyValueEditorProps {
  rows: KeyValueRow[];
  addLabel: string;
  keyPlaceholder: string;
  valuePlaceholder: string;
  onChange: (rows: KeyValueRow[]) => void;
}

export function KeyValueEditor({
  rows,
  addLabel,
  keyPlaceholder,
  valuePlaceholder,
  onChange
}: KeyValueEditorProps) {
  const updateRow = (index: number, next: KeyValueRow) => {
    onChange(rows.map((row, rowIndex) => (rowIndex === index ? next : row)));
  };

  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <div key={`${row.key}-${index}`} className="grid gap-2 md:grid-cols-[1fr_2fr_auto]">
          <input
            className="rounded-2xl border border-stroke bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none transition focus:border-accent-blue"
            placeholder={keyPlaceholder}
            value={row.key}
            onChange={(event) =>
              updateRow(index, {
                ...row,
                key: event.target.value
              })
            }
          />
          <input
            className="rounded-2xl border border-stroke bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none transition focus:border-accent-blue"
            placeholder={valuePlaceholder}
            value={row.value}
            onChange={(event) =>
              updateRow(index, {
                ...row,
                value: event.target.value
              })
            }
          />
          <button
            className="rounded-2xl border border-stroke bg-bg-tertiary px-3 py-2 text-sm text-text-secondary transition hover:text-text-primary"
            onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))}
            type="button"
          >
            删除
          </button>
        </div>
      ))}
      <button
        className="rounded-2xl border border-dashed border-stroke px-3 py-2 text-sm text-text-secondary transition hover:border-stroke-strong hover:text-text-primary"
        type="button"
        onClick={() => onChange([...rows, { key: "", value: "" }])}
      >
        {addLabel}
      </button>
    </div>
  );
}
