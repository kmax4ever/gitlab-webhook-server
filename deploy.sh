#!/bin/bash
echo ">>> Deploy script started at $(date)"
cd && cd xeleb-agent|| exit
echo ">>> pull last develop at $(date)"
git pull
sudo docker stop ai-agent || true
sudo docker rm ai-agent || true
sudo docker build -t ai-agent .
sudo docker run -d --name ai-agent -p 8080:8080 ai-agent
echo ">>> Deploy script finished at $(date)"
