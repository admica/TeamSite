#!/bin/bash

# TeamSite Backend Control Script
# Easy management of the backend server

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SERVICE_NAME="teamsite-backend"

show_help() {
    echo -e "${BLUE}TeamSite Backend Control Script${NC}"
    echo "=================================="
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start     - Start the backend server"
    echo "  stop      - Stop the backend server"
    echo "  restart   - Restart the backend server"
    echo "  status    - Show backend server status"
    echo "  logs      - Show backend server logs"
    echo "  test      - Test backend API endpoints"
    echo "  help      - Show this help message"
    echo ""
}

start_backend() {
    echo -e "${YELLOW}Starting backend server...${NC}"
    sudo systemctl start $SERVICE_NAME
    if systemctl is-active --quiet $SERVICE_NAME; then
        echo -e "${GREEN}✅ Backend server started successfully${NC}"
    else
        echo -e "${RED}❌ Failed to start backend server${NC}"
        exit 1
    fi
}

stop_backend() {
    echo -e "${YELLOW}Stopping backend server...${NC}"
    sudo systemctl stop $SERVICE_NAME
    echo -e "${GREEN}✅ Backend server stopped${NC}"
}

restart_backend() {
    echo -e "${YELLOW}Restarting backend server...${NC}"
    sudo systemctl restart $SERVICE_NAME
    sleep 2
    if systemctl is-active --quiet $SERVICE_NAME; then
        echo -e "${GREEN}✅ Backend server restarted successfully${NC}"
    else
        echo -e "${RED}❌ Failed to restart backend server${NC}"
        exit 1
    fi
}

show_status() {
    echo -e "${BLUE}Backend Server Status:${NC}"
    sudo systemctl status $SERVICE_NAME --no-pager
}

show_logs() {
    echo -e "${BLUE}Backend Server Logs (Press Ctrl+C to exit):${NC}"
    sudo journalctl -u $SERVICE_NAME -f
}

test_api() {
    echo -e "${BLUE}Testing Backend API Endpoints:${NC}"
    echo ""
    
    # Test health endpoint
    echo -e "${YELLOW}Testing health endpoint...${NC}"
    if curl -s http://localhost:3000/api/health > /dev/null; then
        echo -e "${GREEN}✅ Health endpoint responding${NC}"
    else
        echo -e "${RED}❌ Health endpoint not responding${NC}"
    fi
    
    # Test players endpoint
    echo -e "${YELLOW}Testing players endpoint...${NC}"
    if curl -s http://localhost:3000/api/players > /dev/null; then
        echo -e "${GREEN}✅ Players endpoint responding${NC}"
    else
        echo -e "${RED}❌ Players endpoint not responding${NC}"
    fi
    
    # Test teams endpoint
    echo -e "${YELLOW}Testing teams endpoint...${NC}"
    if curl -s http://localhost:3000/api/teams > /dev/null; then
        echo -e "${GREEN}✅ Teams endpoint responding${NC}"
    else
        echo -e "${RED}❌ Teams endpoint not responding${NC}"
    fi
    
    # Test config endpoint
    echo -e "${YELLOW}Testing config endpoint...${NC}"
    if curl -s http://localhost:3000/api/config > /dev/null; then
        echo -e "${GREEN}✅ Config endpoint responding${NC}"
    else
        echo -e "${RED}❌ Config endpoint not responding${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}API Test Complete!${NC}"
}

# Main script logic
case "$1" in
    start)
        start_backend
        ;;
    stop)
        stop_backend
        ;;
    restart)
        restart_backend
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    test)
        test_api
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}❌ Unknown command: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac
