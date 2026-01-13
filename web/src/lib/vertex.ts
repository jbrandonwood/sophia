import { SearchServiceClient } from '@google-cloud/discoveryengine';

const PROJECT_ID = process.env.GOOGLE_VERTEX_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'sophia-production';
const LOCATION = 'global';
const DATA_STORE_ID = process.env.VERTEX_SEARCH_DATA_STORE_ID || 'sophia-kb-v1';
const MAX_SEARCHES_PER_TURN = 10;

export interface Citation {
    source: string;
    text: string;
    uri?: string;
}

export interface SearchResult {
    citations: Citation[];
}

let client: SearchServiceClient | null = null;

function getClient(): SearchServiceClient {
    if (!client) {
        client = new SearchServiceClient();
    }
    return client;
}

export async function searchPhilosophicalCorpus(
    query: string,
    searchCount: number
): Promise<SearchResult> {
    if (searchCount >= MAX_SEARCHES_PER_TURN) {
        return { citations: [] };
    }

    const client = getClient();
    const parent = client.projectLocationCollectionDataStorePath(
        PROJECT_ID,
        LOCATION,
        'default_collection',
        DATA_STORE_ID
    );

    try {
        // The response is an array: [responseObject, request, rawResponse]
        const [response] = await client.search({
            servingConfig: `${parent}/servingConfigs/default_search`,
            query: query,
            pageSize: 3,
            contentSearchSpec: {
                snippetSpec: { returnSnippet: true },
                extractiveContentSpec: { maxExtractiveAnswerCount: 1 }
            },
        });

        const citations: Citation[] = [];

        // Cast response to any to avoid strict typing issues with specific google-cloud versioning
        // We know 'results' exists on the search response.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const results = (response as any).results;

        if (results) {
            for (const result of results) {
                // Safe navigation with 'any' cast or optional chaining
                const data = result.document?.derivedStructData;
                if (!data) continue;

                const snippet = data.snippets?.[0]?.snippet || data.extractive_answers?.[0]?.content;
                const sourceTitle = result.document?.structData?.title || "Unknown Source";
                const sourceAuthor = result.document?.structData?.author || "Unknown Author";

                if (snippet) {
                    citations.push({
                        source: `${sourceAuthor}, ${sourceTitle}`,
                        text: snippet,
                        uri: result.document?.name
                    });
                }
            }
        }

        return { citations };

    } catch (error) {
        console.error('[Sophia] Vertex AI Search Error:', error);
        return { citations: [] };
    }
}
