import React, { useState, useRef } from 'react';
import JSZip from 'jszip';
import FileSaver from 'file-saver';
import { generateImageWithGemini } from './services/geminiService';
import { AspectRatio, Task, GeneratedImage } from './types';
import { SparklesIcon, DocumentTextIcon, UploadIcon, FolderOpenIcon, TrashIcon, DownloadIcon, PuzzlePieceIcon, XCircleIcon } from './components/Icons';
import TaskRow from './components/TaskRow';
import ImageViewer from './components/ImageViewer';

interface RefImage {
  id: string;
  name: string; // filename without extension
  data: string; // base64
}

const App = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [refImages, setRefImages] = useState<RefImage[]>([]);
  // Change default to 9:16 as requested
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.PORTRAIT_9_16);
  const [globalCount, setGlobalCount] = useState(1);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);

  const txtInputRef = useRef<HTMLInputElement>(null);
  const bulkImgInputRef = useRef<HTMLInputElement>(null);

  const generateId = () => Math.random().toString(36).substring(2, 9);

  // --- Helper: Match Images to Tasks ---

  const autoMatchImages = (currentTasks: Task[], currentRefImages: RefImage[]): Task[] => {
    if (currentRefImages.length === 0) return currentTasks;

    return currentTasks.map(task => {
      const promptLower = task.prompt.toLowerCase();
      
      const matches = currentRefImages.filter(img => 
        promptLower.includes(img.name.toLowerCase())
      );
      
      if (matches.length > 0) {
        const matchedData = matches.map(m => m.data);
        const combined = Array.from(new Set([...task.referenceImages, ...matchedData]));
        
        return { ...task, referenceImages: combined };
      }
      return task;
    });
  };

  // --- Handlers ---

  const handleAddTask = () => {
    setTasks(prev => [
      ...prev,
      {
        id: generateId(),
        prompt: '',
        status: 'idle',
        referenceImages: [],
        generatedImages: []
      }
    ]);
  };

  const handleImportTxt = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        let newTasks: Task[] = lines.map(line => ({
          id: generateId(),
          prompt: line,
          status: 'idle',
          referenceImages: [],
          generatedImages: []
        }));
        
        newTasks = autoMatchImages(newTasks, refImages);
        
        setTasks(prev => [...prev, ...newTasks]);
      }
    };
    reader.readAsText(file);
    if (txtInputRef.current) txtInputRef.current.value = '';
  };

  const handleBulkImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files) as File[];
    
    const readers = fileArray.map(file => {
      return new Promise<RefImage>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const name = file.name.replace(/\.[^/.]+$/, ""); 
          resolve({ 
            id: generateId(), 
            name, 
            data: ev.target?.result as string 
          });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then(newRefs => {
      const updatedRefImages = [...refImages, ...newRefs];
      setRefImages(updatedRefImages);
      setTasks(prevTasks => autoMatchImages(prevTasks, newRefs));
    });
    
    if (bulkImgInputRef.current) bulkImgInputRef.current.value = '';
  };

  const handleDeleteRefImage = (id: string) => {
    setRefImages(prev => prev.filter(img => img.id !== id));
  };

  const handleAttachImageToTask = (taskId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, referenceImages: [...t.referenceImages, result] } : t
      ));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImageFromTask = (taskId: string, indexToRemove: number) => {
    setTasks(prev => prev.map(t => {
        if (t.id !== taskId) return t;
        const newImages = [...t.referenceImages];
        newImages.splice(indexToRemove, 1);
        return { ...t, referenceImages: newImages };
    }));
  };

  const handleUpdatePrompt = (taskId: string, prompt: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, prompt } : t));
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const handleClearAll = () => {
    if (isConfirmingClear) {
        setTasks([]);
        setRefImages([]);
        if (txtInputRef.current) txtInputRef.current.value = '';
        if (bulkImgInputRef.current) bulkImgInputRef.current.value = '';
        setIsConfirmingClear(false);
    } else {
        setIsConfirmingClear(true);
        setTimeout(() => setIsConfirmingClear(false), 3000);
    }
  };

  // --- Generation Logic ---

  const generateSingleTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.prompt.trim()) return;

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'generating', error: undefined } : t));

    try {
      const newImages: GeneratedImage[] = [];
      for (let i = 0; i < globalCount; i++) {
        const url = await generateImageWithGemini(task.prompt, aspectRatio, task.referenceImages);
        newImages.push({
          id: generateId(),
          url,
          prompt: task.prompt,
          aspectRatio,
          timestamp: Date.now()
        });
      }

      setTasks(prev => prev.map(t => 
        t.id === taskId ? { 
          ...t, 
          status: 'success', 
          generatedImages: [...t.generatedImages, ...newImages] 
        } : t
      ));

    } catch (err: any) {
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, status: 'error', error: err.message || "失败" } : t
      ));
    }
  };

  const handleGenerateAll = async () => {
    setIsProcessingBatch(true);
    const tasksToProcess = tasks.filter(t => t.status !== 'generating' && t.prompt.trim());

    const CONCURRENCY = 2;
    for (let i = 0; i < tasksToProcess.length; i += CONCURRENCY) {
        const chunk = tasksToProcess.slice(i, i + CONCURRENCY);
        await Promise.all(chunk.map(t => generateSingleTask(t.id)));
    }
    
    setIsProcessingBatch(false);
  };

  // --- Download Logic ---

  const handleDownloadSingle = (url: string, filename: string) => {
    FileSaver.saveAs(url, filename);
  };

  const handleDownloadBatch = async () => {
    const zip = new JSZip();
    let hasFiles = false;

    // Naming logic: 1.png, 1-1.png, 1-2.png, 2.png, 2-1.png...
    tasks.forEach((task, tIndex) => {
        const taskNum = tIndex + 1;
        task.generatedImages.forEach((img, imgIndex) => {
            const data = img.url.split(',')[1];
            // If it's the first image of the task, name it "1.png"
            // If it's the second image of the task, name it "1-1.png"
            const filename = imgIndex === 0 
                ? `${taskNum}.png` 
                : `${taskNum}-${imgIndex}.png`;
            
            zip.file(filename, data, { base64: true });
            hasFiles = true;
        });
    });

    if (!hasFiles) {
        alert("没有可下载的图片。");
        return;
    }

    const content = await zip.generateAsync({ type: "blob" });
    FileSaver.saveAs(content, "gemini_batch_output.zip");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 text-gray-100 font-sans selection:bg-indigo-500 selection:text-white pb-20">
      
      {/* Header */}
      <header className="fixed top-0 w-full z-40 bg-gray-900/80 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/20">
              <SparklesIcon className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              Gemini 批量生图
            </h1>
          </div>
          <div className="hidden md:flex items-center gap-4 text-sm text-gray-400">
            <span>模型: gemini-2.5-flash-image</span>
          </div>
        </div>
      </header>

      <main className="pt-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        
        {/* Global Controls Panel */}
        <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-6 mb-8 shadow-xl backdrop-blur-sm sticky top-20 z-30">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
             
             {/* Import Tools */}
             <div className="space-y-3">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">导入数据</label>
                <div className="flex gap-2">
                    <input type="file" ref={txtInputRef} onChange={handleImportTxt} accept=".txt" className="hidden" />
                    <button onClick={() => txtInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 px-3 py-2.5 rounded-lg text-sm transition-colors border border-gray-600">
                        <DocumentTextIcon className="w-4 h-4" /> 导入 txt
                    </button>
                    
                    <input type="file" ref={bulkImgInputRef} onChange={handleBulkImageUpload} accept="image/*" multiple className="hidden" />
                    <button 
                        onClick={() => bulkImgInputRef.current?.click()} 
                        className="flex-1 flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 px-3 py-2.5 rounded-lg text-sm transition-colors border border-gray-600"
                        title="上传图片，将自动根据提示词中的文件名匹配参考图"
                    >
                        {/* Changed text to '参考图' as requested */}
                        <FolderOpenIcon className="w-4 h-4" /> 参考图
                    </button>
                </div>
             </div>

             {/* Configs */}
             <div className="space-y-3">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">参数设置</label>
                <div className="flex gap-2">
                    <select
                        value={aspectRatio}
                        onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                        className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                        <option value={AspectRatio.SQUARE}>1:1 方形</option>
                        <option value={AspectRatio.PORTRAIT_3_4}>3:4 竖屏</option>
                        <option value={AspectRatio.LANDSCAPE_4_3}>4:3 横屏</option>
                        <option value={AspectRatio.PORTRAIT_9_16}>9:16 全屏</option>
                        <option value={AspectRatio.LANDSCAPE_16_9}>16:9 宽屏</option>
                    </select>
                    <div className="flex items-center gap-2 bg-gray-900 border border-gray-600 rounded-lg px-3 w-24">
                        <span className="text-xs text-gray-400">数量</span>
                        <input 
                            type="number" 
                            min="1" 
                            max="4" 
                            value={globalCount}
                            onChange={(e) => setGlobalCount(parseInt(e.target.value))}
                            className="w-full bg-transparent outline-none text-center text-sm"
                        />
                    </div>
                </div>
             </div>

             {/* Batch Actions */}
             <div className="space-y-3 lg:col-span-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">批量操作</label>
                <div className="flex gap-2">
                    <button 
                        onClick={handleAddTask}
                        className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm border border-gray-600 transition-colors"
                    >
                        + 添加任务
                    </button>
                    
                    <button 
                        onClick={handleGenerateAll}
                        disabled={isProcessingBatch || tasks.length === 0}
                        className={`flex-1 flex items-center justify-center gap-2 rounded-lg font-semibold text-sm transition-all shadow-lg
                            ${isProcessingBatch || tasks.length === 0 
                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'}`}
                    >
                        {isProcessingBatch ? (
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                处理中...
                            </div>
                        ) : (
                            <>
                            <SparklesIcon className="w-4 h-4" /> 批量生成
                            </>
                        )}
                    </button>

                    <button 
                        onClick={handleDownloadBatch}
                        disabled={tasks.every(t => t.generatedImages.length === 0)}
                        className="px-4 py-2.5 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-sm border border-transparent transition-colors shadow-lg shadow-green-900/20"
                        title="下载全部结果 (Zip)"
                    >
                        <DownloadIcon className="w-5 h-5" />
                    </button>

                    <button 
                        onClick={handleClearAll}
                        className={`px-4 py-2.5 text-sm rounded-lg border transition-all duration-200 flex items-center gap-2 min-w-[50px] justify-center
                          ${isConfirmingClear 
                            ? 'bg-red-600 border-red-500 text-white animate-pulse' 
                            : 'bg-red-900/40 border-red-900/50 text-red-200 hover:bg-red-900/60'}`}
                        title="清空所有任务和参考图库"
                    >
                        {isConfirmingClear ? '确认?' : <TrashIcon className="w-5 h-5" />}
                    </button>
                </div>
             </div>
          </div>
        </div>

        {/* Reference Gallery */}
        {refImages.length > 0 && (
          <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
             <div className="flex items-center gap-2 mb-3 text-gray-400">
                <PuzzlePieceIcon className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-semibold uppercase tracking-wider">已上传的参考图库 ({refImages.length})</h3>
             </div>
             <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                {refImages.map((ref) => (
                  <div key={ref.id} className="relative group shrink-0 w-24 flex flex-col items-center">
                     <div className="w-24 h-24 rounded-lg overflow-hidden border border-gray-600 bg-gray-800 relative">
                        <img src={ref.data} alt={ref.name} className="w-full h-full object-cover" />
                        <button 
                           onClick={() => handleDeleteRefImage(ref.id)}
                           className="absolute top-1 right-1 text-red-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-full"
                           title="从库中删除"
                        >
                           <XCircleIcon className="w-5 h-5" />
                        </button>
                     </div>
                     <span className="text-[10px] text-gray-400 mt-1 truncate w-full text-center" title={ref.name}>
                        {ref.name}
                     </span>
                  </div>
                ))}
             </div>
          </div>
        )}

        {/* Task List */}
        <div className="space-y-4">
            {tasks.length === 0 ? (
                <div className="text-center py-20 bg-gray-800/30 rounded-2xl border-2 border-dashed border-gray-700">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-800 mb-4">
                    <DocumentTextIcon className="w-8 h-8 text-gray-600" />
                  </div>
                  <h3 className="text-xl font-medium text-gray-300 mb-2">暂无任务</h3>
                  <p className="text-gray-500 max-w-sm mx-auto">
                    请导入 .txt 文件（每行一个提示词）或手动添加任务以开始批量生成。<br/>
                    提示词中包含文件名（如 "girl"）即可自动匹配已上传的参考图。
                  </p>
                </div>
            ) : (
                tasks.map((task, index) => (
                    <TaskRow 
                        key={task.id} 
                        task={task} 
                        index={index} // Pass index for naming logic
                        onUpdatePrompt={handleUpdatePrompt}
                        onDelete={handleDeleteTask}
                        onGenerate={generateSingleTask}
                        onAttachImage={handleAttachImageToTask}
                        onRemoveImage={handleRemoveImageFromTask}
                        onImageClick={setViewingImage}
                        onDownloadImage={handleDownloadSingle}
                    />
                ))
            )}
        </div>
      </main>

      {/* Image Modal */}
      <ImageViewer url={viewingImage} onClose={() => setViewingImage(null)} />
    </div>
  );
};

export default App;