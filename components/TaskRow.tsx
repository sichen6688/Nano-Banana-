import React, { useRef } from 'react';
import { Task } from '../types';
import { TrashIcon, UploadIcon, SparklesIcon, XMarkIcon, DownloadIcon } from './Icons';

interface TaskRowProps {
  task: Task;
  index: number; // Current task index (0-based)
  onUpdatePrompt: (id: string, prompt: string) => void;
  onDelete: (id: string) => void;
  onGenerate: (id: string) => void;
  onAttachImage: (id: string, file: File) => void;
  onRemoveImage: (id: string, imageIndex: number) => void;
  onImageClick: (url: string) => void;
  onDownloadImage: (url: string, filename: string) => void;
}

const TaskRow: React.FC<TaskRowProps> = ({
  task,
  index,
  onUpdatePrompt,
  onDelete,
  onGenerate,
  onAttachImage,
  onRemoveImage,
  onImageClick,
  onDownloadImage
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onAttachImage(task.id, e.target.files[0]);
      e.target.value = '';
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-4 shadow-lg flex flex-col gap-4">
      {/* Input Section */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-stretch">
        <div className="flex-grow w-full relative">
            <div className="flex justify-between items-center mb-1">
                <label className="text-xs text-gray-500">提示词 (任务 {index + 1})</label>
            </div>
            <div className="flex gap-2">
                <textarea
                    value={task.prompt}
                    onChange={(e) => onUpdatePrompt(task.id, e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none text-sm h-24"
                    placeholder="请输入图片描述..."
                />
            </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-2 min-w-[160px] md:max-w-[200px]">
             <label className="text-xs text-gray-500 mb-1 block">参考图 ({task.referenceImages.length})</label>
             {/* Ref Images Container */}
             <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-600">
                {task.referenceImages.map((img, idx) => (
                    <div key={idx} className="relative group w-12 h-12 rounded border border-gray-600 bg-gray-900 flex-shrink-0">
                        <img src={img} alt={`Ref ${idx}`} className="w-full h-full object-cover rounded opacity-80 group-hover:opacity-100" />
                        <button
                            onClick={() => onRemoveImage(task.id, idx)}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity transform scale-75 hover:scale-100"
                            title="移除此参考图"
                        >
                            <XMarkIcon className="w-3 h-3" />
                        </button>
                    </div>
                ))}
                
                {/* Add Button */}
                <div className="relative">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-12 h-12 border-2 border-dashed border-gray-600 hover:border-indigo-500 hover:bg-gray-700/50 rounded flex items-center justify-center transition-colors text-gray-400 hover:text-indigo-400"
                        title="添加参考图"
                    >
                        <UploadIcon className="w-5 h-5" />
                    </button>
                </div>
             </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-row md:flex-col gap-2 justify-between h-auto md:h-24 pt-6 md:pt-0">
            <button
                onClick={() => onGenerate(task.id)}
                disabled={task.status === 'generating' || !task.prompt.trim()}
                className={`flex-1 px-4 py-2 rounded-lg flex items-center justify-center transition-all ${
                    task.status === 'generating'
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                }`}
                title="生成此任务"
            >
                {task.status === 'generating' ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                    <SparklesIcon className="w-5 h-5" />
                )}
            </button>
            
            <button
                onClick={() => onDelete(task.id)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-red-900/50 hover:text-red-200 text-gray-300 rounded-lg flex items-center justify-center transition-all"
                title="删除任务"
            >
                <TrashIcon className="w-5 h-5" />
            </button>
        </div>
      </div>

      {/* Output Section */}
      {task.generatedImages.length > 0 && (
          <div className="mt-2 pt-4 border-t border-gray-700">
              <div className="flex flex-wrap gap-4">
                  {task.generatedImages.map((img, imgIndex) => {
                      // Naming logic: 1.png for first image, 1-1.png for second...
                      const taskNum = index + 1;
                      const filename = imgIndex === 0 
                          ? `${taskNum}.png` 
                          : `${taskNum}-${imgIndex}.png`;

                      return (
                        <div key={img.id} className="relative group w-32 h-32 bg-gray-900 rounded-lg overflow-hidden border border-gray-600">
                            <img 
                                src={img.url} 
                                alt="Result" 
                                className="w-full h-full object-cover cursor-zoom-in"
                                onDoubleClick={() => onImageClick(img.url)}
                            />
                            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => onDownloadImage(img.url, filename)}
                                    className="p-1.5 bg-black/60 hover:bg-indigo-600 text-white rounded-md backdrop-blur-sm"
                                    title={`下载 ${filename}`}
                                >
                                    <DownloadIcon className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                      );
                  })}
              </div>
          </div>
      )}
      
      {task.error && (
          <div className="mt-2 text-xs text-red-400 bg-red-900/20 p-2 rounded">
              错误: {task.error}
          </div>
      )}
    </div>
  );
};

export default TaskRow;