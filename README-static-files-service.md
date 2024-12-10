Static files like `CCS3 Client App Windows Service` will be hosted in dedicated kubernetes pod with `nginx`.

All the static files can have their own image from where the final static files service image can copy files.

Sample `/etc/nginx/nginx.config` file for image `nginx:stable-alpine3.20` :
```

user  nginx;
worker_processes  auto;

error_log  /var/log/nginx/error.log notice;
pid        /var/run/nginx.pid;


events {
    worker_connections  1024;
}


http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

    access_log  /var/log/nginx/access.log  main;

    sendfile        on;
    #tcp_nopush     on;

    keepalive_timeout  65;

    #gzip  on;

    #include /etc/nginx/conf.d/*.conf;


    server {
        listen 443 ssl;
        ssl_certificate /etc/ssl/certs/ccs3-static-files-service.crt;
        ssl_certificate_key /etc/ssl/private/ccs3-static-files-service.key;

       location / {
           root /usr/share/nginx/html;
           index index.html;
       }
    }
}
```

Certificates for the static file server must be provided as kubernetes secrets pointing to:
- `/etc/ssl/certs/ccs3-static-files-service.crt`
- `/etc/ssl/private/ccs3-static-files-service.key`

Files to serve must be put in `/usr/share/nginx/html`

# Build Docker image
- Ensure that all the images referenced in the Dockerfile are available
- Navigate to `devops` folder
- Build the Docker image:
```bash
docker buildx build -f Dockerfile.static-files-service -t ccs3/sfs:latest ./static-files-service
```