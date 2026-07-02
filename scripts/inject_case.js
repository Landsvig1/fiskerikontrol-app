const fs = require('fs');

const dataPath = 'public/data/graph_data.json';
const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

// Extract excerpts manually or procedurally. Let's define them manually since we read them.
const excerpts = [
  { id: "case_uddrag_A", label: "Art. 62, stk. 1", title: "Uddrag A - Salgsnota og frist", doc: "control", theme: "Kandidat Case", body: "Registrerede købere... senest 48 timer efter det første salg indsende en salgsnota..." },
  { id: "case_uddrag_B", label: "Art. 60, stk. 1", title: "Uddrag B - Vejning straks efter landing", doc: "control", theme: "Kandidat Case", body: "Medlemsstaterne sørger for, at alle mængder af fiskevarer straks efter landing i en medlemsstat vejes pr. art..." },
  { id: "case_uddrag_C", label: "Art. 34, stk. 2", title: "Uddrag C - Præsentationsform og forarbejdningstilstand", doc: "impl", theme: "Kandidat Case", body: "Den præsentationsform, der er omhandlet i artikel 64, stk. 1... skal omfatte forarbejdningstilstand..." },
  { id: "case_uddrag_D", label: "Art. 17, stk. 1", title: "Uddrag D - Forhåndsmeddelelse", doc: "control", theme: "Kandidat Case", body: "Med forbehold af særlige bestemmelser... fire timer før forventet ankomst..." },
  { id: "case_uddrag_E", label: "Art. 64, stk. 1", title: "Uddrag E - Salgsnota indhold", doc: "control", theme: "Kandidat Case", body: "Salgsnotaerne omhandlet i artikel 62 skal have et entydigt identifikationsnummer..." },
  { id: "case_uddrag_F", label: "Art. 32, stk. 1", title: "Uddrag F - Transport og vejning før afslutning", doc: "impl", theme: "Kandidat Case", body: "Når fiskevarer transporteres fra landingsstedet, inden de er blevet vejet... anses landingen først for afsluttet, når fiskevarerne er blevet vejet." },
  { id: "case_uddrag_G", label: "Art. 62, stk. 4", title: "Uddrag G - Første salg uden for Unionen", doc: "control", theme: "Kandidat Case", body: "Hvis det første salg finder sted uden for Unionen... senest 48 timer efter..." },
  { id: "case_uddrag_H", label: "Art. 34, stk. 1", title: "Uddrag H - Elektronisk salgsnota form", doc: "impl", theme: "Kandidat Case", body: "Uden at det berører de undtagelser... skal udfylde og indsende en salgsnota elektronisk..." },
  { id: "case_uddrag_I", label: "Art. 23, stk. 2", title: "Uddrag I - Landingsopgørelse", doc: "control", theme: "Kandidat Case", body: "Den i stk. 1 omhandlede landingsopgørelse skal mindst indeholde følgende oplysninger..." },
  { id: "case_uddrag_J", label: "Art. 17, stk. 1a", title: "Uddrag J - Kortere frist for forhåndsmeddelelse", doc: "control", theme: "Kandidat Case", body: "Den kystmedlemsstat hvor landingen finder sted, kan fastsætte en kortere frist..." },
  { id: "case_uddrag_K", label: "Art. 62, stk. 6", title: "Uddrag K - Gennemførelsesretsakter", doc: "control", theme: "Kandidat Case", body: "Kommissionen kan ved gennemførelsesretsakter fastsætte nærmere regler for..." },
  { id: "case_uddrag_L", label: "Art. 34, stk. 3", title: "Uddrag L - Valuta for pris", doc: "impl", theme: "Kandidat Case", body: "Prisen, jf. artikel 64, stk. 1, litra n), i forordning... angives i valutaen i den medlemsstat, hvor salget finder sted." }
];

const links = [
  { source: "case_uddrag_A", target: "case_uddrag_E", type: "reference", modality: "Obligation", snippet: "omhandlet i artikel 64, stk. 1", context: "Salgsnotaens indhold." },
  { source: "case_uddrag_C", target: "case_uddrag_E", type: "reference", modality: "Obligation", snippet: "omhandlet i artikel 64, stk. 1", context: "Præciserer forarbejdningstilstand." },
  { source: "case_uddrag_E", target: "case_uddrag_A", type: "reference", modality: "Obligation", snippet: "omhandlet i artikel 62", context: "Salgsnotaen hænger sammen med kravet i art. 62." },
  { source: "case_uddrag_F", target: "case_uddrag_B", type: "reference", modality: "Obligation", snippet: "vejning... artikel 60", context: "Vejning inden afslutning af landing." },
  { source: "case_uddrag_H", target: "case_uddrag_A", type: "reference", modality: "Obligation", snippet: "artikel 62", context: "Skal indsende salgsnota efter art 62." },
  { source: "case_uddrag_H", target: "case_uddrag_E", type: "reference", modality: "Obligation", snippet: "artikel 64", context: "Skal indsende salgsnota efter art 64." },
  { source: "case_uddrag_I", target: "case_uddrag_B", type: "reference", modality: "Obligation", snippet: "artikel 60", context: "Vejning i overensstemmelse med art 60." },
  { source: "case_uddrag_J", target: "case_uddrag_D", type: "reference", modality: "Exception", snippet: "stk. 1 omhandlede forhåndsmeddelelse", context: "Kortere frist kan fastsættes." },
  { source: "case_uddrag_K", target: "case_uddrag_A", type: "reference", modality: "Permission", snippet: "salgsnotaernes format", context: "Bemyndigelse til at fastsætte regler." },
  { source: "case_uddrag_L", target: "case_uddrag_E", type: "reference", modality: "Obligation", snippet: "artikel 64, stk. 1, litra n)", context: "Præciserer prisen." }
];

// Append to data
data.nodes = data.nodes.filter(n => n.theme !== "Kandidat Case");
data.links = data.links.filter(l => !l.source.startsWith("case_uddrag_") && !l.target.startsWith("case_uddrag_"));

excerpts.forEach((e, i) => {
  e.number = 99000 + i; // fake number for sorting
  data.nodes.push(e);
});
links.forEach(l => data.links.push(l));

fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
console.log("Injected case data.");
