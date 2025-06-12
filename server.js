const express = require("express");
const bodyParser = require("body-parser");
const { exec } = require("child_process");
const fs = require("fs");
const { Tail } = require("tail");
const { spawn } = require("child_process");

const app = express();
const PORT = 3000;

app.use(bodyParser.json());

const LOG_FILE = "./deploy.log";
let isDeploying = false;

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.get("/deploy", (req, res) => {
  if (isDeploying) {
    return res.status(429).send("⚠️ Deploy đang diễn ra. Vui lòng đợi.");
  }

  isDeploying = true;
  console.log("📦 Webhook received");

  fs.writeFileSync(LOG_FILE, "");
  fs.appendFileSync(
    LOG_FILE,
    `\n== Webhook Received at ${new Date().toISOString()} ==\n`
  );

  const child = exec("bash ./deploy.sh");

  child.stdout.on("data", (data) => {
    fs.appendFileSync(LOG_FILE, data);
  });

  child.stderr.on("data", (data) => {
    fs.appendFileSync(LOG_FILE, data);
  });

  child.on("exit", (code) => {
    fs.appendFileSync(LOG_FILE, `Script exited with code ${code}\n`);
    isDeploying = false; // ✅ Mở lại quyền deploy
  });

  child.on("error", (err) => {
    fs.appendFileSync(LOG_FILE, `Lỗi khi chạy deploy: ${err.message}\n`);
    isDeploying = false;
  });

  res.status(200).send("Webhook received. Deployment started.");
});

// Route để xem log
app.get("/log/deploy", (req, res) => {
  res.setHeader("Content-Type", "text/plain");

  const tail = new Tail(LOG_FILE);

  tail.on("line", (data) => {
    res.write(data + "\n");
  });

  tail.on("error", (err) => {
    res.write(`Lỗi: ${err.message}`);
    res.end();
  });

  req.on("close", () => {
    tail.unwatch();
    res.end();
  });
});

app.get("/log/server", (req, res) => {
  res.setHeader("Content-Type", "text/plain");

  const logStream = spawn("docker", ["logs", "-f", `ai-agent`]);

  logStream.stdout.on("data", (data) => {
    res.write(data);
  });

  logStream.stderr.on("data", (data) => {
    res.write(`STDERR: ${data}`);
  });

  logStream.on("close", () => {
    res.end("== Kết thúc log ==\n");
  });

  req.on("close", () => {
    logStream.kill();
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
