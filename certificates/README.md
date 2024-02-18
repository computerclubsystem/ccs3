# Certificates
- These certificates are only for development purposes. The real certificates must be provided by Kubernetes as secrets. The applications are trying to find their certificates in `./certificates/<file-name>.pem`.

## Client certificates
Use the script `create-cert.sh` to create client certificates. The CA files must be present with names `myCA.key` and `myCA.pem`.