#!/bin/bash

# TeamSite Installation Script
# This script helps you deploy your TeamSite to Apache2

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/home/$(whoami)/TeamSite"
WEB_ROOT="/var/www/html"
SITE_NAME="teamsite"

echo -e "${BLUE}🏗️  TeamSite Installation Script${NC}"
echo "=================================="
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo -e "${RED}❌ Please don't run this script as root. Run as regular user.${NC}"
    echo "The script will ask for sudo when needed."
    exit 1
fi

# Check if project directory exists
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${RED}❌ Project directory not found: $PROJECT_DIR${NC}"
    echo "Please run this script from the correct location."
    exit 1
fi

# Check if Apache2 is installed
if ! command -v apache2 &> /dev/null; then
    echo -e "${RED}❌ Apache2 is not installed.${NC}"
    echo "Please install Apache2 first:"
    echo "  sudo apt update && sudo apt install apache2"
    exit 1
fi

echo -e "${GREEN}✅ Project directory found: $PROJECT_DIR${NC}"
echo -e "${GREEN}✅ Apache2 is installed${NC}"
echo ""

# Ask user for installation method
echo "Choose installation method:"
echo "1) Create symbolic link (recommended - files stay in project directory)"
echo "2) Copy files to web root (files copied to /var/www/html)"
echo "3) Create subdirectory with symbolic link"
echo ""
read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        echo -e "${YELLOW}🔗 Creating symbolic link...${NC}"
        sudo ln -sf "$PROJECT_DIR" "$WEB_ROOT/$SITE_NAME"
        echo -e "${GREEN}✅ Symbolic link created: $WEB_ROOT/$SITE_NAME -> $PROJECT_DIR${NC}"
        SITE_URL="http://localhost/$SITE_NAME"
        ;;
    2)
        echo -e "${YELLOW}📁 Copying files to web root...${NC}"
        sudo rm -rf "$WEB_ROOT/$SITE_NAME"
        sudo cp -r "$PROJECT_DIR" "$WEB_ROOT/$SITE_NAME"
        sudo chown -R www-data:www-data "$WEB_ROOT/$SITE_NAME"
        echo -e "${GREEN}✅ Files copied to: $WEB_ROOT/$SITE_NAME${NC}"
        SITE_URL="http://localhost/$SITE_NAME"
        ;;
    3)
        echo -e "${YELLOW}📁 Creating subdirectory with symbolic link...${NC}"
        sudo mkdir -p "$WEB_ROOT/$SITE_NAME"
        sudo ln -sf "$PROJECT_DIR"/* "$WEB_ROOT/$SITE_NAME/"
        echo -e "${GREEN}✅ Subdirectory created with symbolic links${NC}"
        SITE_URL="http://localhost/$SITE_NAME"
        ;;
    *)
        echo -e "${RED}❌ Invalid choice. Exiting.${NC}"
        exit 1
        ;;
esac

echo ""

# Check if Apache2 is running
if ! systemctl is-active --quiet apache2; then
    echo -e "${YELLOW}⚠️  Apache2 is not running. Starting it...${NC}"
    sudo systemctl start apache2
fi

# Enable Apache2 to start on boot
sudo systemctl enable apache2

echo -e "${GREEN}✅ Apache2 is running${NC}"

# Set proper permissions
echo -e "${YELLOW}🔐 Setting proper permissions...${NC}"
if [ "$choice" = "1" ] || [ "$choice" = "3" ]; then
    # For symbolic links, set permissions on the original directory
    sudo chown -R $USER:$USER "$PROJECT_DIR"
    chmod -R 755 "$PROJECT_DIR"
else
    # For copied files, set permissions on the web directory
    sudo chown -R www-data:www-data "$WEB_ROOT/$SITE_NAME"
    sudo chmod -R 755 "$WEB_ROOT/$SITE_NAME"
fi

echo -e "${GREEN}✅ Permissions set correctly${NC}"

# Create a simple index redirect
echo -e "${YELLOW}📄 Creating index redirect...${NC}"
sudo tee "$WEB_ROOT/index.html" > /dev/null <<EOF
<!DOCTYPE html>
<html>
<head>
    <title>TeamSite</title>
    <meta http-equiv="refresh" content="0; url=/$SITE_NAME/">
</head>
<body>
    <p>Redirecting to <a href="/$SITE_NAME/">TeamSite</a>...</p>
</body>
</html>
EOF

echo -e "${GREEN}✅ Index redirect created${NC}"

# Test the installation
echo -e "${YELLOW}🧪 Testing installation...${NC}"
if curl -s -o /dev/null -w "%{http_code}" "http://localhost/$SITE_NAME/" | grep -q "200\|301\|302"; then
    echo -e "${GREEN}✅ Site is accessible${NC}"
else
    echo -e "${YELLOW}⚠️  Site might not be accessible yet (this is normal)${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Installation Complete!${NC}"
echo "=================================="
echo ""
echo -e "${BLUE}Your TeamSite is now available at:${NC}"
echo -e "  🌐 Main Site: $SITE_URL/"
echo -e "  🔧 Admin Panel: $SITE_URL/admin.html"
echo -e "  🧪 Test Page: $SITE_URL/test-simple.html"
echo ""
echo -e "${BLUE}From Windows, you can also access it at:${NC}"
echo -e "  🌐 Main Site: http://localhost/$SITE_NAME/"
echo -e "  🔧 Admin Panel: http://localhost/$SITE_NAME/admin.html"
echo ""
echo -e "${YELLOW}💡 Tips:${NC}"
echo "  • If you chose symbolic links, changes to your project files will be reflected immediately"
echo "  • If you chose to copy files, you'll need to run this script again to update the site"
echo "  • You can run 'sudo systemctl status apache2' to check Apache status"
echo "  • You can run 'sudo systemctl restart apache2' to restart Apache if needed"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
