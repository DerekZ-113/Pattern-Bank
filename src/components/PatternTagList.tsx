import { Fragment } from "react";
import { groupPatternsByCategory } from "../utils/constants";
import PatternTag from "./PatternTag";

interface Props {
  patterns: string[];
}

// Renders pattern pills grouped structures | strategies | custom, with a
// subtle divider only between non-empty groups. Grouping happens at render
// time — the stored patterns array keeps the user's order untouched.
// Renders a fragment so pills join the call site's existing flex container.
export default function PatternTagList({ patterns }: Props) {
  const { structures, strategies, custom } = groupPatternsByCategory(patterns);
  const groups = [structures, strategies, custom].filter((g) => g.length > 0);

  return (
    <>
      {groups.map((group, i) => (
        <Fragment key={group[0]}>
          {i > 0 && (
            <span
              aria-hidden="true"
              data-testid="pattern-group-divider"
              className="h-3.5 w-px self-center bg-pb-text-dim opacity-60"
            />
          )}
          {group.map((p) => (
            <PatternTag key={p} name={p} />
          ))}
        </Fragment>
      ))}
    </>
  );
}
