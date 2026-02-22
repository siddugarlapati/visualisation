import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

const Layout = () => {
    return (
        <div className="min-h-screen bg-white">
            <Navbar />
            {/* Main content with padding for navbar */}
            <main className="pt-16">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
