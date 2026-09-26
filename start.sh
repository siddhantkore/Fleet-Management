#!/bin/bash

# Fleet Management System - Setup & Start Script
set -e

echo "=================================="
echo "Fleet Management System - Setup"
echo "=================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker and Docker Compose."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose."
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"
echo ""

# Check current directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ docker-compose.yml not found. Please run this script from the project root."
    exit 1
fi

echo "📦 Building and starting services..."

echo ""
echo "=================================="
echo "✅ Services will run in the background!"
echo "=================================="
echo ""
echo "📍 Frontend: http://localhost:5173"
echo "🔌 Backend API: http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs"
echo "🗄️  Database: localhost:5432"
echo ""
echo "📞 User Guide:"
echo "   1. Open http://localhost:5173 in your browser"
echo "   2. Click 'Contact Us' to test the form"
echo "   3. Submit a contact message"
echo "   4. Check backend logs to see the submission"
echo ""
echo "⚠️  To stop services: Press Ctrl+C (stops logs), then run 'docker-compose down'"
echo "=================================="

docker-compose up --build -d
docker-compose logs -f
