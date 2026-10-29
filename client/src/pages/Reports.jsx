import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Download, Filter, RefreshCw, BarChart2, Truck, Users, MapPin, DollarSign, Activity } from 'lucide-react';
import './Reports.css';

const TABS = [
    { id: 'trips', label: 'Trips Report', icon: <Activity size={18} /> },
    { id: 'vehicles', label: 'Vehicle Utilization', icon: <Truck size={18} /> },
    { id: 'drivers', label: 'Driver Performance', icon: <Users size={18} /> },
    { id: 'plants', label: 'Plant Activity', icon: <MapPin size={18} /> },
    { id: 'costs', label: 'Cost Analysis', icon: <DollarSign size={18} /> }
];

const Reports = () => {
    const [activeTab, setActiveTab] = useState('trips');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [exporting, setExporting] = useState(false);

    // Filters state
    const [filters, setFilters] = useState({
        start_date: '',
        end_date: '',
        status: '',
        vehicle_id: '',
        driver_id: ''
    });

    // Reference data for filters
    const [vehicles, setVehicles] = useState([]);
    const [drivers, setDrivers] = useState([]);

    useEffect(() => {
        fetchReferenceData();
    }, []);

    const fetchReferenceData = async () => {
        try {
            const [vRes, dRes] = await Promise.all([
                api.get('/vehicles'),
                api.get('/drivers')
            ]);
            setVehicles(vRes.data || []);
            setDrivers(dRes.data || []);
        } catch (err) {
            console.error("Error fetching reference data", err);
        }
    };

    const fetchReportData = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = Object.fromEntries(
                Object.entries(filters).filter(([_, v]) => v !== '')
            );

            const response = await api.get(`/reports/${activeTab}`, { params });
            setData(response.data);
        } catch (err) {
            console.error("Error fetching report data", err);
            setError("Failed to load report data. Please try again.");
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let ignore = false;

        const fetchTabReport = async () => {
            setLoading(true);
            setError(null);
            try {
                const params = Object.fromEntries(
                    Object.entries(filters).filter(([_, v]) => v !== '')
                );

                const response = await api.get(`/reports/${activeTab}`, { params });
                if (!ignore) {
                    setData(response.data);
                }
            } catch (err) {
                console.error("Error fetching report data", err);
                if (!ignore) {
                    setError("Failed to load report data. Please try again.");
                    setData(null);
                }
            } finally {
                if (!ignore) {
                    setLoading(false);
                }
            }
        };

        fetchTabReport();

        return () => {
            ignore = true;
        };
    }, [activeTab]);

    const handleTabChange = (tabId) => {
        if (tabId === activeTab) return;
        setData(null);
        setError(null);
        setLoading(true);
        setActiveTab(tabId);
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const applyFilters = () => {
        fetchReportData();
    };

    const clearFilters = () => {
        setFilters({
            start_date: '',
            end_date: '',
            status: '',
            vehicle_id: '',
            driver_id: ''
        });
        setTimeout(fetchReportData, 0);
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const params = Object.fromEntries(
                Object.entries(filters).filter(([_, v]) => v !== '')
            );

            const response = await api.get(`/reports/export/${activeTab}`, {
                params,
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const dateStr = new Date().toISOString().split('T')[0];
            link.setAttribute('download', `${activeTab}_report_${dateStr}.csv`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (err) {
            console.error("Error exporting data", err);
            alert("Failed to export data");
        } finally {
            setExporting(false);
        }
    };

    const renderTripsTab = () => {
        if (!data || !data.records || !data.summary) return null;

        const { summary, records } = data;

        return (
            <>
                <div className="stats-grid">
                    <div className="stat-card">
                        <span className="stat-title">Total Trips</span>
                        <span className="stat-value">{summary.total_trips ?? 0}</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-title">Total Distance (km)</span>
                        <span className="stat-value">{(summary.total_distance_km ?? 0).toFixed(2)}</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-title">Completed Trips</span>
                        <span className="stat-value">{summary.completed_count ?? 0}</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-title">Total Cargo (kg)</span>
                        <span className="stat-value">{(summary.total_cargo_weight_kg ?? 0).toFixed(2)}</span>
                    </div>
                </div>

                <div className="table-container">
                    <table className="reports-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>From</th>
                                <th>To</th>
                                <th>Start Time</th>
                                <th>Distance (km)</th>
                                <th>Cargo</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.map((trip, idx) => (
                                <tr key={trip.id || idx}>
                                    <td>{trip.id}</td>
                                    <td>{trip.from_location}</td>
                                    <td>{trip.to_location}</td>
                                    <td>{trip.start_time ? new Date(trip.start_time).toLocaleString() : 'N/A'}</td>
                                    <td>{trip.distance_km !== null && trip.distance_km !== undefined ? Number(trip.distance_km).toFixed(2) : '0.00'}</td>
                                    <td>{trip.cargo_type || 'General'} ({trip.cargo_weight_kg ?? 0}kg)</td>
                                    <td>
                                        <span className={`status-badge status-${(trip.status || 'planned').toLowerCase().replace('-', '')}`}>
                                            {trip.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {records.length === 0 && (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>No trips found for the given criteria.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </>
        );
    };

    const renderVehiclesTab = () => {
        if (!Array.isArray(data)) return null;

        return (
            <div className="table-container">
                <table className="reports-table">
                    <thead>
                        <tr>
                            <th>Vehicle ID</th>
                            <th>License Plate</th>
                            <th>Type</th>
                            <th>Total Trips</th>
                            <th>Distance (km)</th>
                            <th>Est. Cost</th>
                            <th>Utilization</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((v, idx) => (
                            <tr key={v.vehicle_id || idx}>
                                <td>{v.vehicle_id}</td>
                                <td>{v.license_plate}</td>
                                <td>{v.type}</td>
                                <td>{v.total_trips ?? 0}</td>
                                <td>{v.total_distance_km !== null && v.total_distance_km !== undefined ? Number(v.total_distance_km).toFixed(2) : '0.00'}</td>
                                <td>${(v.total_cost ?? 0).toFixed(2)}</td>
                                <td>{v.utilization_pct ?? 0}%</td>
                                <td>{v.current_status || 'Available'}</td>
                            </tr>
                        ))}
                        {data.length === 0 && (
                            <tr>
                                <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>No vehicle data available.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        );
    };

    const renderDriversTab = () => {
        if (!Array.isArray(data)) return null;

        return (
            <div className="table-container">
                <table className="reports-table">
                    <thead>
                        <tr>
                            <th>Driver ID</th>
                            <th>Name</th>
                            <th>Total Trips</th>
                            <th>Distance (km)</th>
                            <th>Completed</th>
                            <th>On-Time %</th>
                            <th>Rating</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((d, idx) => (
                            <tr key={d.driver_id || idx}>
                                <td>{d.driver_id}</td>
                                <td>{d.name}</td>
                                <td>{d.total_trips ?? 0}</td>
                                <td>{d.total_distance_km !== null && d.total_distance_km !== undefined ? Number(d.total_distance_km).toFixed(2) : '0.00'}</td>
                                <td>{d.completed_trips ?? 0}</td>
                                <td>{d.on_time_percentage !== null && d.on_time_percentage !== undefined ? Number(d.on_time_percentage).toFixed(1) : '0.0'}%</td>
                                <td>{d.rating ?? 5.0} ⭐</td>
                                <td>{d.current_status || 'Available'}</td>
                            </tr>
                        ))}
                        {data.length === 0 && (
                            <tr>
                                <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>No driver data available.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        );
    };

    const renderPlantsTab = () => {
        if (!Array.isArray(data)) return null;

        return (
            <div className="table-container">
                <table className="reports-table">
                    <thead>
                        <tr>
                            <th>Plant ID</th>
                            <th>Name</th>
                            <th>Inbound Trips</th>
                            <th>Outbound Trips</th>
                            <th>Total Cargo (kg)</th>
                            <th>Busiest Route (To)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((p, idx) => (
                            <tr key={p.location_id || idx}>
                                <td>{p.location_id}</td>
                                <td>{p.name}</td>
                                <td>{p.inbound_trips ?? 0}</td>
                                <td>{p.outbound_trips ?? 0}</td>
                                <td>{(p.total_cargo_handled_kg ?? 0).toFixed(2)}</td>
                                <td>{p.busiest_route || 'N/A'}</td>
                            </tr>
                        ))}
                        {data.length === 0 && (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No plant data available.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        );
    };

    const renderCostsTab = () => {
        if (!data || typeof data.total_cost !== 'number') return null;

        return (
            <>
                <div className="stats-grid">
                    <div className="stat-card">
                        <span className="stat-title">Total Cost</span>
                        <span className="stat-value">${(data.total_cost ?? 0).toFixed(2)}</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-title">Avg Cost / Trip</span>
                        <span className="stat-value">${(data.avg_cost_per_trip ?? 0).toFixed(2)}</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-title">Avg Cost / KM</span>
                        <span className="stat-value">${(data.avg_cost_per_km ?? 0).toFixed(2)}</span>
                    </div>
                </div>

                <div className="table-container" style={{ marginBottom: '2rem' }}>
                    <h3 style={{ padding: '1rem', margin: 0, borderBottom: '1px solid #e2e8f0', color: '#1e293b' }}>Cost by Vehicle Type</h3>
                    <table className="reports-table">
                        <thead>
                            <tr>
                                <th>Vehicle Type</th>
                                <th>Total Cost</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(data.cost_by_vehicle_type || {}).map(([type, cost], idx) => (
                                <tr key={idx}>
                                    <td>{type}</td>
                                    <td>${(cost ?? 0).toFixed(2)}</td>
                                </tr>
                            ))}
                            {Object.keys(data.cost_by_vehicle_type || {}).length === 0 && (
                                <tr>
                                    <td colSpan="2" style={{ textAlign: 'center', padding: '1rem' }}>No cost data by vehicle type available.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="table-container">
                    <h3 style={{ padding: '1rem', margin: 0, borderBottom: '1px solid #e2e8f0', color: '#1e293b' }}>Cost by Route</h3>
                    <table className="reports-table">
                        <thead>
                            <tr>
                                <th>From</th>
                                <th>To</th>
                                <th>Trip Count</th>
                                <th>Average Cost</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(data.cost_by_route || []).map((route, idx) => (
                                <tr key={idx}>
                                    <td>{route.from_loc}</td>
                                    <td>{route.to_loc}</td>
                                    <td>{route.trip_count ?? 0}</td>
                                    <td>${(route.avg_cost ?? 0).toFixed(2)}</td>
                                </tr>
                            ))}
                            {(!data.cost_by_route || data.cost_by_route.length === 0) && (
                                <tr>
                                    <td colSpan="4" style={{ textAlign: 'center', padding: '1rem' }}>No route cost data available.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </>
        );
    };

    const renderContent = () => {
        if (loading) {
            return (
                <div className="loading-state">
                    <RefreshCw className="animate-spin" size={32} style={{ marginBottom: '1rem' }} />
                    <p>Generating report...</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="error-state">
                    <p>{error}</p>
                    <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={fetchReportData}>
                        Retry
                    </button>
                </div>
            );
        }

        try {
            switch (activeTab) {
                case 'trips': return renderTripsTab();
                case 'vehicles': return renderVehiclesTab();
                case 'drivers': return renderDriversTab();
                case 'plants': return renderPlantsTab();
                case 'costs': return renderCostsTab();
                default: return null;
            }
        } catch (renderErr) {
            console.error("Render error in Reports tab:", renderErr);
            return (
                <div className="error-state">
                    <p>Error displaying report data. Please try again.</p>
                    <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={fetchReportData}>
                        Retry
                    </button>
                </div>
            );
        }
    };

    return (
        <div className="reports-container">
            <div className="reports-header">
                <h1>Reports & Analytics</h1>
                <button 
                    className="btn btn-export" 
                    onClick={handleExport}
                    disabled={exporting || loading || !data}
                >
                    <Download size={18} />
                    {exporting ? 'Exporting...' : 'Export to CSV'}
                </button>
            </div>

            <div className="reports-tabs">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => handleTabChange(tab.id)}
                    >
                        {tab.icon}
                        <span style={{ marginLeft: '0.5rem' }}>{tab.label}</span>
                    </button>
                ))}
            </div>

            <div className="filter-panel">
                <div className="filter-grid">
                    <div className="filter-group">
                        <label>Start Date</label>
                        <input 
                            type="datetime-local" 
                            className="filter-input"
                            name="start_date"
                            value={filters.start_date}
                            onChange={handleFilterChange}
                        />
                    </div>
                    <div className="filter-group">
                        <label>End Date</label>
                        <input 
                            type="datetime-local" 
                            className="filter-input"
                            name="end_date"
                            value={filters.end_date}
                            onChange={handleFilterChange}
                        />
                    </div>
                    
                    {['trips', 'vehicles', 'costs'].includes(activeTab) && (
                        <div className="filter-group">
                            <label>Vehicle</label>
                            <select 
                                className="filter-input"
                                name="vehicle_id"
                                value={filters.vehicle_id}
                                onChange={handleFilterChange}
                            >
                                <option value="">All Vehicles</option>
                                {vehicles.map(v => (
                                    <option key={v.vehicle_id} value={v.vehicle_id}>
                                        {v.license_plate} ({v.type})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {['trips', 'drivers'].includes(activeTab) && (
                        <div className="filter-group">
                            <label>Driver</label>
                            <select 
                                className="filter-input"
                                name="driver_id"
                                value={filters.driver_id}
                                onChange={handleFilterChange}
                            >
                                <option value="">All Drivers</option>
                                {drivers.map(d => (
                                    <option key={d.driver_id} value={d.driver_id}>
                                        {d.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {activeTab === 'trips' && (
                        <div className="filter-group">
                            <label>Status</label>
                            <select 
                                className="filter-input"
                                name="status"
                                value={filters.status}
                                onChange={handleFilterChange}
                            >
                                <option value="">All Statuses</option>
                                <option value="Planned">Planned</option>
                                <option value="In-Transit">In-Transit</option>
                                <option value="Completed">Completed</option>
                                <option value="Cancelled">Cancelled</option>
                            </select>
                        </div>
                    )}

                    <div className="filter-actions">
                        <button className="btn btn-secondary" onClick={clearFilters}>
                            Clear
                        </button>
                        <button className="btn btn-primary" onClick={applyFilters}>
                            <Filter size={18} />
                            Apply Filters
                        </button>
                    </div>
                </div>
            </div>

            {renderContent()}
            
        </div>
    );
};

export default Reports;
