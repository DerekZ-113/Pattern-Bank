import type { LeetCodeProblem } from "../types";

declare const LEETCODE_PROBLEMS: LeetCodeProblem[];
export default LEETCODE_PROBLEMS;

export function searchProblems(query: string, limit?: number): LeetCodeProblem[];
export function getProblemByNumber(num: number): LeetCodeProblem | null;
export function buildLeetCodeUrl(slug: string): string;
