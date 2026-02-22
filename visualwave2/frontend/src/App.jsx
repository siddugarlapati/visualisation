import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import LeetCodeVisualiser from './pages/LeetCodeVisualiser';
import DSAVisualiser from './pages/DSAVisualiser';
import MLVisualiser from './pages/MLVisualiser';
import NLPVisualiser from './pages/NLPVisualiser';
import TechStacksVisualiser from './pages/TechStacksVisualiser';
import ArchitectureBuilder from './pages/ArchitectureBuilder';
import ConceptVisualiser from './pages/ConceptVisualiser';

const App = () => {
    return (
        <Router>
            <Navbar />
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/leetcode-visualiser" element={<LeetCodeVisualiser />} />
                <Route path="/dsa-visualiser" element={<DSAVisualiser />} />
                <Route path="/ml-visualiser" element={<MLVisualiser />} />
                <Route path="/nlp-visualiser" element={<NLPVisualiser />} />
                <Route path="/tech-stacks" element={<TechStacksVisualiser />} />
                <Route path="/architecture-builder" element={<ArchitectureBuilder />} />
                <Route path="/concept-visualiser" element={<ConceptVisualiser />} />
            </Routes>
        </Router>
    );
};

export default App;


