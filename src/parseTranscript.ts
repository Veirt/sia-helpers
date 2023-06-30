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

type Lecturer = {
  [nip: string]: string;
};

const LECTURER: Lecturer = {
  "196909261994121002": "Dr. H. Fahrul Agus, S.Si, MT",
  "196812242000031001": "Dr. Ir. Nataniel Dengen, S.Si, M.Si",
  "197211012001122001": "Ramadiani, S.Pd, M.Si, M.Kom, Ph.D",
  "197305281999031001": "Ir. Haviluddin, S.Kom, M.Kom, Ph.D",
  "197312292005011002": "Awang Harsa Kridalaksana, S.Kom, M.Kom",
  "197701032005011003": "Zainal Arifin, S.Kom, M.Kom",
  "197906062005011006": "Dr. Ir. Hamdani, ST, M.Cs",
  "197908092005011013": "Dedy Cahyadi, S.Kom, M.Eng",
  "198105062005012002": "Indah Fitri Astuti, S.Kom, M.Cs",
  "197801282008121001": "Addy Suyatno Hadisuwito, S.Kom, M.Kom",
  "197701192008122001": "Joan Angelina Widians, S.Kom, M.Kom",
  "198004042012121003": "Ir. Edy Budiman, S.Pd, MT",
  "198209012009122003": "Dr. Anindita Septiarini, ST, M.Cs",
  "198408062015042002": "Ummul Hairah, S.Pd, MT",
  "198506292012121002": "Arda Yunianta, S.Kom, M.Eng, Ph.D",
  "198507152008122003": "Ir. Heliza Rahmania Hatta, S.Kom, M.Kom",
  "198509212019032017": "Rosmasari, S.Kom, MT",
  "198511032014042002": "Masna Wati, S.Si, MT",
  "198811062015042002": "Ir. Novianti Puspitasari, S.Kom, M.Eng",
  "198905222018031001": "Medi Taruk, S.Kom, M.Cs",
  "199211062019031019": "Muhammad Bambang Firdaus, S.Kom, M.Kom",
  "199310222019031016": "Anton Prafanto, S.Kom, MT",
  "197607262006042001": "Andi Tejawati, M.Si",
  "0020099102": "Herman Santoso Pakpahan, S.Si, M.PFis",
  "0004049008": "Gubtha Mahendra Putra, S.Kom, M.Eng",
  "0027079102": "Reza Wardhana, S.Kom, M.Eng",
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
    const nilai_angka = parseFloat($(row.children[13]).html()!);
    const nilai_huruf = $(row.children[15]).html()!;
    const bobot = parseFloat($(row.children[17]).html()!);

    let keterangan = $(row.children[19]).html()!;
    const [nip, ...date] = keterangan.split(" ");
    if (nip !== "" && LECTURER[nip] !== undefined) {
      const lecturerName = LECTURER[nip];
      keterangan = `${lecturerName} ${date}`;
    }

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
