import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import './LiveTrackingPage.css';

// Fix for default marker icons in Leaflet with React
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const LiveTrackingPage = () => {
    const [locations, setLocations] = useState({});
    const [loading, setLoading] = useState(true);
    const ws = useRef(null);

    const API_BASE_URL = 'http://localhost:8000'; // Update if needed
    const WS_URL = 'ws://localhost:8000/tracking/ws';

    useEffect(() => {
        // 1. Fetch initial locations
        const fetchLocations = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/tracking/locations`);
                const locMap = {};
                response.data.forEach(loc => {
                    locMap[loc.driver_id] = loc;
                });
                setLocations(locMap);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching initial locations:", err);
                setLoading(false);
            }
        };

        fetchLocations();

        // 2. Setup WebSocket
        ws.current = new WebSocket(WS_URL);

        ws.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setLocations(prev => ({
                ...prev,
                [data.driver_id]: data
            }));
        };

        ws.current.onclose = () => {
            console.log("WebSocket disconnected. Retrying in 5s...");
            setTimeout(() => {
                // Simple reconnection logic could go here
            }, 5000);
        };

        return () => {
            if (ws.current) ws.current.close();
        };
    }, []);

    if (loading) {
        return <div className="loading-container">Loading Live Map...</div>;
    }

    return (
        <div className="live-tracking-container">
            <h1>Live Fleet Tracking</h1>
            <div className="map-wrapper">
                <MapContainer center={[18.5204, 73.8567]} zoom={10} style={{ height: '70vh', width: '100%' }}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {Object.values(locations).map((loc) => (
                        <Marker 
                            key={loc.driver_id} 
                            position={[loc.latitude, loc.longitude]}
                        >
                            <Popup>
                                <div>
                                    <strong>Driver:</strong> {loc.driver_name || loc.driver_id}<br />
                                    <strong>ID:</strong> {loc.driver_id}<br />
                                    <strong>Last Updated:</strong> {new Date(loc.updated_at).toLocaleString()}
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>
            <div className="driver-list">
                <h3>Active Drivers ({Object.keys(locations).length})</h3>
                <ul>
                    {Object.values(locations).map(loc => (
                        <li key={loc.driver_id}>
                            {loc.driver_name || loc.driver_id}: {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default LiveTrackingPage;
