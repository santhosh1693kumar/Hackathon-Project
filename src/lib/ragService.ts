const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export interface RAGQuery {
  userId: string;
  question: string;
  sourceType: 'internal' | 'iata' | 'auto';
}

export interface RAGSummary {
  answer: string;
  confidence: number;
  sources: string[];
  usedDocuments: string[];
  suggestedUpload?: string;
}

export async function queryWithRAG(query: RAGQuery, token: string): Promise<RAGSummary> {
  const apiUrl = `${SUPABASE_URL}/functions/v1/generate_rag_summary`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Client-Info': 'airline-ai-platform',
      },
      body: JSON.stringify(query),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `RAG query failed with status ${response.status}`);
    }

    const result = await response.json();
    return result as RAGSummary;
  } catch (error) {
    console.error('RAG query error:', error);
    throw error;
  }
}

export async function queryIATAWithRAG(question: string, token: string): Promise<RAGSummary> {
  const userId = (await getAuthUserId(token)) || 'system';
  return queryWithRAG(
    {
      userId,
      question,
      sourceType: 'iata',
    },
    token
  );
}

export async function queryInternalWithFallback(
  question: string,
  token: string
): Promise<RAGSummary> {
  const userId = (await getAuthUserId(token)) || 'system';
  return queryWithRAG(
    {
      userId,
      question,
      sourceType: 'auto',
    },
    token
  );
}

async function getAuthUserId(token: string): Promise<string | null> {
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) return null;

    const userData = await response.json();
    return userData.id || null;
  } catch {
    return null;
  }
}

export function formatRAGResponse(summary: RAGSummary): string {
  let formatted = summary.answer;

  if (summary.usedDocuments && summary.usedDocuments.length > 0) {
    formatted += `\n\n**Source Documents**: ${summary.usedDocuments.join(', ')}`;
  }

  if (summary.suggestedUpload) {
    formatted += `\n\n**Tip**: ${summary.suggestedUpload}`;
  }

  formatted += `\n\n**Confidence Level**: ${Math.round(summary.confidence * 100)}%`;

  return formatted;
}
