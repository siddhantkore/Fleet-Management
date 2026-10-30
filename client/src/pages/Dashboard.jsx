import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icons from '../components/Icons/Icons';
import DriverManagement from './DriverManagement';
import PlantManagement from './PlantManagement';
import VehicleManagement from './VehicleManagement';
import TripManagement from './TripManagement';
import RouteAnalysis from './RouteAnalysis';
import FleetIntelligence from './FleetIntelligence';
import Reports from './Reports';
import ResourceAnalysis from './ResourceAnalysis';
import api from '../services/api';
import './Dashboard.css';

const Dashboard = () => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [recCount, setRecCount] = useState(0);

    useEffect(() => {
        const fetchCount = async () => {
            try {
                const res = await api.get('/fleet/recommendations/count');
                setRecCount(res.data.count || 0);
            } catch { /* ignore */ }
        };
        fetchCount();
        const interval = setInterval(fetchCount, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { path: '/dashboard/plants', label: 'Plants', icon: 'building', color: '#8b5cf6' },
        { path: '/dashboard/vehicles', label: 'Vehicles', icon: 'truck', color: '#2563eb' },
        { path: '/dashboard/drivers', label: 'Drivers', icon: 'user', color: '#059669' },
        { path: '/dashboard/trips', label: 'Trips', icon: 'truck', color: '#d97706' },
        { path: '/dashboard/routes', label: 'Route Analysis', icon: 'mappin', color: '#dc2626' },
        {
            path: '/dashboard/fleet-intelligence', label: 'Fleet Intelligence', icon: 'truck', color: '#7c3aed',
            badge: recCount > 0 ? recCount : null,
        },
        { path: '/dashboard/reports', label: 'Reports', icon: 'clipboard', color: '#10b981' },
        { path: '/dashboard/resources', label: 'Resource Analysis', icon: 'user', color: '#6366f1' },
        { path: '/tracking', label: 'Live Tracking', icon: 'mappin', color: '#0891b2' },
    ];

    const renderIcon = (name, color) => {
        const style = { color };
        switch (name) {
            case 'building': return <span style={style}><Icons.Building size={18} /></span>;
            case 'user': return <span style={style}><Icons.User size={18} /></span>;
            case 'truck': return <span style={style}><Icons.Truck size={18} /></span>;
            case 'mappin': return <span style={style}><Icons.MapPin size={18} /></span>;
            case 'clipboard': return <span style={style}><Icons.Clipboard size={18} /></span>;
            default: return <span style={style}><Icons.Truck size={18} /></span>;
        }
    };

    return (
        <div className="dashboard-layout">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <span className="logo-icon"><Icons.Truck size={24} color="#2563eb" /></span>
                    <h3>Fleet Admin</h3>
                </div>
                <nav className="sidebar-nav">
                    {navItems.map(item => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                        >
                            <span className="nav-icon">{renderIcon(item.icon, location.pathname === item.path ? item.color : '#94a3b8')}</span>
                            {item.label}
                            {item.badge && <span className="nav-badge">{item.badge}</span>}
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
                        <Route path="vehicles" element={<VehicleManagement />} />
                        <Route path="drivers" element={<DriverManagement />} />
                        <Route path="trips" element={<TripManagement />} />
                        <Route path="routes" element={<RouteAnalysis />} />
                        <Route path="fleet-intelligence" element={<FleetIntelligence />} />
                        <Route path="reports" element={<Reports />} />
                        <Route path="resources" element={<ResourceAnalysis />} />
                        <Route path="/" element={<div className="welcome-screen">
                            <div className="welcome-icon"><Icons.Truck size={48} /></div>
                            <h1>Welcome back, Admin</h1>
                            <p>Select a category from the sidebar to manage your fleet assets.</p>
                            {recCount > 0 && (
                                <div className="welcome-notification">
                                    <span className="notification-icon"><Icons.Clipboard size={18} /></span>
                                    <span>{recCount} pending fleet repositioning recommendation{recCount > 1 ? 's' : ''}</span>
                                    <Link to="/dashboard/fleet-intelligence" className="notification-link">View</Link>
                                </div>
                            )}
                        </div>} />
                    </Routes>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
