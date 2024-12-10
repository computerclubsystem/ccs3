# Computer Club System 3

## Prerequisites
- NodeJS >= 20.11.0
- NPM >= 10.2.4

## Install
```bash
npm install
```

## Build
Build requires certain order - first build the dependencies and then the applications that depend on them. This is the order:
```bash
npm run build:libs/types
npm run build:libs/redis-client
npm run build:apps/state-manager
npm run build:apps/device-connector
```
The results can be found in the `dist` folder in the corresponding app (like `state-manager/dist` for the `state-manager` app).

To build everything with single command:
```bash
npm run build
```

## Debug
Debugging is configured for VSCode in `.vscode/launch.json` file. To debug the app, first build it (preferrably in `watch` mode) and then select the appropriate VSCode launch configuration. Applications have dependencies (like `apps/state-manager` depends on `libs/redis-client`) so these dependencies should also be build. To ensure a change in any component (application or library) will be reflected in the debugged application, execute all of these in their own terminals in the following order:

```bash
npm run libs/types:build-watch
npm run libs/redis-client:build-watch
npm run apps/state-manager:build-watch
npm run apps/device-connector:build-watch
```

After a source code change of any of them, the debugging session must be restarted.

## NPM workspaces
The code uses NPM workspaces so most of the `npm` commands must specify the workspace (by adding `-w` or `--workspace`) like:
```bash
npm -w apps/state-manager install ...
```

## Dependencies
The dependencies specified in the individual project's `package.json` files are installed in `node_modules` in the root folder. Individual apps/libs should not have `node_modules`. Since `node_modules` is shared among all the projects, try to use same dependencies with their exact versions - e.g. `"typescript": "5.3.3"`, not `"typescript": "^5.3.3"`.

## Add new app
- Create folder `apps/<new-app-name>`
- Create folder `apps/<new-app-name>/src` which will be used to put the application files
- Create `apps/<new-app-name>/index.mts` which will be used to only export all public types (like `export * from './src/.....mjs`)
- Create `apps/<new-app-name>/package.json` specifying the `"name": "@computerclubsystem/<new-app-name>"`. Sample `package.json`:
```json
{
    "name": "@computerclubsystem/<new-app-name>",
    "version": "1.0.0",
    "description": "",
    "author": "",
    "type": "module",
    "scripts": {
        "build": "tsc --project tsconfig.json --sourceMap",
        "build:watch": "tsc --project tsconfig.json --sourceMap --watch",
        "tsc": "tsc"
    },
    "license": "ISC",
    "dependencies": {
        "<name-from-package.json-of-some-lib-like-@computerclubsystem/redis-client>": "*"
    },
    "devDependencies": {
        "@types/node": "20.11.5",
        "typescript": "5.3.3"
    }
}
```
- From the root folder install the new app dependencies:
```bash
npm -w apps/<new-app-name> install
```
- Make sure its folder is created in `node_modules/@computerclubsystem`
- Initialize TypeScript:
```bash
npm -w apps/<new-app-name> tsc -- --init
```
- The folder strucutre should look like this:
```
apps/
  <new-app-name>/
    src/
      index.mts (app startup file)
      <other app source files here>
  index.mts
  package.json
  tsconfig.json
```
- Change the `apps/<new-app-name>/tsconfig.json` to include the correct configuration like:
```json
{
    "compilerOptions": {
        "target": "ESNext",
        "module": "NodeNext",
        "moduleResolution": "NodeNext",
        "baseUrl": "./",
        "outDir": "./dist",
        "esModuleInterop": true,
        "forceConsistentCasingInFileNames": true,
        "strict": true,
        "skipLibCheck": true 
    }
}
```
- Add build scripts in the root `package.json`:
```json
"scripts": {
    "build:apps/<new-app-name>": "npm --workspace apps/<new-app-name> run build",
    "build:apps/<new-app-name>:watch": "npm --workspace apps/<new-app-name> run build:watch"
}
```

## Add new library
- Create folder `libs\<new-lib-name>`
- Create folder `libs\<new-lib-name>\src`
- Create file `libs\<new-lib-name>\index.mts` which will be used to only export all public types from `./src...` (like `export * from './src/.....mjs`)
- Create file `libs\<new-lib-name>\package.json` specifying the `"name": "@computerclubsystem/<new-lib-name>"`. Sample `package.json`:
```json
{
    "name": "@computerclubsystem/<new-lib-name>",
    "version": "1.0.0",
    "description": "",
    "type": "module",
    "types": "dist/*/**.d.ts",
    "exports": {
        ".": "./dist/index.mjs"
    },
    "scripts": {
        "build": "tsc --project tsconfig.json --sourceMap",
        "build:watch": "tsc --project tsconfig.json --sourceMap --watch",
        "tsc": "tsc"
    },
    "author": "",
    "license": "ISC",
    "dependencies": {
        "redis": "4.6.12"
    },
    "devDependencies": {
        "typescript": "5.3.3"
    }
}
```
- From the project root folder install the new lib dependencies:
```bash
npm -w libs/<new-lib-name> install
```
- Make sure its folder is created in `node_modules/@computerclubsystem`
- Initialize TypeScript:
```bash
npm -w libs/<new-lib-name> run tsc -- --init
```
- The folder strucutre should look like this:
```
libs/
  <new-lib-name>/
    src/
      <lib source files here>
  index.mts
  package.json
  tsconfig.json
```
- Change the `libs/<new-lib-name>/tsconfig.json` to include the correct configuration like:
```json
{
    "compilerOptions": {
        "target": "ESNext",
        "module": "NodeNext",
        "moduleResolution": "NodeNext",
        "baseUrl": "./",
        "outDir": "./dist",
        "declaration": true,
        "declarationMap": true,
        "esModuleInterop": true,
        "forceConsistentCasingInFileNames": true,
        "strict": true,
        "skipLibCheck": true 
    }
}
```
- Add build scripts in the root `package.json`:
```json
"scripts": {
    "build:libs/<new-lib-name>": "npm --workspace libs/<new-lib-name> run build",
    "build:libs/<new-lib-name>:watch": "npm --workspace libs/<new-lib-name> run build:watch"
}
```
- Build the new library by running:
```bash
npm run build:libs/<new-lib-name>
```
- Add the library as dependency to the app that needs it in `dependencies` in the app's `package.json`:
```json
    "dependencies": {
        "@computerclubsystem/<new-lib-name>": "*"
    },
```
- Install the new dependency in the app that uses the new library:
```bash
npm -w app/<app-name> install
```
- Use the library in the app:
```typescript
import { ... } from '@computerclubsystem/<new-lib-name>'
```

## Build docker images
DevOps related files are in `devops` folder. Each dockerfile has a comment in the beginning showing a sample command line that builds the image. The `package.json` file has npm scripts for building images if Docker Desktop is used or Rancher Desktop is used with `containerd` (`nerdctl`) like:
```bash
npm run apps/state-manager:build-image-docker
```
or
```bash
npm run apps/state-manager:build-image-racnher-nerdctl
```

Building `state-manager` manually would look like this for Docker Desktop:
```bash
docker build -t ccs3/state-manager:0.0.1 -f Dockerfile.state-manager ../apps/state-manager
```

Building `state-manager` manually would look like this for Rancher Desktop with `containerd` (`nerdctl`):
```bash
nerdctl -n k8s.io build -t ccs3/state-manager:0.0.1 -f Dockerfile.state-manager ../apps/state-manager
```

Building all the images for Docker Desktop:
```bash
npm run build-images-docker
```

Building all the images for Rancher Desktop with `containerd` (`nerdctl`):
```bash
npm run build-images-rancher-nerdctl
```

## Kubernetes
Before executing Kubernetes commands using `kubectl`, create namespaces for dev and staging environments:
```bash
kubectl create namespace ccs3-dev-namespace
kubectl create namespace ccs3-staging-namespace
```
Then switch to the appropriate Kubernetes namespace with:

### Development namespace
```bash
kubectl config set-context --current --namespace=ccs3-dev-namespace
```

For development environment, apply the file `devops/ccs3-dev.yaml` - this one exposes Redis through LoadBalancer service so it is available for local development and apps debugged locally will be able to access Redis which runs inside Kubernetes cluster:
```bash
kubectl apply -f ./devops/ccs3-dev.yaml
```

### Staging namespace
```bash
kubectl config set-context --current --namespace=ccs3-staging-namespace
```

For prod environment, apply the file `devops/ccs3-staging.yaml`:
```bash
kubectl apply -f ./devops/ccs3-staging.yaml
```

## Certificates
Look at `certificates/README.md`