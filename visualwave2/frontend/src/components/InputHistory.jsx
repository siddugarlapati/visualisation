import React, { useState, useEffect } from 'react';
import { History, Clock, Copy, Trash2, Search } from 'lucide-react';

/**
 * Input History Tracker
 * Tracks and allows reuse of previous inputs
 */
const InputHistory = ({ onSelectHistory, currentText }) => {
  const [history, setHistory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('nlp_input_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load history:', e);
      }
    }
  }, []);

  // Save to history when currentText changes (debounced)
  useEffect(() => {
    if (!currentText || currentText.trim().length < 3) return;

    const timer = setTimeout(() => {
      const newEntry = {
        id: Date.now().toString(),
        text: currentText,
        timestamp: new Date().toISOString()
      };

      // Avoid duplicates
      const exists = history.some(h => h.text === currentText);
      if (!exists) {
        const updated = [newEntry, ...history].slice(0, 50); // Keep last 50
        setHistory(updated);
        localStorage.setItem('nlp_input_history', JSON.stringify(updated));
      }
    }, 2000); // Save after 2 seconds of no changes

    return () => clearTimeout(timer);
  }, [currentText]);

  // Filter history by search term
  const filteredHistory = history.filter(item =>
    item.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Clear all history
  const clearHistory = () => {
    if (confirm('Clear all input history?')) {
      setHistory([]);
      localStorage.removeItem('nlp_input_history');
    }
  };

  // Delete single entry
  const deleteEntry = (id) => {
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    localStorage.setItem('nlp_input_history', JSON.stringify(updated));
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (history.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full py-2 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/80 text-sm flex items-center justify-between transition-all"
      >
        <div className="flex items-center gap-2">
          <History className="w-4 h-4" />
          <span>Input History ({history.length})</span>
        </div>
        <span className="text-xs">{isExpanded ? '▼' : '▶'}</span>
      </button>

      {isExpanded && (
        <div className="p-3 bg-black/20 rounded-lg space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search history..."
              className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* History List */}
          <div className="max-h-60 overflow-y-auto space-y-2">
            {filteredHistory.length === 0 ? (
              <p className="text-xs text-white/40 text-center py-4">
                {searchTerm ? 'No matching history' : 'No history yet'}
              </p>
            ) : (
              filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className="group p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all"
                >
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => onSelectHistory(item.text)}
                      className="flex-1 text-left"
                    >
                      <p className="text-sm text-white/80 line-clamp-2 group-hover:text-white">
                        {item.text}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3 text-white/30" />
                        <span className="text-xs text-white/40">
                          {formatTime(item.timestamp)}
                        </span>
                      </div>
                    </button>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(item.text);
                        }}
                        className="p-1 hover:bg-blue-500/20 rounded text-blue-400"
                        title="Copy"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => deleteEntry(item.id)}
                        className="p-1 hover:bg-red-500/20 rounded text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Clear All */}
          {history.length > 0 && (
            <button
              onClick={clearHistory}
              className="w-full py-2 px-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-xs flex items-center justify-center gap-2 transition-all"
            >
              <Trash2 className="w-3 h-3" />
              Clear All History
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default InputHistory;
