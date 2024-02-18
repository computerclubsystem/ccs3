#!/bin/sh

# To generate myCA.pem and myCA.key use:
# openssl genrsa -des3 -out myCA.key 2048
# openssl req -x509 -new -nodes -key myCA.key -sha256 -days 1825 -out myCA.pem
# After the .crt and .key files are created, combine them in .pfx to import them in Windows certificate store
# openssl pkcs12 -export -out cert-file-name.pfx -inkey file.key -in file.crt

if [ "$#" -ne 2 ]
then
  echo "Usage: Must supply a domain and IP address"
  exit 1
fi

DOMAIN=$1
IP=$2

cd ~/certs

openssl genrsa -out $DOMAIN.key 2048
openssl req -new -key $DOMAIN.key -out $DOMAIN.csr

cat > $DOMAIN.ext << EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names
[alt_names]
DNS.1 = $DOMAIN
IP.1 = $IP
EOF

openssl x509 -req -in $DOMAIN.csr -CA myCA.pem -CAkey myCA.key -CAcreateserial \
-out $DOMAIN.crt -days 825 -sha256 -extfile $DOMAIN.ext

# Create .pfx from .pem and .key files
openssl pkcs12 -export -out $DOMAIN.pfx -inkey $DOMAIN.key -in $DOMAIN.crt