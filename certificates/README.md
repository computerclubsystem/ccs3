# Certificates

## Creating CA certificate which will be used to sign all other certificates
If you plan to use Windows to create the certificates - install `OpenSSL` or run `wsl` from a command prompt if you have WSL installed on your Windows, open a console window and create the CA certificate files (the values of `-subj`, `-keyout` and `-out` parameters can be adjusted to your needs):
```bash
openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -subj "/C=BG/ST=Varna/O=CCS3/OU=Dev/CN=CCS3 Root CA" -addext keyUsage=keyCertSign -keyout ccs3-ca.key -out ccs3-ca.crt
```
The two certificate files `ccs3-ca.key` and `ccs3-ca.crt` will be created in the current directory.

You can change the name of the files in the above sample and the `-subj` parameter value `"/C=BG/ST=Varna/O=CCS3/OU=Dev/CN=CCS3 Root CA"` before executing `openssl`. The parts of the `-subj` value are:
- `C=BG` - "Country" `BG`
- `ST=Varna` - "State" `Varna`
- `O=CCS3` - "Organization" `CCS3`
- `OU=Dev` - "Organization unit" `Dev`
- `CN=CCS3 Root CA` - "Canonical name" `CCS3 Root CA` - CN usually should contain the domain name to which the certificate is created but since this is a CA certificate used just to sign other certificates, we can put here something else. The service certificates should have a value that is the same as the domain the clients are accessing (like `ccs3.operator-connector.local`) otherwise the client (if it is a browser) will show security warnings

## Import the CA .crt file to each Windows computer
- Import the `.crt` file of the CA certificate on each computer, which will connect to the services. These are usually the client computers and the operator computer (possibly also to smart phones connecting to the services - how to import certificates on smart phones depends on the operating system)
  - Start `mmc.exe`
  - Select `File - Add/Remove Snap-in...`
  - From the list on the left select `Certificates` and click `Add ->` button
  - From the pop-up select `Computer account` and click `Next >`
  - From the second pop-up page select `Local computer` and click `Finish`
  - Click `OK`
  - From the list on the left expand `Certificates (Local Computer)` then `Trusted Root Certification Auhtorities` and select `Certificates`
  - Right click on `Certificates` and select `All tasks - Import...`
  - `Local Machine` is preselected - click `Next`
  - Browse for and select the `.crt` file you just created (in the sample its name is `ccs3-ca.crt`)
  - Click `Next`
  - On the second pop-up screen ensure the `Place all certificates in the following store` is selected and `Certificate store` contains `Trusted Root Certification Authorities` and click `Next` and then `Finish`
  - If the certificate is imported successfully, it will appear in the `Trusted Root Certification Authorities - Certificates` list


## Creating service certificates signed with the CA certificate
Each service on the server that accepts connections from clients (operator browser, client machines app or other devices) must use certificates for secure connection. The service certificates should be signed with the CA created in the previous step. To create service certificate, use the script `create-cert-signed-by-ca.sh` - copy this file to the folder where the CA files were created in the previous stsection. The execute the file providing 5 parameters specifying domain name of the service, its ip address, CA .crt file, CA .key file and the value for `-subj` (refer to the previous section).

This is how to create certificate for the operator connector service:
```bash
bash create-cert-signed-by-ca.sh ccs3.operator-connector.local ccs3-ca.crt ccs3-ca.key /C=BG/ST=Varna/O=CCS3/OU=Dev/CN=ccs3.operator-connector.local serverAuth
```
You will be asked for password - select a good password, with lower and upper case letters, numbers, special characters and 16 or more characters long - keep this password in a safe place. 6 files will be created with extensions `.crt`, `csr`, `.ext`, `.key`, `.pem` and `.pfx` with the name provided in the first parameter. Copy these files in a safe place.

Repeat the above for device connector service certificate:
```bash
bash create-cert-signed-by-ca.sh ccs3.device-connector.local ccs3-ca.crt ccs3-ca.key /C=BG/ST=Varna/O=CCS3/OU=Dev/CN=ccs3.device-connector.local serverAuth
```

The services need the `.crt` and `.key` file to operate correctly. Copy these files in the `certificates` directory of this project. The different services will look for different certificate files. These are the file names that are used by the services:
- Operator connector (operator browser are connecting to this service):
  - `ccs3.operator-connector.local.crt`
  - `ccs3.operator-connector.local.key`
- Device connector (applications that run on client computers are connecting to this service)
  - `ccs3.device-connector.local.crt`
  - `ccs3.device-connector.local.key`


## Client certificates
Client certificates are created the same way the service certiicates are (look previous section). When providing parameters, for domain name and CN value use the computer name. Sample usage for computer named `comp-1`:
```bash
bash create-cert-signed-by-ca.sh comp-1 ccs3-ca.crt ccs3-ca.key /C=BG/ST=Varna/O=CCS3/OU=Dev/CN=comp-1 clientAuth
```

## Installing client certificates on Windows computers
The client application running on Windows uses certificate to connect to services. Follow the section `Import the CA .crt file to each Windows computer` but use the path `Certificates (Local Computer) - Personal - Certificates` and import the client `.pfx` file (when borwsing for the file change the drop-down that filters by specific file extensions to point to `Personal Information Exchange (*.pfx)` to see the file). Importing `.pfx` file will ask you for the password provided when the certificate was created.

## Change `hosts` file of operator computer to associate domain name specified in the service certificate to the IP address of the service
The operator browser tries to connect to `https://ccs3.operator-connector.local:65443` and `wss://ccs3.operator-connector.local:65444`. This means the host `ccs3.operator-connector.local` must resolve to the IP address where the `operator-connector` service runs (the server computer IP address). Change the `hosts` file of the operator computer to include the following:
```
192.168.1.20 ccs3.operator-connector.local
``` 
Change `192.168.1.20` with the real IP address of the server computer where the `operator-connector` service is running.

## Using operator browser
Note: This will soon be deprecated after implementing web application static files serving and WebSocket connection are combined in a single HTTP server:

The certificate of `ccs3.operator-connector.local` is considered "not safe" by the browser. The operator must accept the certificate before connecting to the server. If you see certificate-related error in Chrome, click on "Advanced" button and then `Proceed to localhost (unsafe)` link. Open new tab and navigate to `https://ccs3.operator-connector.local:65444/` - this will cause Chrome to accept the certificate for the WebSocket connection. Now you can close this tab and refresh the previous tab `https://ccs3.operator-connector.local:65443/` - the browser should connect now without warnings or errors. 