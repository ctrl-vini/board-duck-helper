#!/bin/sh
# Updates the Duckoder server to one version. The deploy workflow sends it to the EC2 instance
# through Systems Manager, which runs it as root after setting TAG, IMAGE, REGISTRY and REPOSITORY.
set -eu

APP_DIR=/opt/duckoder
# How long the new web server may take to report healthy once its container starts.
HEALTHY_TIMEOUT_S=120

mkdir -p "$APP_DIR"
cd "$APP_DIR"

# Docker gets the ECR credentials from the instance role through the credential helper, so the
# server stores no password and needs no docker login.
export DOCKER_CONFIG=/root/.docker
mkdir -p "$DOCKER_CONFIG"
printf '{ "credHelpers": { "%s": "ecr-login" } }\n' "$REGISTRY" > "$DOCKER_CONFIG/config.json"

# The services as the version describes them, read from the public repository, and that
# version's image for the web server. Other settings added to .env, such as APP_OLLAMA_MODEL,
# are kept.
curl -fsSL "https://raw.githubusercontent.com/$REPOSITORY/$TAG/compose.yaml" -o compose.yaml
touch .env
sed -i '/^DUCKODER_IMAGE=/d' .env
echo "DUCKODER_IMAGE=$IMAGE" >> .env

docker compose pull --quiet
# The first start waits for the model download, several minutes, before starting the server.
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
