import * as cheerio from "cheerio";

type Transcript = {
  no: number;
  kelas: string;
  kode: string;
  matakuliah: string;
  wp: string;
  semester: number;
  sks: number;
  nilai_angka: number;
  nilai_huruf: string;
  bobot: number;
  keterangan: string;
};

export default function parseTranscript(transcript: string) {
  const $ = cheerio.load(transcript);
  const table = $("tbody");

  const rows = $(table)
    .find("tr")
    .filter((_, row) => {
      // if there are 11 TDs, that means it's a valid transcript data.
      const validTranscriptData = $(row).find("td").length === 11;

      return validTranscriptData;
    });

  const transcriptData: Array<Transcript> = [];

  for (const row of rows) {
    const no = parseInt($(row.children[0]).html()!);
    const kelas = $(row.children[2]).html()!;
    const kode = $(row.children[4]).html()!;
    const matakuliah = $(row.children[6]).html()!;
    const wp = $(row.children[8]).html()!;
    const semester = parseInt($(row.children[10]).html()!);
    const sks = parseInt($(row.children[12]).html()!);
    const nilai_angka = parseInt($(row.children[13]).html()!);
    const nilai_huruf = $(row.children[15]).html()!;
    const bobot = parseInt($(row.children[17]).html()!);
    const keterangan = $(row.children[19]).html()!;

    transcriptData.push({
      no,
      kelas,
      kode,
      matakuliah,
      wp,
      semester,
      sks,
      nilai_angka,
      nilai_huruf,
      bobot,
      keterangan,
    });
  }

  return transcriptData;
}
