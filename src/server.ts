import express from "express";
import fs from "fs";
import parseKhs from "./parseKhs.js";

const PORT = 8080;

export function createHttpServer() {
    const app = express();

    app.get("/api/khs", (_req, res) => {
        const khsData = parseKhs(fs.readFileSync("data/khs.html", "utf8"));

        return res.send(khsData);
    });

    app.listen(PORT);
    console.log(`Listening on http://localhost:${PORT}`);
}
