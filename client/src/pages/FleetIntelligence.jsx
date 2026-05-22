import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import api from '../services/api';
import './FleetIntelligence.css';

const plantIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const FleetIntelligence = () => {
    const [recommendations, setRecommendations] = useState([]);
    const [plants, setPlants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('Pending');
    const [expandedId, setExpandedId] = useState(null);
    const [aiLoadingId, setAiLoadingId] = useState(null);

    useEffect(() => {
        fetchPlants();
        fetchRecommendations();
    }, [statusFilter]);

    const fetchPlants = async () => {
        try {
            const res = await api.get('/locations');
            setPlants(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchRecommendations = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/fleet/recommendations?status=${statusFilter}`);
            setRecommendations(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async (id) => {
        try {
            await api.post(`/fleet/recommendations/${id}/accept`);
            fetchRecommendations();
        } catch (err) { alert('Failed to accept'); }
    };

    const handleDismiss = async (id) => {
        try {
            await api.post(`/fleet/recommendations/${id}/dismiss`);
            fetchRecommendations();
        } catch (err) { alert('Failed to dismiss'); }
    };

    const requestAiExplanation = async (id) => {
        setAiLoadingId(id);
        try {
            const res = await api.post(`/fleet/recommendations/${id}/explain`);
            // Refresh to show AI summary
            fetchRecommendations();
        } catch (err) {
            console.error(err);
        } finally {
            setAiLoadingId(null);
        }
    };

    const getPlantCoords = (locId) => {
        const p = plants.find(pl => pl.location_id === locId);
        return p ? [p.latitude, p.longitude] : null;
    };

    const getActionColor = (action) => {
        switch (action) {
            case 'FORWARD_DISPATCH': return '#2563eb';
            case 'RETURN': return '#16a34a';
            case 'HOLD': return '#d97706';
            default: return '#64748b';
        }
    };

    const getActionIcon = (action) => {
        switch (action) {
            case 'FORWARD_DISPATCH': return '🚛';
            case 'RETURN': return '🔄';
            case 'HOLD': return '⏸️';
            default: return '❓';
        }
    };

    return (
        <div className="fleet-intelligence">
            <div className="fi-header">
                <h2>Fleet Intelligence</h2>
                <p className="fi-subtitle">Automated vehicle repositioning recommendations based on demand, distance, and fleet availability</p>
                <div className="fi-filters">
                    {['Pending', 'Accepted', 'Dismissed', 'Expired'].map(s => (
                        <button
                            key={s}
                            className={`fi-filter-btn ${statusFilter === s ? 'active' : ''}`}
                            onClick={() => setStatusFilter(s)}
                        >
                            {s}
                            {s === 'Pending' && recommendations.length > 0 && statusFilter === 'Pending' && (
                                <span className="fi-badge">{recommendations.length}</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <div className="fi-content">
                <div className="fi-map-panel">
                    <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: '400px', width: '100%' }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        {plants.map(p => (
                            <Marker key={p.location_id} position={[p.latitude, p.longitude]} icon={plantIcon}>
                                <Popup>{p.name}</Popup>
                            </Marker>
                        ))}
                        {recommendations.map(rec => {
                            const from = getPlantCoords(rec.current_plant_id);
                            const to = getPlantCoords(rec.recommended_plant_id);
                            if (!from || !to || rec.action === 'HOLD') return null;
                            return (
                                <Polyline
                                    key={`rec-${rec.id}`}
                                    positions={[from, to]}
                                    pathOptions={{
                                        color: getActionColor(rec.action),
                                        weight: 3,
                                        opacity: 0.7,
                                        dashArray: '8 6',
                                    }}
                                >
                                    <Popup>
                                        <strong>{rec.vehicle_id}</strong><br />
                                        {rec.action}: {rec.current_plant_name} → {rec.recommended_plant_name}<br />
                                        {rec.distance_km} km • ₹{rec.estimated_cost?.toFixed(0)}
                                    </Popup>
                                </Polyline>
                            );
                        })}
                    </MapContainer>
                </div>

                <div className="fi-recs-panel">
                    {loading ? (
                        <div className="fi-loading">Loading recommendations...</div>
                    ) : recommendations.length === 0 ? (
                        <div className="fi-empty">
                            <span className="fi-empty-icon">📋</span>
                            <p>No {statusFilter.toLowerCase()} recommendations</p>
                        </div>
                    ) : (
                        <div className="fi-recs-list">
                            {recommendations.map(rec => (
                                <div
                                    key={rec.id}
                                    className={`fi-rec-card ${expandedId === rec.id ? 'expanded' : ''}`}
                                >
                                    <div className="fi-rec-header" onClick={() => setExpandedId(expandedId === rec.id ? null : rec.id)}>
                                        <div className="fi-rec-icon">{getActionIcon(rec.action)}</div>
                                        <div className="fi-rec-title">
                                            <strong>{rec.vehicle_id}</strong>
                                            <span className="fi-action-tag" style={{ background: getActionColor(rec.action) }}>
                                                {rec.action.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <div className="fi-rec-route">
                                            {rec.current_plant_name || rec.current_plant_id} → {rec.recommended_plant_name || rec.recommended_plant_id}
                                        </div>
                                        <div className="fi-rec-meta">
                                            {rec.distance_km} km • ₹{rec.estimated_cost?.toFixed(0)}
                                        </div>
                                    </div>

                                    {expandedId === rec.id && (
                                        <div className="fi-rec-details">
                                            <div className="fi-detail-grid">
                                                <div className="fi-detail-item">
                                                    <span className="fi-detail-label">Demand at current</span>
                                                    <span className="fi-detail-value">{rec.demand_at_current} trips</span>
                                                </div>
                                                <div className="fi-detail-item">
                                                    <span className="fi-detail-label">Demand at recommended</span>
                                                    <span className="fi-detail-value">{rec.demand_at_recommended} trips</span>
                                                </div>
                                                <div className="fi-detail-item">
                                                    <span className="fi-detail-label">Vehicles at destination</span>
                                                    <span className="fi-detail-value">{rec.available_vehicles_at_recommended}</span>
                                                </div>
                                                <div className="fi-detail-item">
                                                    <span className="fi-detail-label">Optimization Score</span>
                                                    <span className="fi-detail-value">{rec.score}</span>
                                                </div>
                                            </div>

                                            <div className="fi-reason">
                                                <strong>Reason:</strong> {rec.reason}
                                            </div>

                                            {rec.ai_summary && (
                                                <div className="fi-ai-summary">
                                                    <h4>🤖 AI Explanation</h4>
                                                    <pre>{rec.ai_summary}</pre>
                                                </div>
                                            )}

                                            <div className="fi-rec-actions">
                                                {rec.status === 'Pending' && (
                                                    <>
                                                        <button className="fi-btn accept" onClick={() => handleAccept(rec.id)}>
                                                            ✓ Accept
                                                        </button>
                                                        <button className="fi-btn dismiss" onClick={() => handleDismiss(rec.id)}>
                                                            ✕ Dismiss
                                                        </button>
                                                    </>
                                                )}
                                                {!rec.ai_summary && (
                                                    <button
                                                        className="fi-btn ai"
                                                        onClick={() => requestAiExplanation(rec.id)}
                                                        disabled={aiLoadingId === rec.id}
                                                    >
                                                        {aiLoadingId === rec.id ? '🤖 Loading...' : '🤖 Get AI Explanation'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FleetIntelligence;
