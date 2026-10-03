# Fehlende Testbilder

**Stand:** 3. Oktober 2026. Geprüft: jeder Eintrag in `TEST_CATALOG` (125 Tests) und `ACTIVE_OBSERVATIONS` (39 Beobachtungswerte) gegen `src/data/testImages.ts` und die Dateien in `public/testbilder/`.

| Bereich | Gesamt | mit Bild | ohne Bild |
|---|---|---|---|
| Tests | 125 | 75 | **50** |
| Beobachtungswerte | 39 | 34 | **5** |
| Übungen (`exercises.ts`) | 72 | 0 | alle (die Anzeige kennt für Übungen noch keine Bilder) |

Stil, Format und Prompt-Vorlage für alle Bilder: `docs/bildauftrag.md` (Particle Athlete: dunkles Foto-Composite, 3:2 quer, kühles Weiß mit Jade-Stich, nasser Boden, ein Athlet, kein Text im Bild, unten ca. 9 % frei). Dateiname: `S_<slug>.jpg`.

## A. Tests ohne Bild (50)

### Maximalkraft und Gewichtheben
| Test (Dateiname) | Was auf dem Bild zu sehen sein soll |
|---|---|
| Umsetzen und Stoßen, Clean & Jerk (`S_clean_and_jerk_1rm`) | Mehrfachbelichtung in 4 Phasen: Langhantel vom Boden, Fangen auf den Schultern in tiefer Hocke, Aufstehen, Stoßen mit gestreckten Armen über den Kopf. Hantelscheiben, Plattform. |
| Reißen, Snatch (`S_snatch_1rm`) | 3–4 Phasen: Stange vom Boden in einem Zug über den Kopf, tiefe Überkopfhocke mit breitem Griff, Aufstehen. |
| Umsetzen, Clean (`S_clean_1rm`) | Phasen: Zug vom Boden, Fangen im Frontrack auf den Schultern, Aufstehen. Kein Stoßen über Kopf. |
| Schulterdrücken, Overhead Press (`S_overhead_press_1rm`) | Aufrecht stehend, Stange auf Schlüsselbeinhöhe, Phasen bis zur vollen Streckung über dem Kopf. Gerader Rücken, kein Beinschwung. |
| Klimmzug mit Zusatzgewicht (`S_weighted_pull_up_1rm`) | Athlet mit Gewichtsgürtel und Scheibe an der Hüfte, Kinn über der Stange, Phasen vom Hang bis oben. |
| Bear Complex (`S_bear_complex`) | Langhantel in Folge: Clean, Frontkniebeuge, Drücken über Kopf, Kniebeuge im Nacken, Drücken. 4 Phasen, Hantel nie abgesetzt. |

### Kraftausdauer
| Test | Bild |
|---|---|
| Klimmzüge maximal (`S_pull_up_max_reps`) | Mehrfachbelichtung am Reck: voller Hang, Kinn über der Stange, kontrolliertes Absenken. Kein Schwungholen. |
| Hang am gestreckten Arm (`S_grip_hang_time`) | Statisch: Athlet hängt mit gestreckten Armen an der Stange, ohne Zughilfen, Fokus auf Unterarmen und Griff. |
| Griffausdauer am Anzug (`S_gi_grip_hang`) | Hang an einem Judoanzug-Revers oder Stoffstück über der Stange, beide Hände im Stoffgriff, Unterarme angespannt. |
| Farmers Carry (`S_farmers_carry`) | Aufrechter Gang mit je einer schweren Hantel oder Kettlebell in beiden Händen über eine markierte Bahn, 3 Phasen hintereinander. |
| Sled Drag (`S_sled_drag`) | Athlet zieht einen beladenen Schlitten an einem Gurt rückwärts oder am Geschirr nach vorn über die Bahn, Schlittenspur im nassen Boden. |
| Treppensteigen unter Last (`S_stair_climb`) | Athlet mit Gewichtsweste in einem Treppenhaus, nimmt zwei Stufen, 3 Phasen nach oben. |
| Marsch unter Last (`S_loaded_march`) | Athlet mit schwerem Rucksack auf einem Feldweg, zügiger Marsch, mehrere Phasen entlang der Strecke. |
| Seilklettern (`S_rope_climb`) | Athlet klettert an einem Kletterseil, Phasen von unten bis zur Hallendecke, Matte darunter. |
| Cindy, 20 Min AMRAP (`S_cindy_20min_amrap`) | Drei Bewegungen in Phasen: Klimmzug, Liegestütz, Kniebeuge ohne Gerät. Reck im Hintergrund. |
| Assault Bike 10 Minuten (`S_assault_bike_10min_cal`) | Athlet auf einem Luftwiderstandsrad mit Armgriffen, Gesicht angestrengt, Windrad glüht, Partikel um Beine und Arme. |

### Sprung, Schnelligkeit, Agilität
| Test | Bild |
|---|---|
| 5-10-5 Shuttle, Pro Agility (`S_shuttle_5_10_5`) | Drei Markierungslinien mit Hütchen, Athlet in 3–4 Phasen: Start in der Mitte, Sprint zur Seite, Wende, 10 Yards zurück, Berühren der Linie mit der Hand. |
| Wiederholungssprünge 15 s (`S_repeated_jump_15s`) | Athlet springt wiederholt auf einer Kontaktmatte, Hände an der Hüfte, kurze Bodenkontakte, Mehrfachbelichtung. |
| Burpee Broad Jump 80 m (`S_burpee_broad_jump_80m`) | Phasen: Burpee mit Brust am Boden, Aufstehen, weiter Standweitsprung, nächster Burpee. Markierte Bahn. |
| Kriechen 30 m (`S_crawl_30m`) | Athlet im Bärengang oder tief am Boden über 30 m, nasser Boden, Hütchen am Start und Ende. |

### Ausdauer, Lauf, Rad, Schwimmen
| Test | Bild |
|---|---|
| 1,5 Meilen Lauf (`S_run_1_5_mile`) | Läufer auf einer 400-m-Bahn, 3–4 Phasen in der Kurve, Stoppuhr am Streckenrand. |
| 5 km Lauf (`S_run_5k`) | Läufer auf einer Straße oder Bahn, gleichmäßige Schrittfolge, Phasen von links nach rechts. |
| 30-Minuten-Schwellentest (`S_threshold_run_30min`) | Läufer mit Brustgurt an der Bahn, gleichmäßiger Lauf, Display eines Pulsmessers mit grünem LED-Akzent. |
| Bergauflauf (`S_uphill_run_test`) | Läufer auf einem Anstieg, Phasen den Hang hinauf, Schrägstellung des Körpers. |
| Bergablauf (`S_downhill_run_test`) | Läufer auf einer Abfahrt, nach hinten gelehnt, Phasen den Hang hinunter, Bremsbewegung der Beine. |
| Herzfrequenzdrift (`S_hr_drift_test`) | Läufer oder Radfahrer mit Brustgurt in gleichmäßigem Tempo über lange Zeit, Uhr am Handgelenk mit grünem Display, ruhige Haltung. |
| Submaximaler Effizienztest (`S_submax_efficiency_bike`) | Radfahrer auf einem Rollentrainer mit Leistungsmesser und Pulsgurt, gleichmäßige Trittfrequenz, kein Maximalaufwand. |
| Spitzenleistung 5 s (`S_peak_power_5s`) | Radfahrer im Wiegetritt auf dem Sprintrad, Fahrt aus dem Rollen, Leistungsmesser an der Kurbel mit grünem LED. |
| Wiederholter Sprint auf dem Rad (`S_repeated_sprint_bike`) | Radfahrer auf einem Ergometer, 3 Phasen: Sprint, Erholung, Sprint, Körper in verschiedenen Ermüdungszuständen. |
| Laktatstufentest (`S_lactate_step_test`) | Laufband oder Bahn, Partner mit Laktat-Handmessgerät am Streckenrand, Athlet läuft, Stufentafel ohne Text. Keine Blutdarstellung. |
| Brick-Test, Rad auf Lauf (`S_brick_bike_run`) | Zwei Bereiche: Athlet steigt vom Rad, sofort Laufschritt im Wechselraum, 3–4 Phasen vom Absteigen zum Laufen. |
| Ski-Ergometer 1000 m (`S_ski_erg_1000m`) | Athlet am Ski-Ergometer, Arme über Kopf gestreckt, Zug nach unten, Phasen des Zugs. |
| 1000 m Rudern (`S_row_1000m`) | Athlet am Rudergerät, Phasen vom Auszug bis zum Zurückgleiten, Griff am Display mit grünem LED. |
| 400 m Schwimmen (`S_swim_400m`) | Schwimmer in der Bahn, Kraulzug, Wasserpartikel um Arme und Wasserlinie, Bahnleinen. |
| Rücken 100 m (`S_swim_100m_backstroke`) | Rückenschwimmer in der Bahn, Armzug über Wasser, Gesicht nach oben. |
| Brust 100 m (`S_swim_100m_breaststroke`) | Brustschwimmer in der Bahn, Atembewegung, Beinschlag, Phasen des Zugs. |
| Schmetterling 100 m (`S_swim_100m_butterfly`) | Schwimmer im Delfinschlag, beide Arme gleichzeitig über Wasser, Wasserwelle um den Körper. |

### Kondition und Wettkampfformate
| Test | Bild |
|---|---|
| Fran, 21-15-9 (`S_fran`) | Thruster mit Langhantel und Klimmzug im Wechsel, Athlet in zwei Bewegungen, Reck im Hintergrund. |
| Grace, 30 Clean & Jerks (`S_grace`) | Langhantel in Folge von Zügen vom Boden bis über Kopf, mehrere Phasen, Hantelscheiben auf dem Boden verstreut. |
| Murph (`S_murph`) | Weste mit Gewicht, Athlet in drei Phasen: Lauf, Klimmzug, Kniebeuge, Reck im Hintergrund. |
| Hindernisbahn (`S_obstacle_course_sim`) | Athlet über eine Wand oder an einem Hindernis, Stationen im Hintergrund, Schlamm- oder nasser Boden. |
| Seilspringen 3 Minuten (`S_rope_skipping_3min`) | Springseil als Lichtspur um den Körper, Athlet leicht auf den Fußballen, mehrere Phasen. |

### Kampfsport
| Test | Bild |
|---|---|
| Schlagtest 60 s (`S_punch_test_60s`) | Boxer am Sandsack oder an Pratzen, Mehrfachbelichtung der Schlagfolge, Handschuhe, schnelle Armspuren. |
| Tritttest 60 s (`S_kick_test_60s`) | Kämpfer tritt wechselnd gegen Pratze oder Sack, Phasen eines Rundhaustritts. |
| Kampfsport-Runden (`S_combat_rounds`) | Kämpfer in Runden am Sack oder mit Partner, Rundenuhr im Hintergrund ohne Ziffern, ermüdeter Ausdruck. |
| Wiederholte Würfe 30 s (`S_repeated_throws_30s`) | Zwei Judoka auf der Matte, Phasen eines Wurfs (Schulterwurf), Partner wird gehoben und abgelegt. |
| Uchi-komi Fitness Test (`S_uchi_komi_fitness_test`) | Judoka übt Eingänge ohne Wurf an einem Partner, Phasen des Eindrehens, Matte. |
| JJAPT, BJJ-Anaerobtest (`S_jjapt`) | Zwei Kämpfer am Boden in der Guard, Positionswechsel, Pulsgurt sichtbar. |
| Grappling-Zirkel 5 Minuten (`S_grappling_circuit_5min`) | Phasen: Wurf, Positionswechsel am Boden, Aufstehen. Ein Athlet mit Partner auf der Matte. |
| Ermüdungszirkel 4 × 30 s (`S_fatigue_circuit_4x30s`) | Athlet in vier Phasen mit zunehmender Ermüdung, jeweils einer technischen Aktion am Sack. |

## B. Beobachtungswerte ohne Bild (5)

Motive zeigen die Erhebung, nie ein Ergebnis oder eine Bewertung.

| Wert (Dateiname) | Was auf dem Bild zu sehen sein soll |
|---|---|
| Ruhepuls, `resting_hr_bpm` (`S_resting_hr_bpm`) | Athlet liegt morgens ruhig auf dem Rücken, Brustgurt oder Uhr am Handgelenk mit grünem Display, gedämpftes Licht. |
| Schlaf, `sleep_h` (`S_sleep_h`) | Athlet schläft in einem dunklen Zimmer, Uhr am Handgelenk, ruhige Atmung als Lichtspur. |
| Sitzungsbelastung, `srpe_load_au` (`S_srpe_load_au`) | Athlet sitzt nach dem Training erschöpft auf einer Bank, Handtuch, Skala ohne Ziffern auf einem Tablet in der Hand. |
| Fettmasse, `fat_mass_percent` (`S_fat_mass_percent`) | Athlet in Sportkleidung auf einer Körperanalysewaage oder Handmessung der Hautfalte, neutrale Szene. |
| Magermasse, `lean_mass_kg` (`S_lean_mass_kg`) | Athlet steht auf einer Körperanalysewaage mit Handgriffen, sachlich, ohne Entblößung. |
