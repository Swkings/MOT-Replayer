
import React, { useMemo } from 'react';
import { Copy, Terminal } from 'lucide-react';

interface RawDataViewProps {
  data: string;
}

const RawDataView: React.FC<RawDataViewProps> = ({ data }) => {
  const formattedJson = useMemo(() => {
    if (!data) return '';
    try {
      // If it's already a string of JSON, we might want to re-parse and stringify to ensure consistent formatting
      const obj = JSON.parse(data);
      return JSON.stringify(obj, null, 2);
    } catch {
      return data;
    }
  }, [data]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(formattedJson);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-900 overflow-hidden">
      <div className="p-3 border-b border-white/5 bg-slate-800/30 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 tracking-widest">
          <Terminal size={14} className="text-blue-500" />
          JSON Stream Console
        </div>
        <button 
          onClick={copyToClipboard}
          className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-all"
          title="Copy to clipboard"
        >
          <Copy size={14} />
        </button>
      </div>
      
      <div className="flex-1 overflow-auto custom-scrollbar p-4 bg-slate-950/50">
        {!formattedJson ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 italic gap-2">
            <Terminal size={24} strokeWidth={1} />
            <span className="text-[10px] uppercase font-bold tracking-widest">Awaiting Payload...</span>
          </div>
        ) : (
          <pre className="text-[11px] font-mono text-blue-300 leading-relaxed whitespace-pre">
            {formattedJson.split('\n').map((line, i) => {
              // Simple "syntax highlighting" logic
              const isKey = /"(\w+)":/.test(line);
              const isString = /: "(.*)"/.test(line);
              const isNumber = /: (\d+)/.test(line);
              
              return (
                <div key={i} className="group flex hover:bg-blue-500/5 transition-colors">
                  <span className="w-8 inline-block text-slate-700 select-none mr-4 text-right pr-2 border-r border-white/5">{i + 1}</span>
                  <span className={
                    isKey ? 'text-blue-400 font-bold' : 
                    isString ? 'text-green-400' : 
                    isNumber ? 'text-amber-400' : 'text-slate-400'
                  }>
                    {line}
                  </span>
                </div>
              );
            })}
          </pre>
        )}
      </div>
    </div>
  );
};

export default RawDataView;
