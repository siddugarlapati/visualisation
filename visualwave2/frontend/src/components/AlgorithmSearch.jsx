import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Command } from 'lucide-react';

/**
 * Algorithm Search Component
 * Provides fuzzy search across all available algorithms
 */
const AlgorithmSearch = ({ algorithms, onSelect, isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredResults, setFilteredResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+K or Cmd+K to open search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (!isOpen) {
          onClose(); // This will toggle open
        }
      }

      if (!isOpen) return;

      // Escape to close
      if (e.key === 'Escape') {
        onClose();
        setSearchTerm('');
      }

      // Arrow navigation
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredResults.length - 1 ? prev + 1 : prev
        );
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
      }

      // Enter to select
      if (e.key === 'Enter' && filteredResults.length > 0) {
        e.preventDefault();
        handleSelect(filteredResults[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredResults, selectedIndex]);

  // Fuzzy search implementation
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredResults([]);
      return;
    }

    const term = searchTerm.toLowerCase();
    const results = algorithms.filter(algo => {
      const name = algo.name.toLowerCase();
      const category = algo.category?.toLowerCase() || '';
      const description = algo.description?.toLowerCase() || '';
      
      // Check if search term matches name, category, or description
      return name.includes(term) || 
             category.includes(term) || 
             description.includes(term) ||
             // Fuzzy match: check if all characters appear in order
             fuzzyMatch(name, term);
    });

    setFilteredResults(results);
    setSelectedIndex(0);
  }, [searchTerm, algorithms]);

  // Simple fuzzy matching
  const fuzzyMatch = (str, pattern) => {
    let patternIdx = 0;
    for (let i = 0; i < str.length && patternIdx < pattern.length; i++) {
      if (str[i] === pattern[patternIdx]) {
        patternIdx++;
      }
    }
    return patternIdx === pattern.length;
  };

  const handleSelect = (algo) => {
    onSelect(algo);
    onClose();
    setSearchTerm('');
  };

  const highlightMatch = (text, term) => {
    if (!term) return text;
    
    const regex = new RegExp(`(${term})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, i) => 
      regex.test(part) ? 
        <mark key={i} className="bg-yellow-500/30 text-yellow-200">{part}</mark> : 
        part
    );
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Search Modal */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 w-full max-w-2xl z-50 px-4">
        <div className="bg-slate-900 border border-white/20 rounded-2xl shadow-2xl overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 p-4 border-b border-white/10">
            <Search className="w-5 h-5 text-white/40" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search algorithms... (Ctrl+K)"
              className="flex-1 bg-transparent text-white placeholder-white/40 focus:outline-none text-lg"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                <X className="w-4 h-4 text-white/60" />
              </button>
            )}
            <div className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded text-xs text-white/40">
              <Command className="w-3 h-3" />
              <span>K</span>
            </div>
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {searchTerm && filteredResults.length === 0 ? (
              <div className="p-8 text-center text-white/40">
                No algorithms found for "{searchTerm}"
              </div>
            ) : searchTerm && filteredResults.length > 0 ? (
              <div className="p-2">
                {filteredResults.map((algo, index) => (
                  <button
                    key={algo.id}
                    onClick={() => handleSelect(algo)}
                    className={`w-full text-left p-3 rounded-lg transition-all ${
                      index === selectedIndex
                        ? 'bg-purple-600/30 border border-purple-500/50'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="font-medium text-white">
                          {highlightMatch(algo.name, searchTerm)}
                        </div>
                        {algo.description && (
                          <div className="text-sm text-white/60 mt-1">
                            {highlightMatch(algo.description, searchTerm)}
                          </div>
                        )}
                      </div>
                      {algo.category && (
                        <span className="px-2 py-1 bg-blue-500/20 border border-blue-500/30 rounded text-xs text-blue-300">
                          {algo.category}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-white/40">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Start typing to search algorithms...</p>
                <p className="text-xs mt-2">Try "sort", "tree", "graph", etc.</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-white/10 bg-white/5">
            <div className="flex items-center justify-between text-xs text-white/40">
              <div className="flex items-center gap-4">
                <span>↑↓ Navigate</span>
                <span>↵ Select</span>
                <span>Esc Close</span>
              </div>
              <span>{filteredResults.length} results</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AlgorithmSearch;
