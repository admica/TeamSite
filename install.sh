#!/bin/bash

# TeamSite Installation Script
# Combined install and update script with Apache2 SSL configuration

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
SITE_DOMAIN="localhost"
SSL_CERT_DIR="/etc/ssl/certs"
SSL_KEY_DIR="/etc/ssl/private"
APACHE_SITES_DIR="/etc/apache2/sites-available"
APACHE_SITES_ENABLED_DIR="/etc/apache2/sites-enabled"
SITE_CONFIG_FILE="teamsite.conf"

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

# Check if OpenSSL is installed
if ! command -v openssl &> /dev/null; then
    echo -e "${RED}❌ OpenSSL is not installed.${NC}"
    echo "Please install OpenSSL first:"
    echo "  sudo apt update && sudo apt install openssl"
    exit 1
fi

echo -e "${GREEN}✅ Project directory found: $PROJECT_DIR${NC}"
echo -e "${GREEN}✅ Apache2 is installed${NC}"
echo -e "${GREEN}✅ OpenSSL is installed${NC}"
echo ""

# Detect if this is an update or fresh install
IS_UPDATE=false
if [ -L "$WEB_ROOT/$SITE_NAME" ] || [ -d "$WEB_ROOT/$SITE_NAME" ]; then
    IS_UPDATE=true
    echo -e "${YELLOW}🔄 Update detected - existing installation found${NC}"
else
    echo -e "${BLUE}🆕 Fresh installation detected${NC}"
fi

# If update and using symlinks, no file changes needed
if [ "$IS_UPDATE" = true ] && [ -L "$WEB_ROOT/$SITE_NAME" ]; then
    echo -e "${GREEN}✅ Symbolic link detected - files are automatically updated${NC}"
    echo "Checking Apache2 configuration..."
    
    # Check if SSL is already configured
    if [ -f "$APACHE_SITES_ENABLED_DIR/$SITE_CONFIG_FILE" ]; then
        echo -e "${GREEN}✅ Apache2 SSL configuration already exists${NC}"
        echo -e "${GREEN}✅ Site is available at: https://$SITE_DOMAIN/$SITE_NAME/${NC}"
        echo ""
        echo -e "${YELLOW}💡 Your site is already configured and up to date!${NC}"
        exit 0
    fi
fi

# Ask user for installation method (only for fresh install or if not using symlinks)
if [ "$IS_UPDATE" = false ] || [ ! -L "$WEB_ROOT/$SITE_NAME" ]; then
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
            INSTALL_METHOD="symlink"
            ;;
        2)
            echo -e "${YELLOW}📁 Copying files to web root...${NC}"
            sudo rm -rf "$WEB_ROOT/$SITE_NAME"
            sudo cp -r "$PROJECT_DIR" "$WEB_ROOT/$SITE_NAME"
            sudo chown -R www-data:www-data "$WEB_ROOT/$SITE_NAME"
            echo -e "${GREEN}✅ Files copied to: $WEB_ROOT/$SITE_NAME${NC}"
            INSTALL_METHOD="copy"
            ;;
        3)
            echo -e "${YELLOW}📁 Creating subdirectory with symbolic link...${NC}"
            sudo mkdir -p "$WEB_ROOT/$SITE_NAME"
            sudo ln -sf "$PROJECT_DIR"/* "$WEB_ROOT/$SITE_NAME/"
            echo -e "${GREEN}✅ Subdirectory created with symbolic links${NC}"
            INSTALL_METHOD="subdir"
            ;;
        *)
            echo -e "${RED}❌ Invalid choice. Exiting.${NC}"
            exit 1
            ;;
    esac
else
    # For updates with symlinks, determine the method
    if [ -L "$WEB_ROOT/$SITE_NAME" ]; then
        INSTALL_METHOD="symlink"
    else
        INSTALL_METHOD="copy"
    fi
fi

echo ""

# Enable required Apache2 modules
echo -e "${YELLOW}🔧 Enabling Apache2 modules...${NC}"
sudo a2enmod ssl
sudo a2enmod rewrite
sudo a2enmod headers
echo -e "${GREEN}✅ Apache2 modules enabled${NC}"

# Generate SSL certificate if it doesn't exist
if [ ! -f "$SSL_CERT_DIR/teamsite.crt" ] || [ ! -f "$SSL_KEY_DIR/teamsite.key" ]; then
    echo -e "${YELLOW}🔐 Generating SSL certificate...${NC}"
    
    # Create private key
    sudo openssl genrsa -out "$SSL_KEY_DIR/teamsite.key" 2048
    
    # Create certificate signing request
    sudo openssl req -new -key "$SSL_KEY_DIR/teamsite.key" -out /tmp/teamsite.csr -subj "/C=/ST=/L=/O=/OU=/CN=$SITE_DOMAIN"
    
    # Create self-signed certificate
    sudo openssl x509 -req -days 365 -in /tmp/teamsite.csr -signkey "$SSL_KEY_DIR/teamsite.key" -out "$SSL_CERT_DIR/teamsite.crt"
    
    # Set proper permissions
    sudo chmod 600 "$SSL_KEY_DIR/teamsite.key"
    sudo chmod 644 "$SSL_CERT_DIR/teamsite.crt"
    
    # Clean up CSR
    sudo rm -f /tmp/teamsite.csr
    
    echo -e "${GREEN}✅ SSL certificate generated${NC}"
else
    echo -e "${GREEN}✅ SSL certificate already exists${NC}"
fi

# Create Apache2 virtual host configuration
echo -e "${YELLOW}📝 Creating Apache2 virtual host configuration...${NC}"

sudo tee "$APACHE_SITES_DIR/$SITE_CONFIG_FILE" > /dev/null <<EOF
# TeamSite Virtual Host Configuration
<VirtualHost *:80>
    ServerName $SITE_DOMAIN
    DocumentRoot $WEB_ROOT
    
    # Redirect all HTTP traffic to HTTPS
    RewriteEngine On
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
</VirtualHost>

<VirtualHost *:443>
    ServerName $SITE_DOMAIN
    DocumentRoot $WEB_ROOT
    
    # SSL Configuration
    SSLEngine on
    SSLCertificateFile $SSL_CERT_DIR/teamsite.crt
    SSLCertificateKeyFile $SSL_KEY_DIR/teamsite.key
    
    # Security Headers
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    Header always set Permissions-Policy "geolocation=(), microphone=(), camera=()"
    
    # Site-specific configuration
    <Directory "$WEB_ROOT/$SITE_NAME">
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
        
        # Enable CORS for local development
        Header set Access-Control-Allow-Origin "*"
        Header set Access-Control-Allow-Methods "GET, POST, OPTIONS"
        Header set Access-Control-Allow-Headers "Content-Type, Authorization"
    </Directory>
    
    # Error and access logs
    ErrorLog \${APACHE_LOG_DIR}/teamsite_error.log
    CustomLog \${APACHE_LOG_DIR}/teamsite_access.log combined
</VirtualHost>
EOF

echo -e "${GREEN}✅ Virtual host configuration created${NC}"

# Enable the site and disable default site
echo -e "${YELLOW}🔗 Enabling site configuration...${NC}"
sudo a2ensite "$SITE_CONFIG_FILE"
sudo a2dissite 000-default
echo -e "${GREEN}✅ Site enabled, default site disabled${NC}"

# Set proper permissions
echo -e "${YELLOW}Setting proper permissions...${NC}"

# Ensure www-data is in user group for symbolic link access
if ! groups www-data | grep -q "\b$USER\b"; then
    echo -e "${YELLOW}Adding www-data to user group...${NC}"
    sudo usermod -a -G $USER www-data
    echo -e "${GREEN}www-data added to $USER group${NC}"
else
    echo -e "${GREEN}www-data already in $USER group${NC}"
fi

if [ "$INSTALL_METHOD" = "symlink" ] || [ "$INSTALL_METHOD" = "subdir" ]; then
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

# Test Apache2 configuration
echo -e "${YELLOW}🧪 Testing Apache2 configuration...${NC}"
if sudo apache2ctl configtest; then
    echo -e "${GREEN}✅ Apache2 configuration is valid${NC}"
else
    echo -e "${RED}❌ Apache2 configuration test failed${NC}"
    exit 1
fi

# Restart Apache2
echo -e "${YELLOW}🔄 Restarting Apache2...${NC}"
sudo systemctl restart apache2
sudo systemctl enable apache2

# Check if Apache2 is running
if systemctl is-active --quiet apache2; then
    echo -e "${GREEN}✅ Apache2 is running${NC}"
else
    echo -e "${RED}❌ Apache2 failed to start${NC}"
    exit 1
fi

# Test the installation
echo -e "${YELLOW}🧪 Testing installation...${NC}"
if curl -s -k -o /dev/null -w "%{http_code}" "https://$SITE_DOMAIN/$SITE_NAME/" | grep -q "200\|301\|302"; then
    echo -e "${GREEN}✅ Site is accessible via HTTPS${NC}"
else
    echo -e "${YELLOW}⚠️  Site might not be accessible yet (this is normal)${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Installation Complete!${NC}"
echo "=================================="
echo ""
echo -e "${BLUE}Your TeamSite is now available at:${NC}"
echo -e "  🌐 Main Site: https://$SITE_DOMAIN/$SITE_NAME/"
echo -e "  🔧 Admin Panel: https://$SITE_DOMAIN/$SITE_NAME/admin.html"
echo -e "  🧪 Test Page: https://$SITE_DOMAIN/$SITE_NAME/test-simple.html"
echo ""
echo -e "${BLUE}From Windows, you can also access it at:${NC}"
echo -e "  🌐 Main Site: https://$SITE_DOMAIN/$SITE_NAME/"
echo -e "  🔧 Admin Panel: https://$SITE_DOMAIN/$SITE_NAME/admin.html"
echo ""
echo -e "${YELLOW}💡 Tips:${NC}"
if [ "$INSTALL_METHOD" = "symlink" ]; then
    echo "  • Changes to your project files will be reflected immediately"
    echo "  • No need to run this script again for updates"
elif [ "$INSTALL_METHOD" = "copy" ]; then
    echo "  • You'll need to run this script again to update the site"
    echo "  • Files are copied to /var/www/html/$SITE_NAME"
else
    echo "  • Changes to your project files will be reflected immediately"
    echo "  • No need to run this script again for updates"
fi
echo "  • All traffic is automatically redirected to HTTPS"
echo "  • You can run 'sudo systemctl status apache2' to check Apache status"
echo "  • You can run 'sudo systemctl restart apache2' to restart Apache if needed"
echo "  • SSL certificate is self-signed - browsers will show a security warning"
echo "  • Click 'Advanced' and 'Proceed to localhost' to bypass the warning"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"