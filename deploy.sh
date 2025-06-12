#!/bin/bash
echo ">>> Deploy script started at $(date)"
cd && cd xeleb-agent|| exit
git pull
docker stop ai-agent || true
docker rm ai-agent || true
docker build -t ai-agent .
docker run -d --name ai-agent -p 8080:8080 ai-agent
echo ">>> Deploy script finished at $(date)"
