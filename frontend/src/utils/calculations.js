/**
 * calculations.js
 *
 * Pure functions for nutrition and fitness calculations used across the app.
 * Exports: calculateBMR, calculateTDEE, calculateCalorieTarget, calculateMacros,
 *          calculateBMI, getBMICategory, calculateTimeToGoal, calculateGoalProgress,
 *          calculateCalorieBalance, calculateAverage, calculateTrend, roundTo
 */
// src/utils/calculations.js

/**
 * Calculate BMR (Basal Metabolic Rate) using Mifflin-St Jeor Equation
 * @param {number} weight - Weight in kg
 * @param {number} height - Height in cm
 * @param {number} age - Age in years
 * @param {string} gender - 'male' or 'female'
 * @returns {number} - BMR in calories
 */
export const calculateBMR = (weight, height, age, gender) => {
  if (gender === 'male') {
    return (10 * weight) + (6.25 * height) - (5 * age) + 5;
  } else {
    return (10 * weight) + (6.25 * height) - (5 * age) - 161;
  }
};

/**
 * Calculate TDEE (Total Daily Energy Expenditure)
 * @param {number} bmr - Basal Metabolic Rate
 * @param {string} activityLevel - Activity level
 * @returns {number} - TDEE in calories
 */
export const calculateTDEE = (bmr, activityLevel) => {
  const activityMultipliers = {
    'sedentary': 1.2,
    'lightly': 1.375,
    'moderately': 1.55,
    'very': 1.725,
    'extremely': 1.9
  };

  return Math.round(bmr * (activityMultipliers[activityLevel] || 1.2));
};

/**
 * Calculate daily calorie target based on goal
 * @param {number} tdee - Total Daily Energy Expenditure
 * @param {string} goal - 'lose', 'maintain', or 'gain'
 * @param {string} rate - 'slow', 'moderate', or 'aggressive'
 * @returns {number} - Daily calorie target
 */
export const calculateCalorieTarget = (tdee, goal, rate = 'moderate') => {
  const deficits = {
    'slow': 250,
    'moderate': 500,
    'aggressive': 750
  };

  if (goal === 'lose') {
    return Math.round(tdee - (deficits[rate] || 500));
  } else if (goal === 'gain') {
    return Math.round(tdee + (deficits[rate] || 500));
  } else {
    return Math.round(tdee);
  }
};

/**
 * Calculate macro targets
 * @param {number} calorieTarget - Daily calorie target
 * @param {Object} ratios - Macro ratios { protein, carbs, fat }
 * @returns {Object} - Macro targets in grams
 */
export const calculateMacros = (calorieTarget, ratios = { protein: 0.3, carbs: 0.4, fat: 0.3 }) => {
  return {
    protein: Math.round((calorieTarget * ratios.protein) / 4),
    carbs: Math.round((calorieTarget * ratios.carbs) / 4),
    fat: Math.round((calorieTarget * ratios.fat) / 9)
  };
};

/**
 * Calculate BMI (Body Mass Index)
 * @param {number} weight - Weight in kg
 * @param {number} height - Height in cm
 * @returns {number} - BMI
 */
export const calculateBMI = (weight, height) => {
  const heightInMeters = height / 100;
  return parseFloat((weight / (heightInMeters * heightInMeters)).toFixed(1));
};

/**
 * Get BMI category
 * @param {number} bmi - BMI value
 * @returns {string} - BMI category
 */
export const getBMICategory = (bmi) => {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal weight';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
};

/**
 * Calculate estimated time to reach goal weight
 * @param {number} currentWeight - Current weight in kg
 * @param {number} goalWeight - Goal weight in kg
 * @param {string} rate - Rate of change ('slow', 'moderate', 'aggressive')
 * @returns {number} - Estimated weeks to goal
 */
export const calculateTimeToGoal = (currentWeight, goalWeight, rate = 'moderate') => {
  const weeklyRates = {
    'slow': 0.25,
    'moderate': 0.5,
    'aggressive': 0.75
  };

  const weightDifference = Math.abs(currentWeight - goalWeight);
  const weeklyRate = weeklyRates[rate] || 0.5;
  
  return Math.ceil(weightDifference / weeklyRate);
};

/**
 * Calculate percentage of goal completed
 * @param {number} startWeight - Starting weight
 * @param {number} currentWeight - Current weight
 * @param {number} goalWeight - Goal weight
 * @returns {number} - Percentage (0-100)
 */
export const calculateGoalProgress = (startWeight, currentWeight, goalWeight) => {
  const totalChange = Math.abs(goalWeight - startWeight);
  const currentChange = Math.abs(currentWeight - startWeight);
  
  if (totalChange === 0) return 100;
  
  const percentage = (currentChange / totalChange) * 100;
  return Math.min(Math.round(percentage), 100);
};

/**
 * Calculate calorie deficit/surplus
 * @param {number} caloriesConsumed - Calories consumed
 * @param {number} calorieTarget - Daily calorie target
 * @returns {number} - Deficit (negative) or surplus (positive)
 */
export const calculateCalorieBalance = (caloriesConsumed, calorieTarget) => {
  return caloriesConsumed - calorieTarget;
};

/**
 * Calculate average from array of numbers
 * @param {Array<number>} numbers - Array of numbers
 * @returns {number} - Average
 */
export const calculateAverage = (numbers) => {
  if (numbers.length === 0) return 0;
  const sum = numbers.reduce((acc, val) => acc + val, 0);
  return parseFloat((sum / numbers.length).toFixed(1));
};

/**
 * Calculate trend (moving average)
 * @param {Array<number>} data - Array of values
 * @param {number} period - Period for moving average
 * @returns {Array<number>} - Trend values
 */
export const calculateTrend = (data, period = 7) => {
  if (data.length < period) return data;
  
  const trend = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      trend.push(data[i]);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      trend.push(calculateAverage(slice));
    }
  }
  return trend;
};

/**
 * Round to decimal places
 * @param {number} value - Value to round
 * @param {number} decimals - Number of decimal places
 * @returns {number} - Rounded value
 */
export const roundTo = (value, decimals = 1) => {
  return parseFloat(value.toFixed(decimals));
};