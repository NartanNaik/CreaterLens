# CreatorLens AI: Failure Lab & Blast Radius Mapping

**Date:** October 5, 2026
**Objective:** Map the blast radius of external dependency failures by intentionally sabotaging the pipeline before writing recovery logic. Goal is to observe whether the system fails loudly (graceful errors) or silently (zombie states, hangs, crashes).

---

## Test 1: AI Cascade Failure
**Action:** Invalidated the Gemini API key (and secondary provider keys) in the `.env` file to force an authentication failure during the `step=analyze` phase.
**Payload:** Valid Instagram Reel URL.

**Observed Blast Radius:**
* **Backend:** Vercel function threw an unhandled promise rejection upon receiving a `401 Unauthorized` from the AI provider.
* **Database (Firestore):** The document was successfully created and scraped, but was abandoned mid-flight. It remained permanently stuck with `status: "scraping_done"`.
* **Frontend (React):** The UI spun indefinitely. The client was polling for a change to `analyzed`, which never occurred. 
* **Verdict:** **Silent Failure / State Leak.** This results in a frustrating user experience (infinite loading) and database bloat (zombie documents).

**Required Mitigation:** 
* Catch the AI provider rejection.
* Update the Firestore document to `status: "failed"` instead of abandoning it.
* Expose the failure state to the React UI.

---

## Test 2: Scraper Failure (Malformed Input)
**Action:** Passed a fabricated, non-existent Instagram URL through the pipeline to observe scraping behavior.
**Payload:** `https://www.instagram.com/reel/FAKE_URL_123/`

**Observed Blast Radius:**
* **Backend:** RapidAPI returned an empty payload or a `404`. The subsequent code attempted to read `tempScrapeData.thumbnailUrl` from an undefined object, causing a fatal `TypeError` in Node.js.
* **Database (Firestore):** Document stuck in `status: "pending"`.
* **Frontend (React):** Received a hard `500 Internal Server Error` from Vercel after the serverless function crashed.
* **Verdict:** **Loud, Unhandled Crash.** The API invocation crashed entirely due to poor null-checking on third-party payloads.

**Required Mitigation:**
* Implement strict null-checks on the RapidAPI response object.
* Wrap the scraping logic in a `try/catch` and utilize a global error handler to prevent Vercel invocation crashes.
* Update Firestore status to `"failed"` if extraction yields no usable data.

---

## Test 3: Database Outage
**Action:** Deliberately modified the `FIREBASE_PROJECT_ID` environment variable to simulate a database connection failure during initial ingestion.
**Payload:** Valid Instagram Reel URL.

**Observed Blast Radius:**
* **Backend:** The Firebase Admin SDK failed to authenticate during the `POST /api/staging/ingest` call. The server crashed before a JSON response could be formatted.
* **Database (Firestore):** No document was created.
* **Frontend (Mobile/Flutter):** The client connection timed out or received a generic server error. The UI hung without actionable feedback for the user.
* **Verdict:** **Client Hang.** The failure occurred too early in the pipeline, leaving the client waiting for a success acknowledgment that never arrived.

**Required Mitigation:**
* Wrap the Firestore `create()` method in a `try/catch`.
* Return a clean `HTTP 503 Service Unavailable` or `HTTP 500` to the client.
* Ensure the Flutter client handles non-200 responses gracefully with user-facing error dialogs.