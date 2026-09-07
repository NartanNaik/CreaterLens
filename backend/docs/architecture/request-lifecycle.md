# CreatorLens AI — End-to-End Request Lifecycle

This document outlines the complete execution lifecycle of a single Instagram Reel URL as it traverses the CreatorLens AI pipeline: from mobile intent interception to final presentation in the React moderation dashboard.

## 1. Mobile Ingestion & Client Normalization
* **Hop 1.1: Intent Interception (Mobile OS to Flutter)**
  * **Trigger:** User taps "Share to..." on an Instagram Reel and selects CreatorLens AI.
  * **Handler:** Flutter `receive_sharing_intent` catches the incoming payload string containing raw URL and tracking tokens.
* **Hop 1.2: Client-Side URL Normalization (Transformation)**
  * **Logic:** Regex extraction targets canonical shortcodes.
  * **Output:** Stripped canonical URL: `https://www.instagram.com/reel/<SHORTCODE>/`.

## 2. Ingestion Network Call & De-duplication
* **Hop 2.1: Ingestion Dispatch (Network Call)**
  * **Transport:** HTTPS POST `/api/staging/ingest`
* **Hop 2.2: Fast De-duplication Gate**
  * **Mechanism:** Queries Firestore using the Reel `<SHORTCODE>` as the natural document ID.
  * **Branch Point:** If document exists, returns `HTTP 409 Conflict` (aborts downstream processing to save database read/write units).
* **Hop 2.3: Staging Persistence**
  * **Transport:** Firebase Admin SDK `setDoc()`
  * **Initial State:** `{ url, status: "pending", createdAt: Timestamp }`

## 3. Dashboard Ingestion & Queue Coordination
* **Hop 3.1: Queue Fetch (Network Call)**
  * **Optimization:** Bounded query reads pending items; avoids realtime `onSnapshot` listeners to prevent exhausting the daily 50k Firestore Spark quota.
* **Hop 3.2: Sequential Queue Lock (Client Control Flow)**
  * **Mechanism:** React `isAutoProcessingRef` acquires an exclusive lock.
  * **Rule:** Strict single-file execution: item N+1 will not execute until item N completes all stages and clears the 6-second cooldown period.

## 4. Step 1: Engagement Scraping Relay
* **Hop 4.1: Scrape Trigger (Network Call)**
  * **Transport:** HTTPS POST `/api/staging/:id/process?step=scrape`
* **Hop 4.2: Extraction & Transformation**
  * **Data Parsed:** Profile username, follower count, view metrics, likes, and raw thumbnail CDN URL.
* **Hop 4.3: Staging State Update**
  * **Write:** Firestore document updated to `status: "scraping_done"`.

## 5. Step 2: Multimodal AI Analysis Relay
* **Hop 5.1: Analysis Trigger (Network Call)**
  * **Transport:** HTTPS POST `/api/staging/:id/process?step=analyze`
* **Hop 5.2: Multi-Provider AI Cascade (Outbound Network Calls & Retries)**
  * **Provider 1 (Gemini API):** Calls `generativelanguage.googleapis.com`. If 401/429/quota exhausted, cascades.
  * **Provider 2 (Groq Cloud):** Calls `api.groq.com`. If model/payload rejected, cascades.
  * **Provider 3 (OpenRouter Gateway):** Calls `openrouter/free`.
  * **Provider 4 (Pollinations.ai):** Public fallback endpoint.
* **Hop 5.3: Sanitization & Parsing (Transformation)**
  * **Logic:** Non-greedy JSON boundary parser locates first `{` and last `}` to strip markdown code fences and conversational preamble.
* **Hop 5.4: Demographic & Brand Gate**
  * **Filter:** Evaluates `accountType.value`.
  * **Branch A (Non-Female / Brand):** Marks document `{ status: "rejected" }`.
  * **Branch B (Target Profile):** Marks document `{ status: "completed" }`.