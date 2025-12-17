import React, { useState, useEffect } from 'react';
import {
    ChevronDown,
    Upload,
    FileText,
    Download,
    FileJson,
    Loader2,
    RefreshCw,
    Trash2
} from 'lucide-react';

import DocumentUploadModal from './DocumentUploadModal';
import {
    listDocuments,
    getDocumentPdfUrl
} from '../../services/documentService';

const GeneratorView = () => {
    const [selectedBRD, setSelectedBRD] = useState('BRD');
    const [projectName] = useState('Enhance the Data Analysis Software ™');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
    const [loadingPdf, setLoadingPdf] = useState(false);


    const [generatedDocs, setGeneratedDocs] = useState([]);
    const [selectedDocId, setSelectedDocId] = useState(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Delete modal state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [docToDelete, setDocToDelete] = useState(null);

    const backendUrl =
        import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

    useEffect(() => {
        loadDocuments();
    }, []);

    /* =========================
       LOAD DOCUMENTS
    ========================= */
    const loadDocuments = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await listDocuments();
            setGeneratedDocs(result.items || []);

            if (result.items?.length) {
                setSelectedDocId(prev => prev ?? result.items[0].id);
            } else {
                setSelectedDocId(null);
            }
        } catch (err) {
            console.error('Failed to load documents:', err);
            setError('Failed to load documents');
        } finally {
            setLoading(false);
        }
    };

    /* =========================
       UPLOAD HANDLER
    ========================= */
    const handleUpload = async () => {
        await loadDocuments();
    };

    const handleDocumentClick = (docId) => {
        setSelectedDocId(docId);
    };

    /* =========================
       FILE TYPE HELPERS
    ========================= */
    const isCsvOrExcel = (fileName = '') => {
        const lower = fileName.toLowerCase();
        return (
            lower.endsWith('.csv') ||
            lower.endsWith('.xls') ||
            lower.endsWith('.xlsx')
        );
    };

    /* =========================
       DOWNLOAD HANDLERS
    ========================= */
    const triggerDownload = (url, filename) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePdfDownload = (e, doc) => {
        e.stopPropagation();
        triggerDownload(
            `${backendUrl}/documents/${doc.id}/pdf`,
            doc.originalFileName.replace(/\.[^/.]+$/, '.pdf')
        );
    };


    const handleJsonDownload = (e, doc) => {
        e.stopPropagation();
        triggerDownload(
            `${backendUrl}/documents/${doc.id}/json`,
            doc.originalFileName.replace(/\.[^/.]+$/, '.json')
        );
    };


    /* =========================
       DELETE HANDLERS
    ========================= */
    const openDeleteModal = (doc) => {
        setDocToDelete(doc);
        setIsDeleteModalOpen(true);
    };

    const closeDeleteModal = () => {
        setDocToDelete(null);
        setIsDeleteModalOpen(false);
    };

    const confirmDelete = async () => {
        if (!docToDelete) return;

        try {
            const apiToken = import.meta.env.VITE_API_TOKEN;

            const response = await fetch(
                `${backendUrl}/documents/${docToDelete.id}`,
                {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${apiToken}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error('Delete failed');
            }

            await loadDocuments();
            closeDeleteModal();
        } catch (err) {
            console.error('Delete failed:', err);
            alert('Failed to delete document');
        }
    };

    /* =========================
       DERIVED STATE
    ========================= */
    const selectedDoc = generatedDocs.find(d => d.id === selectedDocId);
    // const pdfUrl = selectedDocId ? getDocumentPdfUrl(selectedDocId) : null;

    useEffect(() => {
        if (!selectedDocId) {
            setPdfBlobUrl(null);
            return;
        }

        let cancelled = false;
        let objectUrl = null;

        const fetchPdfPreview = async () => {
            setLoadingPdf(true);
            setPdfBlobUrl(null);

            try {
                const res = await fetch(
                    `${backendUrl}/documents/${selectedDocId}/pdf`
                );

                if (!res.ok) return;

                const blob = await res.blob();
                objectUrl = URL.createObjectURL(blob);

                if (!cancelled) {
                    setPdfBlobUrl(objectUrl);
                } else {
                    URL.revokeObjectURL(objectUrl);
                }
            } catch (err) {
                console.error('Preview fetch failed', err);
            } finally {
                if (!cancelled) setLoadingPdf(false);
            }
        };

        fetchPdfPreview();

        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [selectedDocId, backendUrl]);


    return (
        <div className="flex flex-col h-full gap-4">

            {/* TOP BAR */}
            <div className="flex items-center gap-3">
                <div className="relative">
                    <select
                        value={selectedBRD}
                        onChange={(e) => setSelectedBRD(e.target.value)}
                        className="appearance-none bg-white border border-slate-300 rounded-lg px-3 py-1.5 pr-8 text-sm"
                    >
                        <option value="BRD">BRD</option>
                        <option value="TC">TC</option>
                        <option value="Requirements">Requirements</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>

                <div className="bg-white border rounded-lg pl-4 ml-auto flex items-center gap-2">
                    <span className="text-sm text-slate-600">Project Name:</span>
                    <div className="bg-white border rounded-lg px-3 py-1.5 text-sm">
                        {projectName}
                    </div>
                </div>

                <button
                    onClick={loadDocuments}
                    disabled={loading}
                    className="p-1.5 bg-white border rounded-lg"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                </div>
            )}

            {/* MAIN LAYOUT */}
            <div className="flex-1 grid lg:grid-cols-[40fr_60fr] gap-4 min-h-0">

                {/* LEFT COLUMN */}
                <div className="flex flex-col gap-4 min-h-0">

                    {/* SOURCE FILES */}
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                        <h2 className="font-bold mb-3">Source Files</h2>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-teal-500 text-white px-4 py-2 rounded-lg flex gap-2"
                        >
                            <Upload size={16} />
                            Upload Files
                        </button>
                    </div>

                    {/* GENERATED FILES */}
                    <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-col flex-1 min-h-0">
                        <h2 className="font-bold mb-3">Generated Files</h2>

                        {loading ? (
                            <div className="flex-1 flex items-center justify-center">
                                <Loader2 className="animate-spin text-teal-500" />
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto space-y-2">
                                {generatedDocs.map(doc => (
                                    <div
                                        key={doc.id}
                                        className={`p-3 rounded-lg border-2 flex items-center gap-2 ${selectedDocId === doc.id
                                            ? 'bg-teal-50 border-teal-300'
                                            : 'bg-slate-50 border-slate-200'
                                            }`}
                                    >
                                        <div
                                            className="flex-1 cursor-pointer"
                                            onClick={() => handleDocumentClick(doc.id)}
                                        >
                                            <p className="font-semibold text-xs truncate">
                                                {doc.originalFileName}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {(doc.size / 1024).toFixed(1)} KB
                                            </p>
                                        </div>

                                        {/* PDF DOWNLOAD */}
                                        {doc.pdfPath && (
                                            <button
                                                onClick={(e) => handlePdfDownload(e, doc)}
                                                title="Download PDF"
                                                className="p-1.5 rounded-lg hover:bg-slate-200"
                                            >
                                                <Download size={16} />
                                            </button>
                                        )}

                                        {/* JSON DOWNLOAD (CSV / EXCEL ONLY) */}
                                        {isCsvOrExcel(doc.originalFileName) && (
                                            <button
                                                onClick={(e) => handleJsonDownload(e, doc)}
                                                title="Download JSON"
                                                className="p-1.5 rounded-lg hover:bg-slate-200"
                                            >
                                                <FileJson size={16} />
                                            </button>
                                        )}

                                        {/* DELETE */}
                                        <button
                                            onClick={() => openDeleteModal(doc)}
                                            title="Delete document"
                                            className="p-1.5 rounded-lg hover:bg-red-100"
                                        >
                                            <Trash2 size={16} className="text-red-500" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="bg-slate-100 rounded-2xl p-4 flex flex-col">
                    <h2 className="font-bold mb-3">Preview</h2>

                    <div className="flex-1 bg-white rounded-lg overflow-hidden">
                        {loadingPdf && (
                            <div className="text-sm text-slate-400">Loading preview…</div>
                        )}

                        {!loadingPdf && pdfBlobUrl && (
                            <iframe
                                src={pdfBlobUrl}
                                className="w-full h-full border-0"
                                title="Document Preview"
                            />
                        )}

                    </div>
                </div>
            </div>

            {/* DELETE CONFIRMATION MODAL */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-[360px]">
                        <h3 className="font-bold mb-2">Delete Document</h3>
                        <p className="text-sm mb-4">
                            Are you sure you want to delete this document?
                        </p>

                        <div className="flex justify-end gap-2">
                            <button
                                onClick={closeDeleteModal}
                                className="px-4 py-2 border rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 bg-red-500 text-white rounded-lg"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* UPLOAD MODAL */}
            <DocumentUploadModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onUpload={handleUpload}
            />
        </div>
    );
};

export default GeneratorView;
