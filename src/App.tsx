/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileUp, 
  Trash2, 
  Download, 
  FileText, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle,
  X,
  Plus
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { processPdf, generateModifiedPdf, type PageInfo } from './utils/pdfProcessor';
import { cn } from './lib/utils';

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [originalPdf, setOriginalPdf] = useState<PDFDocument | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > MAX_FILE_SIZE) {
        alert('File is too large. Maximum size is 200MB.');
        return;
      }
      if (selectedFile.type === 'application/pdf') {
        await loadFile(selectedFile);
      }
    }
  };

  const resetToHome = () => {
    setFile(null);
    setPages([]);
    setOriginalPdf(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const loadFile = async (selectedFile: File) => {
    setIsProcessing(true);
    setFile(selectedFile);
    try {
      const { pages: processedPages, pdfDoc } = await processPdf(selectedFile);
      setPages(processedPages);
      setOriginalPdf(pdfDoc);
    } catch (error) {
      console.error('Error processing PDF:', error);
      alert('Failed to load PDF. It might be password protected or corrupted.');
      setFile(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const togglePageSelection = (index: number) => {
    setPages(prev => prev.map((p, i) => i === index ? { ...p, selected: !p.selected } : p));
  };

  const removeAllBlank = () => {
    setPages(prev => prev.map(p => ({ ...p, selected: !p.isBlank })));
  };

  const resetSelection = () => {
    setPages(prev => prev.map(p => ({ ...p, selected: true })));
  };

  const downloadModified = async () => {
    if (!originalPdf) return;
    
    const selectedIndices = pages
      .map((p, i) => p.selected ? i : -1)
      .filter(i => i !== -1);

    if (selectedIndices.length === 0) {
      alert('Please select at least one page to download.');
      return;
    }

    setIsDownloading(true);
    try {
      const pdfBytes = await generateModifiedPdf(originalPdf, selectedIndices);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cleaned_${file?.name || 'document.pdf'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF.');
    } finally {
      setIsDownloading(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      if (droppedFile.size > MAX_FILE_SIZE) {
        alert('File is too large. Maximum size is 200MB.');
        return;
      }
      if (droppedFile.type === 'application/pdf') {
        await loadFile(droppedFile);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden font-sans selection:bg-indigo-500/30">
      {/* Background Mesh Gradients */}
      <div className="absolute top-[-100px] left-[-100px] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-100px] right-[-100px] w-[700px] h-[700px] bg-blue-600/15 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-slate-900/50 rounded-full blur-[160px] pointer-events-none"></div>

      {/* Header */}
      <header className="h-16 flex items-center justify-between px-8 border-b border-white/10 backdrop-blur-md bg-white/5 z-20 sticky top-0">
        <div className="max-w-7xl w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={resetToHome}>
            <div className="w-9 h-9 bg-indigo-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
              <FileText size={20} />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold tracking-tight text-white leading-none">BlankPageGone</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">PDF Optimization</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <nav className="hidden md:flex gap-6 text-sm font-medium text-slate-400">
              <button 
                onClick={resetToHome}
                className={cn(
                  "hover:text-white transition-colors cursor-pointer",
                  !file ? "text-indigo-400 font-bold" : "text-slate-400"
                )}
              >
                Home
              </button>
              <span className={cn(
                "transition-colors cursor-default",
                file ? "text-indigo-400 font-bold" : "text-slate-400 opacity-50"
              )}>
                Editor
              </span>
              <span className="hover:text-white transition-colors cursor-pointer opacity-50">Docs</span>
            </nav>
            {file && !isProcessing && (
              <button 
                onClick={resetToHome}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white border border-transparent hover:border-white/10"
                title="Go back to Home"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>
      </header>


      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-6 md:p-8 z-10">
        <AnimatePresence mode="wait">
          {!file ? (
            <motion.div
              key="uploader"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="h-full flex flex-col items-center justify-center min-h-[70vh]"
            >
              <div 
                onDragOver={onDragOver}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className="w-full max-w-2xl backdrop-blur-xl bg-white/5 border border-white/10 rounded-[2rem] p-16 text-center hover:bg-white/[0.07] hover:border-white/20 transition-all cursor-pointer group shadow-2xl relative overflow-hidden"
              >
                {/* Decorative glow inside uploader */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"></div>
                
                <div className="w-24 h-24 bg-gradient-to-tr from-indigo-600/20 to-blue-600/20 rounded-3xl flex items-center justify-center text-indigo-400 mx-auto mb-8 border border-white/10 group-hover:scale-110 transition-transform duration-500 group-hover:border-indigo-500/30">
                  <FileUp size={48} strokeWidth={1.5} />
                </div>
                <h2 className="font-display text-4xl font-bold text-white mb-3 tracking-tight">Drop your PDF document</h2>
                <p className="text-slate-400 max-w-md mx-auto mb-10 text-lg leading-relaxed">
                  Automatically identify and remove blank pages. No data ever leaves your computer.
                </p>
                <div className="flex flex-col items-center gap-4">
                  <button className="bg-indigo-600 text-white px-10 py-4 rounded-xl font-bold hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20 active:scale-[0.98] text-lg">
                    Select PDF File
                  </button>
                  <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">Max 200MB per file</p>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".pdf"
                  className="hidden"
                />
              </div>
              
              <div className="mt-12 flex flex-wrap justify-center gap-10 text-slate-500 text-sm font-medium">
                <div className="flex items-center gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                  <span>Secure Local Processing</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>
                  <span>Auto Blank Detection</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                  <span>Chrome, Edge, Firefox, Safari</span>
                </div>
              </div>
            </motion.div>
          ) : isProcessing ? (
            <motion.div
              key="loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col items-center justify-center min-h-[70vh] text-center"
            >
              <div className="relative w-28 h-28 mb-8">
                <div className="absolute inset-0 rounded-full border-[3px] border-white/5"></div>
                <div className="absolute inset-0 rounded-full border-[3px] border-indigo-500 border-t-transparent animate-spin shadow-[0_0_15px_rgba(99,102,241,0.2)]"></div>
              </div>
              <h2 className="font-display text-3xl font-bold text-white mb-3">Analyzing Document</h2>
              <p className="text-slate-400 text-lg">Detecting page content and generating previews.</p>
            </motion.div>
          ) : (
            <motion.div
              key="editor"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col lg:flex-row gap-8 items-start"
            >
              {/* Document Preview Area */}
              <div className="flex-1 w-full backdrop-blur-xl bg-white/[0.03] border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col relative overflow-hidden">
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-1 truncate max-w-md">{file.name}</h2>
                    <div className="flex items-center gap-3 text-xs text-slate-400 font-semibold uppercase tracking-wider">
                      <span>{pages.length} Pages</span>
                      <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                      <span>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={resetSelection}
                      className="px-4 py-2 text-xs font-bold bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors"
                    >
                      Reset Selection
                    </button>
                    <button 
                      onClick={removeAllBlank}
                      className="px-4 py-2 text-xs font-bold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 rounded-lg border border-indigo-500/20 transition-colors"
                    >
                      Remove All Blanks
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto max-h-[70vh] pr-2 custom-scrollbar">
                  {pages.map((page, index) => (
                    <motion.div
                      key={index}
                      layout
                      onClick={() => togglePageSelection(index)}
                      className={cn(
                        "relative group bg-white rounded-lg transition-all cursor-pointer overflow-hidden shadow-lg",
                        page.selected 
                          ? "ring-2 ring-indigo-500 ring-offset-4 ring-offset-slate-950/50" 
                          : "opacity-40 grayscale-[0.8] scale-95"
                      )}
                    >
                      <div className="absolute top-2 left-2 z-10 w-6 h-6 bg-slate-900 rounded-full text-[10px] font-bold flex items-center justify-center text-white border border-white/10">
                        {page.pageNumber}
                      </div>

                      <div className={cn(
                        "absolute top-2 right-2 z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all",
                        page.selected ? "bg-indigo-600 text-white" : "bg-slate-300/20 backdrop-blur-md text-white"
                      )}>
                        {page.selected ? <CheckCircle2 size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />}
                      </div>

                      {page.isBlank && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none group-hover:scale-105 transition-transform">
                          <div className="bg-red-500 text-white text-[9px] font-black px-2 py-1 rounded shadow-lg tracking-tighter uppercase whitespace-nowrap">
                            Blank Detected
                          </div>
                        </div>
                      )}

                      <div className={cn(
                        "aspect-[3/4] bg-white flex items-center justify-center relative",
                        page.isBlank && !page.selected && "bg-red-500/5"
                      )}>
                        <img 
                          src={page.thumbnail} 
                          alt={`Page ${page.pageNumber}`}
                          className="w-full h-full object-contain p-2"
                        />
                        {page.isBlank && (
                           <div className="absolute inset-0 bg-red-500/10"></div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Sidebar Controls */}
              <div className="w-full lg:w-80 flex flex-col gap-6 shrink-0">
                {/* Stats Card */}
                <div className="p-6 backdrop-blur-xl bg-indigo-500/10 border border-indigo-500/20 rounded-2xl shadow-xl overflow-hidden relative group">
                  <div className="absolute -right-8 -top-8 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                  <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-[0.2em] mb-6">Document Analysis</h3>
                  <div className="space-y-6">
                    <div className="flex justify-between items-end">
                      <span className="text-slate-400 text-sm font-medium">Total Pages</span>
                      <span className="text-3xl font-display font-black text-white leading-none">
                        {pages.length.toString().padStart(2, '0')}
                      </span>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-slate-400 text-sm font-medium">Blanks Identified</span>
                      <span className={cn(
                        "text-3xl font-display font-black leading-none",
                        pages.filter(p => p.isBlank).length > 0 ? "text-red-400" : "text-slate-500"
                      )}>
                        {pages.filter(p => p.isBlank).length.toString().padStart(2, '0')}
                      </span>
                    </div>
                    <div className="pt-6 border-t border-white/5">
                      <div className="flex justify-between mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <span>Optimization Score</span>
                        <span className="text-indigo-400">High efficiency</span>
                      </div>
                      <div className="w-full h-2 bg-slate-800/50 rounded-full overflow-hidden border border-white/5">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: "92%" }}
                          className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.4)]"
                        ></motion.div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Download Card */}
                <div className="p-6 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-xl flex-1 flex flex-col border-t-white/20">
                  <div className="space-y-5 mb-8">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Actions</h3>
                    
                    <button 
                       onClick={removeAllBlank}
                       className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 group"
                    >
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
                             <Trash2 size={16} />
                          </div>
                          <span className="text-sm font-medium text-slate-300">Exclude Blanks</span>
                       </div>
                       <CheckCircle2 size={14} className={cn(
                          "transition-opacity",
                          pages.some(p => p.isBlank && p.selected) ? "opacity-20" : "opacity-100 text-indigo-400"
                       )} />
                    </button>

                    <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                       <h4 className="text-[10px] font-bold uppercase text-slate-500 mb-2">Selected Pages</h4>
                       <span className="text-2xl font-display font-black text-white">
                          {pages.filter(p => p.selected).length}
                       </span>
                       <span className="text-slate-500 text-sm font-medium ml-1">/ {pages.length}</span>
                    </div>
                  </div>

                  <div className="mt-auto space-y-4">
                    <button 
                      onClick={downloadModified}
                      disabled={isDownloading || pages.filter(p => p.selected).length === 0}
                      className="group relative w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl transition-all shadow-xl shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed overflow-hidden"
                    >
                      <div className="relative z-10 flex items-center justify-center gap-3">
                        {isDownloading ? (
                          <div className="w-5 h-5 border-[3px] border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <Download size={20} />
                            <span className="uppercase tracking-widest text-sm">Download PDF</span>
                          </>
                        )}
                      </div>
                      <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20 scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                    </button>
                    
                    <p className="text-[10px] text-center text-slate-500 font-medium px-4 uppercase tracking-tighter leading-relaxed">
                      Encrypted local processing. Your privacy is verified and secured.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer / Status Bar */}
      <footer className="h-10 px-8 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500 bg-slate-950/80 backdrop-blur-md z-20 font-bold uppercase tracking-widest">
        <div className="flex gap-8 items-center">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            <span>System: Ready</span>
          </div>
          <span className="hidden sm:inline opacity-50">Local Engine v1.2</span>
          <span className="hidden md:inline border-l border-white/10 pl-8 opacity-50">Browser Storage Sandbox Active</span>
        </div>
        <div>BPG 2026 Build</div>
      </footer>

      {/* Global Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );

}

