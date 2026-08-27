interface Props {
  value: string;
  onChange: (v: string) => void;
}

// Honeypot anti-spam field — invisible to humans, filled by bots.
// Must be placed inside the <form> element.
export function HoneypotField({ value, onChange }: Props) {
  return (
    <input
      type="text"
      name="website_confirm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      tabIndex={-1}
      aria-hidden="true"
      autoComplete="off"
      style={{
        position: "absolute",
        left: "-9999px",
        width: "1px",
        height: "1px",
        opacity: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    />
  );
}
