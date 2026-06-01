/**
 * NutritionGuidePage
 *
 * Public educational page covering nutrition fundamentals (calories, macros,
 * BMI). Includes an interactive TDEE calculator.
 *
 * Props:
 *   None
 *
 * Used in: App.js (route: '/nutrition-guide')
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Zap, Scale, Info, AlertTriangle, Lightbulb, Beef, Wheat, Droplets, ArrowRight } from 'lucide-react';
import Footer from '../shared/Footer';
import './NutritionGuidePage.css';

function NutritionGuidePage() {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  // Interactive calculator states (metric: kg, cm)
  const [weight, setWeight] = useState('70');
  const [height, setHeight] = useState('170');
  const [age, setAge] = useState('30');
  const [gender, setGender] = useState('male');
  const [activityLevel, setActivityLevel] = useState('moderate');
  const [goal, setGoal] = useState('maintain');

  // Trigger CSS entrance animation and reset scroll on first render
  useEffect(() => {
    setIsVisible(true);
    window.scrollTo(0, 0);
  }, []);

  // BMR calculation (Mifflin-St Jeor Equation)
  const calculateBMR = () => {
    const weightKg = parseFloat(weight) || 0;
    const heightCm = parseFloat(height) || 0;
    const ageNum = parseFloat(age) || 0;

    if (gender === 'male') {
      return 10 * weightKg + 6.25 * heightCm - 5 * ageNum + 5;
    } else {
      return 10 * weightKg + 6.25 * heightCm - 5 * ageNum - 161;
    }
  };

  // TDEE calculation
  const calculateTDEE = () => {
    const bmr = calculateBMR();
    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9
    };
    return Math.round(bmr * activityMultipliers[activityLevel]);
  };

  // Goal-adjusted calories
  const getGoalCalories = () => {
    const tdee = calculateTDEE();
    const adjustments = {
      lose_fast: -750,
      lose: -500,
      lose_slow: -250,
      maintain: 0,
      gain_slow: 250,
      gain: 500
    };
    return tdee + adjustments[goal];
  };

  // Macro calculations
  const calculateMacros = () => {
    const calories = getGoalCalories();
    const weightKg = parseFloat(weight) || 0;
    const proteinGrams = Math.round(weightKg * 2); // 2g per kg bodyweight
    const fatGrams = Math.round((calories * 0.25) / 9); // 25% of calories
    const carbGrams = Math.round((calories - (proteinGrams * 4) - (fatGrams * 9)) / 4);

    return {
      protein: proteinGrams,
      fat: fatGrams,
      carbs: carbGrams,
      calories: calories
    };
  };

  const macros = calculateMacros();

  return (
    <div className="nutrition-guide-page">
      {/* Header */}
      <header className="guide-header">
        <div className="guide-nav">
          <div className="logo" onClick={() => navigate('/')}>MACROTRACK</div>
          <div className="nav-buttons">
            <button className="btn-text" onClick={() => navigate('/login')}>Sign In</button>
            <button className="btn btn-primary" onClick={() => navigate('/signup')}>Get Started</button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="guide-hero">
        <div className={`guide-hero-content ${isVisible ? 'fade-in' : ''}`}>
          <div className="guide-badge">
            <span className="badge-dot"></span>
            Beginner's Guide
          </div>
          <h1>Nutrition Fundamentals</h1>
          <p>Master the science of nutrition. Learn how calories, macros, and body composition work together to transform your health.</p>
        </div>
      </section>

      {/* Main Content */}
      <div className="guide-content">
        {/* Calories Section */}
        <section id="calories" className="guide-section">
          <div className="guide-section-header">
            <span className="section-number">01</span>
            <h2>Understanding Calories</h2>
          </div>

          <div className="section-body">
            <p className="section-intro">
              Calories are units of energy. Every food you eat contains calories, and your body burns calories to function. Understanding this energy balance is the foundation of nutrition.
            </p>

            <div className="concept-grid">
              <div className="concept-card">
                <div className="concept-icon">
                  <Flame size={40} />
                </div>
                <h3>BMR - Basal Metabolic Rate</h3>
                <p>The calories your body burns at rest just to keep you alive. This includes breathing, circulation, and cell production.</p>
                <div className="concept-stat">
                  <span className="stat-label">Average BMR</span>
                  <span className="stat-value">1,400-1,800 cal/day</span>
                </div>
              </div>

              <div className="concept-card">
                <div className="concept-icon">
                  <Zap size={40} />
                </div>
                <h3>TDEE - Total Daily Energy Expenditure</h3>
                <p>Your total calorie burn including activity. BMR + exercise + daily movement + digestion.</p>
                <div className="concept-stat">
                  <span className="stat-label">Average TDEE</span>
                  <span className="stat-value">2,000-2,800 cal/day</span>
                </div>
              </div>

              <div className="concept-card">
                <div className="concept-icon">
                  <Scale size={40} />
                </div>
                <h3>Energy Balance</h3>
                <p>The relationship between calories consumed and calories burned determines weight change.</p>
                <div className="concept-formula">
                  <div className="formula-item">Surplus → Weight Gain</div>
                  <div className="formula-item">Deficit → Weight Loss</div>
                  <div className="formula-item">Balance → Maintenance</div>
                </div>
              </div>
            </div>

            <div className="info-box">
              <div className="info-box-header">
                <Info size={24} />
                <h4>Key Insight</h4>
              </div>
              <p>
                <strong>The 7,700 Calorie Rule:</strong> One kilogram of body fat contains approximately 7,700 calories. To lose 0.5 kg per week, you need a deficit of about 550 calories per day (550 × 7 ≈ 3,850).
              </p>
            </div>
          </div>
        </section>

        {/* Macronutrients Section */}
        <section id="macros" className="guide-section">
          <div className="guide-section-header">
            <span className="section-number">02</span>
            <h2>Macronutrients Explained</h2>
          </div>

          <div className="section-body">
            <p className="section-intro">
              Not all calories are equal. The three macronutrients - protein, carbohydrates, and fats - each play unique roles in your body and provide different amounts of energy.
            </p>

            <div className="macro-breakdown">
              <div className="macro-card protein-card">
                <div className="macro-header">
                  <div className="macro-icon"><Beef size={28} /></div>
                  <div>
                    <h3>Protein</h3>
                    <span className="macro-calories">4 calories per gram</span>
                  </div>
                </div>
                <div className="macro-content">
                  <p><strong>Function:</strong> Building and repairing tissues, enzymes, hormones, and immune function.</p>
                  <p><strong>Recommended:</strong> 1.6-2.2g per kg bodyweight</p>
                  <div className="macro-sources">
                    <h4>Best Sources</h4>
                    <ul>
                      <li>Chicken breast (31g per 100g)</li>
                      <li>Greek yogurt (10g per 100g)</li>
                      <li>Eggs (13g per 100g)</li>
                      <li>Salmon (25g per 100g)</li>
                      <li>Lentils (9g per 100g)</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="macro-card carbs-card">
                <div className="macro-header">
                  <div className="macro-icon"><Wheat size={28} /></div>
                  <div>
                    <h3>Carbohydrates</h3>
                    <span className="macro-calories">4 calories per gram</span>
                  </div>
                </div>
                <div className="macro-content">
                  <p><strong>Function:</strong> Primary energy source for brain and muscles. Essential for high-intensity exercise.</p>
                  <p><strong>Recommended:</strong> 3-5g per kg bodyweight (varies by activity level)</p>
                  <div className="macro-sources">
                    <h4>Best Sources</h4>
                    <ul>
                      <li>Oats (66g per 100g)</li>
                      <li>Sweet potato (20g per 100g)</li>
                      <li>Brown rice (77g per 100g)</li>
                      <li>Quinoa (64g per 100g)</li>
                      <li>Fruits and vegetables</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="macro-card fat-card">
                <div className="macro-header">
                  <div className="macro-icon"><Droplets size={28} /></div>
                  <div>
                    <h3>Fats</h3>
                    <span className="macro-calories">9 calories per gram</span>
                  </div>
                </div>
                <div className="macro-content">
                  <p><strong>Function:</strong> Hormone production, vitamin absorption, brain health, and long-term energy.</p>
                  <p><strong>Recommended:</strong> 0.8-1g per kg bodyweight (25-35% of total calories)</p>
                  <div className="macro-sources">
                    <h4>Best Sources</h4>
                    <ul>
                      <li>Avocado (15g per 100g)</li>
                      <li>Nuts and seeds (45-55g per 100g)</li>
                      <li>Olive oil (100g per 100g)</li>
                      <li>Fatty fish (salmon, 13g per 100g)</li>
                      <li>Eggs (10g per 100g)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="comparison-table">
              <h3>Macro Distribution by Goal</h3>
              <table>
                <thead>
                  <tr>
                    <th>Goal</th>
                    <th>Protein</th>
                    <th>Carbs</th>
                    <th>Fats</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Weight Loss</strong></td>
                    <td>35-40%</td>
                    <td>30-35%</td>
                    <td>25-30%</td>
                  </tr>
                  <tr>
                    <td><strong>Maintenance</strong></td>
                    <td>30%</td>
                    <td>40%</td>
                    <td>30%</td>
                  </tr>
                  <tr>
                    <td><strong>Muscle Gain</strong></td>
                    <td>30%</td>
                    <td>45-50%</td>
                    <td>20-25%</td>
                  </tr>
                  <tr>
                    <td><strong>Keto</strong></td>
                    <td>25%</td>
                    <td>5-10%</td>
                    <td>65-70%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Weight Management Section */}
        <section id="weight" className="guide-section">
          <div className="guide-section-header">
            <span className="section-number">03</span>
            <h2>Weight Management</h2>
          </div>

          <div className="section-body">
            <p className="section-intro">
              Weight management is about creating the right energy balance for your goals. Whether losing, maintaining, or gaining weight, the principles remain the same.
            </p>

            <div className="weight-goal-cards">
              <div className="weight-goal-card loss-card">
                <div className="goal-header">
                  <h3>Weight Loss</h3>
                  <span className="goal-deficit">Calorie Deficit</span>
                </div>
                <div className="goal-content">
                  <div className="goal-range">
                    <h4>Recommended Deficit</h4>
                    <div className="range-options">
                      <div className="range-option">
                        <span className="range-label">Slow (Sustainable)</span>
                        <span className="range-value">250-300 cal/day</span>
                        <span className="range-rate">~0.25 kg/week</span>
                      </div>
                      <div className="range-option recommended">
                        <span className="range-label">Moderate</span>
                        <span className="range-value">500 cal/day</span>
                        <span className="range-rate">~0.45 kg/week</span>
                      </div>
                      <div className="range-option">
                        <span className="range-label">Aggressive</span>
                        <span className="range-value">750-1000 cal/day</span>
                        <span className="range-rate">~0.7-0.9 kg/week</span>
                      </div>
                    </div>
                  </div>
                  <div className="goal-tips">
                    <h4>Tips for Success</h4>
                    <ul>
                      <li>Prioritize protein to preserve muscle mass</li>
                      <li>Expect 0.5-1 kg/week weight loss for sustainability</li>
                      <li>Track weight daily but focus on weekly averages</li>
                      <li>Don't go below 1,200-1,500 cal/day</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="weight-goal-card gain-card">
                <div className="goal-header">
                  <h3>Muscle Gain</h3>
                  <span className="goal-surplus">Calorie Surplus</span>
                </div>
                <div className="goal-content">
                  <div className="goal-range">
                    <h4>Recommended Surplus</h4>
                    <div className="range-options">
                      <div className="range-option recommended">
                        <span className="range-label">Lean Bulk</span>
                        <span className="range-value">200-300 cal/day</span>
                        <span className="range-rate">~0.25-0.45 kg/week</span>
                      </div>
                      <div className="range-option">
                        <span className="range-label">Standard Bulk</span>
                        <span className="range-value">500 cal/day</span>
                        <span className="range-rate">~0.45 kg/week</span>
                      </div>
                    </div>
                  </div>
                  <div className="goal-tips">
                    <h4>Tips for Success</h4>
                    <ul>
                      <li>Combine with resistance training</li>
                      <li>Keep protein high (1.8-2.2g per kg)</li>
                      <li>Expect some fat gain with muscle</li>
                      <li>Be patient - muscle builds slowly</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="warning-box">
              <div className="warning-header">
                <AlertTriangle size={24} />
                <h4>Important Considerations</h4>
              </div>
              <ul>
                <li><strong>Water weight fluctuations:</strong> Your weight can vary 1-2 kg daily due to water, sodium, and carb intake</li>
                <li><strong>Menstrual cycle:</strong> Women may see 1.5-2.5 kg fluctuations during their cycle</li>
                <li><strong>Adaptive thermogenesis:</strong> Your metabolism may slow 5-15% during extended dieting</li>
                <li><strong>Minimum thresholds:</strong> Never eat below your BMR for extended periods</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Body Composition Section */}
        <section id="body-comp" className="guide-section">
          <div className="guide-section-header">
            <span className="section-number">04</span>
            <h2>Body Composition</h2>
          </div>

          <div className="section-body">
            <p className="section-intro">
              Body composition refers to the ratio of fat mass to lean mass (muscle, bone, organs). Scale weight alone doesn't tell the full story of your health and fitness.
            </p>

            <div className="body-comp-explainer">
              <div className="body-comp-visual">
                <div className="body-comp-comparison">
                  <div className="comp-example">
                    <div className="comp-figure fat-figure">
                      <div className="figure-label">Higher Body Fat</div>
                      <div className="figure-stats">
                        <div className="stat">68 kg</div>
                        <div className="stat-breakdown">30% body fat = 20 kg fat</div>
                        <div className="stat-breakdown">70% lean mass = 48 kg</div>
                      </div>
                    </div>
                  </div>
                  <div className="comp-example">
                    <div className="comp-figure muscle-figure">
                      <div className="figure-label">Lower Body Fat</div>
                      <div className="figure-stats">
                        <div className="stat">68 kg</div>
                        <div className="stat-breakdown">18% body fat = 12 kg fat</div>
                        <div className="stat-breakdown">82% lean mass = 56 kg</div>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="comp-note">Same weight, drastically different body composition and appearance</p>
              </div>

              <div className="body-fat-ranges">
                <h3>Body Fat Percentage Ranges</h3>
                <div className="bf-range-grid">
                  <div className="bf-range-card">
                    <h4>Men</h4>
                    <div className="bf-categories">
                      <div className="bf-category">
                        <span className="bf-label">Essential Fat</span>
                        <span className="bf-value">2-5%</span>
                      </div>
                      <div className="bf-category">
                        <span className="bf-label">Athletes</span>
                        <span className="bf-value">6-13%</span>
                      </div>
                      <div className="bf-category recommended">
                        <span className="bf-label">Fitness</span>
                        <span className="bf-value">14-17%</span>
                      </div>
                      <div className="bf-category">
                        <span className="bf-label">Average</span>
                        <span className="bf-value">18-24%</span>
                      </div>
                      <div className="bf-category">
                        <span className="bf-label">Obese</span>
                        <span className="bf-value">25%+</span>
                      </div>
                    </div>
                  </div>

                  <div className="bf-range-card">
                    <h4>Women</h4>
                    <div className="bf-categories">
                      <div className="bf-category">
                        <span className="bf-label">Essential Fat</span>
                        <span className="bf-value">10-13%</span>
                      </div>
                      <div className="bf-category">
                        <span className="bf-label">Athletes</span>
                        <span className="bf-value">14-20%</span>
                      </div>
                      <div className="bf-category recommended">
                        <span className="bf-label">Fitness</span>
                        <span className="bf-value">21-24%</span>
                      </div>
                      <div className="bf-category">
                        <span className="bf-label">Average</span>
                        <span className="bf-value">25-31%</span>
                      </div>
                      <div className="bf-category">
                        <span className="bf-label">Obese</span>
                        <span className="bf-value">32%+</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="measurement-methods">
              <h3>How to Track Body Composition</h3>
              <div className="method-grid">
                <div className="method-card">
                  <h4>Tape Measurements</h4>
                  <p className="method-accuracy">Accuracy: Moderate</p>
                  <p>Track waist, hips, chest, arms, and thighs weekly. Changes indicate fat loss or muscle gain.</p>
                </div>
                <div className="method-card">
                  <h4>Progress Photos</h4>
                  <p className="method-accuracy">Accuracy: Visual</p>
                  <p>Take front, side, and back photos every 2-4 weeks in same lighting and clothing.</p>
                </div>
                <div className="method-card">
                  <h4>Smart Scales</h4>
                  <p className="method-accuracy">Accuracy: Low-Moderate</p>
                  <p>Bioelectrical impedance scales provide estimates. Use for trends, not absolute values.</p>
                </div>
                <div className="method-card">
                  <h4>Caliper Testing</h4>
                  <p className="method-accuracy">Accuracy: Moderate-High</p>
                  <p>Skinfold calipers measure subcutaneous fat at specific sites. Requires practice.</p>
                </div>
                <div className="method-card">
                  <h4>DEXA Scan</h4>
                  <p className="method-accuracy">Accuracy: Very High</p>
                  <p>Gold standard for body composition. Shows exact fat, muscle, and bone mass distribution.</p>
                </div>
                <div className="method-card">
                  <h4>Performance Metrics</h4>
                  <p className="method-accuracy">Accuracy: Functional</p>
                  <p>Track strength gains, endurance, and how clothes fit. Real-world indicators of progress.</p>
                </div>
              </div>
            </div>

            <div className="info-box">
              <div className="info-box-header">
                <Lightbulb size={24} />
                <h4>Pro Tip</h4>
              </div>
              <p>
                Focus on multiple metrics, not just scale weight. You can lose fat and gain muscle simultaneously (recomposition), which may not show on the scale but results in a leaner, stronger physique.
              </p>
            </div>
          </div>
        </section>

        {/* Interactive Calculator Section */}
        <section id="calculator" className="guide-section calculator-section">
          <div className="guide-section-header">
            <span className="section-number">05</span>
            <h2>Personalized Calculator</h2>
          </div>

          <div className="section-body">
            <p className="section-intro">
              Calculate your personalized calorie and macro targets based on your stats and goals.
            </p>

            <div className="calculator-container">
              <div className="calculator-inputs">
                <h3>Your Information</h3>

                <div className="input-group">
                  <label>Gender</label>
                  <div className="gender-toggle">
                    <button
                      className={`gender-option ${gender === 'male' ? 'active' : ''}`}
                      onClick={() => setGender('male')}
                    >
                      Male
                    </button>
                    <button
                      className={`gender-option ${gender === 'female' ? 'active' : ''}`}
                      onClick={() => setGender('female')}
                    >
                      Female
                    </button>
                  </div>
                </div>

                <div className="input-row">
                  <div className="input-group">
                    <label>Weight (kg)</label>
                    <input
                      type="number"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      min="30"
                      max="300"
                    />
                  </div>

                  <div className="input-group">
                    <label>Height (cm)</label>
                    <input
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      min="100"
                      max="250"
                    />
                  </div>

                  <div className="input-group">
                    <label>Age</label>
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      min="15"
                      max="100"
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label>Activity Level</label>
                  <select value={activityLevel} onChange={(e) => setActivityLevel(e.target.value)}>
                    <option value="sedentary">Sedentary (little to no exercise)</option>
                    <option value="light">Light (1-3 days/week)</option>
                    <option value="moderate">Moderate (3-5 days/week)</option>
                    <option value="active">Active (6-7 days/week)</option>
                    <option value="very_active">Very Active (athlete, physical job)</option>
                  </select>
                </div>

                <div className="input-group">
                  <label>Goal</label>
                  <select value={goal} onChange={(e) => setGoal(e.target.value)}>
                    <option value="lose_fast">Lose Weight Fast (-0.7 kg/week)</option>
                    <option value="lose">Lose Weight (-0.45 kg/week)</option>
                    <option value="lose_slow">Lose Weight Slowly (-0.25 kg/week)</option>
                    <option value="maintain">Maintain Weight</option>
                    <option value="gain_slow">Gain Weight Slowly (+0.25 kg/week)</option>
                    <option value="gain">Gain Weight (+0.45 kg/week)</option>
                  </select>
                </div>
              </div>

              <div className="calculator-results">
                <h3>Your Targets</h3>

                <div className="result-card result-primary">
                  <div className="result-label">Daily Calorie Target</div>
                  <div className="result-value">{getGoalCalories()} <span className="result-unit">calories</span></div>
                  <div className="result-detail">TDEE: {calculateTDEE()} cal | BMR: {Math.round(calculateBMR())} cal</div>
                </div>

                <div className="result-macros">
                  <div className="result-macro protein">
                    <div className="macro-bar">
                      <div className="macro-bar-fill" style={{ width: `${(macros.protein * 4 / macros.calories) * 100}%` }}></div>
                    </div>
                    <div className="macro-info">
                      <span className="macro-name">Protein</span>
                      <span className="macro-amount">{macros.protein}g</span>
                      <span className="macro-percent">{Math.round((macros.protein * 4 / macros.calories) * 100)}%</span>
                    </div>
                  </div>

                  <div className="result-macro carbs">
                    <div className="macro-bar">
                      <div className="macro-bar-fill" style={{ width: `${(macros.carbs * 4 / macros.calories) * 100}%` }}></div>
                    </div>
                    <div className="macro-info">
                      <span className="macro-name">Carbs</span>
                      <span className="macro-amount">{macros.carbs}g</span>
                      <span className="macro-percent">{Math.round((macros.carbs * 4 / macros.calories) * 100)}%</span>
                    </div>
                  </div>

                  <div className="result-macro fat">
                    <div className="macro-bar">
                      <div className="macro-bar-fill" style={{ width: `${(macros.fat * 9 / macros.calories) * 100}%` }}></div>
                    </div>
                    <div className="macro-info">
                      <span className="macro-name">Fat</span>
                      <span className="macro-amount">{macros.fat}g</span>
                      <span className="macro-percent">{Math.round((macros.fat * 9 / macros.calories) * 100)}%</span>
                    </div>
                  </div>
                </div>

                <div className="result-cta">
                  <p>Ready to start tracking with these targets?</p>
                  <button className="btn btn-primary btn-large" onClick={() => navigate('/signup')}>
                    Create Free Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Summary Section */}
        <section className="guide-summary">
          <h2>Key Takeaways</h2>
          <div className="takeaway-grid">
            <div className="takeaway-card">
              <div className="takeaway-number">1</div>
              <h3>Calories Drive Weight Change</h3>
              <p>Energy balance is the foundation. Eat less than you burn to lose weight, more to gain weight.</p>
            </div>
            <div className="takeaway-card">
              <div className="takeaway-number">2</div>
              <h3>Macros Affect Body Composition</h3>
              <p>Protein preserves muscle, carbs fuel performance, fats support hormones. Balance all three.</p>
            </div>
            <div className="takeaway-card">
              <div className="takeaway-number">3</div>
              <h3>Track Multiple Metrics</h3>
              <p>Scale weight, measurements, photos, and performance paint the complete picture.</p>
            </div>
            <div className="takeaway-card">
              <div className="takeaway-number">4</div>
              <h3>Consistency Beats Perfection</h3>
              <p>Small, sustainable changes over time create lasting results. Be patient with the process.</p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="guide-cta">
          <h2>Ready to Apply What You've Learned?</h2>
          <p>Join MacroTrack and start tracking your nutrition with science-backed tools.</p>
          <button className="btn btn-primary btn-large" onClick={() => navigate('/signup')}>
            Start Free Today
            <ArrowRight size={20} />
          </button>
        </section>
      </div>

      <Footer />
    </div>
  );
}

export default NutritionGuidePage;
