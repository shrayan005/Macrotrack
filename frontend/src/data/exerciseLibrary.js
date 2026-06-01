// Exercise library with MET (Metabolic Equivalent of Task) values
// Source: Compendium of Physical Activities (Ainsworth et al.)
// Calorie formula: calories = MET × weight_kg × duration_hours

export const EXERCISE_LIBRARY = [
  // Cardio
  { name: 'Walking (slow, ~3 km/h)',        met: 2.8,  category: 'Cardio' },
  { name: 'Walking (moderate, ~5 km/h)',     met: 3.5,  category: 'Cardio' },
  { name: 'Walking (brisk, ~6.5 km/h)',      met: 4.3,  category: 'Cardio' },
  { name: 'Running (light jog, ~6 km/h)',    met: 6.0,  category: 'Cardio' },
  { name: 'Running (moderate, ~8 km/h)',     met: 8.3,  category: 'Cardio' },
  { name: 'Running (fast, ~10 km/h)',        met: 10.0, category: 'Cardio' },
  { name: 'Running (very fast, ~12 km/h)',   met: 11.5, category: 'Cardio' },
  { name: 'Cycling (leisure, <16 km/h)',     met: 4.0,  category: 'Cardio' },
  { name: 'Cycling (moderate, ~19 km/h)',    met: 8.0,  category: 'Cardio' },
  { name: 'Cycling (vigorous, >22 km/h)',    met: 10.0, category: 'Cardio' },
  { name: 'Swimming (leisure)',              met: 6.0,  category: 'Cardio' },
  { name: 'Swimming (vigorous laps)',        met: 9.8,  category: 'Cardio' },
  { name: 'Jump Rope',                       met: 11.0, category: 'Cardio' },
  { name: 'Elliptical Trainer',              met: 5.0,  category: 'Cardio' },
  { name: 'Rowing Machine',                  met: 7.0,  category: 'Cardio' },
  { name: 'Stair Climbing',                  met: 4.0,  category: 'Cardio' },
  { name: 'Aerobics (general)',              met: 7.3,  category: 'Cardio' },
  { name: 'HIIT',                            met: 8.0,  category: 'Cardio' },
  { name: 'Zumba / Dance Fitness',           met: 6.5,  category: 'Cardio' },
  { name: 'Boxing / Kickboxing',             met: 7.8,  category: 'Cardio' },

  // Strength Training
  { name: 'Weight Training (general)',       met: 3.5,  category: 'Strength' },
  { name: 'Weight Training (vigorous)',      met: 6.0,  category: 'Strength' },
  { name: 'Bodyweight Exercises',            met: 3.8,  category: 'Strength' },
  { name: 'Circuit Training',               met: 8.0,  category: 'Strength' },
  { name: 'CrossFit',                        met: 8.0,  category: 'Strength' },
  { name: 'Pilates',                         met: 3.0,  category: 'Strength' },

  // Sports
  { name: 'Basketball',                      met: 6.5,  category: 'Sports' },
  { name: 'Football / Soccer',               met: 7.0,  category: 'Sports' },
  { name: 'Tennis',                          met: 7.3,  category: 'Sports' },
  { name: 'Badminton',                       met: 5.5,  category: 'Sports' },
  { name: 'Volleyball',                      met: 4.0,  category: 'Sports' },
  { name: 'Cricket',                         met: 4.8,  category: 'Sports' },

  // Flexibility & Mind-Body
  { name: 'Yoga',                            met: 3.0,  category: 'Flexibility' },
  { name: 'Stretching',                      met: 2.5,  category: 'Flexibility' },
  { name: 'Tai Chi',                         met: 3.0,  category: 'Flexibility' },

  // Daily Activity
  { name: 'Household Chores (general)',      met: 3.0,  category: 'Daily Activity' },
  { name: 'Gardening',                       met: 3.5,  category: 'Daily Activity' },
  { name: 'Carrying / Moving Boxes',         met: 5.0,  category: 'Daily Activity' },
];

export const EXERCISE_CATEGORIES = [
  'Cardio',
  'Strength',
  'Sports',
  'Flexibility',
  'Daily Activity',
];

/**
 * Calculate calories burned using MET formula.
 * @param {number} met - MET value for the exercise
 * @param {number} weightKg - User's body weight in kg
 * @param {number} durationMinutes - Duration of exercise in minutes
 * @returns {number} Estimated calories burned (rounded)
 */
export function calcCaloriesFromMET(met, weightKg, durationMinutes) {
  if (!met || !weightKg || !durationMinutes) return 0;
  return Math.round(met * weightKg * (durationMinutes / 60));
}
