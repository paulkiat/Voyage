# Rawh Pineapple Platform

- Contains the code for both the Rawh platform and the Customer/Org deployments
- Allows building of all Docker and npm packages
- Facilitates ease of first time setup and ongoing development

## Developer Setup

- requires NodeJS 20 or newer
- requires Java JRE 11 or newer
- requires 15GB of free disk space
- after running `git pull` instead of `npm i` run `npm run update`

### Mac

- `brew install zmq`
- `npm i`
- `script/seed-model.sh`

## Testing Setup

- start everything in test mode with one command

`node src/run/hub-org-llm.js --test --debug -err -llm`

OR

- start Rawh Hub server

`node src/hub/main`

- create at least one organizeional entity on the hub  at [http://localhost:8000](http://localhost:8000) 
- start organization server using `org-id` from the hub admin page

`node src/org/main --org-id=<org-id>`

- create at least one application for the organizeion at [http://localhost:9000](http://localhost:8000) 
- start organization server using `app-id` from the hub admin page

`node src/org/main --org-id=<app-id>`

- start the sample service using the `app-id` from the admin interface

`node src/web/app --app-id=<app-id>`

- access app directly (dev only) at [http://localhost:7000](http://localhost:7000)

## Web App Access

The Org web server at port `9000` will proxy calls to the app server under the `/app/[app-id]` urls. Each app also serves their own content directly for testing.

In production, you would not use the `--app-port` settting to the org server.
Instead, it would serve web traffic only through port `443`. When the key/cert files
are _not_ provided to the org environment (as a directory name), then the system will auto-generate a self-signed cert for testing.

## LevelDB NoSQL Storage
The Hub and Org servers use LevelDB as a back-end NoSQL store for meta-data and logging. There is a REST api available from localhost only. By default the **hub** webmin port is `8000` and the **org** webmin port is `9000`.

## LLM API package

`src/llm`  contains  llm-related services. To run these, the
script 
`script/seed-model.sh` needs to be run to get a basic quantized
llama-2-7b model for running locally and testing.


## Building Docker Images

- `script/build-docker-images.sh`

## Deploy Docker Images

- read-only acces to pull images from docker-hub with ...
- `docker login -u ...`
- password: `dckr_pat_...`
- run scripts: `script/start-dock-*` with ENV vars (read the scripts)

### Run Docker Hub Image

- `script/start-dock-hub.sh`
- use web admin (port 443) to create an org
- use `?` to add admin user for org
- copy org ID then

### Run Docker Org Image

- `ORG-ID=<org-id> HUB_HOST=<ip.of.hub.host> script/start-dock-org.sh`
- use web admin (port 443)
- copy org `secret` from hub web admin interface
- login as admin user specified as above
- use `secret`` to complete admin user setup

### Run Docker LLM Services

- `APP_ID=org ORG_HOST<ip.of.org.host> script/start-dock.org-llm.sh`

starts app the same way using app-specific containers

# Pineapple Source Tree

| directory   | description                                                     |
| ----------- | --------------------------------------------------------------- |
| `script`    | build, run, deploy scripts                                      |
| `src/app`   | organization application based api services                     |
| `src/cli`   | command line utilities and wrappers for testing                 |
| `src/hub`   | rawh hub that all customer organizations connect to             |
| `src/lib`   | libraries share by hub, org, apps                               |
| `src/llm`   | llm-related services: embed, chat, etc                          |
| `src/org`   | organization based services (proxy, web, meta, license)         |
| `src/run`   | helpers to run hub + org + llm + app under one parent process   |
| `src/test`  | informal testing artifacts                                      |
| `src-dock`  | build directories for all docker image types based on this repo |
| `src-py`    | python libraries ported from js (`lib/net`)                     |
| `src-react` | a sample react app for testing                                  |
| `web/app`   | a sample org app for testing apis                               |
| `web/hub`   | web admin interface for rawh hub                                |
| `web/org`   | web admin and proxy interface for organization                  |

### Security Constraints

- Write stuff that isn't susceptible to buffer overflow and memory leaks
- Make sure the memory that the app references can't be altered
- |-> and it can only run code from that memory block
- `-> and it can't be tricked to run code from another part of memory where a bad guy saved a malicious script
- Local storage can be tracked by local edr agent
- Do not allow app to have code injected

### Rendering Constraints

- No Precomputation: Real-time Calculation is ensured through the use of transitions, keyframes, and animations in various classes
- Performance Constraints: Ensuring performance by keeping transitions and animations lightweight and efficient
- Exact Visualization: Precise visual feedback provided through animations, transitions, and visual effects (e.g., box-shadow)
- Robustness: Consistent use of transitions and animations to provide a seamless and unbreakable user experience.

