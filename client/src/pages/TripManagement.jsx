import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import './TripManagement.css';

const TripManagement = () => {
    const [trips, setTrips] = useState([]);
    const [plants, setPlants] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        from_loc: '',
        to_loc: '',
        start_time: '',
        cargo_weight: 0,
        optimize: true
    });
    const [optimizationResult, setOptimizationResult] = useState(null);

    useEffect(() => {
        fetchTrips();
        fetchPlants();
    }, []);

    const fetchTrips = async () => {
        try {
            const response = await api.get('/trips');
            setTrips(response.data);
        } catch (error) {
            console.error('Error fetching trips:', error);
        }
    };

    const fetchPlants = async () => {
        try {
            const response = await api.get('/locations');
            setPlants(response.data);
        } catch (error) {
            console.error('Error fetching locations:', error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleScheduleTrip = async (e) => {
        e.preventDefault();
        setLoading(true);
        setOptimizationResult(null);
        try {
            const response = await api.post('/trips/schedule', {
                ...formData,
                start_time: new Date(formData.start_time).toISOString(),
                cargo_weight: parseFloat(formData.cargo_weight)
            });
            setOptimizationResult(response.data);
            fetchTrips();
            // Reset form after delay or Success message
            setTimeout(() => {
                setShowForm(false);
                setOptimizationResult(null);
                setFormData({
                    from_loc: '',
                    to_loc: '',
                    start_time: '',
                    cargo_weight: 0,
                    optimize: true
                });
            }, 5000);
        } catch (error) {
            console.error('Error scheduling trip:', error);
            alert(error.response?.data?.detail || 'Failed to schedule trip');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Planned': return '#3498db';
            case 'In-Transit': return '#f1c40f';
            case 'Completed': return '#2ecc71';
            case 'Cancelled': return '#e74c3c';
            default: return '#7f8c8d';
        }
    };

    return (
        <div className="trip-management">
            <div className="header-actions">
                <button 
                    className="add-btn" 
                    onClick={() => setShowForm(!showForm)}
                >
                    {showForm ? 'Cancel' : 'Schedule New Trip'}
                </button>
            </div>

            {showForm && (
                <div className="trip-form-container card">
                    <h3>Schedule Trip</h3>
                    <form onSubmit={handleScheduleTrip} className="trip-form">
                        <div className="form-group">
                            <label>From Plant</label>
                            <select 
                                name="from_loc" 
                                value={formData.from_loc} 
                                onChange={handleInputChange}
                                required
                            >
                                <option value="">Select Plant</option>
                                {plants.map(p => (
                                    <option key={p.location_id} value={p.location_id}>{p.name} ({p.city})</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>To Plant</label>
                            <select 
                                name="to_loc" 
                                value={formData.to_loc} 
                                onChange={handleInputChange}
                                required
                            >
                                <option value="">Select Plant</option>
                                {plants.map(p => (
                                    <option key={p.location_id} value={p.location_id}>{p.name} ({p.city})</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Start Time</label>
                                <input 
                                    type="datetime-local" 
                                    name="start_time" 
                                    value={formData.start_time} 
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Cargo Weight (kg)</label>
                                <input 
                                    type="number" 
                                    name="cargo_weight" 
                                    value={formData.cargo_weight} 
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                        </div>
                        
                        <button type="submit" className="submit-btn" disabled={loading}>
                            {loading ? 'Optimizing...' : 'Optimize and Schedule'}
                        </button>
                    </form>

                    {optimizationResult && (
                        <div className="optimization-result">
                            <div className="success-banner">Trip Scheduled Successfully!</div>
                            <h4>Optimization Summary</h4>
                            <pre className="summary-text">{optimizationResult.summary}</pre>
                            <div className="result-details">
                                <p><strong>Trip ID:</strong> {optimizationResult.trip_id}</p>
                                <p><strong>Vehicle:</strong> {optimizationResult.vehicle_id}</p>
                                <p><strong>Driver:</strong> {optimizationResult.driver_id}</p>
                                <p><strong>Distance:</strong> {optimizationResult.distance_km} km</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="trips-table-container card">
                <h3>Active & Planned Trips</h3>
                <table className="trips-table">
                    <thead>
                        <tr>
                            <th>Trip ID</th>
                            <th>Vehicle</th>
                            <th>Driver</th>
                            <th>From</th>
                            <th>To</th>
                            <th>Start Time</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {trips.length > 0 ? trips.map(trip => (
                            <tr key={trip.trip_id}>
                                <td>{trip.trip_id}</td>
                                <td>{trip.vehicle_id}</td>
                                <td>{trip.driver_id}</td>
                                <td>{trip.from_loc}</td>
                                <td>{trip.to_loc}</td>
                                <td>{new Date(trip.start_time).toLocaleString()}</td>
                                <td>
                                    <span 
                                        className="status-badge" 
                                        style={{ backgroundColor: getStatusColor(trip.status) }}
                                    >
                                        {trip.status}
                                    </span>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="7" className="no-data">No trips found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TripManagement;
