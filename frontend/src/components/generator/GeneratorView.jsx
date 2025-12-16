import React, { useState } from 'react';
import { ChevronDown, Upload, FileText, Download, MessageSquare } from 'lucide-react';
import DocumentUploadModal from './DocumentUploadModal';

const GeneratorView = () => {
    const [selectedBRD, setSelectedBRD] = useState('BRD');
    const [projectName, setProjectName] = useState('Enhance the Data Analysis Software ™');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState([]);

    const generatedFiles = [
        { id: 1, name: 'Enhance the Data Analysis Software TC', date: 'Date Created: 15 Nov 2023' },
        { id: 2, name: 'Enhance the Data Analysis Software BRD', date: 'Date Created: 15 Nov 2023' }
    ];

    const handleUpload = (files) => {
        setUploadedFiles(prev => [...prev, ...files]);
    };

    return (
        <div className="flex flex-col h-full gap-6">
            {/* Top Bar */}
            <div className="flex items-center gap-4 shrink-0">
                <div className="relative">
                    <select
                        value={selectedBRD}
                        onChange={(e) => setSelectedBRD(e.target.value)}
                        className="appearance-none bg-white border border-slate-300 rounded-lg px-4 py-2 pr-10 text-slate-700 font-medium cursor-pointer hover:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
                    >
                        <option value="BRD">BRD</option>
                        <option value="TC">TC</option>
                        <option value="Requirements">Requirements</option>
                    </select>
                    <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                <div className="flex-1">
                    <input
                        type="text"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        placeholder="Project Name"
                        className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
                    />
                </div>
            </div>

            {/* Main 3-Column Layout */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
                {/* Source Files */}
                <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col">
                    <h2 className="text-lg font-bold text-slate-800 mb-4">Source Files</h2>

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 mb-4"
                    >
                        <Upload size={18} />
                        Upload Files
                    </button>

                    {uploadedFiles.length > 0 && (
                        <div className="flex-1 overflow-y-auto space-y-2">
                            {uploadedFiles.map((file) => (
                                <div key={file.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                    <FileText size={18} className="text-teal-500" />
                                    <span className="text-sm text-slate-700 flex-1">{file.name}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Generated Files */}
                <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col">
                    <h2 className="text-lg font-bold text-slate-800 mb-4">Generated Files</h2>

                    <div className="flex-1 overflow-y-auto space-y-3">
                        {generatedFiles.map((file) => (
                            <div key={file.id} className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                                <h3 className="font-semibold text-slate-800 text-sm mb-1">{file.name}</h3>
                                <p className="text-xs text-slate-500">{file.date}</p>
                            </div>
                        ))}
                    </div>

                    {/* Click here to add context */}
                    <div className="mt-4 pt-4 border-t border-slate-200">
                        <button className="text-sm text-slate-500 hover:text-teal-600 flex items-center gap-2 transition-colors">
                            <MessageSquare size={16} />
                            Click here to add your context
                        </button>
                    </div>

                    {/* Generate Report Button */}
                    <button className="mt-4 bg-teal-500 hover:bg-teal-600 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                        Generate Report
                    </button>
                </div>

                {/* Preview */}
                <div className="bg-slate-100 rounded-2xl p-6 shadow-sm flex flex-col">
                    <h2 className="text-lg font-bold text-slate-800 mb-4">Preview</h2>

                    <div className="flex-1 bg-white rounded-lg p-6 overflow-y-auto shadow-sm">
                        {/* Invoice Preview */}
                        <div className="max-w-md mx-auto">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h1 className="text-2xl font-bold text-slate-800 mb-2">Invoice</h1>
                                </div>
                                <div className="w-12 h-12 bg-purple-600 rounded"></div>
                            </div>

                            <div className="text-right text-xs text-slate-600 mb-6">
                                <p>Your Company</p>
                                <p>123 Business St</p>
                                <p>Calgary, MD 12345</p>
                                <p>Canada</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-xs mb-6">
                                <div>
                                    <p className="font-semibold text-slate-700 mb-1">Customer Name</p>
                                    <p className="text-slate-600">John Smith</p>
                                    <p className="text-slate-600">Payable City</p>
                                    <p className="text-slate-600">Country</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-slate-700 mb-1">Invoice Date</p>
                                    <p className="text-slate-600">Nov 18, 2025</p>
                                    <p className="text-slate-600">abcxyz</p>
                                    <p className="text-slate-600">Payment Due</p>
                                    <p className="text-slate-600">30 days</p>
                                </div>
                            </div>

                            <div className="border-t border-slate-200 pt-4">
                                <div className="flex justify-between text-xs mb-2">
                                    <span className="font-semibold text-slate-700">Description</span>
                                    <span className="font-semibold text-slate-700">Amount</span>
                                </div>
                                <div className="flex justify-between text-xs py-2">
                                    <span className="text-slate-600">Project Upgrades & Support</span>
                                    <span className="text-slate-600">USD $950.00</span>
                                </div>
                                <div className="border-t border-slate-200 mt-4 pt-3 flex justify-between text-sm font-bold">
                                    <span className="text-slate-800">Total</span>
                                    <span className="text-slate-800">USD $950.00</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 flex gap-2 justify-end">
                        <button className="p-2 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors">
                            <Download size={18} className="text-slate-600" />
                        </button>
                        <button className="p-2 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors">
                            <MessageSquare size={18} className="text-slate-600" />
                        </button>
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
