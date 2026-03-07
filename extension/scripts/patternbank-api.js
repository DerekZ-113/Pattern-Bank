// PatternBank Integration API

const PATTERNBANK_API_URL = "http://localhost:5173/api/extension/add-problem"; // Placeholder, normally would be Supabase edge function or direct REST endpoint
// Given PatternBank is a Vite app, the easiest way to inject data via extension is directly talking to Supabase.
// Let's use the standard Supabase REST API manually to avoid bundling complex SDKs.

const SUPABASE_URL = "REPLACE_WITH_SUPABASE_URL";
const SUPABASE_ANON_KEY = "REPLACE_WITH_SUPABASE_KEY";

/**
 * Show a 5-star rating UI on the screen, wait for user selection, then post to PatternBank.
 * @param {string} problemName e.g., "Two Sum", or "0001-two-sum"
 * @param {string} problemId e.g., "1"
 * @param {string} difficulty e.g., "Easy", "Medium", "Hard"
 */
export async function injectPatternBankRatingUI(problemName, problemId, difficulty) {
    // First, get the PatternBank User ID from Chrome storage
    chrome.storage.local.get(['patternbank_user_id'], async (result) => {
        const userId = result.patternbank_user_id;
        if (!userId) {
            console.log("PatternBank: No user ID found in storage. Skipping integration.");
            return;
        }

        // Create the overlay UI
        const overlay = document.createElement('div');
        overlay.id = 'patternbank-rating-overlay';

        // Add styling (using LeetCode's existing tailwind classes if possible, or inline)
        overlay.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #282828;
      color: #fff;
      padding: 16px 24px;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      z-index: 999999;
      font-family: system-ui, -apple-system, sans-serif;
      border: 1px solid #444;
      display: flex;
      flex-direction: column;
      gap: 12px;
      animation: pb-slide-up 0.3s ease-out;
    `;

        // Add animation style to document if not exists
        if (!document.getElementById('pb-styles')) {
            const style = document.createElement('style');
            style.id = 'pb-styles';
            style.textContent = `
        @keyframes pb-slide-up {
          from { transform: translateY(100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .pb-star {
          cursor: pointer;
          font-size: 24px;
          color: #555;
          transition: color 0.1s;
        }
        .pb-star:hover, .pb-star.active {
          color: #fbbf24;
        }
      `;
            document.head.appendChild(style);
        }

        overlay.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="font-weight: 600; font-size: 15px;">🚀 Accepted! Log to PatternBank?</div>
        <button id="pb-close" style="background:none;border:none;color:#888;cursor:pointer;font-size:16px;">✕</button>
      </div>
      <div style="font-size: 13px; color: #aaa;">How confident are you with <b>${problemName || ('Problem ' + problemId)}</b>?</div>
      <div id="pb-stars" style="display: flex; gap: 8px; justify-content: center; margin-top: 4px;">
        <span class="pb-star" data-val="1">★</span>
        <span class="pb-star" data-val="2">★</span>
        <span class="pb-star" data-val="3">★</span>
        <span class="pb-star" data-val="4">★</span>
        <span class="pb-star" data-val="5">★</span>
      </div>
      <div id="pb-status" style="font-size: 12px; color: #4ade80; text-align: center; height: 16px;"></div>
    `;

        document.body.appendChild(overlay);

        // Event Listeners
        document.getElementById('pb-close').addEventListener('click', () => {
            overlay.remove();
        });

        const stars = overlay.querySelectorAll('.pb-star');
        const statusDiv = document.getElementById('pb-status');

        stars.forEach(star => {
            // Hover effect
            star.addEventListener('mouseenter', (e) => {
                const val = parseInt(e.target.dataset.val);
                stars.forEach(s => {
                    if (parseInt(s.dataset.val) <= val) s.classList.add('active');
                    else s.classList.remove('active');
                });
            });
            // Click effect (Submit to DB)
            star.addEventListener('click', async (e) => {
                const rating = parseInt(e.target.dataset.val);
                statusDiv.style.color = '#fff';
                statusDiv.textContent = 'Saving...';

                try {
                    await saveToPatternBankLocal(userId, problemId, rating);
                    statusDiv.style.color = '#4ade80';
                    statusDiv.textContent = 'Saved successfully! ✓';
                    setTimeout(() => overlay.remove(), 2000);
                } catch (err) {
                    console.error(err);
                    statusDiv.style.color = '#ef4444';
                    statusDiv.textContent = 'Failed to save.';
                }
            });
        });

        overlay.querySelector('#pb-stars').addEventListener('mouseleave', () => {
            stars.forEach(s => s.classList.remove('active'));
        });
    });
}

/**
 * Since PatternBank is local (localhost:5173 currently), the extension can try to hit an endpoint
 * OR we talk straight to Supabase REST API instead of the local server so it works anywhere.
 */
async function saveToPatternBankSupabase(userId, problemId, rating) {
    // To be filled with actual Supabase creds extracted from PatternBank .env
}

/**
 * Alternatively, logic to update SM2 metrics locally mimicking PatternBank's internal structure
 */
async function saveToPatternBankLocal(userId, problemId, rating) {
    // For this proof-of-concept, we will simulate a successful save.
    // To make this fully functional locally, PatternBank needs an active Supabase project OR 
    // a small Express.js local server running alongside Vite.
    console.log(`[PatternBank Extension] Saving Problem ${problemId} with rating ${rating} for user ${userId}`);

    // Simulate network delay
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log("[PatternBank Extension] Successfully saved to your queue!");
            resolve(true);
        }, 800);
    });
}
