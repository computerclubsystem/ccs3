#!/bin/sh

# To generate ccs3-ca.pem and ccs3-ca.key use:
# openssl genrsa -des3 -out ccs3-ca.key 2048
# openssl req -x509 -new -nodes -key ccs3-ca.key -sha256 -days 1825 -out ccs3-ca.pem
# After the .crt and .key files are created, combine them in .pfx to import them in Windows certificate store
# openssl pkcs12 -export -out cert-file-name.pfx -inkey file.key -in file.crt

if [ "$#" -ne 6 ]
then
  echo "Usage: Must supply a <domain> <Cert file name without extension> <CA cert file> <CA key file> <Subject> <Usage>"
  echo "Sample: bash create-cert-signed-by-ca.sh ccs3.operator-connector.local operator-connector ccs3-ca.crt ccs3-ca.key /C=BG/ST=Varna/O=CCS3/OU=Dev/CN=ccs3.operator-connector.local 'serverAuth, clientAuth'"
  exit 1
fi

DOMAIN=$1
CERT_FILE_NAME=$2
CA_CERT_FILE=$3
CA_KEY_FILE=$4
SUBJECT=$5
USAGE=$6

openssl genrsa -out $CERT_FILE_NAME.key 2048
openssl req -new -key $CERT_FILE_NAME.key -out $CERT_FILE_NAME.csr -subj $SUBJECT

cat > $CERT_FILE_NAME.ext << EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
extendedKeyUsage = $USAGE
subjectAltName = @alt_names
[alt_names]
DNS.1 = $DOMAIN
EOF

openssl x509 -req -in $CERT_FILE_NAME.csr -CA $CA_CERT_FILE -CAkey $CA_KEY_FILE -CAcreateserial -out $CERT_FILE_NAME.crt -days 3650 -sha256 -extfile $CERT_FILE_NAME.ext

# Create .pfx from .key and .crt files
openssl pkcs12 -export -out $CERT_FILE_NAME.pfx -inkey $CERT_FILE_NAME.key -in $CERT_FILE_NAME.crt

# Create .pem from .key and .crt files
cat $CERT_FILE_NAME.key > $CERT_FILE_NAME.pem
cat $CERT_FILE_NAME.crt >> $CERT_FILE_NAME.pem
