// Curriculum / region options shown in the generator form.

export interface Region {
  id: string;
  label: string;
  yearGroups: string[];
}

export const REGIONS: Region[] = [
  {
    id: "uk",
    label: "United Kingdom (National Curriculum)",
    yearGroups: [
      "Reception",
      "Year 1",
      "Year 2",
      "Year 3",
      "Year 4",
      "Year 5",
      "Year 6",
      "Year 7",
      "Year 8",
      "Year 9",
      "Year 10",
      "Year 11",
      "Year 12",
      "Year 13",
    ],
  },
  {
    id: "us",
    label: "United States (Common Core / State Standards)",
    yearGroups: [
      "Kindergarten",
      "Grade 1",
      "Grade 2",
      "Grade 3",
      "Grade 4",
      "Grade 5",
      "Grade 6",
      "Grade 7",
      "Grade 8",
      "Grade 9",
      "Grade 10",
      "Grade 11",
      "Grade 12",
    ],
  },
  {
    id: "au",
    label: "Australia (Australian Curriculum)",
    yearGroups: [
      "Foundation",
      "Year 1",
      "Year 2",
      "Year 3",
      "Year 4",
      "Year 5",
      "Year 6",
      "Year 7",
      "Year 8",
      "Year 9",
      "Year 10",
      "Year 11",
      "Year 12",
    ],
  },
  {
    id: "international",
    label: "International / IB",
    yearGroups: [
      "Early Years",
      "PYP 1",
      "PYP 2",
      "PYP 3",
      "PYP 4",
      "PYP 5",
      "MYP 1",
      "MYP 2",
      "MYP 3",
      "MYP 4",
      "MYP 5",
      "DP 1",
      "DP 2",
    ],
  },
];

export const SUBJECTS: string[] = [
  "English / Literacy",
  "Mathematics",
  "Science",
  "Biology",
  "Chemistry",
  "Physics",
  "History",
  "Geography",
  "Computing / ICT",
  "Art & Design",
  "Music",
  "Physical Education",
  "Languages (MFL)",
  "Religious Education",
  "PSHE / Wellbeing",
  "Business Studies",
  "Economics",
  "Design & Technology",
  "Drama",
  "Other",
];

export const TONES: string[] = [
  "Engaging & friendly",
  "Formal & academic",
  "Playful & fun",
  "Inquiry-led",
  "Hands-on & practical",
];

export function regionById(id: string): Region {
  return REGIONS.find((r) => r.id === id) ?? REGIONS[0];
}

export function regionLabel(id: string): string {
  return regionById(id).label;
}
