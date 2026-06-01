/**
 * OnboardingPage
 *
 * Two-step form shown to users who signed up via Google OAuth and haven't yet
 * provided their physical stats. Collects height, weight, activity level and
 * goal, calculates a personalised calorie target, and saves the profile.
 *
 * Props:
 *   None — reads user data from AuthContext.
 *
 * Used in: App.js (protected route "/onboarding")
 */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
// user and setUser come from AuthContext so is_onboarded is updated after save
import { useAuth } from "../../context/AuthContext";
import * as authService from "../../api/authService";

function OnboardingPage() {
    const { user, setUser } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // Initialize with any existing data (e.g. from Google) or defaults
    const [formData, setFormData] = useState({
        age: user?.age || "",
        gender: user?.gender || "",
        height: user?.height || "",
        weight: user?.weight || "",
        goalWeight: user?.goal_weight || "",
        activityLevel: user?.activity_level || "",
        goal: user?.goal || "",
        rate: user?.rate || "",
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const calculateCalories = () => {
        const { weight, height, age, gender, activityLevel, goal, rate } = formData;

        // Values are in metric (kg, cm)
        const weightKg = parseFloat(weight);
        const heightCm = parseFloat(height);

        let bmr;
        if (gender === "male") {
            bmr = 10 * weightKg + 6.25 * heightCm - 5 * parseFloat(age) + 5;
        } else {
            bmr = 10 * weightKg + 6.25 * heightCm - 5 * parseFloat(age) - 161;
        }

        const activityMultipliers = {
            sedentary: 1.2,
            lightly: 1.375,
            moderately: 1.55,
            very: 1.725,
        };

        let tdee = bmr * activityMultipliers[activityLevel];

        if (goal === "lose") {
            const deficits = { slow: 250, moderate: 500, aggressive: 750 };
            tdee -= deficits[rate] || 0;
        } else if (goal === "gain") {
            const surpluses = { slow: 250, moderate: 500, aggressive: 750 };
            tdee += surpluses[rate] || 0;
        }

        return Math.round(tdee);
    };

    const handleNext = (e) => {
        e.preventDefault();
        setError("");
        if (step < 2) setStep(step + 1);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        const calories = calculateCalories();

        const weightKg = parseFloat(formData.weight);
        const heightCm = parseFloat(formData.height);
        const goalWeightKg = formData.goal === "maintain"
            ? weightKg
            : parseFloat(formData.goalWeight);

        // Map frontend field names to backend model fields
        const payload = {
            age: Number(formData.age),
            gender: formData.gender,
            height: Number(heightCm),
            weight: Number(weightKg),
            goal_weight: Number(goalWeightKg),
            activity_level: formData.activityLevel,
            goal: formData.goal,
            rate: formData.goal === "maintain" ? "" : formData.rate,
            calorie_target: calories,
        };

        try {
            const updatedUser = await authService.updateProfile(payload);
            setUser({ ...user, ...updatedUser });
            navigate("/dashboard");
        } catch (err) {
            setError("Failed to save profile. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container signup-container">
                <div className="auth-logo">MACROTRACK</div>
                <h1 className="auth-title">Complete Your Profile</h1>
                <p className="auth-subtitle">
                    We need a few details to calculate your personalized plan
                </p>

                {error && <p className="auth-error">{error}</p>}

                {/* Reuse the progress bar style */}
                <div className="progress-steps">
                    <div className={`step ${step >= 1 ? "active" : ""}`}></div>
                    <div className={`step ${step >= 2 ? "active" : ""}`}></div>
                </div>

                {step === 1 && (
                    <form onSubmit={handleNext} className="auth-form">
                        <div className="form-row">
                            <div className="form-group">
                                <label>Age</label>
                                <input
                                    type="number"
                                    name="age"
                                    value={formData.age}
                                    onChange={handleChange}
                                    placeholder="25"
                                    min="1"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Gender</label>
                                <select
                                    name="gender"
                                    value={formData.gender}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">Select</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Height (cm)</label>
                                <input
                                    type="number"
                                    name="height"
                                    value={formData.height}
                                    onChange={handleChange}
                                    placeholder="175"
                                    min="1"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Current Weight (kg)</label>
                                <input
                                    type="number"
                                    name="weight"
                                    value={formData.weight}
                                    onChange={handleChange}
                                    placeholder="70"
                                    min="1"
                                    step="0.1"
                                    required
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Activity Level</label>
                            <select
                                name="activityLevel"
                                value={formData.activityLevel}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select</option>
                                <option value="sedentary">Sedentary (little or no exercise)</option>
                                <option value="lightly">Lightly Active (1-3 days/week)</option>
                                <option value="moderately">Moderately Active (3-5 days/week)</option>
                                <option value="very">Very Active (6-7 days/week)</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Your Goal</label>
                            <select
                                name="goal"
                                value={formData.goal}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select</option>
                                <option value="lose">Lose Weight</option>
                                <option value="maintain">Maintain Weight</option>
                                <option value="gain">Gain Weight</option>
                            </select>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-block"
                        >
                            Next Step
                        </button>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleSubmit} className="auth-form">
                        {formData.goal !== "maintain" && (
                            <div className="form-group">
                                <label>Goal Weight (kg)</label>
                                <input
                                    type="number"
                                    name="goalWeight"
                                    value={formData.goalWeight}
                                    onChange={handleChange}
                                    placeholder="65"
                                    min="1"
                                    step="0.1"
                                    required
                                />
                            </div>
                        )}

                        {formData.goal !== "maintain" && (
                            <div className="form-group">
                                <label>Rate of Change</label>
                                <select
                                    name="rate"
                                    value={formData.rate}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">Select</option>
                                    <option value="slow">Slow (0.25 kg/week)</option>
                                    <option value="moderate">Moderate (0.5 kg/week)</option>
                                    <option value="aggressive">Aggressive (0.75 kg/week)</option>
                                </select>
                            </div>
                        )}

                        {formData.goal === "maintain" && (
                            <div className="form-group">
                                <p style={{ textAlign: 'center', color: '#666', padding: '20px 0' }}>
                                    Your goal weight will be set to your current weight ({formData.weight} kg).
                                </p>
                            </div>
                        )}

                        <div className="form-buttons">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setStep(1)}
                            >
                                Back
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={loading}
                            >
                                {loading ? "Calculating Plan..." : "Start Tracking"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

export default OnboardingPage;
