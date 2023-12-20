import express from "express";
import fs from "fs";
import parseTranscript from "./parseTranscript.js";

const PORT = 8080;

export function createHttpServer() {
    const app = express();

    app.get("/api/transcript", (req, res) => {
        const transcriptData = parseTranscript(fs.readFileSync("data/transcript.html", "utf8"));

        return res.send(transcriptData);
    });

    app.listen(PORT);
    console.log(`Listening on http://localhost:${PORT}`);
}
