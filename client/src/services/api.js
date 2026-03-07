import axios from 'axios';

const getBaseURL = () => {
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'https' : 'http';

    // Support for GitHub Codespaces / Gitpod where ports are subdomains
    if (host.includes('.app.github.dev') || host.includes('.gitpod.io')) {
        const backendHost = host.replace('-5173', '-8000');
        return `${protocol}://${backendHost}/api/v1/`;
    }

    return `${protocol}://${host}:8000/api/v1/`;
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
