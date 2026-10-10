import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  DailyMenuSnapshot,
  MenuCategory,
  MenuMeal,
} from "../lib/types";

const MENU_URL =
  "https://www.absecom.psu.edu/menus/user-pages/daily-menu.cfm";
const OUTPUT_PATH = join(process.cwd(), "public", "daily-menu.json");
const LOCATIONS = [
  {
    label: "Findlay",
    campusId: "11",
  },
  {
    label: "Warnock",
    campusId: "17",
  },
  {
    label: "Pollock",
    campusId: "14",
  },
  {
    label: "Redifer",
    campusId: "13",
  },
  {
    label: "Waring",
    campusId: "16",
  },
] as const;
const MEALS: MenuMeal[] = ["Lunch", "Dinner"];

function getPennStateDate(): { iso: string; formValue: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date());
  const value = (type: string) => {
    const part = parts.find((candidate) => candidate.type === type)?.value;
    if (!part) throw new Error(`Could not determine current date part: ${type}`);
    return part;
  };
  const year = value("year");
  const month = value("month");
  const day = value("day");
  return {
    iso: `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`,
    formValue: `${month}/${day}/${year.slice(-2)}`,
  };
}

function decodeHtml(value: string): string {
  const namedEntities: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    if (code[0] === "#") {
      const numeric = code[1].toLowerCase() === "x"
        ? Number.parseInt(code.slice(2), 16)
        : Number.parseInt(code.slice(1), 10);
      return Number.isFinite(numeric) ? String.fromCodePoint(numeric) : entity;
    }
    return namedEntities[code.toLowerCase()] ?? entity;
  });
}

function getAttribute(tag: string, name: string): string | null {
  const match = tag.match(
    new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i")
  );
  return match ? decodeHtml(match[1] ?? match[2]) : null;
}

function parseCategories(html: string): MenuCategory[] {
  const categories: MenuCategory[] = [];
  const sections =
    /<details\b(?=[^>]*\bdata-category-section\b)[^>]*>([\s\S]*?)<\/details>/gi;

  for (const sectionMatch of html.matchAll(sections)) {
    const section = sectionMatch[1];
    const titleMatch = section.match(
      /<span\b[^>]*class="[^"]*\bnutrition-category-title\b[^"]*"[^>]*>([\s\S]*?)<\/span>/i
    );
    if (!titleMatch) continue;
    const name = decodeHtml(titleMatch[1].replace(/<[^>]+>/g, "")).trim();
    if (!name) continue;

    const items: MenuCategory["items"] = [];
    const itemBlocks =
      /<div\b(?=[^>]*\bdata-menu-item-name\s*=)[^>]*>([\s\S]*?)<\/div>/gi;
    for (const itemMatch of section.matchAll(itemBlocks)) {
      const itemName = getAttribute(itemMatch[0].slice(0, itemMatch[0].indexOf(">") + 1), "data-menu-item-name");
      if (!itemName) continue;
      const dietary: string[] = [];
      for (const icon of itemMatch[1].matchAll(/<img\b[^>]*>/gi)) {
        const label = getAttribute(icon[0], "alt");
        if (label) dietary.push(label);
      }
      items.push({ name: itemName.trim(), dietary });
    }
    categories.push({ name, items });
  }
  return categories;
}

async function fetchMenu(
  date: string,
  meal: MenuMeal,
  campusId: string
): Promise<MenuCategory[]> {
  const response = await fetch(MENU_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "user-agent": "NittanyBites daily menu updater",
    },
    body: new URLSearchParams({
      selMenuDate: date,
      selMeal: meal,
      selCampus: campusId,
    }),
  });
  if (!response.ok) {
    throw new Error(
      `Penn State menu request failed (${response.status}) for ${meal}, campus ${campusId}.`
    );
  }

  const html = await response.text();
  if (
    !html.includes('id="frmMenuFilters"') ||
    !html.includes("daily-menu-results-container")
  ) {
    throw new Error(
      `Penn State returned an unexpected menu page for ${meal}, campus ${campusId}.`
    );
  }
  const categories = parseCategories(html);
  if (categories.length === 0) {
    throw new Error(
      `No menu categories were found for ${meal}, campus ${campusId}; the menu page format may have changed.`
    );
  }
  return categories;
}

async function main(): Promise<void> {
  const date = getPennStateDate();
  console.log(`Fetching Penn State menus for ${date.iso}`);
  const menus: DailyMenuSnapshot["menus"] = {
    Findlay: { Lunch: [], Dinner: [] },
    Warnock: { Lunch: [], Dinner: [] },
    Pollock: { Lunch: [], Dinner: [] },
    Redifer: { Lunch: [], Dinner: [] },
    Waring: { Lunch: [], Dinner: [] },
  };

  for (const location of LOCATIONS) {
    for (const meal of MEALS) {
      const categories = await fetchMenu(date.formValue, meal, location.campusId);
      menus[location.label][meal] = categories;
      const itemCount = categories.reduce(
        (total, category) => total + category.items.length,
        0
      );
      console.log(`${date.iso} ${location.label} ${meal}: ${itemCount} items`);
    }
  }

  const snapshot: DailyMenuSnapshot = {
    date: date.iso,
    updatedAt: new Date().toISOString(),
    sourceUrl: MENU_URL,
    menus,
  };
  await mkdir(join(process.cwd(), "public"), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(`Wrote ${OUTPUT_PATH}`);
}

main().catch((error: unknown) => {
  console.error("Daily menu update failed:", error);
  process.exitCode = 1;
});
