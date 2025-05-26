importScripts("/pouchdb.min.js"); // Load PouchDB library first
// PouchDB will now be available on `self.PouchDB` or globally as `PouchDB`

console.log("SW-CUSTOM: Loaded");

const DB_NAME = "pending-surveys";
const API_INSERT_ANSWER_ENDPOINT =
  "https://test-guazu-back-25fc1ea7c2f7.herokuapp.com/api/insert-answer"; // Full Heroku URL
let db;

const initializePouchDB = () => {
  if (!db || db.constructor.name === "Promise") {
    // Check if db is a promise (still initializing)
    console.log("[SW-CUSTOM/PouchDB] Initializing PouchDB...");
    db = new PouchDB(DB_NAME); // PouchDB should be globally available here
    return db
      .info()
      .then((info) => {
        console.log(
          `[SW-CUSTOM/PouchDB] '${DB_NAME}\' initialized. Docs: ${info.doc_count}`
        );
        return db;
      })
      .catch((error) => {
        console.error("[SW-CUSTOM/PouchDB] Error initializing PouchDB:", error);
        db = null; // Reset on error
        throw error;
      });
  }
  return Promise.resolve(db);
};

// Initialize DB when the script loads
let dbInitializationPromise = initializePouchDB();

// Define the URL pattern for survey submissions
const SURVEY_SUBMIT_URL_PATTERN = new RegExp(
  API_INSERT_ANSWER_ENDPOINT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$"
);

// Function to save survey data from within the Service Worker
const saveSurveyOfflineSW = async (surveyData) => {
  const currentDb = await getGuaranteedDb();
  console.log(
    "[SW-CUSTOM/PouchDB] Attempting to save survey offline from SW:",
    surveyData
  );

  if (!surveyData || typeof surveyData !== "object") {
    const error = new Error("Invalid survey data: must be an object");
    console.error(
      "[SW-CUSTOM/PouchDB] Error: Invalid survey data format:",
      surveyData
    );
    throw error;
  }

  // Ensure _id is present, generate if not (though it should be by the time it gets here)
  const docToSave = {
    _id: surveyData._id || surveyData.surveyId || new Date().toISOString(),
    ...surveyData,
    offline: true, // Mark as offline
    submitted: false, // Mark as not submitted yet
  };

  console.log("[SW-CUSTOM/PouchDB] Document to be saved from SW:", docToSave);
  try {
    const response = await currentDb.put(docToSave);
    console.log(
      "[SW-CUSTOM/PouchDB] Survey successfully saved offline from SW:",
      response
    );
    return response;
  } catch (error) {
    console.error(
      "[SW-CUSTOM/PouchDB] Error saving survey offline from SW:",
      error
    );
    if (error.name === "conflict") {
      console.warn(
        "[SW-CUSTOM/PouchDB] Conflict saving survey, attempting to update existing doc or using new ID if necessary.",
        docToSave
      );
      // Potentially try to get existing doc and update, or save with a new ID if appropriate
      // For now, re-throwing to see if it resolves or if more sophisticated conflict handling is needed.
    }
    throw error;
  }
};

// --- PouchDB Helper Functions (adapted from src/lib/pouchdb.js) ---
const getGuaranteedDb = async () => {
  if (!db || db.constructor.name === "Promise") {
    console.log("[SW-CUSTOM/PouchDB] DB not ready, awaiting initialization...");
    try {
      return await dbInitializationPromise;
    } catch (e) {
      console.error(
        "[SW-CUSTOM/PouchDB] DB initialization failed permanently for this operation.",
        e
      );
      throw new Error("PouchDB could not be initialized for sync operation.");
    }
  }
  return db;
};

const getPendingSurveys = async () => {
  const currentDb = await getGuaranteedDb();
  console.log("[SW-CUSTOM/PouchDB] Getting pending surveys...");
  const result = await currentDb.allDocs({ include_docs: true });
  const pending = result.rows
    .map((row) => row.doc)
    .filter((doc) => !doc.submitted && doc.offline);
  console.log(`[SW-CUSTOM/PouchDB] Found ${pending.length} pending surveys.`);
  return pending;
};

const deleteSurveyOffline = async (surveyId) => {
  const currentDb = await getGuaranteedDb();
  console.log(`[SW-CUSTOM/PouchDB] Deleting survey ${surveyId}...`);
  try {
    const doc = await currentDb.get(surveyId);
    const response = await currentDb.remove(doc);
    console.log(`[SW-CUSTOM/PouchDB] Survey ${surveyId} deleted:`, response);
    return response;
  } catch (error) {
    console.error(
      `[SW-CUSTOM/PouchDB] Error deleting survey ${surveyId}:`,
      error
    );
    if (error.name === "not_found") {
      console.warn(
        `[SW-CUSTOM/PouchDB] Survey ${surveyId} already deleted or never existed.`
      );
      return { ok: true, deleted: true, already_deleted: true };
    }
    throw error;
  }
};

const markSurveyAsSubmitted = async (surveyId) => {
  const currentDb = await getGuaranteedDb();
  console.log(`[SW-CUSTOM/PouchDB] Marking survey ${surveyId} as submitted...`);
  try {
    const doc = await currentDb.get(surveyId);
    doc.submitted = true;
    doc.offline = false;
    const response = await currentDb.put(doc);
    console.log(
      `[SW-CUSTOM/PouchDB] Survey ${surveyId} marked as submitted:`,
      response
    );
    return response;
  } catch (error) {
    console.error(
      `[SW-CUSTOM/PouchDB] Error marking survey ${surveyId} as submitted:`,
      error
    );
    throw error;
  }
};

// --- Sync Logic ---
async function syncPendingSurveys() {
  console.log(
    "SW-CUSTOM: Sync event triggered. Initiating sync for pending surveys..."
  );

  let pendingSurveysList;
  try {
    // Ensure DB is ready before getting surveys
    await dbInitializationPromise;
    pendingSurveysList = await getPendingSurveys();
  } catch (dbError) {
    console.error(
      "SW-CUSTOM: Error fetching pending surveys from PouchDB for sync:",
      dbError
    );
    return; // Cannot proceed without DB access
  }

  if (!pendingSurveysList || pendingSurveysList.length === 0) {
    console.log("SW-CUSTOM: No pending surveys to sync.");
    return;
  }

  console.log(
    `SW-CUSTOM: Found ${pendingSurveysList.length} survey(s) to sync.`
  );

  let successfullySyncedCount = 0;

  for (const survey of pendingSurveysList) {
    const surveyIdString = String(survey._id);
    // Exclude PouchDB internal fields and potentially sensitive/redundant fields for the POST body
    const { _id, _rev, offline, submitted, ...surveyDataToSync } = survey;

    // The actual survey payload is often nested, e.g., survey.answerData or survey.payload
    // Adjust this based on how data is stored by saveSurveyOffline in page.jsx
    let payload = surveyDataToSync;
    if (surveyDataToSync.answerData) {
      // Example: if client saves { _id: ..., answerData: {...} }
      payload = surveyDataToSync.answerData;
    } else if (surveyDataToSync.surveyData) {
      // from lib/worker/index.js
      payload = surveyDataToSync.surveyData;
    }

    console.log(`SW-CUSTOM: Attempting to sync survey ID: ${surveyIdString}`);
    // console.log(`SW-CUSTOM: Full survey doc for sync (ID: ${surveyIdString}):`, survey);
    // console.log(`SW-CUSTOM: Payload for sync (ID: ${surveyIdString}):`, payload);

    const authToken = survey.authToken; // Assuming authToken is stored with the survey

    try {
      const headers = { "Content-Type": "application/json" };
      if (authToken) {
        headers["Authorization"] = authToken;
      }
      // Note: The 'Origin' header is typically set by the browser automatically for cross-origin requests.
      // We generally don't (and often can't) set it manually in a service worker fetch.
      // However, we can log if it's being added by the browser for the SW context.

      console.log(`SW-CUSTOM: Preparing to send survey ID: ${surveyIdString}`);
      console.log(
        "SW-CUSTOM: Headers for fetch (as constructed by SW):",
        headers
      );
      // We can't easily see the *final* headers the browser sends after adding its own (like Origin)
      // directly here before the fetch, but the server-side logs (if it receives the request)
      // or the Network tab (if the request makes it out) would show them.

      console.log(
        "SW-CUSTOM: Payload for fetch:",
        JSON.stringify(payload, null, 2)
      );

      const response = await fetch(API_INSERT_ANSWER_ENDPOINT, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(payload), // Send the actual survey data object
      });

      if (response.ok) {
        console.log(
          `SW-CUSTOM: Survey ${surveyIdString} sent successfully to server. Status: ${response.status}`
        );
        await deleteSurveyOffline(surveyIdString); // Or markAsSubmitted(surveyIdString)
        successfullySyncedCount++;
      } else {
        const errorBody = await response
          .text()
          .catch(() => "Could not parse error body");
        console.error(
          `SW-CUSTOM: Server error sending survey ${surveyIdString}: ${response.status} ${response.statusText}`,
          `Body: ${errorBody}`
        );
        if (
          response.status === 400 ||
          response.status === 404 ||
          response.status === 422
        ) {
          // Client error (bad request, not found, unprocessable entity) - likely won't succeed with a retry.
          console.warn(
            `SW-CUSTOM: Deleting survey ${surveyIdString} from local DB due to client-side error (${response.status}) to prevent sync loops.`
          );
          await deleteSurveyOffline(surveyIdString);
        } else if (response.status === 401 || response.status === 403) {
          console.error(
            `SW-CUSTOM: Auth error for ${surveyIdString}. Token might be invalid. Will retry later.`
          );
          // Keep in DB for next sync attempt, hoping token is refreshed.
        }
        // For 5xx errors, it will be kept and retried by BackgroundSync by default.
      }
    } catch (networkOrOtherError) {
      console.error(
        `SW-CUSTOM: Network or other error syncing survey ${surveyIdString}:`,
        networkOrOtherError
      );
      // The survey remains in PouchDB and BackgroundSync will retry later.
    }
  }
  console.log("SW-CUSTOM: Pending survey sync process completed.");
  // Enviar mensaje a los clientes sobre el resultado de la sincronización
  if (successfullySyncedCount > 0) {
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        if (clients && clients.length) {
          clients.forEach((client) => {
            client.postMessage({
              type: "SURVEYS_SYNCED",
              count: successfullySyncedCount,
            });
          });
        }
      });
  }
}

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-pending-surveys") {
    // This tag MUST match the one in BackgroundSyncPlugin
    console.log("SW-CUSTOM: Received sync event for 'sync-pending-surveys'");
    event.waitUntil(
      dbInitializationPromise // Ensure DB is ready before starting sync
        .then(() => syncPendingSurveys())
        .catch((err) =>
          console.error("SW-CUSTOM: Error during sync event handling:", err)
        )
    );
  }
});

// Optional: Listen to fetch events if you need to intercept and save data
// directly from the SW, like in the original lib/worker/index.js.
// However, for 'BackgroundSyncPlugin', the primary role here is the 'sync' handler.
// The client-side (page.jsx) should save to PouchDB, then fetch.
// The fetch from client, if it fails and is a GET request, will be handled by NetworkFirst.
// If it's a POST for /api/insert-answer, BackgroundSyncPlugin handles it.
// The fetch handler below is how lib/worker/index.js saved data if fetch failed.
// This is only needed IF THE CLIENT ISN'T SAVING TO POUCHDB FIRST.
// Given the plan for page.jsx to save to PouchDB, this specific fetch interceptor for POST might be redundant
// or could conflict if not careful.
// For now, focusing on the 'sync' event for data sending.

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Check if it's a POST request to the survey submission URL
  if (
    request.method === "POST" &&
    SURVEY_SUBMIT_URL_PATTERN.test(request.url)
  ) {
    console.log("SW-CUSTOM: Intercepted POST to survey API:", request.url);
    event.respondWith(
      fetch(request.clone())
        .then((networkResponse) => {
          console.log(
            "SW-CUSTOM: Initial fetch response status:",
            networkResponse.status
          );
          if (networkResponse.ok) {
            console.log(
              "SW-CUSTOM: Request successful online. Returning network response."
            );
            return networkResponse;
          }
          // If server responds with an error but we are online, let the client handle it.
          // This part is crucial: if the server returns a 4xx or 5xx error,
          // we should not automatically save it for sync unless that's desired behavior.
          // The original code returned networkResponse, letting the client see the error.
          // If we want to save it for sync even on server error, we'd go to catch.
          // For now, let's assume server errors (4xx, 5xx) when online should be handled by client.
          // Only network failures should trigger offline save here.
          console.warn(
            "SW-CUSTOM: Server responded with an error (but online), status:",
            networkResponse.status,
            "Forwarding to app."
          );
          // This throw will take it to the .catch() block, which will save offline.
          // This matches the behavior where BackgroundSyncPlugin would queue it.
          throw new Error(`Server error: ${networkResponse.status}`);
        })
        .catch(async () => {
          // Catches network errors OR the thrown server error from above
          console.log(
            "SW-CUSTOM: Network error or server error on initial fetch. Client should have already saved to PouchDB. Registering for sync.",
            request.url
          );
          try {
            // Optional: Log the data for debugging if needed, but don't re-save.
            const clonedRequest = request.clone();
            let surveyDataForLog;
            try {
              surveyDataForLog = await clonedRequest.json();
              console.log(
                "SW-CUSTOM: Cloned request body (not re-saving, client handles save):",
                surveyDataForLog
              );
            } catch (bodyError) {
              console.warn(
                "SW-CUSTOM: Failed to parse request body for logging (not re-saving):",
                bodyError
              );
            }

            // Key action: Register for background sync
            if (self.registration.sync) {
              try {
                await self.registration.sync.register("sync-pending-surveys");
                console.log(
                  "SW-CUSTOM: Background sync 'sync-pending-surveys' registered after failed fetch."
                );
              } catch (syncRegError) {
                console.error(
                  "SW-CUSTOM: Error registering background sync after failed fetch:",
                  syncRegError
                );
              }
            } else {
              console.warn(
                "SW-CUSTOM: Background Sync not supported by this browser."
              );
            }

            // Return a 202 Accepted response to the client.
            // The client already knows it saved locally; this confirms SW will attempt sync.
            return new Response(
              JSON.stringify({
                message:
                  "Solicitud aceptada por Service Worker para sincronización posterior.",
                offlineDueToSW: true,
                detail: "Client should have saved to PouchDB; SW will sync.",
              }),
              {
                status: 202, // Accepted
                statusText: "Accepted for Background Sync by Service Worker",
                headers: { "Content-Type": "application/json" },
              }
            );
          } catch (errorDuringSyncRegistration) {
            console.error(
              "SW-CUSTOM: CRITICAL error during sync registration process in SW fetch listener:",
              errorDuringSyncRegistration
            );
            return new Response(
              JSON.stringify({
                message:
                  "Error crítico en SW al registrar para sincronización.",
                error: errorDuringSyncRegistration.toString(),
              }),
              {
                status: 500,
                statusText: "Sync Registration Error in Service Worker",
                headers: { "Content-Type": "application/json" },
              }
            );
          }
        })
    );
    return; // IMPORTANT: Stop further processing for this fetch event
  }
  // For other fetch events, you might have other handlers or let them pass through
  // console.log("SW-CUSTOM: Fetch event not matching POST to survey API:", request.method, request.url);
});

// Ensure SW activates quickly
self.addEventListener("install", (event) => {
  console.log("SW-CUSTOM: Install event");
  // event.waitUntil(self.skipWaiting()); // next-pwa usually handles this
});

self.addEventListener("activate", (event) => {
  console.log("SW-CUSTOM: Activate event");
  // event.waitUntil(self.clients.claim()); // next-pwa usually handles this
});
