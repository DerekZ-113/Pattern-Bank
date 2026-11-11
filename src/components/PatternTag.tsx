interface Props {
  name: string;
}

// Deliberately colourless: colour is reserved for confidence and difficulty,
// so a row of tags reads as words rather than as a second colour code.
export default function PatternTag({ name }: Props) {
  return (
    <span className="inline-flex items-center rounded-md bg-pb-surface-hover px-2 py-1 text-xs font-medium leading-none text-pb-text-muted">
      {name}
    </span>
  );
}
