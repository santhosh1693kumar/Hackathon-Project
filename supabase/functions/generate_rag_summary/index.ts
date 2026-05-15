import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RAGRequest {
  userId: string;
  question: string;
  sourceType: "internal" | "iata" | "auto";
  maxChunks?: number;
}

interface RAGResponse {
  answer: string;
  confidence: number;
  sources: string[];
  usedDocuments: string[];
  suggestedUpload?: string;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const aiApiKey = Deno.env.get("VITE_AI_API_KEY") || "";
const aiBaseUrl = Deno.env.get("VITE_AI_BASE_URL") || "https://api.openai.com/v1";
const aiModel = Deno.env.get("VITE_AI_MODEL") || "gpt-4o-mini";

const supabase = createClient(supabaseUrl, supabaseKey);

async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!aiApiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${aiApiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text.substring(0, 8000),
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.data?.[0]?.embedding || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function retrieveRelevantChunks(
  userId: string,
  question: string,
  documentType: "internal" | "iata" | "auto",
  maxChunks: number = 5
) {
  try {
    const queryEmbedding = await generateEmbedding(question);

    let query = supabase
      .from("document_chunks")
      .select("*, airline_documents(id, file_name, document_type)", { count: "exact" })
      .eq("airline_documents.user_id", userId);

    if (documentType !== "auto") {
      query = query.eq("airline_documents.document_type", documentType);
    }

    let results: any[] = [];

    if (queryEmbedding) {
      const { data, error } = await query
        .rpc("match_documents", {
          query_embedding: queryEmbedding,
          match_threshold: 0.3,
          match_count: maxChunks,
        });

      if (!error && data) {
        results = data;
      }
    }

    if (results.length === 0) {
      const { data } = await query
        .order("created_at", { ascending: false })
        .limit(maxChunks);
      results = data || [];
    }

    return results;
  } catch (error) {
    console.error("Error retrieving chunks:", error);
    return [];
  }
}

async function callAI(messages: Array<{ role: string; content: string }>): Promise<string> {
  if (!aiApiKey) {
    return generateFallbackResponse();
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${aiBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${aiApiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: aiModel,
        messages,
        max_tokens: 1200,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("AI API error:", err);
      return generateFallbackResponse();
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || generateFallbackResponse();
  } catch (error) {
    console.error("AI call failed:", error);
    return generateFallbackResponse();
  } finally {
    clearTimeout(timeout);
  }
}

function generateFallbackResponse(): string {
  return "I apologize, but I'm unable to generate a response at this moment. Please try again later or contact support if the issue persists.";
}

async function generateRAGSummary(req: RAGRequest): Promise<RAGResponse> {
  const { userId, question, sourceType, maxChunks = 5 } = req;

  const chunks = await retrieveRelevantChunks(userId, question, sourceType, maxChunks);

  const chunkTexts = chunks.map((c: any) => c.chunk_text).join("\n\n---\n\n");
  const usedDocuments = [...new Set(chunks.map((c: any) => c.airline_documents?.file_name || "Unknown"))];

  let systemPrompt = `You are an expert airline baggage policy assistant. Answer questions based on the provided documents.
Always prioritize information according to these rules:

PRIORITY RULES:
1. If the user uploads an INTERNAL document and asks about that airline's policies, prioritize the internal document
2. If the question is not covered in the internal document, use IATA information
3. If the user explicitly asks for IATA information (even with internal doc uploaded), use IATA as primary source
4. If the user asks about internal policies but NO internal document is uploaded, use IATA information and suggest uploading internal guidelines

AVAILABLE CONTEXT:
${chunkTexts || "No documents available. Using general knowledge."}

Generate clear, professional responses suitable for airline support staff.
Always cite your source (internal document name or IATA guidelines).
If information cannot be found in provided documents, clearly state this.`;

  if (!chunkTexts) {
    const hasInternalDocs = chunks.some((c: any) => c.airline_documents?.document_type === "internal");

    if (!hasInternalDocs && sourceType === "auto") {
      systemPrompt = `You are an expert airline baggage policy assistant.
The user has NOT uploaded any internal airline guidelines. When answering about internal policies:
1. Provide IATA standard information
2. Suggest they upload their specific airline guidelines for more accurate answers
3. Explain how uploading their guidelines would improve the accuracy of future responses`;
    }
  }

  const answer = await callAI([
    { role: "system", content: systemPrompt },
    { role: "user", content: question },
  ]);

  const confidence = chunks.length > 0 && aiApiKey ? 0.85 : 0.6;
  const suggestedUpload =
    chunks.length === 0 && sourceType === "auto"
      ? "Consider uploading your airline's baggage guidelines for more tailored responses"
      : undefined;

  return {
    answer,
    confidence,
    sources: usedDocuments,
    usedDocuments,
    suggestedUpload,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body = await req.json();
    const result = await generateRAGSummary(body);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
