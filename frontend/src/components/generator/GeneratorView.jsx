import React, { useState, useEffect } from 'react';
import { ChevronDown, Upload, FileText, Download, MessageSquare, Loader2, RefreshCw } from 'lucide-react';
import DocumentUploadModal from './DocumentUploadModal';
import { listDocuments, getDocumentPdfUrl } from '../../services/documentService';

const GeneratorView = () => {
    const [selectedBRD, setSelectedBRD] = useState('BRD');
    const [projectName, setProjectName] = useState('Enhance the Data Analysis Software ™');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [generatedDocs, setGeneratedDocs] = useState([]);
    const [selectedDocId, setSelectedDocId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Load documents on mount
    useEffect(() => {
        loadDocuments();
    }, []);

    const loadDocuments = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await listDocuments();
            setGeneratedDocs(result.items || []);

            // Auto-select first document for preview
            if (result.items && result.items.length > 0 && !selectedDocId) {
                setSelectedDocId(result.items[0].id);
            }
        } catch (err) {
            console.error('Failed to load documents:', err);
            setError('Failed to load documents');
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (result) => {
        console.log('Upload result:', result);

        // Refresh document list after upload
        await loadDocuments();

        // Add successful uploads to uploadedFiles for display
        if (result.results) {
            const successfulUploads = result.results
                .filter(r => r.success)
                .map(r => r.document);
            setUploadedFiles(prev => [...prev, ...successfulUploads]);

            // Select first uploaded document for preview
            if (successfulUploads.length > 0) {
                setSelectedDocId(successfulUploads[0].id);
            }
        }
    };

    const handleDocumentClick = (docId) => {
        setSelectedDocId(docId);
    };

    const selectedDoc = generatedDocs.find(d => d.id === selectedDocId);
    const pdfUrl = selectedDocId ? getDocumentPdfUrl(selectedDocId) : null;

    return (
        <div className="flex flex-col h-full gap-4">
            {/* Top Bar - Compact */}
            <div className="flex items-center gap-3 shrink-0">
                <div className="relative">
                    <select
                        value={selectedBRD}
                        onChange={(e) => setSelectedBRD(e.target.value)}
                        className="appearance-none bg-white border border-slate-300 rounded-lg px-3 py-1.5 pr-8 text-sm text-slate-700 font-medium cursor-pointer hover:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
                    >
                        <option value="BRD">BRD</option>
                        <option value="TC">TC</option>
                        <option value="Requirements">Requirements</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                <div className="flex items-center gap-2 ml-auto">
                    <span className="text-sm text-slate-600 whitespace-nowrap">Project Name:</span>
                    <div className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-700 font-medium min-w-[250px] max-w-[350px]">
                        {projectName}
                    </div>
                </div>

                <button
                    onClick={loadDocuments}
                    disabled={loading}
                    className="p-1.5 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                    title="Refresh documents"
                >
                    <RefreshCw size={16} className={`text-slate-600 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                </div>
            )}

            {/* Main 2-Column Layout: 40% Left (Source + Generated) | 60% Right (Preview) */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-[40fr_60fr] gap-4 min-h-0">
                {/* Left Column: Source Files + Generated Files Stacked */}
                <div className="flex flex-col gap-4 min-h-0">
                    {/* Source Files */}
                    <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-col">
                        <h2 className="text-base font-bold text-slate-800 mb-3">Source Files</h2>

                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 mb-3 text-sm"
                        >
                            <Upload size={16} />
                            Upload Files
                        </button>

                        {uploadedFiles.length > 0 && (
                            <div className="flex-1 overflow-y-auto space-y-2">
                                <p className="text-xs text-slate-600 mb-2">Recently Uploaded:</p>
                                {uploadedFiles.slice(0, 3).map((file) => (
                                    <div
                                        key={file.id}
                                        className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:bg-teal-50 hover:border-teal-300 transition-colors"
                                        onClick={() => handleDocumentClick(file.id)}
                                    >
                                        <FileText size={16} className="text-teal-500" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-slate-700 truncate">{file.originalFileName}</p>
                                            <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Generated Files */}
                    <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-col flex-1 min-h-0">
                        <h2 className="text-base font-bold text-slate-800 mb-3">Generated Files</h2>

                        {loading ? (
                            <div className="flex-1 flex items-center justify-center">
                                <Loader2 size={24} className="animate-spin text-teal-500" />
                            </div>
                        ) : generatedDocs.length > 0 ? (
                            <div className="flex-1 overflow-y-auto space-y-2">
                                {generatedDocs.map((doc) => (
                                    <div
                                        key={doc.id}
                                        className={`p-3 rounded-lg cursor-pointer transition-all border-2 ${selectedDocId === doc.id
                                            ? 'bg-teal-50 border-teal-300'
                                            : 'bg-slate-50 border-slate-200 hover:border-teal-200'
                                            }`}
                                        onClick={() => handleDocumentClick(doc.id)}
                                    >
                                        <h3 className="font-semibold text-slate-800 text-xs mb-0.5 truncate">
                                            {(() => {
                                                const pdfName = doc.pdfPath ? doc.pdfPath.split('/').pop().split('\\').pop() : doc.originalFileName;
                                                // Remove timestamp pattern (e.g., -1234567890 before .pdf)
                                                return pdfName.replace(/-\d+\.pdf$/, '.pdf');
                                            })()}
                                        </h3>
                                        <p className="text-xs text-slate-500">
                                            {(doc.size / 1024).toFixed(1)} KB
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-slate-400">
                                <p className="text-xs">No documents uploaded yet</p>
                            </div>
                        )}

                        {/* Generate Report Button */}
                        <button className="mt-3 bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            disabled={generatedDocs.length === 0}
                        >
                            Generate Report
                        </button>
                    </div>
                </div>

                {/* Right Column: Preview (Larger) */}
                <div className="bg-slate-100 rounded-2xl p-4 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-base font-bold text-slate-800">Preview</h2>
                        {selectedDoc && (
                            <div className="flex gap-2">
                                <a
                                    href={pdfUrl}
                                    download
                                    className="p-1.5 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors"
                                    title="Download PDF"
                                >
                                    <Download size={16} className="text-slate-600" />
                                </a>
                                <button className="p-1.5 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors"
                                    title="Add comment"
                                >
                                    <MessageSquare size={16} className="text-slate-600" />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 bg-white rounded-lg overflow-hidden shadow-sm flex flex-col">
                        {selectedDoc && pdfUrl ? (
                            <>
                                <div className="p-2 bg-slate-50 border-b border-slate-200">
                                    <p className="text-xs font-medium text-slate-700 truncate">
                                        {selectedDoc.originalFileName}
                                    </p>
                                </div>
                                <div className="flex-1 relative">
                                    <iframe
                                        src={pdfUrl}
                                        className="w-full h-full border-0"
                                        title="Document Preview"
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-slate-400">
                                <div className="text-center">
                                    <FileText size={48} className="mx-auto mb-3 opacity-50" />
                                    <p className="text-sm">No document selected</p>
                                    <p className="text-xs mt-1">Upload files to preview</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Upload Modal */}
            <DocumentUploadModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onUpload={handleUpload}
            />
        </div>
    );
};

export default GeneratorView;
