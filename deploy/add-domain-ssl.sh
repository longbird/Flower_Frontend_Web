#!/bin/bash
# Issue SSL certificate for a custom branch domain
# Usage: bash deploy/add-domain-ssl.sh <domain>
#
# Prerequisites:
#   - Domain A record must point to this server
#   - certbot must be installed
#   - nginx must be running with the catch-all config

set -euo pipefail

DOMAIN="${1:-}"
EMAIL="admin@seoulflower.co.kr"

if [ -z "$DOMAIN" ]; then
    echo "Usage: $0 <domain>"
    echo "Example: $0 15885555.co.kr"
    exit 1
fi

# Check if cert already exists
if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    echo "Certificate already exists for $DOMAIN"
    echo "To renew: certbot renew --cert-name $DOMAIN"
    exit 0
fi

echo "Issuing SSL certificate for $DOMAIN..."
certbot certonly \
    --nginx \
    -d "$DOMAIN" \
    --non-interactive \
    --agree-tos \
    -m "$EMAIL"

echo "Testing nginx configuration..."
nginx -t

echo "Reloading nginx..."
systemctl reload nginx

echo "Done! $DOMAIN is now SSL-enabled."
echo "Verify: curl -I https://$DOMAIN"
