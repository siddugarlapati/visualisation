import React, { useState } from 'react';
import { List, Plus, X, Play } from 'lucide-react';

/**
 * Batch Input Component
 * Allows users to input and process multiple sentences at once
 */
const BatchInput = ({ onBatchProcess, isVisible }) => {
  const [batchItems, setBatchItems] = useState(['']);
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isVisible) return null;

  // Add new input field
  const addItem = () => {
    setBatchItems([...batchItems, '']);
  };

  // Remove input field
  const removeItem = (index) => {
    if (batchItems.length === 1) return;
    const updated = batchItems.filter((_, i) => i !== index);
    setBatchItems(updated);
  };

  // Update item text
  const updateItem = (index, value) => {
    const updated = [...batchItems];
    updated[index] = value;
    setBatchItems(updated);
  };

  // Process batch
  const processBatch = () => {
    const validItems = batchItems.filter(item => item.trim().length > 0);
    if (validItems.length === 0) {
      alert('Please enter at least one sentence');
      return;
    }
    onBatchProcess(validItems);
  };

  return (
    <div className="space-y-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full py-2 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/80 text-sm flex items-center justify-between transition-all"
      >
        <div className="flex items-center gap-2">
          <List className="w-4 h-4" />
          <span>Batch Input ({batchItems.length})</span>
        </div>
        <span className="text-xs">{isExpanded ? '▼' : '▶'}</span>
      </button>

      {isExpanded && (
        <div className="p-3 bg-black/20 rounded-lg space-y-3">
          <p className="text-xs text-white/60">
            Add multiple sentences to process them sequentially
          </p>

          {/* Batch Items */}
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {batchItems.map((item, index) => (
              <div key={index} className="flex gap-2">
                <div className="flex-shrink-0 w-6 h-8 flex items-center justify-center text-xs text-white/40 font-medium">
                  {index + 1}
                </div>
                <textarea
                  value={item}
                  onChange={(e) => updateItem(index, e.target.value)}
                  placeholder={`Sentence ${index + 1}...`}
                  rows={2}
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/40 focus:outline-none focus:border-purple-500 resize-none"
                />
                {batchItems.length > 1 && (
                  <button
                    onClick={() => removeItem(index)}
                    className="flex-shrink-0 w-8 h-8 flex items-center justify-center hover:bg-red-500/20 rounded text-red-400 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={addItem}
              className="flex-1 py-2 px-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-blue-300 text-sm flex items-center justify-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Sentence
            </button>
            <button
              onClick={processBatch}
              className="flex-1 py-2 px-3 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-lg text-green-300 text-sm flex items-center justify-center gap-2 transition-all"
            >
              <Play className="w-4 h-4" />
              Process All
            </button>
          </div>

          <div className="text-xs text-white/40 bg-white/5 rounded-lg p-2">
            💡 Tip: Each sentence will be visualized one after another
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchInput;
