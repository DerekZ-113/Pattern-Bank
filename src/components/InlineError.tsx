interface Props {
  message?: string;
}

export default function InlineError({ message }: Props) {
  if (!message) return null;
  return <span className="mt-1 block text-xs text-pb-error">{message}</span>;
}
