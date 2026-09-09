export interface CheerCategoryConfig {
  [categoryName: string]: string[];
}

export interface CheerInstitutionConfig {
  [institutionType: string]: CheerCategoryConfig;
}

// Editable configuration for Cheerleading categories, divisions, and levels.
// Modify this structure each year as the regulations update.
export const CHEER_CONFIG: CheerInstitutionConfig = {
  "All Stars": {
    "Novice": [
      "Tiny 1R",
      "Mini 1R",
      "Youth 1R",
      "Junior 1R",
      "Senior 1R",
      "Open 2R"
    ],
    "Prep": [
      "Mini 1.1",
      "Youth 1.1",
      "Junior 1.1",
      "Senior 1.1",
      "Youth 2.2",
      "Junior 2.2",
      "Senior 2.2",
      "Open 3.2",
      "Open Coed 3.2"
    ],
    "Elite": [
      "Youth 1",
      "Junior 1",
      "Senior 1",
      "Youth 2",
      "Junior 2",
      "Senior 2",
      "Junior 3",
      "Senior 3",
      "Senior Coed 3",
      "Senior 4",
      "Senior Coed 4",
      "Senior 5",
      "Senior Coed 5"
    ],
    "International": [
      "Open 3",
      "Open Coed 3",
      "Open 4",
      "Open Coed 4",
      "Open 5",
      "Open Coed 5",
      "Open 6",
      "Open Coed 6",
      "Open 7",
      "Open Coed 7",
      "U18 6.0",
      "U18 Coed 6.0",
      "Open 6.0",
      "Open Coed 6.0",
      "Open 7.0",
      "Open Coed 7.0"
    ],
    "Performance/Exhibition": [
      "AdaptiveABILITIES 1R",
      "TeamPARENTS 2R",
      "Cheer4ALL 2R"
    ]
  },
  "School": {
    "Rec": [
      "Tiny N1R",
      "Mini N1R",
      "Youth N1R",
      "Junior N1R",
      "Senior N1R"
    ],
    "Tradicional": [
      "Youth N1",
      "Junior N1",
      "Senior N1",
      "Junior N2",
      "Senior N2",
      "Senior Coed N2",
      "Senior N3",
      "Senior Coed N3"
    ]
  },
  "University": {
    "Rec": [
      "N1"
    ],
    "Tradicional": [
      "All Girl N2",
      "Coed N2",
      "All Girl N3",
      "Coed N3",
      "Coed N4"
    ]
  }
};

export const INSTITUTION_TYPES = ["All Stars", "School", "University"] as const;
export type InstitutionType = typeof INSTITUTION_TYPES[number];
