// Curated problem lists for PatternBank
// Verified against leetcodeProblems.js (3,846 problems) on March 2, 2026
// Pattern assignments use PatternBank's 18 patterns from constants.js

import { getProblemByNumber } from "./leetcodeProblems";

// ============================================================
// SHARED PATTERN MAP
// Each LC problem number → its primary PatternBank pattern
// One source of truth — shared across all lists
// ============================================================

const PATTERN_MAP = {
  // Hash Table
  1: "Hash Table",     // Two Sum
  7: "Hash Table",     // Reverse Integer
  8: "Hash Table",     // String to Integer (atoi)
  9: "Hash Table",     // Palindrome Number
  13: "Hash Table",    // Roman to Integer
  14: "Hash Table",    // Longest Common Prefix
  31: "Hash Table",    // Next Permutation
  36: "Hash Table",    // Valid Sudoku
  41: "Hash Table",    // First Missing Positive
  49: "Hash Table",    // Group Anagrams
  67: "Hash Table",    // Add Binary
  128: "Hash Table",   // Longest Consecutive Sequence
  136: "Hash Table",   // Single Number
  169: "Hash Table",   // Majority Element
  189: "Hash Table",   // Rotate Array
  190: "Hash Table",   // Reverse Bits
  191: "Hash Table",   // Number of 1 Bits
  217: "Hash Table",   // Contains Duplicate
  238: "Hash Table",   // Product of Array Except Self
  242: "Hash Table",   // Valid Anagram
  268: "Hash Table",   // Missing Number
  271: "Hash Table",   // Encode and Decode Strings
  338: "Hash Table",   // Counting Bits
  347: "Hash Table",   // Top K Frequent Elements
  380: "Hash Table",   // Insert Delete GetRandom O(1)
  383: "Hash Table",   // Ransom Note
  409: "Hash Table",   // Longest Palindrome
  525: "Hash Table",   // Contiguous Array
  560: "Hash Table",   // Subarray Sum Equals K
  43: "Hash Table",    // Multiply Strings
  66: "Hash Table",    // Plus One
  202: "Hash Table",   // Happy Number
  371: "Hash Table",   // Sum of Two Integers
  2013: "Hash Table",  // Detect Squares
  27: "Hash Table",     // Remove Element
  122: "Hash Table",    // Best Time to Buy And Sell Stock II
  168: "Hash Table",    // Excel Sheet Column Title
  201: "Hash Table",    // Bitwise AND of Numbers Range
  229: "Hash Table",    // Majority Element II
  304: "Hash Table",    // Range Sum Query 2D Immutable
  705: "Hash Table",    // Design HashSet
  706: "Hash Table",    // Design HashMap
  867: "Hash Table",    // Transpose Matrix
  912: "Hash Table",    // Sort an Array
  1071: "Hash Table",   // Greatest Common Divisor of Strings
  1929: "Hash Table",   // Concatenation of Array
  2807: "Hash Table",   // Insert Greatest Common Divisors in Linked List
  3133: "Hash Table",   // Minimum Array End

  // Two Pointers
  11: "Two Pointers",  // Container With Most Water
  15: "Two Pointers",  // 3Sum
  16: "Two Pointers",  // 3Sum Closest
  42: "Two Pointers",  // Trapping Rain Water
  75: "Two Pointers",  // Sort Colors
  125: "Two Pointers", // Valid Palindrome
  167: "Two Pointers", // Two Sum II
  283: "Two Pointers", // Move Zeroes
  287: "Two Pointers", // Find the Duplicate Number
  977: "Two Pointers", // Squares of a Sorted Array
  18: "Two Pointers",   // 4Sum
  26: "Two Pointers",   // Remove Duplicates From Sorted Array
  88: "Two Pointers",   // Merge Sorted Array
  344: "Two Pointers",  // Reverse String
  680: "Two Pointers",  // Valid Palindrome II
  881: "Two Pointers",  // Boats to Save People
  1768: "Two Pointers", // Merge Strings Alternately

  // Sliding Window
  3: "Sliding Window",   // Longest Substring Without Repeating Characters
  76: "Sliding Window",  // Minimum Window Substring
  239: "Sliding Window",  // Sliding Window Maximum
  424: "Sliding Window", // Longest Repeating Character Replacement
  438: "Sliding Window", // Find All Anagrams in a String
  567: "Sliding Window", // Permutation in String
  209: "Sliding Window", // Minimum Size Subarray Sum
  219: "Sliding Window", // Contains Duplicate II

  // Binary Search
  4: "Binary Search",    // Median of Two Sorted Arrays
  33: "Binary Search",   // Search in Rotated Sorted Array
  34: "Binary Search",   // Find First and Last Position
  35: "Binary Search",   // Search Insert Position
  50: "Binary Search",   // Pow(x, n)
  74: "Binary Search",   // Search a 2D Matrix
  153: "Binary Search",  // Find Minimum in Rotated Sorted Array
  240: "Binary Search",  // Search a 2D Matrix II
  278: "Binary Search",  // First Bad Version
  528: "Binary Search",  // Random Pick with Weight
  658: "Binary Search",  // Find K Closest Elements
  704: "Binary Search",  // Binary Search
  875: "Binary Search",  // Koko Eating Bananas
  981: "Binary Search",  // Time Based Key-Value Store
  69: "Binary Search",    // Sqrt(x)
  81: "Binary Search",    // Search In Rotated Sorted Array II
  374: "Binary Search",   // Guess Number Higher Or Lower
  410: "Binary Search",   // Split Array Largest Sum
  1011: "Binary Search",  // Capacity to Ship Packages Within D Days
  1095: "Binary Search",  // Find in Mountain Array

  // Sorting
  48: "Sorting",   // Rotate Image
  54: "Sorting",   // Spiral Matrix
  56: "Sorting",   // Merge Intervals
  57: "Sorting",   // Insert Interval
  73: "Sorting",   // Set Matrix Zeroes
  179: "Sorting",  // Largest Number
  252: "Sorting",  // Meeting Rooms
  253: "Sorting",  // Meeting Rooms II
  435: "Sorting",  // Non-overlapping Intervals
  759: "Sorting",  // Employee Free Time
  1851: "Sorting", // Minimum Interval to Include Each Query
  2402: "Sorting",  // Meeting Rooms III

  // Linked List
  2: "Linked List",    // Add Two Numbers
  19: "Linked List",   // Remove Nth Node From End of List
  21: "Linked List",   // Merge Two Sorted Lists
  24: "Linked List",   // Swap Nodes in Pairs
  25: "Linked List",   // Reverse Nodes in k-Group
  61: "Linked List",   // Rotate List
  138: "Linked List",  // Copy List with Random Pointer
  141: "Linked List",  // Linked List Cycle
  142: "Linked List",  // Linked List Cycle II
  143: "Linked List",  // Reorder List
  146: "Linked List",  // LRU Cache
  148: "Linked List",  // Sort List
  160: "Linked List",  // Intersection of Two Linked Lists
  206: "Linked List",  // Reverse Linked List
  234: "Linked List",  // Palindrome Linked List
  328: "Linked List",  // Odd Even Linked List
  876: "Linked List",  // Middle of the Linked List
  92: "Linked List",   // Reverse Linked List II
  460: "Linked List",  // LFU Cache
  622: "Linked List",  // Design Circular Queue

  // Stack
  20: "Stack",   // Valid Parentheses
  84: "Stack",   // Largest Rectangle in Histogram
  150: "Stack",  // Evaluate Reverse Polish Notation
  155: "Stack",  // Min Stack
  224: "Stack",  // Basic Calculator
  227: "Stack",  // Basic Calculator II
  232: "Stack",  // Implement Queue using Stacks
  394: "Stack",  // Decode String
  735: "Stack",  // Asteroid Collision
  739: "Stack",  // Daily Temperatures
  844: "Stack",  // Backspace String Compare
  895: "Stack",  // Maximum Frequency Stack
  853: "Stack",  // Car Fleet
  71: "Stack",    // Simplify Path
  225: "Stack",   // Implement Stack Using Queues
  682: "Stack",   // Baseball Game
  901: "Stack",   // Online Stock Span

  // Tree
  94: "Tree",    // Binary Tree Inorder Traversal
  98: "Tree",    // Validate Binary Search Tree
  100: "Tree",   // Same Tree
  101: "Tree",   // Symmetric Tree
  104: "Tree",   // Maximum Depth of Binary Tree
  105: "Tree",   // Construct Binary Tree from Preorder and Inorder
  108: "Tree",   // Convert Sorted Array to Binary Search Tree
  110: "Tree",   // Balanced Binary Tree
  113: "Tree",   // Path Sum II
  114: "Tree",   // Flatten Binary Tree to Linked List
  124: "Tree",   // Binary Tree Maximum Path Sum
  226: "Tree",   // Invert Binary Tree
  230: "Tree",   // Kth Smallest Element in a BST
  235: "Tree",   // Lowest Common Ancestor of a BST
  236: "Tree",   // Lowest Common Ancestor of a Binary Tree
  285: "Tree",   // Inorder Successor in BST
  297: "Tree",   // Serialize and Deserialize Binary Tree
  437: "Tree",   // Path Sum III
  543: "Tree",   // Diameter of Binary Tree
  572: "Tree",   // Subtree of Another Tree
  1448: "Tree",  // Count Good Nodes in Binary Tree
  144: "Tree",   // Binary Tree Preorder Traversal
  145: "Tree",   // Binary Tree Postorder Traversal
  337: "Tree",   // House Robber III
  427: "Tree",   // Construct Quad Tree
  450: "Tree",   // Delete Node in a BST
  701: "Tree",   // Insert into a Binary Search Tree
  1325: "Tree",  // Delete Leaves With a Given Value

  // BFS
  102: "BFS",    // Binary Tree Level Order Traversal
  103: "BFS",    // Binary Tree Zigzag Level Order Traversal
  127: "BFS",    // Word Ladder
  199: "BFS",    // Binary Tree Right Side View
  200: "BFS",    // Number of Islands
  310: "BFS",    // Minimum Height Trees
  417: "BFS",    // Pacific Atlantic Water Flow
  542: "BFS",    // 01 Matrix
  662: "BFS",    // Maximum Width of Binary Tree
  733: "BFS",    // Flood Fill
  815: "BFS",    // Bus Routes
  863: "BFS",    // All Nodes Distance K in Binary Tree
  994: "BFS",    // Rotting Oranges
  1197: "BFS",   // Minimum Knight Moves
  1730: "BFS",   // Shortest Path to Get Food
  286: "BFS",    // Walls and Gates
  695: "BFS",    // Max Area of Island
  463: "BFS",    // Island Perimeter
  752: "BFS",    // Open The Lock

  // DFS
  329: "DFS",    // Longest Increasing Path in a Matrix

  // Heap
  23: "Heap",    // Merge k Sorted Lists
  215: "Heap",   // Kth Largest Element in an Array
  295: "Heap",   // Find Median from Data Stream
  362: "Heap",   // Design Hit Counter
  621: "Heap",   // Task Scheduler
  632: "Heap",   // Smallest Range Covering Elements from K Lists
  692: "Heap",   // Top K Frequent Words
  973: "Heap",   // K Closest Points to Origin
  355: "Heap",   // Design Twitter
  703: "Heap",   // Kth Largest Element in a Stream
  1046: "Heap",  // Last Stone Weight
  502: "Heap",    // IPO
  767: "Heap",    // Reorganize String
  1094: "Heap",   // Car Pooling
  1405: "Heap",   // Longest Happy String
  1834: "Heap",   // Single Threaded CPU

  // Greedy
  45: "Greedy",    // Jump Game II
  55: "Greedy",    // Jump Game
  121: "Greedy",   // Best Time to Buy and Sell Stock
  134: "Greedy",   // Gas Station
  763: "Greedy",   // Partition Labels
  678: "Greedy",   // Valid Parenthesis String
  846: "Greedy",   // Hand of Straights
  1899: "Greedy",  // Merge Triplets to Form Target Triplet
  135: "Greedy",    // Candy
  649: "Greedy",    // Dota2 Senate
  860: "Greedy",    // Lemonade Change
  918: "Greedy",    // Maximum Sum Circular Subarray
  978: "Greedy",    // Longest Turbulent Subarray
  1871: "Greedy",   // Jump Game VII

  // Backtracking
  17: "Backtracking",  // Letter Combinations of a Phone Number
  22: "Backtracking",  // Generate Parentheses
  37: "Backtracking",  // Sudoku Solver
  39: "Backtracking",  // Combination Sum
  46: "Backtracking",  // Permutations
  51: "Backtracking",  // N-Queens
  78: "Backtracking",  // Subsets
  79: "Backtracking",  // Word Search
  131: "Backtracking", // Palindrome Partitioning
  40: "Backtracking",  // Combination Sum II
  90: "Backtracking",  // Subsets II
  47: "Backtracking",    // Permutations II
  52: "Backtracking",    // N Queens II
  77: "Backtracking",    // Combinations
  140: "Backtracking",   // Word Break II
  473: "Backtracking",   // Matchsticks to Square
  698: "Backtracking",   // Partition to K Equal Sum Subsets
  1863: "Backtracking",  // Sum of All Subsets XOR Total

  // Graph
  133: "Graph",  // Clone Graph
  207: "Graph",  // Course Schedule
  210: "Graph",  // Course Schedule II
  261: "Graph",  // Graph Valid Tree
  269: "Graph",  // Alien Dictionary
  323: "Graph",  // Number of Connected Components
  336: "Graph",  // Palindrome Pairs
  721: "Graph",  // Accounts Merge
  787: "Graph",  // Cheapest Flights Within K Stops
  130: "Graph",  // Surrounded Regions
  332: "Graph",  // Reconstruct Itinerary
  684: "Graph",  // Redundant Connection
  743: "Graph",  // Network Delay Time
  778: "Graph",  // Swim in Rising Water
  1584: "Graph", // Min Cost to Connect All Points
  399: "Graph",   // Evaluate Division
  953: "Graph",   // Verifying An Alien Dictionary
  997: "Graph",   // Find the Town Judge
  1462: "Graph",  // Course Schedule IV
  1489: "Graph",  // Find Critical and Pseudo Critical Edges in MST
  1631: "Graph",  // Path with Minimum Effort
  2392: "Graph",  // Build a Matrix With Conditions
  2709: "Graph",  // Greatest Common Divisor Traversal

  // Union Find
  // (none exclusively in these lists)

  // Trie
  208: "Trie",   // Implement Trie (Prefix Tree)
  211: "Trie",   // Design Add and Search Words
  212: "Trie",   // Word Search II
  588: "Trie",   // Design In-Memory File System
  2707: "Trie",   // Extra Characters in a String

  // DP
  5: "DP",       // Longest Palindromic Substring
  32: "DP",      // Longest Valid Parentheses
  53: "DP",      // Maximum Subarray
  62: "DP",      // Unique Paths
  64: "DP",      // Minimum Path Sum
  70: "DP",      // Climbing Stairs
  72: "DP",      // Edit Distance
  91: "DP",      // Decode Ways
  118: "DP",     // Pascal's Triangle
  139: "DP",     // Word Break
  152: "DP",     // Maximum Product Subarray
  198: "DP",     // House Robber
  213: "DP",     // House Robber II
  221: "DP",     // Maximal Square
  279: "DP",     // Perfect Squares
  300: "DP",     // Longest Increasing Subsequence
  322: "DP",     // Coin Change
  377: "DP",     // Combination Sum IV
  416: "DP",     // Partition Equal Subset Sum
  1143: "DP",    // Longest Common Subsequence
  1235: "DP",    // Maximum Profit in Job Scheduling
  10: "DP",      // Regular Expression Matching
  97: "DP",      // Interleaving String
  115: "DP",     // Distinct Subsequences
  309: "DP",     // Best Time to Buy and Sell Stock with Cooldown
  312: "DP",     // Burst Balloons
  494: "DP",     // Target Sum
  518: "DP",     // Coin Change II
  647: "DP",     // Palindromic Substrings
  746: "DP",     // Min Cost Climbing Stairs
  63: "DP",      // Unique Paths II
  343: "DP",     // Integer Break
  877: "DP",     // Stone Game
  1049: "DP",    // Last Stone Weight II
  1137: "DP",    // N-th Tribonacci Number
  1140: "DP",    // Stone Game II
  1406: "DP",    // Stone Game III
};

// ============================================================
// LIST DEFINITIONS
// ============================================================

const PROBLEM_LISTS = [
  {
    id: "neetcode75",
    name: "NeetCode 75",
    nameZh: "NeetCode 75",
    description: "The essential 75 interview problems, curated by NeetCode. The foundation of NeetCode 150.",
    source: "https://neetcode.io/practice/neetcode75",
    numbers: [
      1, 3, 5, 11, 15, 19, 20, 21, 23, 33, 39, 48, 49, 53, 54, 55,
      56, 57, 62, 70, 73, 76, 79, 91, 98, 100, 102, 104, 105, 121, 124,
      125, 128, 133, 139, 141, 143, 152, 153, 190, 191, 198, 200, 206,
      207, 208, 211, 212, 213, 217, 226, 230, 235, 238, 242, 252, 253,
      261, 268, 269, 271, 295, 297, 300, 322, 323, 338, 347, 371, 417,
      424, 435, 572, 647, 1143,
    ],
  },
  {
    id: "neetcode150",
    name: "NeetCode 150",
    nameZh: "NeetCode 150",
    description: "NeetCode 75 + 75 more problems. Organized by pattern with NeetCode video explanations.",
    source: "https://neetcode.io/practice/neetcode150",
    numbers: [
      1, 2, 3, 4, 5, 7, 10, 11, 15, 17, 19, 20, 21, 22, 23, 25, 33,
      36, 39, 40, 42, 43, 45, 46, 48, 49, 50, 51, 53, 54, 55, 56, 57,
      62, 66, 70, 72, 73, 74, 76, 78, 79, 84, 90, 91, 97, 98, 100,
      102, 104, 105, 110, 115, 121, 124, 125, 127, 128, 130, 131, 133,
      134, 136, 138, 139, 141, 143, 146, 150, 152, 153, 155, 167, 190,
      191, 198, 199, 200, 202, 206, 207, 208, 210, 211, 212, 213, 215,
      217, 226, 230, 235, 238, 239, 242, 252, 253, 261, 268, 269, 271,
      286, 287, 295, 297, 300, 309, 312, 322, 323, 329, 332, 338, 347,
      355, 371, 416, 417, 424, 435, 494, 518, 543, 567, 572, 621, 647,
      678, 684, 695, 703, 704, 739, 743, 746, 763, 778, 787, 846, 853,
      875, 973, 981, 994, 1046, 1143, 1448, 1584, 1851, 1899, 2013,
    ],
  },
  {
    id: "neetcode250",
    name: "NeetCode 250",
    nameZh: "NeetCode 250",
    description: "NeetCode 150 + 100 more problems. Comprehensive interview prep across 18 patterns.",
    source: "https://neetcode.io/practice/neetcode250",
    numbers: [
      1, 2, 3, 4, 5, 7, 10, 11, 13, 14, 15, 17, 18, 19, 20,
      21, 22, 23, 25, 26, 27, 33, 35, 36, 39, 40, 41, 42, 43, 45,
      46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 62, 63, 64,
      66, 67, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 81, 84,
      88, 90, 91, 92, 94, 97, 98, 100, 102, 104, 105, 110, 115, 121, 122,
      124, 125, 127, 128, 130, 131, 133, 134, 135, 136, 138, 139, 140, 141, 143,
      144, 145, 146, 150, 152, 153, 155, 167, 168, 169, 189, 190, 191, 198, 199,
      200, 201, 202, 206, 207, 208, 209, 210, 211, 212, 213, 215, 217, 219, 225,
      226, 229, 230, 232, 235, 238, 239, 242, 252, 253, 261, 268, 269, 271, 279,
      286, 287, 295, 297, 300, 304, 309, 310, 312, 322, 323, 329, 332, 337, 338,
      343, 344, 347, 355, 371, 374, 377, 394, 399, 410, 416, 417, 424, 427, 435,
      450, 460, 463, 473, 494, 502, 518, 543, 560, 567, 572, 621, 622, 647, 649,
      658, 678, 680, 682, 684, 695, 698, 701, 703, 704, 705, 706, 721, 735, 739,
      743, 746, 752, 763, 767, 778, 787, 846, 853, 860, 867, 875, 877, 881, 895,
      901, 912, 918, 953, 973, 978, 981, 994, 997, 1011, 1046, 1049, 1071, 1094, 1095,
      1137, 1140, 1143, 1325, 1405, 1406, 1448, 1462, 1489, 1584, 1631, 1768, 1834, 1851, 1863,
      1871, 1899, 1929, 2013, 2392, 2402, 2707, 2709, 2807, 3133,
    ],
  },
  {
    id: "grind75",
    name: "Grind 75",
    nameZh: "Grind 75",
    description: "Modernized Blind 75 by the same author, with a structured weekly study plan.",
    source: "https://www.techinterviewhandbook.org/grind75/",
    numbers: [
      1, 3, 5, 8, 9, 13, 14, 15, 20, 21, 33, 39, 46, 53, 54, 56, 57,
      62, 67, 70, 75, 78, 98, 100, 101, 102, 104, 105, 108, 110, 121,
      125, 133, 136, 139, 141, 150, 155, 169, 190, 191, 199, 200, 206,
      207, 208, 217, 226, 232, 234, 235, 236, 238, 242, 252, 268, 278,
      283, 322, 338, 383, 409, 416, 542, 543, 572, 704, 721, 733, 844,
      876, 973, 977, 981, 994,
    ],
  },
  {
    id: "grind169",
    name: "Grind 169",
    nameZh: "Grind 169",
    description: "Extended Grind 75 with 94 additional problems for thorough interview coverage.",
    source: "https://www.techinterviewhandbook.org/grind75/",
    numbers: [
      1, 2, 3, 4, 5, 7, 8, 9, 11, 13, 14, 15, 16, 17, 19, 20, 21, 22,
      23, 24, 25, 31, 32, 33, 36, 37, 39, 41, 42, 46, 48, 49, 50, 51,
      53, 54, 55, 56, 57, 61, 62, 67, 70, 73, 74, 75, 76, 78, 79, 84,
      91, 98, 100, 101, 102, 103, 104, 105, 108, 110, 113, 121, 124, 125,
      127, 128, 133, 134, 136, 139, 141, 143, 146, 148, 150, 152, 153,
      155, 169, 179, 189, 190, 191, 198, 199, 200, 206, 207, 208, 210,
      211, 212, 215, 217, 221, 224, 226, 227, 230, 232, 234, 235, 236,
      238, 239, 242, 252, 253, 261, 268, 269, 271, 278, 283, 285, 287,
      295, 297, 300, 310, 322, 323, 328, 329, 336, 338, 362, 377, 380,
      383, 394, 409, 416, 417, 424, 435, 437, 438, 525, 528, 542, 543,
      560, 572, 588, 621, 632, 658, 662, 692, 704, 721, 733, 735, 739,
      759, 787, 815, 844, 863, 876, 895, 973, 977, 981, 994, 1197, 1235,
      1730,
    ],
  },
  {
    id: "hot100",
    name: "LeetCode Hot 100",
    nameZh: "力扣热题 100",
    description: "The 100 most popular problems on LeetCode — a must-do list in the Chinese tech community.",
    source: "https://leetcode.cn/studyplan/top-100-liked/",
    numbers: [
      1, 2, 3, 4, 5, 11, 15, 17, 19, 20, 21, 22, 23, 24, 25, 31, 32,
      33, 34, 35, 39, 41, 42, 45, 46, 48, 49, 51, 53, 54, 55, 56, 62,
      64, 70, 72, 73, 74, 75, 76, 78, 79, 84, 94, 98, 101, 102, 104,
      105, 108, 114, 118, 121, 124, 128, 131, 136, 138, 139, 141, 142,
      146, 148, 152, 153, 155, 160, 169, 189, 198, 199, 200, 206, 207,
      208, 215, 226, 230, 234, 236, 238, 239, 240, 279, 283, 287, 295,
      300, 322, 347, 394, 416, 437, 438, 543, 560, 739, 763, 994, 1143,
    ],
  },
];

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Get all available lists with computed counts.
 * @param {Set<number>} existingNumbers - LC numbers already in user's library
 * @returns {Array<{ id, name, nameZh, description, total, existing, newCount }>}
 */
export function getListSummaries(existingNumbers) {
  return PROBLEM_LISTS.map((list) => {
    const validNumbers = list.numbers.filter((n) => getProblemByNumber(n));
    const existing = validNumbers.filter((n) => existingNumbers.has(n)).length;
    return {
      id: list.id,
      name: list.name,
      nameZh: list.nameZh,
      description: list.description,
      total: validNumbers.length,
      existing,
      newCount: validNumbers.length - existing,
    };
  });
}

/**
 * Get the problems to add for a specific list.
 * Returns only problems NOT already in the user's library.
 * Each problem gets its pattern from PATTERN_MAP.
 * @param {string} listId
 * @param {Set<number>} existingNumbers - LC numbers already in user's library
 * @returns {{ lcProblems: Array, patternMap: Map<number, string[]> }}
 */
export function getListProblems(listId, existingNumbers) {
  const list = PROBLEM_LISTS.find((l) => l.id === listId);
  if (!list) return { lcProblems: [], patternMap: new Map() };

  const lcProblems = [];
  const patternMap = new Map();

  for (const num of list.numbers) {
    // Skip if already in library
    if (existingNumbers.has(num)) continue;

    // Look up in our LC database
    const problem = getProblemByNumber(num);
    if (!problem) continue; // Safety: skip if not in DB

    lcProblems.push(problem);

    // Assign pattern if we have one
    const pattern = PATTERN_MAP[num];
    if (pattern) {
      patternMap.set(num, [pattern]);
    }
  }

  return { lcProblems, patternMap };
}
