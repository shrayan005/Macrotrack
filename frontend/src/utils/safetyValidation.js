/**
 * safetyValidation.js
 *
 * Safety-check utilities that detect potentially harmful nutrition or weight goals
 * and drive the EatingDisorderWarning modal.
 * Exports: validateCalorieTarget, validateWeightLossRate, calculateBMI,
 *          isUnderweightTarget, shouldShowEatingDisorderWarning,
 *          getRecommendedCalorieRange, validateAge
 */

/**
 * Validate if calorie target is safe
 * @param {number} calories - Target calories per day
 * @param {string} gender - User's gender ('male' or 'female')
 * @returns {object} - { isSafe: boolean, minimum: number }
 */
export const validateCalorieTarget = (calories, gender) => {
    const minimums = {
        male: 1500,
        female: 1200,
    };

    const minimum = minimums[gender] || 1200;
    const isSafe = calories >= minimum;

    return {
        isSafe,
        minimum,
        calories,
        gender,
    };
};

/**
 * Validate if weight loss rate is safe
 * @param {number} rate - Weight loss rate in kg/week
 * @returns {object} - { isSafe: boolean, rate: number }
 */
export const validateWeightLossRate = (rate) => {
    const maxSafeRate = 1.0; // 1 kg per week maximum
    const isSafe = rate <= maxSafeRate;

    return {
        isSafe,
        rate,
        maxSafeRate,
    };
};

/**
 * Calculate BMI
 * @param {number} weight - Weight in kg
 * @param {number} height - Height in cm
 * @returns {number} - BMI value
 */
export const calculateBMI = (weight, height) => {
    if (!weight || !height || height === 0) return 0;
    const heightInMeters = height / 100;
    return weight / (heightInMeters * heightInMeters);
};

/**
 * Check if target BMI is underweight
 * @param {number} targetBMI - Target BMI value
 * @returns {boolean} - True if underweight
 */
export const isUnderweightTarget = (targetBMI) => {
    return targetBMI < 18.5;
};

/**
 * Determine if eating disorder warning should be shown
 * @param {object} goals - User's goals { calories, gender, weight, height, goalWeight, rate }
 * @returns {object} - { shouldWarn: boolean, warningType: string, details: object }
 */
export const shouldShowEatingDisorderWarning = (goals) => {
    const { calories, gender, weight, height, goalWeight, rate, goal } = goals;

    // Check for very low calorie target
    const calorieCheck = validateCalorieTarget(calories, gender);
    if (!calorieCheck.isSafe) {
        return {
            shouldWarn: true,
            warningType: "low_calories",
            details: calorieCheck,
        };
    }

    // Check for aggressive weight loss rate (only if losing weight)
    if (goal === "lose" && rate) {
        // Map rate strings to kg/week
        const rateMapping = {
            slow: 0.25,
            moderate: 0.5,
            aggressive: 0.75,
        };

        const rateInKg = rateMapping[rate] || 0.5;
        const rateCheck = validateWeightLossRate(rateInKg);

        if (!rateCheck.isSafe) {
            return {
                shouldWarn: true,
                warningType: "rapid_weight_loss",
                details: rateCheck,
            };
        }
    }

    // Check for underweight goal
    if (goalWeight && height) {
        const targetBMI = calculateBMI(goalWeight, height);
        if (isUnderweightTarget(targetBMI)) {
            return {
                shouldWarn: true,
                warningType: "underweight_target",
                details: {
                    targetBMI: targetBMI.toFixed(1),
                    goalWeight,
                    height,
                },
            };
        }
    }

    return {
        shouldWarn: false,
        warningType: null,
        details: null,
    };
};

/**
 * Get recommended calorie range based on user stats
 * @param {object} stats - { weight, height, age, gender, activityLevel }
 * @returns {object} - { min: number, max: number, recommended: number }
 */
export const getRecommendedCalorieRange = (stats) => {
    const { weight, height, age, gender, activityLevel } = stats;

    // Calculate BMR using Mifflin-St Jeor equation
    let bmr;
    if (gender === "male") {
        bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
        bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }

    // Activity multipliers
    const activityMultipliers = {
        sedentary: 1.2,
        lightly: 1.375,
        moderately: 1.55,
        very: 1.725,
    };

    const multiplier = activityMultipliers[activityLevel] || 1.2;
    const tdee = bmr * multiplier;

    return {
        min: Math.round(bmr), // Never go below BMR
        max: Math.round(tdee + 500), // Max for gaining weight
        recommended: Math.round(tdee), // Maintenance
        bmr: Math.round(bmr),
        tdee: Math.round(tdee),
    };
};

/**
 * Validate age for signup
 * @param {string} dateOfBirth - Date of birth in YYYY-MM-DD format
 * @returns {object} - { isValid: boolean, age: number, requiresParentalConsent: boolean }
 */
export const validateAge = (dateOfBirth) => {
    if (!dateOfBirth) {
        return { isValid: false, age: 0, requiresParentalConsent: false };
    }

    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    return {
        isValid: age >= 13, // COPPA compliance
        age,
        requiresParentalConsent: age >= 13 && age < 18,
    };
};
