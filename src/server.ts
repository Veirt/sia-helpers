import express from "express";
import fs from "fs";
import parseKhs from "./lib/parseKhs.js";

const PORT = 8080;

export function createHttpServer() {
    const app = express();

    app.get("/", (_req, res) => {
        res.sendFile("views/khs.html", { root: "." });
    });

    app.get("/api/khs", (req, res) => {
        const khsData = parseKhs(fs.readFileSync("data/khs.html", "utf8"));

        const accepts = req.accepts();
        if (accepts.length === 1 && accepts[0] === "text/html") {
            let html = "";
            for (const data of khsData) {
                html += "<tr>";
                html += `<td>${data.no}</td>`;
                html += `<td>${data.kelas}</td>`;
                html += `<td>${data.matakuliah}</td>`;
                html += `<td>${data.dosen.join("<br>")}</td>`;
                html += `<td>${data.wp}</td>`;
                html += `<td>${data.sks}</td>`;
                html += `<td>${data.nilaiAngka}</td>`;
                html += `<td>${data.nilaiHuruf}</td>`;
                html += `<td>${data.bobot}</td>`;
                html += `<td>${data.sksxbobot}</td>`;
                html += "</tr>";
            }
            return res.send(html);
        }

        return res.send(khsData);
    });

    app.listen(PORT);
    console.log(`Listening on http://localhost:${PORT}`);
}

createHttpServer();
