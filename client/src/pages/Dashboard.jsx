import React from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icons from '../components/Icons/Icons';
import DriverManagement from './DriverManagement';
import PlantManagement from './PlantManagement';
import TripManagement from './TripManagement';
import './Dashboard.css';

const Dashboard = () => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { path: '/dashboard/plants', label: 'Plants', icon: () => <Icons.Building size={20} color="#1976d2" /> },
        { path: '/dashboard/drivers', label: 'Drivers', icon: () => <Icons.User size={20} color="#1976d2" /> },
        { path: '/dashboard/trips', label: 'Trips', icon: () => <Icons.Truck size={20} color="#1976d2" /> },
        { path: '/tracking', label: 'Live Tracking', icon: () => <Icons.MapPin size={20} color="#1976d2" /> },
    ];

    return (
        <div className="dashboard-layout">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <span className="logo-icon"><Icons.Truck size={28} color="#1976d2" /></span>
                    <h3>Fleet Admin</h3>
                </div>
                <nav className="sidebar-nav">
                    {navItems.map(item => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                        >
                            <span className="nav-icon">{item.icon()}</span>
                            {item.label}
                        </Link>
                    ))}
                </nav>
                <div className="sidebar-footer">
                    <div className="user-info">
                        <div className="user-avatar">{user?.email?.[0].toUpperCase()}</div>
                        <span className="user-email">{user?.email}</span>
                    </div>
                    <button onClick={handleLogout} className="logout-btn">Logout</button>
                </div>
            </aside>
            <main className="dashboard-main">
                <header className="main-header">
                    <h2>{navItems.find(i => i.path === location.pathname)?.label || 'Dashboard'}</h2>
                </header>
                <div className="dashboard-content">
                    <Routes>
                        <Route path="plants" element={<PlantManagement />} />
                        <Route path="drivers" element={<DriverManagement />} />
                        <Route path="trips" element={<TripManagement />} />
                        <Route path="/" element={<div className="welcome-screen">
                            <h1>Welcome back, Admin</h1>
                            <p>Select a category from the sidebar to manage your fleet assets.</p>
                        </div>} />
                    </Routes>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
