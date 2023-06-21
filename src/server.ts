import http from "http";
import fs from "fs";

const PORT = 8080;

export function createHttpServer() {
  const transcript = fs.readFileSync("data/transcript-render.html", "utf8");
  http
    .createServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.write(transcript);
      res.end();
    })
    .listen(PORT);

  console.log(`Listening on http://localhost:${PORT}`);
}
