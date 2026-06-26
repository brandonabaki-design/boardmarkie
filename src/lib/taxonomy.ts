// Controlled vocabularies for classifying simulations. Concepts and standards
// are free-text (teachers type their own, or Claude auto-extracts them); grade
// and subject are pick-lists so the library filters stay clean and consistent.

export const GRADE_LEVELS = [
  "K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "Higher Ed",
] as const;

export const SUBJECTS = [
  "Science",
  "Biology",
  "Chemistry",
  "Physics",
  "Earth & Space",
  "Mathematics",
  "English/Language Arts",
  "Social Studies",
  "History",
  "Geography",
  "Computer Science",
  "Engineering",
  "Health & PE",
  "Arts",
  "World Languages",
  "Other",
] as const;
