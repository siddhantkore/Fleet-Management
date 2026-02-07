import axios from 'axios';

const getBaseURL = () => {
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    return `http://${host}:8000/api/v1/`;
};

const api = axios.create({
    baseURL: getBaseURL(),
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
