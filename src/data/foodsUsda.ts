import type { CoreFood } from "@/data/foods";

/**
 * Lebensmittel aus USDA FoodData Central — gemeinfrei, mit Namensnennung.
 *
 * ERZEUGT von scripts/buildFoodCore.mjs aus scripts/foodCore.curation.json.
 * NICHT VON HAND PFLEGEN: die Kuratierungsliste ändern und neu erzeugen.
 *
 * NOCH LEER. Die Entwicklungsumgebung hat keinen Zugang zu fdc.nal.usda.gov,
 * und Nährwerte aus dem Gedächtnis einzutippen wäre genau der Fehler, den
 * §89 verbietet. Der Weg steht in docs/lebensmitteldaten.md §6.
 */
export const USDA_FOODS: CoreFood[] = [];
