#!/bin/bash
# User data for the Duckoder server on Ubuntu Server 24.04 LTS, pasted in "Advanced details >
# User data" when launching the instance. It installs Docker, Compose and the ECR credential
# helper; the first deploy from GitHub Actions then downloads the model and starts the services.
set -euxo pipefail

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y docker.io docker-compose-v2 amazon-ecr-credential-helper

# Container logs rotate instead of filling the disk.
cat > /etc/docker/daemon.json <<'JSON'
{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" } }
JSON
systemctl enable docker
systemctl restart docker

mkdir -p /opt/duckoder
