import { GoogleAuth } from 'google-auth-library';

const PROJECT_ID = process.env.GOOGLE_VERTEX_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'sophia-484006';
const LOCATION = 'global';
const DATA_STORE_ID = process.env.VERTEX_SEARCH_DATA_STORE_ID || 'sophia-kb-v1';
const APP_ID = process.env.VERTEX_SEARCH_APP_ID;
const MAX_SEARCHES_PER_TURN = 10;

// REST API Endpoint Construction
const API_ENDPOINT = APP_ID
    ? `https://discoveryengine.googleapis.com/v1alpha/projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection/engines/${APP_ID}/servingConfigs/default_search:search`
    : `https://discoveryengine.googleapis.com/v1alpha/projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection/dataStores/${DATA_STORE_ID}/servingConfigs/default_search:search`;

export interface Citation {
    source: string;
    text: string;
    uri?: string;
}

export interface SearchResult {
    citations: Citation[];
}

let authClient: GoogleAuth | null = null;

function getAuthClient(): GoogleAuth {
    if (!authClient) {
        authClient = new GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });
    }
    return authClient;
}

export async function searchPhilosophicalCorpus(
    query: string,
    searchCount: number
): Promise<SearchResult> {
    if (searchCount >= MAX_SEARCHES_PER_TURN) {
        return { citations: [] };
    }

    try {
        // 1. Get Auth Token
        const auth = getAuthClient();
        const client = await auth.getClient();
        const accessToken = await client.getAccessToken();

        if (!accessToken.token) {
            throw new Error("Failed to generate Google Cloud access token");
        }

        // 2. Make REST Request
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: query,
                pageSize: 3,
                contentSearchSpec: {
                    snippetSpec: { returnSnippet: true },
                    extractiveContentSpec: { maxExtractiveAnswerCount: 1, maxExtractiveSegmentCount: 1 }
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Sophia] Vertex AI REST Error (${response.status}):`, errorText.substring(0, 200));
            return { citations: [] };
        }

        const data = await response.json();
        const citations: Citation[] = [];

        // 3. Parse Results
        // Protocol: { results: [ { document: { ... } } ] }
        if (data.results && Array.isArray(data.results)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            for (const result of data.results as any[]) {
                const docData = result.document?.derivedStructData;
                const structData = result.document?.structData;

                if (!docData && !structData) continue;

                // Priority: Extractive Segment (Best context) > Extractive Answer > Snippet > Full Content (Fallback)
                let text = "";

                if (docData?.extractive_segments?.[0]?.content) {
                    text = docData.extractive_segments[0].content;
                } else if (docData?.extractive_answers?.[0]?.content) {
                    text = docData.extractive_answers[0].content;
                } else if (docData?.snippets?.[0]?.snippet) {
                    text = docData.snippets[0].snippet;
                } else if (structData?.text) {
                    // Fallback to unstructured text if available
                    text = structData.text.substring(0, 500) + "...";
                }

                const sourceTitle = structData?.title || "Unknown Source";
                const sourceAuthor = structData?.author || "Unknown Author";

                if (text) {
                    citations.push({
                        source: `${sourceAuthor}, ${sourceTitle}`,
                        text: text, // potentially contains HTML <b> tags
                        uri: result.document?.name
                    });
                }
            }
        }

        return { citations };

    } catch (error) {
        console.error('[Sophia] Vertex AI Search Critical Error:', error);
        return { citations: [] };
    }
}
