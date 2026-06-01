/**
 * SignupPage
 *
 * Three-step registration wizard. Step 1 collects account credentials, Step 2
 * collects physical stats (height, weight, goal), and Step 3 finalises the rate
 * of change and submits the account to the backend.
 *
 * Props:
 *   None — reads auth state from AuthContext and navigation from React Router.
 *
 * Used in: App.js (route "/signup")
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
// signup() sends the form data to the backend; loading tracks if request is in progress
import { useAuth } from "../../context/AuthContext";
import GoogleSignInButton from "./GoogleSignInButton";
// safeParseFloat prevents NaN crashes when numeric inputs are empty or invalid
import { safeParseFloat } from "../../utils/numberHelpers";
import LegalConsentCheckbox from "../../shared/LegalConsentCheckbox";


function SignupPage() {
  const { signup, loading } = useAuth();
  const navigate = useNavigate();

  // Which step the wizard is currently on (1, 2, or 3)
  const [step, setStep] = useState(1);

  // Error message shown in red if validation or API call fails
  const [error, setError] = useState("");

  // All form fields collected across all 3 steps — stored in one object
  // so data isn't lost when moving between steps
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    dateOfBirth: "",
    age: "",           // auto-calculated from dateOfBirth
    gender: "",
    height: "",        // in cm
    weight: "",        // in kg
    goalWeight: "",    // target weight in kg
    activityLevel: "", // sedentary / lightly / moderately / very
    goal: "",          // lose / maintain / gain
    rate: "",          // slow / moderate / aggressive
  });

  // Whether the user has ticked the privacy/terms checkbox
  const [legalConsent, setLegalConsent] = useState(false);

  // Whether to show a parental consent warning (for users aged 13–17)
  const [requiresParentalConsent, setRequiresParentalConsent] = useState(false);

  // Toggles the password field between hidden (●●●) and visible (abc)
  const [showPassword, setShowPassword] = useState(false);

  // Generic change handler — updates whichever field was changed by name
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Calculates the user's recommended daily calorie target using the
  // Mifflin-St Jeor formula, then adjusts for activity level and goal.
  // This runs entirely on the frontend — no API call needed.
  const calculateCalories = () => {
    const { weight, height, age, gender, activityLevel, goal, rate } = formData;

    // Parse strings to numbers safely (returns 0 if empty/invalid)
    const w = safeParseFloat(weight, 0);
    const h = safeParseFloat(height, 0);
    const a = safeParseFloat(age, 0);

    // If any required value is missing, return a safe default
    if (w <= 0 || h <= 0 || a <= 0 || !gender || !activityLevel) {
      return 2000;
    }

    // Mifflin-St Jeor BMR formula:
    // BMR = base metabolic rate — calories burned at complete rest
    let bmr;
    if (gender === "male") {
      bmr = 10 * w + 6.25 * h - 5 * a + 5;
    } else {
      bmr = 10 * w + 6.25 * h - 5 * a - 161;
    }

    if (isNaN(bmr) || bmr <= 0) {
      return 2000;
    }

    // TDEE = Total Daily Energy Expenditure
    // Multiply BMR by how active the user is to get actual calories burned per day
    const activityMultipliers = {
      sedentary: 1.2,    // desk job, no exercise
      lightly: 1.375,    // light exercise 1-3 days/week
      moderately: 1.55,  // moderate exercise 3-5 days/week
      very: 1.725,       // hard exercise 6-7 days/week
    };

    const activityMultiplier = activityMultipliers[activityLevel];
    if (!activityMultiplier) {
      return Math.round(bmr * 1.2); // default to sedentary if unknown
    }

    let tdee = bmr * activityMultiplier;

    // Adjust TDEE based on the user's goal:
    // Losing weight → eat less than you burn (deficit)
    // Gaining weight → eat more than you burn (surplus)
    if (goal === "lose") {
      const deficits = { slow: 250, moderate: 500, aggressive: 750 };
      tdee -= deficits[rate] || 0;
    } else if (goal === "gain") {
      const surpluses = { slow: 250, moderate: 500, aggressive: 750 };
      tdee += surpluses[rate] || 0;
    }

    const finalCalories = Math.round(tdee);
    if (isNaN(finalCalories) || finalCalories <= 0) {
      return 2000;
    }

    return finalCalories;
  };

  // Validates the current step then moves to the next one.
  // Does NOT talk to the backend yet — that only happens at the final submit.
  const handleNext = (e) => {
    e.preventDefault();
    setError("");

    // Validate Step 2 fields before allowing the user to proceed to Step 3
    if (step === 2) {
      if (!formData.age || !formData.gender || !formData.height ||
        !formData.weight || !formData.activityLevel || !formData.goal) {
        setError("Please fill all required fields");
        return;
      }

      const age = safeParseFloat(formData.age, 0);
      const height = safeParseFloat(formData.height, 0);
      const weight = safeParseFloat(formData.weight, 0);

      if (age <= 0 || height <= 0 || weight <= 0) {
        setError("Please enter valid numeric values");
        return;
      }

      // Sanity ranges — catch obvious typos
      if (age < 13 || age > 120) {
        setError("Age must be between 13 and 120 years");
        return;
      }

      if (height < 50 || height > 300) {
        setError("Height must be between 50 and 300 cm");
        return;
      }

      if (weight < 20 || weight > 500) {
        setError("Weight must be between 20 and 500 kg");
        return;
      }
    }

    if (step < 3) setStep(step + 1);
  };

  // Validates Step 3, calculates calories, builds the payload, then calls
  // the backend. On success, redirects to email verification or dashboard.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // A rate (speed of change) is required for lose/gain goals
    if ((formData.goal === "lose" || formData.goal === "gain") && !formData.rate) {
      setError("Please select a rate of change for your goal");
      return;
    }

    // Goal weight must make logical sense (e.g. can't "lose" to a higher weight)
    if (formData.goal !== "maintain") {
      const currentWeight = safeParseFloat(formData.weight, 0);
      const targetWeight = safeParseFloat(formData.goalWeight, 0);

      if (targetWeight <= 0) {
        setError("Please enter a valid goal weight");
        return;
      }

      if (formData.goal === "lose" && targetWeight >= currentWeight) {
        setError("Goal weight must be less than current weight when losing weight");
        return;
      }

      if (formData.goal === "gain" && targetWeight <= currentWeight) {
        setError("Goal weight must be greater than current weight when gaining weight");
        return;
      }
    }

    // Calculate the personalised calorie target using the Mifflin-St Jeor formula
    const calories = calculateCalories();

    // For "maintain" goal, goal weight = current weight
    const goalWeight = formData.goal === "maintain"
      ? formData.weight
      : formData.goalWeight;

    // Parse all numeric fields to proper numbers before sending
    const age = safeParseFloat(formData.age, 0);
    const height = safeParseFloat(formData.height, 0);
    const weight = safeParseFloat(formData.weight, 0);
    const goalWeightNum = safeParseFloat(goalWeight, weight);

    if (age <= 0 || height <= 0 || weight <= 0 || goalWeightNum <= 0) {
      setError("Invalid numeric values. Please check your input.");
      return;
    }

    if (isNaN(calories) || calories <= 0) {
      setError("Unable to calculate calorie target. Please check your input.");
      return;
    }

    // username is derived from the email prefix (e.g. "john" from "john@gmail.com")
    // The backend will make it unique if there's a clash
    const username = formData.email?.split("@")[0] || "user";

    // Build the payload — maps frontend field names to backend serializer field names
    const payload = {
      email: formData.email,
      username: username,
      password: formData.password,
      first_name: formData.name,    // full name stored in first_name
      last_name: "",
      date_of_birth: formData.dateOfBirth || null,
      age: Math.round(age),
      gender: formData.gender,
      height: Math.round(height),
      weight: parseFloat(weight.toFixed(1)),
      goal_weight: parseFloat(goalWeightNum.toFixed(1)),
      activity_level: formData.activityLevel,
      goal: formData.goal,
      rate: formData.goal === "maintain" ? "" : formData.rate,
      calorie_target: calories,
      privacy_policy_accepted: legalConsent,
      terms_accepted: legalConsent,
    };

    try {
      // POST /api/auth/signup/ — creates the user in the database
      const result = await signup(payload);

      // Email/password signups require OTP verification before getting a token
      if (result?.needs_verification) {
        // Pass the email so VerifyEmailPage doesn't have to ask for it again
        navigate("/verify-email", { state: { email: formData.email } });
      } else {
        // Google OAuth signups skip verification and get a token immediately
        navigate("/dashboard");
      }
    } catch (err) {
      // Backend returns field-level errors as an object, e.g. { email: ["already exists"] }
      if (err && typeof err === "object") {
        const firstKey = Object.keys(err)[0];
        setError(
          Array.isArray(err[firstKey])
            ? err[firstKey][0]
            : err.error || "Signup failed"
        );
      } else {
        setError("Signup failed");
      }
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container signup-container">
        <div className="auth-logo">MACROTRACK</div>
        <h1 className="auth-title">Create Your Account</h1>
        {/* Shows which step the user is on */}
        <p className="auth-subtitle">Step {step} of 3</p>

        {/* Visual progress bar — each bar turns green when that step is reached */}
        <div className="progress-steps">
          <div className={`step ${step >= 1 ? "active" : ""}`}></div>
          <div className={`step ${step >= 2 ? "active" : ""}`}></div>
          <div className={`step ${step >= 3 ? "active" : ""}`}></div>
        </div>

        {error && <p className="auth-error">{error}</p>}

        {/* ── STEP 1: Account credentials ── */}
        {step === 1 && (
          <form onSubmit={handleNext} className="auth-form">
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
                title="Please enter a valid email address"
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <div style={{ position: "relative", width: "100%" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create a password (min. 10 characters)"
                  minLength="10"
                  title="Password must be at least 10 characters"
                  required
                  style={{ paddingRight: "44px" }}
                />
                {/* Toggle password visibility */}
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  style={{
                    position: "absolute", right: "12px", top: "50%",
                    transform: "translateY(-50%)", background: "none",
                    border: "none", cursor: "pointer", padding: "0",
                    color: "var(--text-secondary)", display: "flex",
                    alignItems: "center",
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* "Continue" submits Step 1 — just moves to Step 2, no API call yet */}
            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
            >
              {loading ? "Please wait..." : "Continue"}
            </button>

            {/* Legal consent checkbox — must be ticked before proceeding */}
            <LegalConsentCheckbox
              checked={legalConsent}
              onChange={(e) => setLegalConsent(e.target.checked)}
              type="both"
              required={true}
            />

            <div className="auth-divider">
              <span>OR</span>
            </div>

            {/* Alternative: sign up with Google (skips all 3 steps) */}
            <GoogleSignInButton />
          </form>
        )}

        {/* ── STEP 2: Physical stats & goal ── */}
        {step === 2 && (
          <form onSubmit={handleNext} className="auth-form">
            <div className="form-row">
              <div className="form-group">
                <label>Date of Birth</label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={(e) => {
                    const dob = e.target.value;
                    setFormData({ ...formData, dateOfBirth: dob });

                    // Auto-calculate age from the selected date of birth
                    if (dob) {
                      const today = new Date();
                      const birthDate = new Date(dob);
                      let age = today.getFullYear() - birthDate.getFullYear();
                      const monthDiff = today.getMonth() - birthDate.getMonth();

                      // Adjust if birthday hasn't happened yet this year
                      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                        age--;
                      }

                      setFormData(prev => ({ ...prev, dateOfBirth: dob, age: age.toString() }));
                      // Show parental consent warning for 13–17 year olds
                      setRequiresParentalConsent(age >= 13 && age < 18);
                    }
                  }}
                  max={new Date().toISOString().split('T')[0]} // can't be born in the future
                  required
                />
                {/* Show the calculated age as friendly feedback */}
                {formData.dateOfBirth && formData.age && (
                  <p style={{ fontSize: "13px", color: "#666666", marginTop: "4px" }}>
                    Age: {formData.age} years old
                  </p>
                )}
                {/* Warning box for minors — COPPA compliance */}
                {requiresParentalConsent && (
                  <div style={{ marginTop: "8px", padding: "10px 12px", background: "#fff5f5", borderRadius: "8px", border: "1px solid #fc8181" }}>
                    <p style={{ fontSize: "13px", color: "#c53030", margin: 0 }}>
                      <strong>Parental Consent Required:</strong> Users under 18 must have parental consent and supervision to use MacroTrack.
                    </p>
                  </div>
                )}
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
                  min="50"
                  max="300"
                  title="Height must be between 50 and 300 cm"
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
                  min="20"
                  max="500"
                  step="0.1"
                  title="Weight must be between 20 and 500 kg"
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
                <option value="sedentary">
                  Sedentary (little or no exercise)
                </option>
                <option value="lightly">Lightly Active (1-3 days/week)</option>
                <option value="moderately">
                  Moderately Active (3-5 days/week)
                </option>
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
            <div className="form-buttons">
              {/* Back goes to Step 1 without losing any data */}
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
                {loading ? "Please wait..." : "Continue"}
              </button>
            </div>
          </form>
        )}

        {/* ── STEP 3: Goal weight + rate of change ── */}
        {step === 3 && (
          <form onSubmit={handleSubmit} className="auth-form">
            {/* Only show goal weight if not maintaining */}
            {formData.goal !== "maintain" && (
              <div className="form-group">
                <label>Goal Weight (kg)</label>
                <input
                  type="number"
                  name="goalWeight"
                  value={formData.goalWeight}
                  onChange={handleChange}
                  placeholder="65"
                  min="20"
                  max="500"
                  step="0.1"
                  title="Goal weight must be between 20 and 500 kg"
                  required
                />
              </div>
            )}
            {/* Rate of change — determines the calorie deficit/surplus size */}
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
                  <option value="aggressive">
                    Aggressive (0.75 kg/week)
                  </option>
                </select>
              </div>
            )}
            {/* For "maintain" — no goal weight or rate needed, just show a message */}
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
                onClick={() => setStep(2)}
              >
                Back
              </button>
              {/* Final submit — this is where the backend API call actually happens */}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? "Creating..." : "Create Account"}
              </button>
            </div>
          </form>
        )}

        <div className="auth-footer">
          Already have an account?{" "}
          <button className="btn-link" onClick={() => navigate("/login")}>
            Sign in
          </button>
        </div>

        <button className="btn-text" onClick={() => navigate("/")}>
          Back to Home
        </button>
      </div>

    </div>
  );
}

export default SignupPage;
