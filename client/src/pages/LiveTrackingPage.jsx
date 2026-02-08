import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import api from '../services/api';
import Navbar from '../components/Navbar/Navbar';
import Footer from '../components/Footer/Footer';
import './LiveTrackingPage.css';

// Custom red icon for plants
const plantIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

const LiveTrackingPage = () => {
    const [locations, setLocations] = useState({});
    const [plants, setPlants] = useState([]);
    const [loading, setLoading] = useState(true);
    const ws = useRef(null);

    // Dynamic extraction of host to support different environments
    const host = window.location.hostname;
    const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';

    let backendHost = `${host}:8000`;
    
    // Support for GitHub Codespaces / Gitpod where ports are subdomains
    if (host.includes('.app.github.dev') || host.includes('.gitpod.io')) {
        backendHost = host.replace('-5173', '-8000');
    }
    
    const WS_URL = `${wsProtocol}://${backendHost}/api/v1/tracking/ws`;

    useEffect(() => {
        // 1. Fetch plants
        const fetchPlants = async () => {
            try {
                const response = await api.get('locations');
                setPlants(response.data.filter(loc => loc.type === 'Plant'));
            } catch (err) {
                console.error("Error fetching plants:", err);
            }
        };

        // 2. Fetch initial locations
        const fetchLocations = async () => {
            try {
                const response = await api.get('tracking/locations');
                const locMap = {};
                response.data.forEach(loc => {
                    locMap[String(loc.driver_id)] = loc;
                });
                setLocations(locMap);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching initial locations:", err);
                setLoading(false);
            }
        };

        fetchPlants();
        fetchLocations();

        // 3. Setup WebSocket
        ws.current = new WebSocket(WS_URL);

        ws.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setLocations(prev => ({
                ...prev,
                [String(data.driver_id)]: data
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
        return (
            <div className="live-tracking-page">
                <Navbar />
                <div className="loading-container">Loading Live Map...</div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="live-tracking-page">
            <Navbar />
            <div className="live-tracking-container">
                <h1>Live Fleet Tracking</h1>
                <div className="map-wrapper">
                    <MapContainer center={[18.5204, 73.8567]} zoom={10} style={{ height: '70vh', width: '100%' }}>
                        <LayersControl position="topright">
                            <LayersControl.BaseLayer checked name="OpenStreetMap">
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                            </LayersControl.BaseLayer>
                            <LayersControl.BaseLayer name="Satellite View">
                                <TileLayer
                                    attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EBP, and the GIS User Community'
                                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                                />
                            </LayersControl.BaseLayer>
                            <LayersControl.BaseLayer name="Dark Mode">
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                                />
                            </LayersControl.BaseLayer>
                        </LayersControl>
                        
                        {/* Render Plants */}
                        {plants.map((p) => (
                            <Marker 
                                key={`plant-${p.location_id}`} 
                                position={[p.latitude, p.longitude]}
                                icon={plantIcon}
                            >
                                <Popup>
                                    <strong>Plant:</strong> {p.name}<br />
                                    <strong>City:</strong> {p.city}
                                </Popup>
                            </Marker>
                        ))}
                        {/* Render Drivers (filter out data older than 5 mins) */}
                        {Object.values(locations)
                            .filter(loc => {
                                const lastUpdate = new Date(loc.updated_at).getTime();
                                return (Date.now() - lastUpdate) < STALE_THRESHOLD_MS;
                            })
                            .map((loc) => (
                                <Marker 
                                    key={`driver-${loc.driver_id}`} 
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
                    <h3>Active Drivers ({Object.values(locations).filter(loc => (Date.now() - new Date(loc.updated_at).getTime()) < STALE_THRESHOLD_MS).length})</h3>
                    <ul>
                        {Object.values(locations)
                            .filter(loc => (Date.now() - new Date(loc.updated_at).getTime()) < STALE_THRESHOLD_MS)
                            .map(loc => (
                                <li key={loc.driver_id}>
                                    {loc.driver_name || loc.driver_id}: {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                                </li>
                            ))}
                    </ul>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default LiveTrackingPage;
