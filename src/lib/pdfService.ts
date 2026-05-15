import { supabase } from './supabase';

export interface PDFDocument {
  id: string;
  user_id: string;
  file_name: string;
  file_size: number;
  file_path: string;
  document_type: 'internal' | 'iata';
  content_preview: string | null;
  pages_count: number;
  upload_status: 'pending' | 'processing' | 'completed' | 'failed';
  processing_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  chunk_text: string;
  chunk_length: number;
  page_number: number | null;
  embedding_model: string;
  created_at: string;
}

async function extractTextFromPDF(file: File): Promise<{ text: string; pages: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      if (!arrayBuffer) {
        reject(new Error('Failed to read file'));
        return;
      }

      const dynamicImport = async () => {
        try {
          const pdfjs = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.269/build/pdf.min.mjs');
          const pdf = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
          let text = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            text += textContent.items.map((item: any) => item.str).join(' ') + '\n';
          }
          resolve({ text, pages: pdf.numPages });
        } catch (err) {
          reject(err);
        }
      };

      dynamicImport();
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

export async function uploadPDFDocument(
  file: File,
  documentType: 'internal' | 'iata'
): Promise<PDFDocument> {
  const userId = (await supabase.auth.getUser())?.data?.user?.id;
  if (!userId) throw new Error('User not authenticated');

  const fileName = `${documentType}_${Date.now()}_${file.name}`;
  const filePath = `documents/${userId}/${fileName}`;

  try {
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('airline_documents')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: docData, error: dbError } = await supabase
      .from('airline_documents')
      .insert({
        user_id: userId,
        file_name: file.name,
        file_size: file.size,
        file_path: filePath,
        document_type: documentType,
        upload_status: 'processing',
        pages_count: 0,
      })
      .select()
      .single();

    if (dbError) throw dbError;

    extractAndChunkPDF(docData.id, file, documentType).catch((err) => {
      console.error('PDF chunking error:', err);
      updateDocumentStatus(docData.id, 'failed', err.message);
    });

    return docData;
  } catch (error) {
    console.error('PDF upload error:', error);
    throw error;
  }
}

async function extractAndChunkPDF(documentId: string, file: File, documentType: string) {
  try {
    const { text, pages } = await extractTextFromPDF(file);
    const chunkSize = 800;
    const chunks = [];

    for (let i = 0; i < text.length; i += chunkSize) {
      const chunkText = text.substring(i, Math.min(i + chunkSize, text.length));
      chunks.push({
        document_id: documentId,
        chunk_index: chunks.length,
        chunk_text: chunkText,
        chunk_length: chunkText.length,
        page_number: Math.floor(i / (text.length / pages)),
        embedding_model: 'gte-small',
      });
    }

    const contentPreview = text.substring(0, 500);

    const { error: insertError } = await supabase
      .from('document_chunks')
      .insert(chunks);

    if (insertError) throw insertError;

    const { error: updateError } = await supabase
      .from('airline_documents')
      .update({
        upload_status: 'completed',
        pages_count: pages,
        content_preview: contentPreview,
      })
      .eq('id', documentId);

    if (updateError) throw updateError;
  } catch (error) {
    console.error('Chunking error:', error);
    throw error;
  }
}

export async function updateDocumentStatus(
  documentId: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  error?: string
) {
  const { error: updateError } = await supabase
    .from('airline_documents')
    .update({
      upload_status: status,
      processing_error: error || null,
    })
    .eq('id', documentId);

  if (updateError) throw updateError;
}

export async function getUserDocuments(documentType?: 'internal' | 'iata'): Promise<PDFDocument[]> {
  const userId = (await supabase.auth.getUser())?.data?.user?.id;
  if (!userId) throw new Error('User not authenticated');

  let query = supabase
    .from('airline_documents')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (documentType) {
    query = query.eq('document_type', documentType);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function deleteDocument(documentId: string): Promise<void> {
  const userId = (await supabase.auth.getUser())?.data?.user?.id;
  if (!userId) throw new Error('User not authenticated');

  const { data: doc, error: fetchError } = await supabase
    .from('airline_documents')
    .select('file_path')
    .eq('id', documentId)
    .eq('user_id', userId)
    .single();

  if (fetchError) throw fetchError;
  if (!doc) throw new Error('Document not found');

  await supabase.storage.from('airline_documents').remove([doc.file_path]);

  const { error: deleteError } = await supabase
    .from('airline_documents')
    .delete()
    .eq('id', documentId)
    .eq('user_id', userId);

  if (deleteError) throw deleteError;
}

export async function downloadDocument(documentId: string): Promise<Blob> {
  const userId = (await supabase.auth.getUser())?.data?.user?.id;
  if (!userId) throw new Error('User not authenticated');

  const { data: doc, error: fetchError } = await supabase
    .from('airline_documents')
    .select('file_path, file_name')
    .eq('id', documentId)
    .eq('user_id', userId)
    .single();

  if (fetchError) throw fetchError;
  if (!doc) throw new Error('Document not found');

  const { data, error: downloadError } = await supabase.storage
    .from('airline_documents')
    .download(doc.file_path);

  if (downloadError) throw downloadError;
  return data;
}

export async function getDocumentChunks(documentId: string): Promise<DocumentChunk[]> {
  const { data, error } = await supabase
    .from('document_chunks')
    .select('*')
    .eq('document_id', documentId)
    .order('chunk_index', { ascending: true });

  if (error) throw error;
  return data || [];
}
