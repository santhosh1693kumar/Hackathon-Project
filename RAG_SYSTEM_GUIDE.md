# PDF Upload & RAG System Implementation Guide

## Overview
This document describes the comprehensive PDF upload and Retrieval-Augmented Generation (RAG) system implemented in the SkyAir AI Platform for intelligent baggage policy queries.

## Architecture

### Database Schema
Three new tables support the RAG system:

#### 1. `airline_documents`
Stores metadata for uploaded PDF documents (internal or IATA guidelines)
- **user_id**: References the uploading user
- **document_type**: Either 'internal' (airline-specific) or 'iata' (standard guidelines)
- **upload_status**: Tracks processing state (pending, processing, completed, failed)
- **pages_count**: Number of pages extracted
- **file_path**: Storage location in Supabase Storage
- **RLS Policy**: Users can only access their own documents

#### 2. `document_chunks`
Stores text chunks extracted from PDFs with embeddings
- **document_id**: References parent document
- **chunk_text**: Text content for semantic search
- **embedding**: Vector (1536-dim) for similarity matching
- **page_number**: Source page reference
- **RLS Policy**: Users can access chunks from their documents

#### 3. `embedding_cache`
Caches embedding vectors to avoid redundant computation
- **content_hash**: Unique hash of text content
- **embedding**: Pre-computed vector
- **RLS Policy**: Readable by all authenticated users

### File Structure
```
project/
├── src/
│   ├── lib/
│   │   ├── pdfService.ts         # PDF upload, extraction, chunking
│   │   ├── ragService.ts         # RAG query interface
│   │   └── aiService.ts          # Updated with RAG fallback
│   ├── pages/
│   │   └── DocumentManager.tsx   # UI for document management & RAG queries
│   └── types/index.ts            # New types for PDFs and RAG
├── supabase/
│   ├── functions/
│   │   └── generate_rag_summary/
│   │       └── index.ts          # Edge Function for RAG processing
│   └── migrations/
│       └── add_pdf_storage_and_embeddings.sql
└── public/
    └── IATA_Baggage_Guidelines_2024.txt  # Default IATA reference
```

## Features

### 1. Document Upload
**Location**: Document Manager → Documents Tab

**Capabilities**:
- Upload PDF or text files (internal or IATA guidelines)
- Automatic text extraction and chunking
- Page count detection
- Content preview generation
- Error tracking and status monitoring

**Process Flow**:
1. User selects file and document type
2. File uploaded to `airline_documents` Supabase Storage
3. PDF extraction triggered (async)
4. Text split into 800-character chunks
5. Chunks stored with metadata in `document_chunks` table
6. Status updated to 'completed'

### 2. RAG Query System
**Location**: Document Manager → Query Documents Tab

**Priority Rules** (Implemented):
1. **Auto Mode**: If internal document uploaded, prioritize internal first
   - If answer found in internal docs → use internal
   - If not found in internal → fallback to IATA
   
2. **Internal Mode**: Only query internal documents
   - If no internal docs → suggest uploading

3. **IATA Mode**: Only query IATA guidelines
   - Overrides internal documents even if available

4. **No Documents Scenario**: 
   - If user asks about internal policies without uploading
   - Provides IATA information
   - Suggests uploading specific guidelines

**Query Flow**:
1. User submits question with source priority selection
2. Edge Function `generate_rag_summary` receives request
3. Query embedded using `text-embedding-3-small` model
4. Semantic similarity search finds relevant chunks
5. Top 5 chunks passed as context to AI
6. AI generates answer with sources and confidence score
7. Response includes:
   - Answer text
   - Confidence level (0.0-1.0)
   - Used document names
   - Suggested uploads (if applicable)

### 3. IATA Guidelines Reference
**Default File**: `public/IATA_Baggage_Guidelines_2024.txt`

Contains 13 sections:
- Baggage Policy Basics
- Allowance Concepts (Weight & Piece)
- Most Significant Carrier (MSC) Rules
- Excess Baggage Procedures
- Operational Handling Requirements
- Mishandled Baggage Procedures
- Prohibited/Restricted Items
- Passenger Rights & Compensation
- Baggage Fees
- Best Practices
- Regulatory Compliance
- Settlement & Billing
- Key Acronyms & Checklists

## Edge Function: `generate_rag_summary`

### Endpoint
```
POST /functions/v1/generate_rag_summary
Authorization: Bearer {JWT_TOKEN}
```

### Request Body
```typescript
{
  userId: string,
  question: string,
  sourceType: 'internal' | 'iata' | 'auto',
  maxChunks?: number  // Default: 5
}
```

### Response
```typescript
{
  answer: string,
  confidence: number,
  sources: string[],
  usedDocuments: string[],
  suggestedUpload?: string
}
```

### Processing Logic
1. **Vector Generation**: Question converted to embedding
2. **Similarity Search**: Find relevant document chunks
3. **Fallback**: If no vectors, use created_at ordering
4. **Context Assembly**: Join top chunks with separators
5. **Prompt Construction**: Build system prompt with priority rules
6. **AI Generation**: Call OpenAI with context and rules
7. **Response Formatting**: Include sources, confidence, suggestions

## Integration with Baggage Assistant

The Baggage Assistant page now automatically uses RAG when available:

1. **Fallback Chain**:
   - First attempts RAG query if user is authenticated
   - Falls back to standard IATA query if RAG fails
   - Uses embedded IATA knowledge base if no API key

2. **Session-Based**:
   - Respects user authentication state
   - Prioritizes internal documents for logged-in users
   - Maintains audit logs of all queries

## Security & Access Control

### Row Level Security (RLS)
- **airline_documents**: Users see only their own uploads
- **document_chunks**: Accessible only if user owns parent document
- **embedding_cache**: Readable by authenticated users (efficient caching)

### Authentication
- JWT token verification on Edge Function
- User identity from Supabase Auth
- Audit logging for compliance

## Performance Optimizations

### Embeddings
- Vector caching to avoid recomputation
- IVFFlat index for similarity search (100 lists)
- Batch embedding generation possible

### Chunking
- 800-character chunks balance context & efficiency
- Page number tracking for reference
- Chunk index for retrieval order

### Storage
- Supabase Storage for files (automatic CDN)
- Database for metadata & embeddings
- Efficient JSON storage for document details

## Usage Examples

### Example 1: Internal Guideline Query
```
User: "What is our excess baggage policy?"
Mode: Auto (Internal First)

→ If internal doc uploaded:
  Answer from internal document
  Confidence: 0.90
  Source: "airline_guidelines.pdf"

→ If NO internal doc:
  Answer from IATA + suggestion to upload
  "Consider uploading your specific baggage guidelines..."
```

### Example 2: IATA-Only Query
```
User: "What does IATA say about MSC rules?"
Mode: IATA Only

→ Only queries IATA guidelines
→ Ignores any internal documents
→ Confidence: 0.85
→ Source: "IATA Guidance Document"
```

### Example 3: Conflict Resolution
```
User: "Show me IATA baggage allowance rules"
Mode: Auto (Internal First)
Internal doc: Contains different rules

→ Prioritizes IATA (explicit IATA request)
→ Ignores internal document
→ Source: "IATA Guidelines"
```

## API Keys Required

The system works with or without external APIs:

### Optional (Enhanced Features)
- `VITE_AI_API_KEY`: OpenAI API key for embedding & completion
- `VITE_AI_BASE_URL`: Custom AI API endpoint (default: OpenAI)
- `VITE_AI_MODEL`: Model selection (default: gpt-4o-mini)

### Automatic (Supabase)
- `VITE_SUPABASE_URL`: Project URL
- `VITE_SUPABASE_ANON_KEY`: Public key
- `SUPABASE_SERVICE_ROLE_KEY`: Backend key (Edge Function)

## Troubleshooting

### Issue: Documents not appearing
- Check user authentication state
- Verify RLS policies on `airline_documents` table
- Check upload status in database

### Issue: RAG queries returning generic answers
- Verify document chunks were created (check `document_chunks` table)
- Ensure embedding model is accessible
- Check AI API key configuration

### Issue: Slow similarity search
- IVFFlat index may need tuning (adjust 'lists' parameter)
- Consider archiving old documents
- Monitor database query performance

## Future Enhancements

1. **Multi-document Context**: Search across all user documents
2. **Custom Chunking**: Configurable chunk sizes by document type
3. **Fine-tuning**: Train custom models on specific documents
4. **Analytics**: Track most-asked questions by category
5. **Batch Processing**: Upload multiple documents at once
6. **Collaboration**: Share documents between team members
7. **Version Control**: Track document updates and changes
8. **Export**: Generate reports from query results

## Compliance & Audit

All RAG queries are logged in `audit_logs` table:
- User identity and role
- Question asked
- Document sources used
- Confidence score
- Timestamp
- Query category

Enables full compliance audit trails for regulatory requirements.

---

**Version**: 1.0  
**Last Updated**: 2024-05-15  
**Deployment Status**: Ready for Production
