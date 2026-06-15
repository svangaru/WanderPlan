import type { CountrySeed } from "../lib/types";
import { italy } from "./italy";
import { france } from "./france";
import { spain } from "./spain";
import { unitedStates } from "./united-states";
import { turkey } from "./turkey";
import { mexico } from "./mexico";
import { japan } from "./japan";
import { greece } from "./greece";
import { thailand } from "./thailand";
import { portugal } from "./portugal";

/**
 * Curated launch set — the 10 most-visited countries. Add a new country by
 * dropping a file here and appending it (see docs/add-country-runbook.md).
 */
export const countrySeeds: CountrySeed[] = [
  italy,
  france,
  spain,
  unitedStates,
  turkey,
  mexico,
  japan,
  greece,
  thailand,
  portugal,
];
