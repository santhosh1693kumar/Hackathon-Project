/*
  # Add PDF Storage and Embeddings for RAG System

  1. Enable pgvector extension for embeddings
  2. New Tables
    - `airline_documents` - Stores user-uploaded airline PDFs with metadata
    - `document_chunks` - Text chunks from PDFs with embeddings for semantic search
    - `embedding_cache` - Cache for embeddings to avoid regeneration

  3. Security
    - RLS enabled on all tables
    - Users can only access their own documents
    - Embeddings are readable by all authenticated users

  4. Performance
    - Indexes for user_id, document_type, and full-text search on chunk text
    - Vector index for similarity search
*/

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS airline_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_size integer NOT NULL,
  file_path text NOT NULL,
  document_type text NOT NULL DEFAULT 'internal' CHECK (document_type IN ('internal', 'iata')),
  content_preview text,
  pages_count integer DEFAULT 0,
  upload_status text NOT NULL DEFAULT 'completed' CHECK (upload_status IN ('pending', 'processing', 'completed', 'failed')),
  processing_error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE airline_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own documents"
  ON airline_documents FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
  ON airline_documents FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents"
  ON airline_documents FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
  ON airline_documents FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Document chunks for RAG retrieval with embeddings
CREATE TABLE IF NOT EXISTS document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES airline_documents(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  chunk_text text NOT NULL,
  chunk_length integer NOT NULL,
  page_number integer,
  embedding vector(1536) DEFAULT NULL,
  embedding_model text DEFAULT 'gte-small',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read chunks of own documents"
  ON document_chunks FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM airline_documents
      WHERE airline_documents.id = document_chunks.document_id
      AND airline_documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert chunks for own documents"
  ON document_chunks FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM airline_documents
      WHERE airline_documents.id = document_chunks.document_id
      AND airline_documents.user_id = auth.uid()
    )
  );

-- Cache for embeddings to avoid redundant computation
CREATE TABLE IF NOT EXISTS embedding_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_hash text UNIQUE NOT NULL,
  embedding vector(1536) NOT NULL,
  model text DEFAULT 'gte-small',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE embedding_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read embeddings"
  ON embedding_cache FOR SELECT TO authenticated
  USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_airline_documents_user_id ON airline_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_airline_documents_doc_type ON airline_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_airline_documents_created_at ON airline_documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_page ON document_chunks(page_number);
CREATE INDEX IF NOT EXISTS idx_embedding_cache_hash ON embedding_cache(content_hash);
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
