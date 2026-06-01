/**
 * EatingDisorderWarning
 *
 * Safety modal that appears when the user sets potentially harmful nutrition
 * goals (very low calories, rapid weight loss, or an underweight target BMI).
 * Lists relevant health risks and NEDA helpline details, and gives the user the
 * choice to adjust their goals or proceed with acknowledgement.
 *
 * Props:
 *   isOpen      (boolean)  — controls visibility
 *   onClose     (function) — called when the user chooses to adjust goals
 *   onProceed   (function) — called when the user acknowledges risks and proceeds
 *   warningType (string)   — 'low_calories' | 'rapid_weight_loss' | 'underweight_target'
 *   details     (object)   — context values used to build the warning message
 *                           (e.g. { calories, minimum, gender } for low_calories)
 *
 * Used in: features/onboarding/OnboardingPage, features/profile/ProfilePage
 */
import React from "react";

function EatingDisorderWarning({ isOpen, onClose, onProceed, warningType, details }) {
    // Render nothing when closed to keep the DOM clean
    if (!isOpen) return null;

    const getWarningMessage = () => {
        switch (warningType) {
            case "low_calories":
                return {
                    title: "⚠️ Very Low Calorie Target",
                    message: `Your target of ${details?.calories} calories per day is below the recommended minimum of ${details?.minimum} calories for ${details?.gender === 'male' ? 'men' : 'women'}. Very low calorie diets can be dangerous and should only be undertaken under medical supervision.`,
                    risks: [
                        "Nutrient deficiencies",
                        "Loss of muscle mass",
                        "Slowed metabolism",
                        "Fatigue and weakness",
                        "Hormonal imbalances",
                        "Increased risk of eating disorders"
                    ]
                };
            case "rapid_weight_loss":
                return {
                    title: "⚠️ Aggressive Weight Loss Rate",
                    message: `Losing ${details?.rate} kg per week is considered very aggressive. Safe weight loss is typically 0.25-0.5 kg per week. Rapid weight loss can lead to serious health issues.`,
                    risks: [
                        "Muscle loss",
                        "Nutritional deficiencies",
                        "Gallstones",
                        "Dehydration",
                        "Fatigue and irritability",
                        "Unsustainable results"
                    ]
                };
            case "underweight_target":
                return {
                    title: "⚠️ Underweight Goal",
                    message: `Your goal weight would result in a BMI of ${details?.targetBMI}, which is considered underweight. Being underweight can be as harmful as being overweight.`,
                    risks: [
                        "Weakened immune system",
                        "Bone density loss",
                        "Fertility issues",
                        "Malnutrition",
                        "Increased mortality risk",
                        "Development of eating disorders"
                    ]
                };
            default:
                return {
                    title: "⚠️ Health Warning",
                    message: "The goals you've set may not be safe or healthy for you.",
                    risks: ["Please consult with a healthcare professional"]
                };
        }
    };

    const warning = getWarningMessage();

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <button className="modal-close" onClick={onClose} aria-label="Close warning">×</button>

                <div className="warning-content">
                    <div className="warning-icon">⚠️</div>
                    <h2>{warning.title}</h2>

                    <div className="warning-message">
                        <p>{warning.message}</p>
                    </div>

                    <div className="warning-risks">
                        <h3>Potential Health Risks:</h3>
                        <ul>
                            {warning.risks.map((risk, index) => (
                                <li key={index}>{risk}</li>
                            ))}
                        </ul>
                    </div>

                    <div className="warning-box" style={{ marginTop: "24px" }}>
                        <h3 style={{ marginTop: 0, marginBottom: "12px", fontSize: "16px" }}>
                            If you have or suspect you have an eating disorder:
                        </h3>
                        <p style={{ marginBottom: "8px" }}>
                            <strong>National Eating Disorders Association (NEDA)</strong>
                        </p>
                        <p style={{ marginBottom: "8px" }}>
                            Helpline: <strong>1-800-931-2237</strong>
                        </p>
                        <p style={{ marginBottom: "0" }}>
                            Crisis Text Line: Text <strong>"NEDA"</strong> to <strong>741741</strong>
                        </p>
                    </div>

                    <div className="warning-recommendation">
                        <p>
                            <strong>We strongly recommend:</strong>
                        </p>
                        <ul>
                            <li>Consulting with a doctor or registered dietitian before proceeding</li>
                            <li>Setting more moderate, sustainable goals</li>
                            <li>Focusing on overall health rather than just weight</li>
                            <li>Seeking professional help if you're struggling with food or body image</li>
                        </ul>
                    </div>

                    <div className="modal-buttons" style={{ marginTop: "32px" }}>
                        <button
                            className="btn btn-secondary"
                            onClick={onClose}
                            style={{ flex: 1.5 }}
                        >
                            Adjust My Goals
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={onProceed}
                            style={{ flex: 1, background: "var(--danger-color)", borderColor: "var(--danger-color)" }}
                        >
                            I Understand the Risks
                        </button>
                    </div>

                    <p style={{ fontSize: "12px", color: "var(--text-tertiary)", textAlign: "center", marginTop: "16px", marginBottom: 0 }}>
                        MacroTrack is not a medical service. Always consult healthcare professionals for medical advice.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default EatingDisorderWarning;
