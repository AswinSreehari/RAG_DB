import React from 'react';
import { X, Upload, FileText } from 'lucide-react';

const DocumentUploadModal = ({ isOpen, onClose, onUpload }) => {
    const [selectedFiles, setSelectedFiles] = React.useState([]);
    const [dragActive, setDragActive] = React.useState(false);

    const documentRepository = [
        { id: 1, name: 'Upgrade the Legacy Systems for XYZ', type: 'BRD' },
        { id: 2, name: 'Upgrade the Legacy Systems for ABC', type: 'BRD' },
        { id: 3, name: 'Upgrade the Legacy Systems for PQR', type: 'BRD' },
        { id: 4, name: 'Solar Farm Use Case Requirements', type: 'Requirements' },
        { id: 5, name: 'Marketing Platform Enhancement v1', type: 'Spec' },
        { id: 6, name: 'Marketing Platform Enhancement v2', type: 'Spec' },
        { id: 7, name: 'Security Protocol Docs', type: 'Policy' },
        { id: 8, name: 'API Documentation 2025', type: 'Technical' }
    ];

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFiles(e.dataTransfer.files);
        }
    };

    const handleFiles = (files) => {
        const fileArray = Array.from(files).map((file, index) => ({
            id: Date.now() + index,
            name: file.name,
            size: file.size
        }));
        setSelectedFiles(prev => [...prev, ...fileArray]);
    };

    const handleFileInput = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFiles(e.target.files);
        }
    };

    const removeFile = (fileId) => {
        setSelectedFiles(prev => prev.filter(f => f.id !== fileId));
    };

    const toggleDocument = (doc) => {
        const exists = selectedFiles.find(f => f.id === doc.id);
        if (exists) {
            setSelectedFiles(prev => prev.filter(f => f.id !== doc.id));
        } else {
            setSelectedFiles(prev => [...prev, { ...doc, fromRepo: true }]);
        }
    };

    const handleUploadClick = () => {
        onUpload(selectedFiles);
        setSelectedFiles([]);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-800">Document Repository</h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-slate-600" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Drag & Drop Area */}
                        <div>
                            <label
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all
                                    ${dragActive
                                        ? 'border-teal-500 bg-teal-50'
                                        : 'border-slate-300 bg-slate-50 hover:border-teal-400 hover:bg-slate-100'}`}
                            >
                                <Upload size={48} className={`mb-4 ${dragActive ? 'text-teal-500' : 'text-slate-400'}`} />
                                <p className="text-sm text-slate-600 text-center mb-2 font-medium">
                                    Drag and drop files here
                                </p>
                                <p className="text-xs text-slate-400 text-center">or click to browse</p>
                                <input
                                    type="file"
                                    multiple
                                    onChange={handleFileInput}
                                    className="hidden"
                                />
                            </label>

                            {/* Selected Files */}
                            {selectedFiles.length > 0 && (
                                <div className="mt-4 space-y-2">
                                    {selectedFiles.map((file) => (
                                        <div key={file.id} className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-lg">
                                            <FileText size={16} className="text-teal-500" />
                                            <span className="text-sm text-slate-700 flex-1 truncate">{file.name}</span>
                                            <button
                                                onClick={() => removeFile(file.id)}
                                                className="p-1 hover:bg-slate-100 rounded"
                                            >
                                                <X size={14} className="text-slate-400" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Document Repository List */}
                        <div>
                            <h3 className="text-sm font-semibold text-slate-700 mb-3">Available Documents</h3>
                            <div className="space-y-2 max-h-80 overflow-y-auto">
                                {documentRepository.map((doc) => {
                                    const isSelected = selectedFiles.find(f => f.id === doc.id);
                                    return (
                                        <button
                                            key={doc.id}
                                            onClick={() => toggleDocument(doc)}
                                            className={`w-full text-left p-3 rounded-lg transition-all border ${isSelected
                                                    ? 'bg-teal-50 border-teal-300 text-teal-700'
                                                    : 'bg-white border-slate-200 hover:border-teal-300 text-slate-700'
                                                }`}
                                        >
                                            <div className="flex items-start gap-2">
                                                <span className="font-medium text-sm">{doc.id}.</span>
                                                <span className="text-sm text-blue-600 hover:underline flex-1">
                                                    {doc.name}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-200 flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleUploadClick}
                        className="px-6 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors font-medium"
                    >
                        Upload Files
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DocumentUploadModal;
