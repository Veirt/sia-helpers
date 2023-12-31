import * as cheerio from "cheerio";

export type KHS = {
    no: number;
    kelas: string;
    matakuliah: string;
    dosen: Array<String>;
    wp: string;
    sks: number;
    nilaiAngka: number;
    nilaiHuruf: string;
    bobot: number;
    sksxbobot: number;
};

export default function parseKhs(khs: string) {
    const $ = cheerio.load(khs);

    const rows = $("tr");

    const data: KHS[] = [];

    for (const row of rows) {
        // not valid row if it's not 21
        if (row.children.length !== 21) {
            continue;
        }

        const no = parseInt($(row.children[3]).html()!);
        const kelas = $(row.children[5]).html()!;
        const matakuliah = $(row.children[7]).html()!.split("<br>")[0].trim();

        // get list dosen
        const dosen = [];
        const $dosen = cheerio.load($(row.children[7]).html()!);
        for (const prof of $dosen(".badge.badge-primary")) {
            dosen.push($(prof).html()!.trim());
        }

        // if NaN, convert it to 0.
        let nilaiAngka = parseFloat($(row.children[13]).html()!) || 0;

        const wp = $(row.children[9]).html()!;
        const sks = parseInt($(row.children[11]).html()!) || 0;

        const nilaiHuruf = $(row.children[15]).html()!;
        const bobot = parseFloat($(row.children[17]).html()!) || 0;
        const sksxbobot = parseFloat($(row.children[19]).html()!) || 0;

        data.push({
            no,
            kelas,
            matakuliah,
            dosen,
            wp,
            sks,
            nilaiAngka,
            nilaiHuruf,
            bobot,
            sksxbobot,
        });
    }

    return data;
}
