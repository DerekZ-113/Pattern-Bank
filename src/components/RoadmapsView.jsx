import { useState } from 'react';
import SectionHeader from "./SectionHeader";
import RoadmapDetail from "./RoadmapDetail";
import { ROADMAPS } from "../data/roadmaps";

export default function RoadmapsView({ userProblems, onBulkAdd }) {
    const [selectedRoadmap, setSelectedRoadmap] = useState(null);

    if (selectedRoadmap) {
        return (
            <RoadmapDetail
                roadmap={selectedRoadmap}
                userProblems={userProblems}
                onBack={() => setSelectedRoadmap(null)}
                onBulkAdd={onBulkAdd}
            />
        );
    }

    return (
        <div className="flex flex-col gap-6 p-5">
            <div>
                <SectionHeader title="Interview Roadmaps" />
                <p className="mb-4 text-sm leading-relaxed text-pb-text-muted">
                    Follow structured paths to interview readiness. Problems you rate 4 or 5 stars are considered "Interview Ready."
                </p>
                <div className="flex flex-col gap-3">
                    {ROADMAPS.map(roadmap => {
                        const totalProblems = roadmap.groups.reduce((acc, g) => acc + g.problems.length, 0);

                        const roadmapProblemIds = new Set(roadmap.groups.flatMap(g => g.problems));
                        const readyCount = userProblems.filter(p => roadmapProblemIds.has(p.leetcodeNumber) && p.confidence >= 4).length;

                        const progressPercent = totalProblems > 0 ? Math.round((readyCount / totalProblems) * 100) : 0;

                        return (
                            <button
                                key={roadmap.id}
                                onClick={() => setSelectedRoadmap(roadmap)}
                                className="flex cursor-pointer flex-col gap-3 rounded-[14px] border border-pb-border bg-pb-surface p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-[1px] hover:border-pb-accent hover:shadow-md"
                            >
                                <div className="flex w-full items-start justify-between">
                                    <div>
                                        <h3 className="text-[17px] font-semibold text-pb-text">{roadmap.title}</h3>
                                        <p className="pb-1 pt-1 text-[13px] text-pb-text-dim">{roadmap.description}</p>
                                    </div>
                                </div>

                                <div className="flex w-full flex-col gap-1.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[12px] font-semibold text-pb-accent">{progressPercent}% Ready</span>
                                        <span className="text-[11px] font-medium text-pb-text-dim">{readyCount} / {totalProblems}</span>
                                    </div>
                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-pb-bg">
                                        <div
                                            className="h-full bg-pb-accent transition-all duration-500"
                                            style={{ width: `${progressPercent}%` }}
                                        />
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
