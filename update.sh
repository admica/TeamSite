#!/bin/bash

# TeamSite Update Script
# Use this to update your site after making changes

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="/home/user/TeamSite"
WEB_ROOT="/var/www/html"
SITE_NAME="teamsite"

echo -e "${BLUE}🔄 TeamSite Update Script${NC}"
echo "=========================="
echo ""

# Check if symbolic link exists
if [ -L "$WEB_ROOT/$SITE_NAME" ]; then
    echo -e "${GREEN}✅ Symbolic link detected - no update needed!${NC}"
    echo "Changes are automatically reflected since files are linked."
    echo ""
    echo -e "${BLUE}Your site is available at:${NC}"
    echo "  🌐 Main Site: http://localhost/$SITE_NAME/"
    echo "  🔧 Admin Panel: http://localhost/$SITE_NAME/admin.html"
    exit 0
fi

# Check if directory exists
if [ -d "$WEB_ROOT/$SITE_NAME" ]; then
    echo -e "${YELLOW}📁 Copying updated files...${NC}"
    sudo cp -r "$PROJECT_DIR"/* "$WEB_ROOT/$SITE_NAME/"
    sudo chown -R www-data:www-data "$WEB_ROOT/$SITE_NAME"
    sudo chmod -R 755 "$WEB_ROOT/$SITE_NAME"
    echo -e "${GREEN}✅ Files updated successfully!${NC}"
else
    echo -e "${YELLOW}⚠️  Site not found. Please run install.sh first.${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Update Complete!${NC}"
echo "Your changes are now live at: http://localhost/$SITE_NAME/"
