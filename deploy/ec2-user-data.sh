#!/bin/bash
# User data for the Duckoder server, pasted in "Advanced details > User data" when launching the
# instance: on Ubuntu Server 24.04 LTS or, for a GPU instance, on the Deep Learning Base OSS Nvidia
# Driver GPU AMI (Ubuntu 24.04), which already has Docker and the NVIDIA drivers. It installs what
# is missing of Docker, Compose and the ECR credential helper; the first deploy from GitHub Actions
# then downloads the model and starts the services.
set -euxo pipefail

export DEBIAN_FRONTEND=noninteractive
apt-get update
if ! command -v docker > /dev/null; then
    apt-get install -y docker.io
fi
if ! docker compose version > /dev/null 2>&1; then
    # Docker's packages name the Compose plugin docker-compose-plugin; Ubuntu's, docker-compose-v2.
    apt-get install -y docker-compose-plugin || apt-get install -y docker-compose-v2
fi
apt-get install -y amazon-ecr-credential-helper

# Container logs rotate instead of filling the disk. The other Docker settings, such as the NVIDIA
# runtime on the GPU image, are kept.
python3 - <<'PY'
import json
from pathlib import Path

path = Path("/etc/docker/daemon.json")
config = json.loads(path.read_text()) if path.exists() else {}
config.update({"log-driver": "json-file", "log-opts": {"max-size": "10m", "max-file": "3"}})
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text(json.dumps(config, indent=2) + "\n")
PY
systemctl enable docker
systemctl restart docker

mkdir -p /opt/duckoder
