#!/bin/sh

# To generate myCA.pem and myCA.key use:
# openssl genrsa -des3 -out myCA.key 2048
# openssl req -x509 -new -nodes -key myCA.key -sha256 -days 1825 -out myCA.pem
# After the .crt and .key files are created, combine them in .pfx to import them in Windows certificate store
# openssl pkcs12 -export -out cert-file-name.pfx -inkey file.key -in file.crt

if [ "$#" -ne 4 ]
then
  echo "Usage: Must supply a <domain> <CA cert file> <CA key file> <Subject>"
  echo "Sample: bash create-cert-signed-by-ca.sh ccs3.operator-connector.local ccs3-ca.crt ccs3-ca.key /C=BG/ST=Varna/O=CCS3/OU=Dev/CN=ccs3.operator-connector.local"
  exit 1
fi

DOMAIN=$1
CA_CERT_FILE=$2
CA_KEY_FILE=$3
SUBJECT=$4

openssl genrsa -out $DOMAIN.key 2048
openssl req -new -key $DOMAIN.key -out $DOMAIN.csr -subj $SUBJECT

cat > $DOMAIN.ext << EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth, clientAuth
subjectAltName = @alt_names
[alt_names]
DNS.1 = $DOMAIN
EOF

openssl x509 -req -in $DOMAIN.csr -CA $CA_CERT_FILE -CAkey $CA_KEY_FILE -CAcreateserial -out $DOMAIN.crt -days 3650 -sha256 -extfile $DOMAIN.ext

# Create .pfx from .key and .crt files
openssl pkcs12 -export -out $DOMAIN.pfx -inkey $DOMAIN.key -in $DOMAIN.crt

# Create .pem from .key and .crt files
cat $DOMAIN.key > $DOMAIN.pem
cat $DOMAIN.crt >> $DOMAIN.pem
