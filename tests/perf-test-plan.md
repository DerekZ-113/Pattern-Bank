# PatternBank Web Performance & Visual Test Plan

> For Claude Code with Playwright MCP. Run these tests against localhost:5173.

## Pre-Check

1. Open browser to http://localhost:5173
2. Take a screenshot to confirm the app loads

## Test 1: Inject 500 Problems for Stress Test

Run this in the browser console (via Playwright's evaluate):

```javascript
const patterns = ["Two Pointers", "Hash Table", "Sliding Window", "Binary Search", "Sorting", "Linked List", "Stack", "Queue", "Tree", "BFS", "DFS", "Heap", "Greedy", "Backtracking", "Graph", "Union Find", "Trie", "DP"];
const difficulties = ["Easy", "Medium", "Hard"];

const problems = [];
for (let i = 0; i < 500; i++) {
  const patternCount = Math.floor(Math.random() * 2) + 1;
  const shuffled = [...patterns].sort(() => Math.random() - 0.5);
  const selectedPatterns = shuffled.slice(0, patternCount);
  const confidence = Math.floor(Math.random() * 5) + 1;
  const daysAgo = Math.floor(Math.random() * 30);
  const today = new Date();
  const dateAdded = new Date(today - daysAgo * 86400000).toISOString().split("T")[0];
  const nextReview = new Date(today.getTime() + (Math.random() * 14 - 7) * 86400000).toISOString().split("T")[0];

  problems.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + i,
    title: "Test Problem " + (i + 1),
    leetcodeNumber: 2000 + i,
    url: null,
    difficulty: difficulties[i % 3],
    patterns: selectedPatterns,
    confidence,
    notes: i % 3 === 0 ? "Notes for problem " + (i + 1) : "",
    dateAdded,
    lastReviewed: i % 2 === 0 ? dateAdded : null,
    nextReviewDate: nextReview,
    updatedAt: new Date().toISOString(),
  });
}

localStorage.setItem("patternbank-problems", JSON.stringify(problems));
console.log("Injected 500 problems");
```

After injecting, reload the page.

## Test 2: Dashboard Render Check

1. Take a screenshot of the dashboard
2. Verify: stats bar shows "500" total, heatmap renders all 18 pattern cells
3. Note: does the page feel slow or instant?

## Test 3: All Problems — Scroll Performance

1. Click "All Problems" tab
2. Take a screenshot showing the problem list
3. Note: how many cards are visible? Is there any visible lag?

## Test 4: Filter Responsiveness

1. On All Problems, type "Test Problem 2" in the search bar
2. Take a screenshot — should filter to around 111 results (200-299 range)
3. Select "Hard" from difficulty filter
4. Take a screenshot — should narrow further to around 37 results
5. Click "Clear filters"
6. Take a screenshot — should return to 500

## Test 5: Heatmap Accuracy

1. Go back to Dashboard
2. Take a screenshot focused on the heatmap
3. Verify: all 18 patterns should have data (the injection distributes randomly across all patterns)
4. Colors should range from red to green based on random confidence values

## Test 6: Cleanup

Run in browser console:

```javascript
localStorage.removeItem("patternbank-problems");
console.log("Cleaned up test data");
```

Reload to confirm empty state returns.

## Report Format

After all tests, provide:
- Screenshot from each test step
- Any performance concerns (lag, jank, slow rendering)
- Any visual bugs noticed
- Pass/fail for each test
