# Quellenprüfung der Trainingsregeln

Stand: 5. Oktober 2026. Für die fachkundige Person: jede Quelle, die eine Regel des Registers (`src/data/trainingRules.ts`) trägt, mit Verweis, DOI-Link und der Frage, was im Volltext zu prüfen ist. **Keine Regel gilt als geprüft, solange nicht jede ihrer Quellen im Volltext gelesen ist** (`fullTextChecked`) und eine Fachperson mit Namen und Datum zugestimmt hat. Bisher gelesen wurden nur Abstracts.

Zum Zugang: Ich kann hier nicht prüfen, ob ein Volltext frei verfügbar ist. «Open Access» steht nur dort, wo der Verlag grundsätzlich offen veröffentlicht (MDPI, Frontiers); sonst «über Verlag oder Bibliothek».

## Quellen

| Kennung | Quelle | DOI | Zugang | Trägt die Regel(n) | Volltext gelesen |
|---|---|---|---|---|---|
| `helgerud_2007` | Helgerud J, Høydal K, Wang E, et al. (2007). Aerobic high-intensity intervals improve VO₂max more than moderate training. Med Sci Sports Exerc 39(4):665-71. | [10.1249/mss.0b013e3180304570](https://doi.org/10.1249/mss.0b013e3180304570) | über Verlag oder Bibliothek, Open-Access-Status nicht geprüft | 4×4-Intervalle (VO₂max) | nein |
| `rst_meta_2023` | Thurlow F, et al. (2024). Effects of Repeated-Sprint Training on Physical Fitness and Physiological Adaptation in Athletes. Sports Med. | [10.1007/s40279-023-01959-1](https://doi.org/10.1007/s40279-023-01959-1) | über Verlag oder Bibliothek, Open-Access-Status nicht geprüft | Wiederholte Sprints 30 m | nein |
| `acsm_2026` | Currier BS, et al. (2026). ACSM Position Stand: Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults. Med Sci Sports Exerc. | [10.1249/MSS.0000000000003897](https://doi.org/10.1249/MSS.0000000000003897) | über Verlag oder Bibliothek, Open-Access-Status nicht geprüft | Maximalkraft, Power (30–70 % 1RM) | nein |
| `combat_strength_2023` | Cid-Calfucura I, et al. (2023). Effects of Strength Training on Physical Fitness of Olympic Combat Sports Athletes. Int J Environ Res Public Health. | [10.3390/ijerph20043516](https://doi.org/10.3390/ijerph20043516) | Open Access (MDPI) | Maximalkraft, Power (30–70 % 1RM) | nein |
| `combat_plyo_2023` | Ojeda-Aravena A, et al. (2023). Plyometric-Jump Training on Physical Fitness of Combat Sport Athletes. Sports (Basel). | [10.3390/sports11020033](https://doi.org/10.3390/sports11020033) | Open Access (MDPI) | Plyometrie Kampfsport | nein |
| `concurrent_2024` | Huiberts RO, et al. (2024). Concurrent Strength and Endurance Training: impact of sex and training status. Sports Med. | [10.1007/s40279-023-01943-9](https://doi.org/10.1007/s40279-023-01943-9) | über Verlag oder Bibliothek, Open-Access-Status nicht geprüft | (nur Hinweis zur Studienlage, keine Dosis) | nein |
| `concurrent_umbrella_2026` | Held S, et al. (2026). Maximizing Adaptations in Concurrent Training: An Umbrella Review of Meta-analyses. Sports Med. | [10.1007/s40279-026-02401-y](https://doi.org/10.1007/s40279-026-02401-y) | über Verlag oder Bibliothek, Open-Access-Status nicht geprüft | (nur Hinweis zur Studienlage, keine Dosis) | nein |
| `heavy_strength_cyclists_2025` | Llanos-Lagos C, et al. (2025). Heavy strength training effects on physiological determinants of endurance cyclist performance. Eur J Appl Physiol. | [10.1007/s00421-025-05883-2](https://doi.org/10.1007/s00421-025-05883-2) | über Verlag oder Bibliothek, Open-Access-Status nicht geprüft | Maximalkraft | nein |
| `hyrox_demand_2025` | Brandt T, et al. (2025). Acute physiological responses and performance determinants in Hyrox. Front Physiol. | [10.3389/fphys.2025.1519240](https://doi.org/10.3389/fphys.2025.1519240) | Open Access (Frontiers) | (nur Hinweis zur Studienlage, keine Dosis) | nein |
| `hift_scoping_2025` | Villarroel López P, Juárez Santos-García D. (2025). HIFT in Hybrid Competitions: A Scoping Review of Performance Models and Physiological Adaptations. J Funct Morphol Kinesiol. | [10.3390/jfmk10040365](https://doi.org/10.3390/jfmk10040365) | Open Access (MDPI) | (nur Hinweis zur Studienlage, keine Dosis) | nein |

## Was je Regel zu prüfen ist

| Regel | Quellen | Fragen an den Volltext |
|---|---|---|
| 4×4-Intervalle (`vo2_4x4`) | Helgerud 2007 | Stimmt die Dosis (4 × 4 min bei 90–95 % HFmax, 3 min Pause) mit der Studie? Die Probanden waren moderat trainierte gesunde Männer: reicht das für Kampfsportler und Hybridathleten (Übertragung)? |
| Wiederholte Sprints (`rst_30m`) | Thurlow et al. (Meta-Analyse) | Welche Streckenlängen, Wiederholungen, Pausen und Frequenzen nennt die Meta-Analyse als wirksam? Gilt das für Kampfsport? |
| Maximalkraft (`max_strength_80`) | ACSM Position Stand 2026, Cid-Calfucura 2023, Llanos-Lagos 2025 | Intensität, Sätze und Frequenz; Trainingsalter; Übertragbarkeit auf Kampfsport und Hybrid. |
| Power 30–70 % (`power_30_70`) | ACSM 2026, Cid-Calfucura 2023 | Lastbereich für Power und ob er für die Disziplinen belegt ist. |
| Plyometrie (`plyo_combat`) | Ojeda-Aravena 2023 | Welche Sprungformen, Kontakte je Einheit und Dauer; nur Kampfsport. |
| Hinweise zur Studienlage (keine Dosis) | Huiberts 2024, Held 2026 (Concurrent Training), Brandt 2025, Villarroel López 2025 (Hyrox, HIFT) | Stimmen die Aussagen der Hinweistexte («Abstand zwischen den Reizen», «keine Stationsdosis»)? |

## Eine Quelle ohne DOI im Register: behoben

Helgerud 2007 hatte im Register keinen DOI. Nachgetragen nach PubMed (PMID 17414804): [10.1249/mss.0b013e3180304570](https://doi.org/10.1249/mss.0b013e3180304570). Das ist nur der Verweis; der Volltext ist weiter nicht gelesen.

## Wie eine Regel «geprüft» wird

1. Fachperson liest alle Quellen der Regel im Volltext und prüft Dosis, Zielgruppe, Grenzen (die Grenzen stehen im Register je Regel).
2. Im Register: `fullTextChecked: true` je gelesener Quelle, `review: { state: 'reviewed', reviewer, reviewedOn, note }` an der Regel. Das setzt der Inhaber oder ich auf ausdrückliche Anweisung; ohne beides lässt `validateRegistry` die Regel nicht durch.
3. Erst dann zeigt der Betrieb ohne Vorschauschalter die Regel (`VITE_TRAINING_PLAN=live`).
