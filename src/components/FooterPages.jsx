export function TermsContent() {
  return (
    <div className="fp-content">
      <h2>Terms & Conditions</h2>
      <p className="fp-updated">Last updated: March 2026</p>

      <h3>1. Acceptance of Terms</h3>
      <p>By accessing or using FastFuel ("the App"), you agree to be bound by these Terms & Conditions. If you do not agree, do not use the App.</p>

      <h3>2. Description of Service</h3>
      <p>FastFuel is a nutrition planning tool for endurance athletes. It generates macro targets based on training data and user-provided settings. FastFuel is not a medical device and does not provide medical advice.</p>

      <h3>3. Not Medical Advice</h3>
      <p>The information provided by FastFuel is for informational and educational purposes only. It is not intended as a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider before making changes to your diet or exercise program.</p>

      <h3>4. Beta Service</h3>
      <p>FastFuel is currently in beta. The service is provided "as is" without warranties of any kind. Features, calculations, and availability may change without notice.</p>

      <h3>5. User Data</h3>
      <p>You are responsible for the accuracy of data you provide. FastFuel stores your settings and nutrition logs to provide the service. See our Privacy Policy for details on data handling.</p>

      <h3>6. Third-Party Integrations</h3>
      <p>FastFuel integrates with third-party services including Athletica.ai, Intervals.icu, Strava, and FatSecret. Your use of these services is governed by their respective terms. FastFuel is not responsible for the accuracy or availability of third-party data.</p>

      <h3>7. Limitation of Liability</h3>
      <p>FastFuel and its creators shall not be liable for any direct, indirect, incidental, or consequential damages arising from your use of the App, including but not limited to health outcomes, training decisions, or data loss.</p>

      <h3>8. Changes to Terms</h3>
      <p>We may update these terms at any time. Continued use of the App after changes constitutes acceptance of the new terms.</p>
    </div>
  );
}

export function PrivacyContent() {
  return (
    <div className="fp-content">
      <h2>Privacy Policy</h2>
      <p className="fp-updated">Last updated: March 2026</p>

      <h3>What We Collect</h3>
      <p>FastFuel collects only the data necessary to provide the service:</p>
      <ul>
        <li><strong>Account data:</strong> Email address for authentication (via Supabase)</li>
        <li><strong>Profile data:</strong> Weight, height, age, gender — used to calculate your macro targets</li>
        <li><strong>Nutrition logs:</strong> Meals, training fuel, hydration, and supplements you log</li>
        <li><strong>Integration data:</strong> Workout data from Athletica.ai, Intervals.icu, and Strava (accessed via your API keys)</li>
      </ul>

      <h3>How We Store It</h3>
      <ul>
        <li>Profile and nutrition data is stored locally on your device (localStorage) and optionally backed up to Supabase cloud storage</li>
        <li>API keys for third-party integrations are stored in Supabase (encrypted at rest)</li>
        <li>We do not store your third-party passwords</li>
      </ul>

      <h3>What We Don't Do</h3>
      <ul>
        <li>We do not sell your data to third parties</li>
        <li>We do not use your data for advertising</li>
        <li>We do not share your data with other users</li>
        <li>We do not track you across other websites</li>
      </ul>

      <h3>Third-Party Services</h3>
      <p>FastFuel connects to external services at your request. Data shared with these services is governed by their privacy policies:</p>
      <ul>
        <li>Supabase (authentication & cloud backup)</li>
        <li>Athletica.ai (training calendar)</li>
        <li>Intervals.icu (workout & wellness data)</li>
        <li>FatSecret (food database search)</li>
        <li>Anthropic (AI Coach macro recommendations)</li>
      </ul>

      <h3>Data Deletion</h3>
      <p>You can delete all your data at any time from the Settings page. This removes all local data and cloud backups.</p>

      <h3>Contact</h3>
      <p>Questions about your data? Contact us at the email listed in your account settings.</p>
    </div>
  );
}

export function ResourcesContent() {
  return (
    <div className="fp-content">
      <h2>Resources</h2>
      <p className="fp-updated">The science behind FastFuel's macro calculations</p>

      <h3>Fat-Adapted Baseline</h3>
      <p>FastFuel's daily macro split is based on research into keto-adapted endurance athletes. The baseline diet targets approximately 70% fat, 20% protein, and 10% carbohydrates of total calories — consistent with the dietary patterns of elite low-carbohydrate athletes.</p>

      <h3>Protein Target: 2.0 g/kg</h3>
      <p>The FASTER study LC athletes averaged 2.1 g/kg protein intake. FastFuel uses 2.0 g/kg as a well-supported target for fat-adapted endurance athletes, balancing muscle preservation and recovery with the fat-adapted macro split.</p>

      <h3>EPOC-Adjusted Daily Calories</h3>
      <p>High-intensity sessions create Excess Post-exercise Oxygen Consumption (EPOC) — elevated metabolic rate and fat oxidation that persists for hours after training. FastFuel adds a small EPOC bonus to daily calories on HIT days (5-10%), allocated primarily to fat to match the body's post-exercise fuel preference.</p>

      <h3>Periodized Nutrition</h3>
      <p>FastFuel periodizes carbohydrate intake based on training intensity — the same approach used by elite WorldTour cycling teams. Carbs are not restricted year-round; they are manipulated based on training load with lower intake during base training and targeted intake during high-intensity and competition days.</p>
      <div className="fp-ref">
        <strong>Training fuel carbs (g/kg body weight):</strong>
        <ul>
          <li>Rest / Endurance / Lower Tempo: 0 g/kg (fat-fueled)</li>
          <li>Upper Tempo: 0.5 g/kg</li>
          <li>Threshold: 1.0 g/kg</li>
          <li>VO2max / Anaerobic: 1.5 g/kg</li>
        </ul>
      </div>

      <h3>5-Window Fuel Timing</h3>
      <p>Training fuel is distributed across five windows to optimize substrate availability and recovery:</p>
      <ol>
        <li><strong>4-24h Pre:</strong> Set glycogen and fat stores</li>
        <li><strong>&gt;1h Pre:</strong> Top-up fuel without GI distress</li>
        <li><strong>During (early):</strong> Fat-based fuels for low/moderate intensity</li>
        <li><strong>During (later):</strong> Carbs introduced as glycogen depletes</li>
        <li><strong>Post:</strong> Recovery protein + fat (+ carbs after HIT)</li>
      </ol>

      <h3>BMR & TDEE Calculation</h3>
      <p>FastFuel uses the Mifflin-St Jeor equation for Basal Metabolic Rate with a 1.55 activity multiplier for endurance athletes:</p>
      <div className="fp-ref">
        <strong>Mifflin-St Jeor:</strong> BMR = 10 x weight(kg) + 6.25 x height(cm) - 5 x age + gender offset (+5 male, -161 female)
        <p>TDEE = BMR x 1.55 x (1 + EPOC bonus)</p>
      </div>

      {/* ── Expert Consensus ── */}
      <h3 style={{ marginTop: "2.5rem", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "1.5rem" }}>Expert Consensus: Base Macros for Fat-Adapted Endurance Athletes</h3>
      <p>All of these researchers and practitioners converge on one central principle: fat must become the dominant aerobic fuel, and carbohydrates must be reduced enough to allow that metabolic shift to occur.</p>

      <h3>Dr. Stephen Phinney & Dr. Jeff Volek</h3>
      <p><em>The Art and Science of Low Carbohydrate Performance (2012)</em></p>
      <p>The most cited researchers in keto-adapted athletics. In their landmark FASTER Study, the fat-adapted athlete cohort ate a diet consisting of 10% carbohydrates, 19% protein, and 70% fat. Peak fat oxidation was 2.3-fold higher in the low-carb group (1.54 g/min vs 0.67 g/min), occurring at a higher percentage of VO2max — demonstrating that fat-adapted athletes burn more fat at higher intensities than previously thought possible.</p>
      <p>Phinney and Volek's general recommendation for athletes:</p>
      <ul>
        <li><strong>Carbs:</strong> ≤50g/day to maintain ketosis (roughly 5-10% of calories)</li>
        <li><strong>Protein:</strong> ~1.2-1.7g/kg of lean body mass (moderate — excess protein is gluconeogenic and impairs ketosis)</li>
        <li><strong>Fat:</strong> 65-75%+ of total calories, filling the remainder</li>
      </ul>
      <div className="fp-ref">
        <h4>Resources</h4>
        <p><em>The Art and Science of Low Carbohydrate Performance</em> (Volek & Phinney, 2012)</p>
        <p>FASTER Study: "Metabolic characteristics of keto-adapted ultra-endurance runners" — <em>Metabolism</em>, 2015</p>
        <p>"Rethinking fat as a fuel for endurance exercise" — <em>European Journal of Sport Science</em>, 2015</p>
      </div>

      <h3>Dr. Phil Maffetone</h3>
      <p>Maffetone is less dogmatic about hitting specific macro percentages and more focused on carbohydrate tolerance as an individual variable. He historically recommended no more than 40% of calories from natural carbohydrates, and as low as 20% for older or more carbohydrate-intolerant individuals. His Two-Week Keto Test uses a hard carb ceiling: no more than 50 grams of carbohydrates per day to trigger nutritional ketosis.</p>
      <p>His MAF Method ties fat-burning directly to diet: a higher fat, lower natural carbohydrate intake directly affects fat-burning capacity, correlating to a lower respiratory quotient at rest and during submaximal exercise.</p>
      <ul>
        <li><strong>Carbs:</strong> Individualized; start at ≤50g/day for adaptation, then find personal tolerance</li>
        <li><strong>Protein:</strong> "Adequate healthy protein" — quality emphasized over quantity</li>
        <li><strong>Fat:</strong> Fill the rest with natural fats; no fear of dietary fat</li>
      </ul>
      <div className="fp-ref">
        <h4>Resources</h4>
        <p>philmaffetone.com — Macro-Managing Meals</p>
        <p>The Two-Week Keto Test</p>
        <p>Keto, Sports, and Human Performance</p>
        <p><em>The Big Book of Endurance Training and Racing</em> (Maffetone)</p>
      </div>

      <h3>Dr. Paul Laursen & Dr. Daniel Plews</h3>
      <p>These two brought the science into elite triathlon coaching. A ketogenic diet is defined in their research as fewer than 50g/day of carbohydrate and greater than 75% of calories from fat. Evidence from 3-4 week adaptations showed maintenance of both moderate and vigorous intensity endurance exercise, with increases in fat oxidation even at intensities up to 70% VO2max.</p>
      <p>Plews personally follows this structure and used it to win his age group at the Kona World Championships with a course record.</p>
      <ul>
        <li><strong>Carbs:</strong> {"<"}50g/day baseline, with strategic increases pre-race or during race-day execution</li>
        <li><strong>Protein:</strong> Moderate (~15-20% of calories); adequate but not high</li>
        <li><strong>Fat:</strong> ≥70% of calories from quality sources</li>
      </ul>
      <div className="fp-ref">
        <h4>Resources</h4>
        <p>"Impact of Ketogenic Diet on Athletes: Current Insights" — <em>PMC / OAJSM</em>, 2019 (Plews, Zinn, et al.)</p>
        <p>Dostal, Plews, Hofmann, Laursen et al. — <em>Frontiers in Physiology</em>, 2019 (12-week VLCHF study)</p>
        <p>plewsandprof.com</p>
      </div>

      <h3>Peter Defty — Optimized Fat Metabolism (OFM)</h3>
      <p>Defty takes a nuanced position that separates him from the pure keto camp. OFM is not a keto diet and not chronic low-carb either — but one stage involves getting into nutritional ketosis during the off-season or recovery blocks, while avoiding strict ketosis during high-volume or intense training phases.</p>
      <p>His key philosophy: fat is your aerobic energy source, and glycogen/glucose is your "fight or flight" fuel. Strategic carbs are used wisely — race day may involve up to 90% of calories from carbs, but that represents a small percentage of overall weekly intake.</p>
      <ul>
        <li><strong>Carbs:</strong> Low baseline (personalized), strategic increases around key training and racing</li>
        <li><strong>Protein:</strong> Moderate, always eaten with fat</li>
        <li><strong>Fat:</strong> Dominant fuel; quality animal fats, organ meats, and MCTs emphasized</li>
      </ul>
      <div className="fp-ref">
        <h4>Resources</h4>
        <p>vespapower.com / ofm.io</p>
        <p>Endurance Planet Podcast with Peter Defty</p>
      </div>

      <h3>Dr. Jonathan Edwards</h3>
      <p>Dr. Edwards' work intersects with metabolic health and low-carbohydrate approaches. His specific macro frameworks are not as broadly documented in the peer-reviewed literature compared to the others on this list. For precise macro targets, cross-reference his recent interviews or publications directly.</p>

      {/* ── Consensus Table ── */}
      <h3 style={{ marginTop: "2rem" }}>Consensus Macro Ranges</h3>
      <p>Synthesizing across all the above researchers and practitioners:</p>
      <div className="fp-ref">
        <p><strong>Baseline Fat-Adaptation:</strong> Fat 60-70% | Protein 15-20% | Carbs 10-20% / ≤75g/day</p>
        <p><strong>Strict Ketogenic:</strong> Fat 70-80%+ | Protein 15-20% | Carbs {"<"}50g/day / 5-10%</p>
        <p><strong>Race / Peak Training:</strong> Fat drops as carbs increase strategically | Protein holds steady | Carbs up to 30-60g/hr during long efforts</p>
      </div>

      <h3>Key Points of Universal Agreement</h3>
      <ul>
        <li>Carb restriction must be sustained long enough for full adaptation — generally a minimum of 3-6 weeks, often 3-6 months for peak fat oxidation</li>
        <li>Protein should be moderate, not excessive (excess is anti-ketogenic)</li>
        <li>Fat quality matters: prioritize whole food sources — grass-fed meats, fatty fish, eggs, butter, olive oil, coconut/MCT</li>
        <li>Strategic carbohydrate use (around race day and high-intensity sessions) is NOT incompatible with fat adaptation once metabolic flexibility is established</li>
        <li>Electrolyte management (especially sodium) is critical during transition and ongoing</li>
      </ul>

      {/* ── Additional Peer-Reviewed Resources ── */}
      <h3 style={{ marginTop: "2rem" }}>Additional Peer-Reviewed Resources</h3>
      <div className="fp-ref">
        <p>"Effect of a Ketogenic LCHF Diet on Aerobic Capacity in Endurance Athletes" — Meta-Analysis (<em>PMC</em>, 2021)</p>
        <p>"Ketogenic low-CHO, high-fat diet: the future of elite endurance sport?" — Burke (2021) — provides the counterpoint for the full debate</p>
        <p>Maffetone PB, Laursen PB. "Athletes: Fit but Unhealthy?" — <em>Sports Medicine Open</em>, 2016</p>
      </div>

      <h3>Integrations</h3>
      <ul>
        <li><a href="https://athletica.ai" target="_blank" rel="noopener noreferrer">Athletica.ai</a> — Training calendar & workout planning</li>
        <li><a href="https://intervals.icu" target="_blank" rel="noopener noreferrer">Intervals.icu</a> — Workout data, wellness metrics, HRV, sleep</li>
        <li><a href="https://www.strava.com" target="_blank" rel="noopener noreferrer">Strava</a> — Activity tracking</li>
        <li><a href="https://www.fatsecret.com" target="_blank" rel="noopener noreferrer">FatSecret</a> — Food database for meal logging</li>
      </ul>
    </div>
  );
}
