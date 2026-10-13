#!/bin/sh
# Updates the Duckoder server to one version. The deploy workflow sends it to the EC2 instance
# through Systems Manager, which runs it as root after setting TAG, IMAGE, REGISTRY and REPOSITORY,
# and DOMAIN when the site has one. The model runs on the instance's NVIDIA GPU when it has one.
set -eu

APP_DIR=/opt/duckoder
# How long the new web server may take to report healthy once its container starts.
HEALTHY_TIMEOUT_S=120

# Downloads one of the files of this version from the public repository.
fetch() {
    curl -fsSL "https://raw.githubusercontent.com/$REPOSITORY/$TAG/$1" -o "$1"
}

# Sets a line of .env, which Compose reads in this folder, or removes it when the value is empty.
# Other settings added to .env, such as APP_OLLAMA_MODEL, are kept.
set_env() {
    sed -i "/^$1=/d" .env
    if [ -n "$2" ]; then
        echo "$1=$2" >> .env
    fi
}

mkdir -p "$APP_DIR"
cd "$APP_DIR"

# Docker gets the ECR credentials from the instance role through the credential helper, so the
# server stores no password and needs no docker login.
export DOCKER_CONFIG=/root/.docker
mkdir -p "$DOCKER_CONFIG"
printf '{ "credHelpers": { "%s": "ecr-login" } }\n' "$REGISTRY" > "$DOCKER_CONFIG/config.json"

# The services as the version describes them, and that version's image for the web server.
fetch compose.yaml
touch .env
set_env DUCKODER_IMAGE "$IMAGE"

# The Compose files this server combines, which Compose reads from COMPOSE_FILE in .env.
files=compose.yaml

# With a domain, Caddy serves the site over HTTPS on ports 80 and 443, from compose.proxy.yaml;
# without one, the web server answers on port 8000.
# The bare domain, also when the variable was given with www.
domain=${DOMAIN:-}
domain=${domain#www.}
if [ -n "$domain" ]; then
    fetch compose.proxy.yaml
    files="$files:compose.proxy.yaml"
else
    rm -f compose.proxy.yaml
fi
set_env DUCKODER_DOMAIN "$domain"

# On an instance with an NVIDIA GPU, Ollama runs the model on it, from compose.gpu.yaml.
if nvidia-smi -L > /dev/null 2>&1; then
    echo "Running the model on $(nvidia-smi -L | head -n 1)"
    fetch compose.gpu.yaml
    files="$files:compose.gpu.yaml"
else
    rm -f compose.gpu.yaml
fi
set_env COMPOSE_FILE "$files"

docker compose pull --quiet
# The first start waits for the model download, several minutes, before starting the server.
# Turning the domain off leaves the proxy out of the services, so it is removed as an orphan.
docker compose up -d --no-build --remove-orphans

container=$(docker compose ps -q app)
waited=0
until [ "$(docker inspect -f '{{.State.Health.Status}}' "$container")" = healthy ]; do
    if [ "$waited" -ge "$HEALTHY_TIMEOUT_S" ]; then
        docker compose logs --tail 50 app
        echo "The web server did not become healthy in $HEALTHY_TIMEOUT_S s." >&2
        exit 1
    fi
    sleep 5
    waited=$((waited + 5))
done

# The images of earlier versions are no longer needed; the model and the conversations are in
# volumes, which stay.
docker image prune -f
docker compose ps
echo "Duckoder $TAG is running."
