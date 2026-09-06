/**
 * Warum eine Disziplin so gemessen wird, wie sie gemessen wird.
 *
 * Steht getrennt von `sportProfiles.ts`, obwohl es fachlich dazugehört: die
 * Struktur einer Disziplin (Achsen, Gewichte, Kernbatterie) braucht die App
 * beim Start, um überhaupt ein Profil rechnen zu können. Diese Begründungen
 * liest jemand auf zwei Bildschirmen — sie beim Start mitzuschicken hiesse,
 * 18 KB Fliesstext jedem aufzuladen, der sie nie öffnet.
 */

export const RATIONALE_BY_ID: Record<string, { de: string; en: string }> = {
  combat: {
    de: 'Intermittierende Maximalbelastung mit wechselnden Pausen. Entscheidend ist nicht das Maximum einer Achse, sondern die Wiederholbarkeit unter Ermüdung — und Gewichtsklassen machen Relativkraft zur zentralen Grösse.',
    en: 'Intermittent maximal effort with irregular rest. What decides a bout is not a peak value but repeatability under fatigue — and weight classes make relative strength the central quantity.',
  },
  hybrid: {
    de: 'Definierend ist der Zwang, auf allen Achsen gleichzeitig wettbewerbsfähig zu sein. Das Profil ist hier nicht Beiwerk, sondern der Wettkampfgegenstand: die schwächste Achse begrenzt das Ergebnis unmittelbar.',
    en: 'Defined by the need to be competitive on every axis at once. The profile is not an accessory here but the object of competition: the weakest axis limits the result directly.',
  },
  running: {
    de: 'Die Leistungsdeterminanten sind gut beschrieben: maximale Sauerstoffaufnahme, Schwelle, Laufökonomie und Renneinteilung. Eine Bestzeit fasst sie zu einer Zahl zusammen und verdeckt damit, welche davon begrenzt.',
    en: 'The determinants are well described: maximal oxygen uptake, threshold, running economy and pacing. A personal best collapses them into one number and hides which of them is limiting.',
  },
  cycling: {
    de: 'Die einzige Ausdauersportart mit direkter Leistungsmessung in Watt. Dadurch sind Schwelle, Ermüdungsresistenz und Wirkungsgrad unmittelbar messbar statt geschätzt.',
    en: 'The one endurance sport with direct power measurement in watts. Threshold, fatigue resistance and efficiency are therefore measured rather than estimated.',
  },
  swimming: {
    de: 'Stark technikbestimmt: zwei Schwimmer mit gleicher Ausdauer trennen sich über Zuglänge und Wasserlage. Deshalb gehören kinematische Kennwerte neben die physiologischen.',
    en: 'Strongly technique-driven: two swimmers with equal endurance are separated by stroke length and body position. Kinematic measures therefore belong beside the physiological ones.',
  },
  triathlon: {
    de: 'Die diagnostische Kernfrage ist nicht die Einzeldisziplin, sondern die Leistung nach Vorermüdung und über die Wechsel hinweg — ein Wert, den drei getrennte Bestzeiten nicht zeigen.',
    en: 'The core diagnostic question is not the single discipline but performance after pre-fatigue and across transitions — a value three separate personal bests do not show.',
  },
  tactical: {
    de: 'Kein Sport, sondern ein Anforderungsprofil: die Belastung ist berufsbedingt und tritt selten, unangekündigt und aus dem Ruhezustand auf. Gemessen wird gegen eine Untergrenze, nicht gegen ein Optimum.',
    en: 'Not a sport but a requirement profile: the load is occupational and occurs rarely, without warning and from rest. It is measured against a floor, not an optimum.',
  },
  judo: {
    de: 'Griff- und Wurfkampf in Gewichtsklassen. Entscheidend ist wiederholte maximale Anstrengung mit unvollständiger Erholung sowie Griffausdauer, die keine Bestleistung erfasst.',
    en: 'Gripping and throwing in weight classes. What decides it is repeated maximal effort with incomplete recovery, plus grip endurance that no personal best captures.',
  },
  wrestling: {
    de: 'Belastungsstruktur aus Griffkraft, Rumpfkraft und wiederholten explosiven Aktionen unter Ermüdung. Nahe an Judo, aber mit deutlich höherem Anteil an Bodenarbeit und isometrischer Rumpfleistung.',
    en: 'A load structure of grip strength, trunk strength and repeated explosive actions under fatigue. Close to judo, but with a markedly higher share of ground work and isometric trunk output.',
  },
  bjj: {
    de: 'Lange Kampfdauer mit Positionswechseln am Boden. Griffkraft und isometrische Haltearbeit sind über zehn Minuten leistungsbegrenzend, nicht die Spitzenkraft.',
    en: 'Long bouts with positional changes on the ground. Over ten minutes, grip strength and isometric holding limit performance, not peak force.',
  },
  boxing: {
    de: 'Mehrere Runden mit kurzen Pausen. Schlagfrequenz über die Rundendauer und die Erholung zwischen den Runden bestimmen das Ergebnis stärker als die einzelne Schlagkraft.',
    en: 'Several rounds with short breaks. Punch rate across the round and recovery between rounds decide the outcome more than single-punch force.',
  },
  kickboxing: {
    de: 'Wie Boxen, zusätzlich mit hoher Beinarbeit. Die Wiederholbarkeit von Tritten unter Ermüdung ist die Grösse, die eine Bestleistung nicht zeigt.',
    en: 'As boxing, with a large lower-body share added. Repeatability of kicks under fatigue is the quantity a personal best does not show.',
  },
  taekwondo: {
    de: 'Sehr kurze, sehr schnelle Aktionen mit langen Pausen dazwischen. Trittgeschwindigkeit und Antritt sind entscheidend, Maximalkraft kaum.',
    en: 'Very short, very fast actions with long pauses between them. Kicking speed and first-step acceleration decide; maximal strength barely does.',
  },
  mma: {
    de: 'Verbindet Schlag-, Griff- und Bodenkampf. Kein Einzeltest bildet das ab — MMA braucht eine breite Batterie, gerade weil keine Achse ausgelassen werden darf.',
    en: 'Combines striking, clinch and ground work. No single test covers this — MMA needs a broad battery precisely because no axis may be left out.',
  },
  karate: {
    de: 'Kumite lebt von Explosivität und Distanzkontrolle in sehr kurzen Aktionen. Reaktion und Antritt sind wichtiger als Kraftausdauer.',
    en: 'Kumite lives on explosiveness and distance control in very short actions. Reaction and first-step speed matter more than strength endurance.',
  },
  ju_jutsu: {
    de: 'Mischform aus Schlag, Wurf und Bodenarbeit. Die Testbatterie ist deshalb bewusst breit und überschneidet sich mit Judo und MMA.',
    en: 'A mix of striking, throwing and ground work. The battery is deliberately broad and overlaps with judo and MMA.',
  },
  pencak_silat: {
    de: 'Zur Belastungsstruktur gibt es bislang wenig Belastbares. Die Batterie besteht deshalb aus allgemeinen Feldtests und ist ausdrücklich als vorläufig zu lesen.',
    en: 'Little solid evidence on its load structure exists so far. The battery therefore consists of general field tests and is explicitly to be read as provisional.',
  },
  fencing: {
    de: 'Sehr kurze Ausfallbewegungen in hoher Zahl, einseitig belastet. Antritt und Richtungswechsel auf der Planche sind die bestimmenden Grössen.',
    en: 'Very short lunges in high number, loaded asymmetrically. First-step speed and changes of direction on the piste are the decisive quantities.',
  },
  hyrox: {
    de: 'Acht 1-km-Läufe im Wechsel mit acht standardisierten Kraftausdauerstationen. Die Standardisierung macht das Format diagnostisch ungewöhnlich gut zugänglich; begrenzend ist regelmässig die Kraftausdauer, nicht die Laufleistung.',
    en: 'Eight 1 km runs alternating with eight standardised strength-endurance stations. The standardisation makes it unusually accessible diagnostically; the limiter is regularly strength endurance, not running.',
  },
  functional_fitness: {
    de: 'Wettkampfformate wechseln von Jahr zu Jahr, die Anforderung bleibt: auf allen Achsen gleichzeitig bestehen. Ein vollständiges Profil ist hier kein Zusatznutzen, sondern die Vorbereitung selbst.',
    en: 'Competition formats change from year to year; the demand does not: hold up on every axis at once. A complete profile here is not an added benefit but the preparation itself.',
  },
  general_fitness: {
    de: 'Kein Wettkampf, aber die Frage «Wo stehe ich?» — sportartübergreifend. Getestet werden die vier Grössen, für die es die belastbarsten Referenzwerte über alle Bevölkerungsgruppen gibt: Griffkraft, aerobe Kapazität, Sprungkraft und Antritt.',
    en: 'No competition, but the question "where do I stand?" — across sports. Tested are the four quantities with the most robust reference values across the general population: grip strength, aerobic capacity, jump power and acceleration.',
  },
  ocr: {
    de: 'Laufen unter Zusatzlast, mit Griff-, Zug- und Kletteranteilen. Die Griffkraft am Ende eines langen Laufs ist die Grösse, an der die meisten Läufe entschieden werden.',
    en: 'Running under added load with grip, pulling and climbing sections. Grip strength at the end of a long run is where most races are decided.',
  },
  run_5k_discipline: {
    de: 'Kurz genug, dass die maximale Sauerstoffaufnahme dominiert, lang genug für einen deutlichen Schwellenanteil. Damit die Distanz, an der sich Grundlagenarbeit am schnellsten zeigt.',
    en: 'Short enough for maximal oxygen uptake to dominate, long enough for a clear threshold share. The distance where base work shows up fastest.',
  },
  run_10k_discipline: {
    de: 'Nahe an der Schwelle über die volle Distanz. Wer hier nachlässt, hat meist ein Schwellenproblem und kein Problem der maximalen Sauerstoffaufnahme.',
    en: 'Close to threshold over the whole distance. Whoever fades here usually has a threshold problem, not a maximal-oxygen-uptake problem.',
  },
  half_marathon: {
    de: 'Erste Distanz, auf der Ökonomie und Ermüdungsresistenz über die reine Sauerstoffaufnahme dominieren. Die 10-km-Zeit sagt die Halbmarathonzeit nur so gut voraus, wie die Ökonomie hält.',
    en: 'The first distance where economy and fatigue resistance dominate over raw oxygen uptake. A 10 km time predicts the half only as far as economy holds.',
  },
  marathon: {
    de: 'Multifaktoriell: Ökonomie, Ermüdungsresistenz, Körperzusammensetzung und Renneinteilung wirken zusammen. Eine einzelne Testzahl erklärt die Leistung hier am wenigsten von allen Laufdistanzen.',
    en: 'Multifactorial: economy, fatigue resistance, body composition and pacing act together. A single test number explains performance here less than at any other running distance.',
  },
  trail_running: {
    de: 'Anstiege und Abfahrten verschieben die Belastung auf exzentrische Arbeit und Rumpfstabilität. Eine Bahnzeit ist hier ein schwacher Prädiktor.',
    en: 'Climbs and descents shift the load towards eccentric work and trunk stability. A track time is a weak predictor here.',
  },
  ultramarathon: {
    de: 'Über diese Dauer entscheidet nicht die Spitzenleistung, sondern der Wirkungsgrad bei niedriger Intensität und die Fähigkeit, ihn zu halten. Maximaltests sagen wenig.',
    en: 'Over this duration it is not peak output that decides but efficiency at low intensity and the ability to hold it. Maximal tests say little.',
  },
  road_race: {
    de: 'Lange Grundbelastung mit wiederholten harten Antritten. Entscheidend ist die Leistung an der Schwelle und die Fähigkeit, nach einem Antritt wieder dorthin zurückzukehren.',
    en: 'A long base load with repeated hard efforts. What decides it is power at threshold and the ability to return there after an attack.',
  },
  time_trial: {
    de: 'Gleichmässige Maximalleistung ohne Windschatten. Die reinste Schwellenprüfung im Radsport — hier zählt nichts als die haltbare Leistung.',
    en: 'Steady maximal output with no draft. The purest threshold test in cycling — nothing counts but sustainable power.',
  },
  track_cycling: {
    de: 'Sehr kurze Maximalbelastungen mit vollständiger Erholung. Spitzenleistung und ihre Wiederholbarkeit sind die einzigen relevanten Grössen; die Schwelle spielt kaum eine Rolle.',
    en: 'Very short maximal efforts with full recovery. Peak power and its repeatability are the only relevant quantities; threshold hardly matters.',
  },
  mtb: {
    de: 'Ständiger Wechsel aus Antritt und Erholung im Gelände, dazu hohe Anforderungen an Rumpf und Oberkörper. Ein reines Schwellenprofil beschreibt das nur zur Hälfte.',
    en: 'A constant alternation of surge and recovery off-road, plus high demands on trunk and upper body. A pure threshold profile describes only half of it.',
  },
  gravel: {
    de: 'Mischprofil aus Strasse und Gelände über sehr lange Dauer. Robustheit und Renneinteilung wiegen schwerer als die Spitzenleistung.',
    en: 'A mixed profile of road and off-road over very long duration. Robustness and pacing weigh more than peak output.',
  },
  freestyle: {
    de: 'Die schnellste und am besten untersuchte Lage. Zuglänge und Zugfrequenz trennen Schwimmer mit gleicher Ausdauer deutlicher als jeder physiologische Wert.',
    en: 'The fastest and best-studied stroke. Stroke length and rate separate swimmers of equal endurance more sharply than any physiological value.',
  },
  backstroke: {
    de: 'Eigene Wasserlage und Atemrhythmik. Kennwerte aus dem Freistil lassen sich nicht übertragen, weshalb die Lage eine eigene Zeitmessung braucht.',
    en: 'Its own body position and breathing rhythm. Freestyle measures do not transfer, so the stroke needs its own timed trials.',
  },
  breaststroke: {
    de: 'Am stärksten technikbestimmte Lage: der Wirkungsgrad schwankt zwischen Schwimmern stärker als die Kraft. Zuglänge ist hier die aussagekräftigste Einzelzahl.',
    en: 'The most technique-driven stroke: efficiency varies between swimmers more than strength does. Stroke length is the single most informative number.',
  },
  butterfly: {
    de: 'Höchste anaerobe Last aller Lagen bei kurzer Distanz. Kraftausdauer des Oberkörpers und Rumpfarbeit begrenzen früher als die Ausdauer.',
    en: 'The highest anaerobic load of all strokes over short distances. Upper-body strength endurance and trunk work limit before endurance does.',
  },
  open_water: {
    de: 'Lange Dauer ohne Wand und ohne Bahnbegrenzung. Tempokontrolle und Orientierung wiegen schwerer als die Bestzeit über eine Bahnstrecke.',
    en: 'Long duration with no wall and no lane. Pace control and sighting weigh more than a best time over a pool distance.',
  },
  triathlon_sprint: {
    de: '750 m / 20 km / 5 km. Kurz genug, dass durchgehend nahe der Schwelle gefahren und gelaufen wird — die Wechsel kosten hier anteilig am meisten.',
    en: '750 m / 20 km / 5 km. Short enough to ride and run near threshold throughout — transitions cost proportionally the most here.',
  },
  triathlon_olympic: {
    de: '1,5 / 40 / 10 km. Die diagnostische Kernfrage ist die Laufleistung nach der Radbelastung — ein Wert, den drei getrennte Bestzeiten nicht zeigen.',
    en: '1.5 / 40 / 10 km. The core diagnostic question is running performance after the bike — a value three separate personal bests do not show.',
  },
  triathlon_70_3: {
    de: 'Erste Distanz, auf der Energieversorgung und Renneinteilung mit der Leistungsfähigkeit gleichziehen. Ein hoher Schwellenwert nützt wenig, wenn er nicht über vier Stunden trägt.',
    en: 'The first distance where fuelling and pacing draw level with capacity. A high threshold helps little if it does not hold for four hours.',
  },
  triathlon_ironman: {
    de: 'Über diese Dauer entscheidet der Wirkungsgrad bei submaximaler Intensität, nicht die Spitzenleistung. Maximaltests sind hier die am wenigsten aussagekräftige Testart.',
    en: 'Over this duration efficiency at submaximal intensity decides, not peak output. Maximal tests are the least informative kind of test here.',
  },
  police: {
    de: 'Die Anforderung ist nicht Höchstleistung, sondern eine selten auftretende Maximalbelastung aus dem Ruhezustand sicher zu erbringen: Verfolgung, Fixierung, Tragen.',
    en: 'The requirement is not peak performance but reliably producing a rarely occurring maximal effort from rest: pursuit, restraint, carrying.',
  },
  firefighter: {
    de: 'Arbeit unter Zusatzlast in Schutzausrüstung, häufig über Treppen. Die Belastung ist überwiegend Kraftausdauer bei eingeschränkter Atmung — Laufleistung allein bildet sie nicht ab.',
    en: 'Work under added load in protective equipment, often up stairs. The load is predominantly strength endurance with restricted breathing — running alone does not represent it.',
  },
  military: {
    de: 'Marschleistung unter Last neben Kraft- und Sprintanforderungen. Die Kombination aus Zusatzlast und Dauer unterscheidet dieses Profil von jedem Sportprofil.',
    en: 'Loaded marching alongside strength and sprint requirements. The combination of added load and duration separates this profile from any sporting one.',
  },
  special_forces: {
    de: 'Wiederholte Höchstleistung unter Last über lange Einsatzdauer. Von allen Profilen dasjenige mit der höchsten gleichzeitigen Anforderung auf allen Achsen.',
    en: 'Repeated maximal effort under load across long deployments. Of all profiles the one with the highest simultaneous demand on every axis.',
  },
  ems: {
    de: 'Tragen und Heben unter Zeitdruck, oft in engen Räumen und über Treppen. Die Belastung ist kurz und hoch, die Erholung dazwischen unplanbar.',
    en: 'Carrying and lifting under time pressure, often in confined spaces and up stairs. The effort is short and high, the recovery between unplannable.',
  },
  basketball: {
    de: 'Sprungkraft und wiederholte Richtungswechsel über vier Viertel. Gemessen wird, was die Reichhöhe am Korb und den ersten Schritt entscheidet — nicht die Wurfquote.',
    en: 'Jump height and repeated changes of direction across four quarters. What is measured is what decides reach at the rim and the first step — not shooting percentage.',
  },
  handball: {
    de: 'Antritt, Richtungswechsel und Wurfarm unter Zweikampfbelastung über sechzig Minuten. Die Griffkraft steht dabei, weil sie im Zweikampf zuerst nachlässt.',
    en: 'Acceleration, change of direction and throwing arm under contact over sixty minutes. Grip strength is included because it is the first thing to fade in contact.',
  },
  volleyball: {
    de: 'Sprunghöhe, wiederholt über einen langen Satz. Der Unterschied zwischen Sprung mit und ohne Ausholbewegung sagt, wie gut der Dehnungs-Verkürzungs-Zyklus genutzt wird.',
    en: 'Jump height, repeated across a long set. The gap between jumps with and without a countermovement shows how well the stretch-shortening cycle is used.',
  },
  rugby: {
    de: 'Kraft im Kontakt, Antritt über kurze Distanz und die Fähigkeit, beides achtzig Minuten lang zu wiederholen. Die Position verschiebt das Anforderungsprofil erheblich.',
    en: 'Strength in contact, acceleration over short distances, and the ability to repeat both for eighty minutes. Position shifts the demand profile considerably.',
  },
  cricket: {
    de: 'Kurze maximale Antritte zwischen langen Phasen ohne Belastung, über einen ganzen Tag. Gemessen wird der Antritt und die Fähigkeit, ihn nach Stunden zu wiederholen.',
    en: 'Short maximal sprints between long passive phases, across a whole day. What is measured is the sprint and the ability to repeat it hours later.',
  },
  long_jump: {
    de: 'Anlaufgeschwindigkeit und Absprungkraft. Beides einzeln zu messen sagt mehr als die Weite allein, denn dieselbe Weite entsteht aus sehr verschiedenen Anteilen.',
    en: 'Run-up speed and take-off power. Measuring both separately says more than the distance alone, since the same distance arises from very different components.',
  },
  sprint_athletics: {
    de: 'Antritt, Beschleunigung und Höchstgeschwindigkeit als drei getrennte Grössen. Wer nur die Endzeit misst, weiss nicht, welcher Abschnitt sie bestimmt.',
    en: 'Acceleration over the first metres, over the next, and top speed as three separate quantities. Measuring only the final time leaves open which section decides it.',
  },
  rowing: {
    de: 'Ausdauer unter hoher Kraftanforderung über sechs bis acht Minuten. Die Ergometerzeit ist der Kern; die Kraftwerte daneben sagen, woran sie hängt.',
    en: 'Endurance under high force demand over six to eight minutes. Ergometer time is the core; the strength values beside it say what it depends on.',
  },
  powerlifting: {
    de: 'Drei Einer-Maxima. Gemessen wird die Last und ihr Verhältnis zum Körpergewicht — der Wettkampf entscheidet über die Summe, das Training über die einzelne Übung.',
    en: 'Three one-rep maxima. Load and its ratio to body weight are measured — competition decides on the total, training on the single lift.',
  },
}

/** Die Begründung zu einer Disziplin. Null, wenn keine hinterlegt ist. */
export function rationaleFor(disciplineId: string): { de: string; en: string } | null {
  return RATIONALE_BY_ID[disciplineId] ?? null
}
