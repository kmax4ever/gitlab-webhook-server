const express = require("express");
const { spawn } = require("child_process");

const app = express();
const PORT = 3000;

let isDeploying = false;

app.get("/deploy", (req, res) => {
  if (isDeploying) {
    return res.status(429).send("⚠️ Deploy đang diễn ra. Vui lòng đợi.");
  }

  isDeploying = true;
  res.setHeader("Content-Type", "text/plain");

  res.write(`📦 Bắt đầu deploy: ${new Date().toISOString()}\n\n`);

  // Chạy deploy.sh và stream trực tiếp
  const deploy = spawn("bash", ["./deploy.sh"]);

  deploy.stdout.on("data", (data) => {
    res.write(data);
  });

  deploy.stderr.on("data", (data) => {
    res.write(`STDERR: ${data}`);
  });

  deploy.on("error", (err) => {
    res.write(`❌ Lỗi khi chạy deploy: ${err.message}`);
    res.end();
    isDeploying = false;
  });

  deploy.on("close", (code) => {
    res.write(`\n✅ Deploy kết thúc với mã ${code}\n`);
    res.write(`\n🐳 Đang bắt đầu đọc log container...\n\n`);

    // Sau khi deploy xong, tiếp tục stream docker logs
    const containerLog = spawn("docker", ["logs", "-f", "ai-agent"]);

    containerLog.stdout.on("data", (data) => {
      res.write(data);
    });

    containerLog.stderr.on("data", (data) => {
      res.write(`STDERR: ${data}`);
    });

    containerLog.on("close", () => {
      res.write("\n🛑 Kết thúc log container\n");
      res.end();
      isDeploying = false;
    });

    req.on("close", () => {
      containerLog.kill();
      isDeploying = false;
    });
  });

  req.on("close", () => {
    deploy.kill();
    isDeploying = false;
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
