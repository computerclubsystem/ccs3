Static files like `CCS3 Client App Windows Service` (`Ccs3ClientAppWindowsService.zip`) will be hosted in dedicated kubernetes pod with `nginx`.

All the static files can have their own image from where the final static files service image can copy files.

Certificates for the static file server must be provided as kubernetes secrets pointing to:
- `/etc/ssl/certs/ccs3-static-files-service.crt`
- `/etc/ssl/private/ccs3-static-files-service.key`
To create kubernetes secret for use in the static files service, navigate to where the certificate files are and execute:
```bash
kubectl create secret generic nginx-certs --from-file=ccs3-static-files-service.crt --from-file=ccs3-static-files-service.key
``` 

Files to serve must be put in `/usr/share/nginx/html`

# Build Docker image
- Ensure that all the images referenced in the `Dockerfile.static-files-service` are available
- Navigate to `devops` folder
- Build the Docker image:
```bash
docker buildx build -f Dockerfile.static-files-service -t ccs3/sfs:latest ./static-files-service
```