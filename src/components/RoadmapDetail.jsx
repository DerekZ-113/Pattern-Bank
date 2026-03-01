import { useMemo } from "react";
import SectionHeader from "./SectionHeader";
import { getProblemByNumber, buildLeetCodeUrl } from "../utils/leetcodeProblems";
import DifficultyBadge from "./DifficultyBadge";

export default function RoadmapDetail({
    roadmap,
    userProblems,
    onBack,
    onBulkAdd
}) {
    const userProblemIds = useMemo(() => new Set(userProblems.map(p => p.leetcodeNumber).filter(Boolean)), [userProblems]);

    // Find all problems in this roadmap that are NOT in the user's library
    const missingProblems = useMemo(() => {
        const missing = [];
        roadmap.groups.forEach(group => {
            group.problems.forEach(num => {
                if (!userProblemIds.has(num)) {
                    const lcProb = getProblemByNumber(num);
                    if (lcProb) missing.push(lcProb);
                }
            });
        });
        return missing;
    }, [roadmap, userProblemIds]);

    const handleAddMissing = () => {
        if (missingProblems.length > 0) {
            onBulkAdd(missingProblems);
        }
    };

    const totalProblems = useMemo(() =>
        roadmap.groups.reduce((acc, g) => acc + g.problems.length, 0)
        , [roadmap]);

    const readyProblems = useMemo(() => {
        const roadmapProblemIds = new Set(roadmap.groups.flatMap(g => g.problems));
        return userProblems.filter(p => roadmapProblemIds.has(p.leetcodeNumber) && p.confidence >= 4).length;
    }, [roadmap, userProblems]);

    const progressPercent = totalProblems > 0 ? Math.round((readyProblems / totalProblems) * 100) : 0;

    // Count how many roadmap problems the user has imported
    const roadmapProblemIds = new Set(roadmap.groups.flatMap(g => g.problems));
    const importedCount = userProblems.filter(p => roadmapProblemIds.has(p.leetcodeNumber)).length;

    return (
        <div className="flex flex-col gap-6 p-5">
            <div className="flex items-center gap-3">
                <button
                    onClick={onBack}
                    className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-pb-bg text-pb-text-dim transition-colors hover:bg-pb-surface hover:text-pb-text"
                    aria-label="Go back"
                    title="Go back"
                >
                    &larr;
                </button>
                <div>
                    <h2 className="text-[19px] font-semibold leading-tight text-pb-text">{roadmap.title}</h2>
                    <p className="text-[13px] text-pb-text-dim mt-0.5">{roadmap.description}</p>
                </div>
            </div>

            <div className="rounded-[14px] border border-pb-border bg-pb-surface p-4 shadow-sm">
                <div className="mb-2.5 flex items-end justify-between">
                    <span className="text-[14px] font-medium text-pb-text">Interview Ready</span>
                    <span className="text-[20px] font-bold leading-none text-pb-accent">{progressPercent}%</span>
                </div>
                <div className="mb-3.5 h-2 w-full overflow-hidden rounded-full bg-pb-bg">
                    <div
                        className="h-full bg-pb-accent transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
                <div className="flex items-center justify-between text-[12px]">
                    <span className="text-pb-text-muted">{readyProblems} of {totalProblems} problems (≥ 4 stars)</span>
                    <span className="text-pb-text-muted">{importedCount} added to library</span>
                </div>
            </div>

            {missingProblems.length > 0 && (
                <button
                    onClick={handleAddMissing}
                    className="w-full cursor-pointer rounded-xl bg-pb-accent px-4 py-3.5 text-center text-[15px] font-semibold text-pb-bg shadow-sm transition-all hover:-translate-y-[1px] hover:bg-pb-accent/90"
                >
                    Add {missingProblems.length} Missing Problems to Library
                </button>
            )}

            <div className="flex flex-col gap-8 pb-4">
                {roadmap.groups.map(group => (
                    <div key={group.name} className="flex flex-col gap-3">
                        <SectionHeader title={group.name} />
                        <div className="flex flex-col gap-2">
                            {group.problems.map(num => {
                                const lcProb = getProblemByNumber(num);
                                const userProb = userProblems.find(p => p.leetcodeNumber === num);

                                if (!lcProb) return null;

                                const isReady = userProb && userProb.confidence >= 4;

                                return (
                                    <div
                                        key={num}
                                        className="flex flex-col gap-2.5 rounded-xl border border-pb-border bg-pb-surface p-3 transition-colors md:flex-row md:items-center md:justify-between"
                                    >
                                        <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-3">
                                            <div className="flex items-center gap-2">
                                                {isReady ? (
                                                    <span className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full bg-pb-success/20 text-[10px] text-pb-success">✓</span>
                                                ) : (
                                                    <span className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full bg-pb-bg text-[10px] text-pb-text-dim">○</span>
                                                )}
                                                <span className="w-[3ch] text-[13px] font-medium text-pb-text-muted">{num}.</span>
                                                <a
                                                    href={buildLeetCodeUrl(lcProb.s)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="line-clamp-1 text-[15px] font-medium text-pb-text transition-colors hover:text-pb-accent"
                                                >
                                                    {lcProb.t}
                                                </a>
                                            </div>
                                            <div className="pl-9 md:pl-0">
                                                <DifficultyBadge difficulty={lcProb.d} />
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pl-9 md:justify-end md:pl-0">
                                            {userProb ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-pb-text-dim hidden md:inline">Conf:</span>
                                                    <div className="flex gap-[3px]">
                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                            <span
                                                                key={star}
                                                                className={`text-[13px] leading-none ${star <= userProb.confidence
                                                                        ? "text-pb-warning drop-shadow-[0_0_2px_rgba(250,204,21,0.3)]"
                                                                        : "text-pb-bg"
                                                                    }`}
                                                            >
                                                                ★
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => onBulkAdd([lcProb])}
                                                    className="cursor-pointer rounded-lg bg-pb-bg px-3 py-1.5 text-xs font-semibold text-pb-text transition-colors hover:bg-pb-border hover:text-pb-accent"
                                                >
                                                    + Add
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
