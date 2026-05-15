import React, { useState, useEffect } from 'react';
import { Upload, Download, Trash2, FileText, Loader, MessageSquare, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { uploadPDFDocument, getUserDocuments, deleteDocument, downloadDocument, PDFDocument } from '../lib/pdfService';
import { queryWithRAG, formatRAGResponse, RAGSummary } from '../lib/ragService';

export default function DocumentManager() {
  const [documents, setDocuments] = useState<PDFDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [sourceType, setSourceType] = useState<'auto' | 'internal' | 'iata'>('auto');
  const [ragResponse, setRagResponse] = useState<RAGSummary | null>(null);
  const [ragLoading, setRagLoading] = useState(false);
  const [expandedResponse, setExpandedResponse] = useState(false);
  const [activeTab, setActiveTab] = useState<'documents' | 'query'>('documents');

  useEffect(() => {
    fetchDocuments();
  }, []);

  async function fetchDocuments() {
    try {
      setLoading(true);
      const docs = await getUserDocuments();
      setDocuments(docs);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>, docType: 'internal' | 'iata') {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      await uploadPDFDocument(file, docType);
      await fetchDocuments();
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload document');
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  }

  async function handleDelete(docId: string) {
    if (!confirm('Delete this document permanently?')) return;

    try {
      await deleteDocument(docId);
      await fetchDocuments();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete document');
    }
  }

  async function handleDownload(docId: string) {
    try {
      const blob = await downloadDocument(docId);
      const doc = documents.find(d => d.id === docId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc?.file_name || 'document.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download document');
    }
  }

  async function handleRAGQuery() {
    if (!query.trim()) return;

    try {
      setRagLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        alert('User session required');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      const response = await queryWithRAG(
        {
          userId: user?.id || '',
          question: query,
          sourceType,
        },
        token
      );

      setRagResponse(response);
      setExpandedResponse(true);
    } catch (error) {
      console.error('RAG query error:', error);
      alert('Failed to process query');
    } finally {
      setRagLoading(false);
    }
  }

  const internalDocs = documents.filter(d => d.document_type === 'internal' && d.upload_status === 'completed');
  const iataDocs = documents.filter(d => d.document_type === 'iata' && d.upload_status === 'completed');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Document Manager & RAG Query</h1>
          <p className="text-slate-600">Upload airline guidelines and query with AI-powered RAG system</p>
        </div>

        <div className="flex gap-2 mb-8 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'documents'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="inline mr-2 w-4 h-4" />
            Documents
          </button>
          <button
            onClick={() => setActiveTab('query')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'query'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="inline mr-2 w-4 h-4" />
            Query Documents
          </button>
        </div>

        {activeTab === 'documents' && (
          <div className="space-y-8">
            {/* Internal Documents Section */}
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Internal Guidelines</h2>
                  <p className="text-slate-600 text-sm">Your airline-specific baggage policies</p>
                </div>
                <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
                  <Upload className="w-4 h-4" />
                  Upload Internal
                  <input
                    type="file"
                    accept=".pdf,.txt"
                    onChange={(e) => handleUpload(e, 'internal')}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : internalDocs.length > 0 ? (
                <div className="space-y-3">
                  {internalDocs.map(doc => (
                    <DocumentCard
                      key={doc.id}
                      doc={doc}
                      onDelete={handleDelete}
                      onDownload={handleDownload}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <p>No internal guidelines uploaded yet</p>
                </div>
              )}
            </div>

            {/* IATA Guidelines Section */}
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">IATA Guidelines</h2>
                  <p className="text-slate-600 text-sm">Standard airline baggage policies reference</p>
                </div>
                <label className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer transition-colors">
                  <Upload className="w-4 h-4" />
                  Upload IATA
                  <input
                    type="file"
                    accept=".pdf,.txt"
                    onChange={(e) => handleUpload(e, 'iata')}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : iataDocs.length > 0 ? (
                <div className="space-y-3">
                  {iataDocs.map(doc => (
                    <DocumentCard
                      key={doc.id}
                      doc={doc}
                      onDelete={handleDelete}
                      onDownload={handleDownload}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-green-50 rounded-lg p-4">
                  <p className="text-slate-600 mb-2">Default IATA guidelines available</p>
                  <a
                    href="/IATA_Baggage_Guidelines_2024.txt"
                    download
                    className="text-green-600 hover:text-green-700 font-medium inline-flex items-center gap-1"
                  >
                    <Download className="w-4 h-4" />
                    Download Standard IATA Guidelines
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'query' && (
          <div className="space-y-6">
            {/* Query Input Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Ask a Question</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Your Question
                  </label>
                  <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="e.g., What is the excess baggage policy? Or ask about MSC determination..."
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={4}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Source Priority
                  </label>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value="auto"
                        checked={sourceType === 'auto'}
                        onChange={(e) => setSourceType(e.target.value as any)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-slate-700">Auto (Internal first, then IATA)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value="internal"
                        checked={sourceType === 'internal'}
                        onChange={(e) => setSourceType(e.target.value as any)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-slate-700">Internal Only</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value="iata"
                        checked={sourceType === 'iata'}
                        onChange={(e) => setSourceType(e.target.value as any)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-slate-700">IATA Only</span>
                    </label>
                  </div>
                </div>

                <button
                  onClick={handleRAGQuery}
                  disabled={ragLoading || !query.trim()}
                  className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {ragLoading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Generating Response...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="w-4 h-4" />
                      Query Documents
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Response Section */}
            {ragResponse && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900">AI Response</h3>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      ragResponse.confidence >= 0.8
                        ? 'bg-green-100 text-green-800'
                        : ragResponse.confidence >= 0.6
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {Math.round(ragResponse.confidence * 100)}% Confidence
                    </span>
                  </div>
                </div>

                <div className="mb-4 max-h-96 overflow-y-auto">
                  <div className="prose prose-sm max-w-none">
                    <p className="text-slate-700 whitespace-pre-wrap">{ragResponse.answer}</p>
                  </div>
                </div>

                {ragResponse.usedDocuments.length > 0 && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm font-medium text-blue-900 mb-2">Sources Used:</p>
                    <div className="flex flex-wrap gap-2">
                      {ragResponse.usedDocuments.map((doc, i) => (
                        <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                          {doc}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {ragResponse.suggestedUpload && (
                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-800">{ragResponse.suggestedUpload}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DocumentCard({
  doc,
  onDelete,
  onDownload,
}: {
  doc: PDFDocument;
  onDelete: (id: string) => void;
  onDownload: (id: string) => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
      <div className="flex items-start gap-3 flex-1">
        <FileText className="w-5 h-5 text-slate-400 mt-1 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-900 truncate">{doc.file_name}</p>
          <div className="flex flex-wrap gap-3 text-xs text-slate-500 mt-1">
            <span>{(doc.file_size / 1024).toFixed(1)} KB</span>
            <span>{doc.pages_count} pages</span>
            <span>{new Date(doc.created_at).toLocaleDateString()}</span>
            {doc.upload_status !== 'completed' && (
              <span className="text-amber-600 font-medium">{doc.upload_status}</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2 ml-4 flex-shrink-0">
        <button
          onClick={() => onDownload(doc.id)}
          className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          title="Download"
        >
          <Download className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(doc.id)}
          className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
