// Helper array for ordinal names
const ordinals = ["First", "Second", "Third", "Fourth", "Fifth"];

// Called on page load to generate win type inputs based on the selected count
function updateWinTypes() {
  const container = document.getElementById("winTypesContainer");
  const count = parseInt(document.getElementById("winTypeCount").value);
  container.innerHTML = ""; // clear existing inputs
  
  for (let i = 1; i <= count; i++) {
    const ordinalText = ordinals[i - 1] || `${i}th`; // Fallback if more than available in array
    // Create a div to wrap the win type inputs
    const winDiv = document.createElement("div");
    winDiv.className = "win-type";
    winDiv.innerHTML = `
      <label>${ordinalText} Win Type (R value):
        <input type="number" id="winSize${i}" placeholder="Enter ${ordinalText.toLowerCase()} win type R value">
      </label>
      <label>${ordinalText} Win Type percentage:
        <input type="number" id="winPct${i}" placeholder="Enter ${ordinalText.toLowerCase()} win type percentage">
      </label>
    `;
    container.appendChild(winDiv);
  }
}

// Set up event listener to update win type inputs when the selection changes
document.getElementById("winTypeCount").addEventListener("change", updateWinTypes);

// Initialize win types on page load
updateWinTypes();

function runSimulation() {
  // Get basic inputs
  const riskPerTrade = parseFloat(document.getElementById("riskPerTrade").value);
  const numTrades = parseInt(document.getElementById("numTrades").value);
  const losePct = parseFloat(document.getElementById("losePct").value);
  const winTypeCount = parseInt(document.getElementById("winTypeCount").value);
  const alertDiv = document.getElementById("alert");

  // Validate that the basic inputs are filled
  if (
    isNaN(riskPerTrade) ||
    isNaN(numTrades) ||
    isNaN(losePct)
  ) {
    alertDiv.style.display = "block";
    alertDiv.textContent = "Error: Please fill in all basic fields.";
    return;
  }
  
  // Gather win type inputs
  let winTypes = [];
  for (let i = 1; i <= winTypeCount; i++) {
    const rVal = parseFloat(document.getElementById(`winSize${i}`).value);
    const pctVal = parseFloat(document.getElementById(`winPct${i}`).value);
    if (isNaN(rVal) || isNaN(pctVal)) {
      alertDiv.style.display = "block";
      alertDiv.textContent = `Error: Please fill in all fields for ${ordinals[i - 1] || i + "th"} win type.`;
      return;
    }
    winTypes.push({ r: rVal, pct: pctVal });
  }
  
  // Validate that the percentages add up to 100 (loss % + all win %)
  const totalWinPct = winTypes.reduce((sum, win) => sum + win.pct, 0);
  if ((losePct + totalWinPct) !== 100) {
    alertDiv.style.display = "block";
    alertDiv.textContent = "Error: The sum of Loss % and all Win % fields must equal 100.";
    return;
  } else {
    alertDiv.style.display = "none";
  }
  
  let tradeResults = [];
  // Initialize counts: loss is -1, plus one entry for each win type R value.
  let counts = { "-1": 0 };
  winTypes.forEach(win => counts[win.r] = 0);
  
  // Pre-calculate cumulative thresholds
  let thresholds = [];
  let cumulative = losePct;
  thresholds.push({ threshold: cumulative, result: -1 });
  winTypes.forEach(win => {
    cumulative += win.pct;
    thresholds.push({ threshold: cumulative, result: win.r });
  });
  
  // Simulate trades
  for (let i = 0; i < numTrades; i++) {
    let rand = Math.random() * 100;
    let result;
    for (let t of thresholds) {
      if (rand < t.threshold) {
        result = t.result;
        break;
      }
    }
    tradeResults.push(result);
    counts[result]++; // increment count for this result
  }
  
  // Calculate total profit/loss in dollars
  const totalProfitLoss = tradeResults.reduce((sum, r) => sum + r, 0) * riskPerTrade;
  
  // Calculate additional statistics: longest winning streak, longest losing streak, and max drawdown
  let longestWinStreak = 0, longestLoseStreak = 0;
  let currentWinStreak = 0, currentLoseStreak = 0;
  let runningTotal = 0, peak = 0, maxDrawdown = 0;
  
  tradeResults.forEach(r => {
    if (r > 0) {
      currentWinStreak++;
      longestWinStreak = Math.max(longestWinStreak, currentWinStreak);
      currentLoseStreak = 0;
    } else if (r < 0) {
      currentLoseStreak++;
      longestLoseStreak = Math.max(longestLoseStreak, currentLoseStreak);
      currentWinStreak = 0;
    } else {
      currentWinStreak = 0;
      currentLoseStreak = 0;
    }
    
    runningTotal += r * riskPerTrade;
    peak = Math.max(peak, runningTotal);
    const drawdown = peak - runningTotal;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  });
  
  // Format the simulated trades output in a singular column
  let tradesOutput = "<strong>Simulated Trades:</strong><br>" + tradeResults.join("<br>");
  
  // Format Trade Counts output with percentages
  let tradeCountsOutput = "<strong>Trade Count:</strong><br>";
  winTypes.forEach(win => {
    const count = counts[win.r];
    const pct = ((count / numTrades) * 100).toFixed(0);
    tradeCountsOutput += `${win.r}r -> ${count} (${pct}%)<br>`;
  });
  const lossCount = counts["-1"];
  const lossPctDisplay = ((lossCount / numTrades) * 100).toFixed(0);
  tradeCountsOutput += `-1r -> ${lossCount} (${lossPctDisplay}%)`;
  
  // Calculate win rate (trades with r > 0)
  const winCount = tradeResults.filter(r => r > 0).length;
  const winRatePct = ((winCount / numTrades) * 100).toFixed(0);
  
  // Calculate total R
  const totalR = tradeResults.reduce((sum, r) => sum + r, 0);
  
  // Build results output HTML
  const resultsHTML = `
    <p>${tradesOutput}</p>
    <p>${tradeCountsOutput}</p>
    <p><strong>Win Rate:</strong> ${winCount}/${numTrades} (${winRatePct}%)</p>
    <p><strong>Total R:</strong> ${totalR}</p>
    <p><strong>Total Profit/Loss:</strong> $${totalProfitLoss.toFixed(2)}</p>
    <p><strong>Longest Winning Streak:</strong> ${longestWinStreak}</p>
    <p><strong>Longest Losing Streak:</strong> ${longestLoseStreak}</p>
    <p><strong>Maximum Drawdown:</strong> $${maxDrawdown.toFixed(2)}</p>
  `;
  
  // Show output box and update results
  const outputDiv = document.getElementById("output");
  outputDiv.style.display = "block";
  outputDiv.innerHTML = resultsHTML;
  
  // Compute the equity curve (cumulative profit in dollars)
  let equityCurve = [];
  let cumulativeEquity = 0;
  tradeResults.forEach(r => {
    cumulativeEquity += r * riskPerTrade;
    equityCurve.push(cumulativeEquity);
  });
  
  // Show chart container and render the chart
  const chartContainer = document.getElementById("chart-container");
  chartContainer.style.display = "block";
  
  // Remove previous chart instance if it exists
  if (window.myChart instanceof Chart) {
    window.myChart.destroy();
  }
  
  const ctx = document.getElementById("equityCurve").getContext("2d");
  window.myChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: equityCurve.map((_, index) => index + 1),
      datasets: [{
        label: 'Equity Curve ($)',
        data: equityCurve,
        borderColor: varBorderColor(),
        backgroundColor: varBackgroundColor(),
        fill: false,
        tension: 0.1,
      }]
    },
    options: {
      scales: {
        x: {
          title: {
            display: true,
            text: 'Trade Number'
          }
        },
        y: {
          title: {
            display: true,
            text: 'Cumulative Profit ($)'
          }
        }
      }
    }
  });
}

// Helper functions to use CSS variables for chart colors
function varBorderColor() {
  return getComputedStyle(document.documentElement).getPropertyValue('--button-bg').trim() || "#6200ee";
}
function varBackgroundColor() {
  return getComputedStyle(document.documentElement).getPropertyValue('--button-hover').trim() || "#7e3ff2";
}

// --- Graph Control Functions ---

// Open the current graph as an image in a new tab.
function openGraphInNewTab() {
  const canvas = document.getElementById("equityCurve");
  const dataURL = canvas.toDataURL("image/png");
  const newTab = window.open();
  newTab.document.body.style.margin = "0";
  newTab.document.body.innerHTML = `<img src="${dataURL}" style="width:100%;height:auto;">`;
}

// Toggle full screen mode for the chart container.
function toggleGraphFullScreen() {
  const chartContainer = document.getElementById("chart-container");
  if (!document.fullscreenElement) {
    chartContainer.requestFullscreen().catch(err => {
      console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
    });
  } else {
    document.exitFullscreen();
  }
}

// Set up event listeners for graph control buttons.
document.getElementById("open-new-tab-btn").addEventListener("click", openGraphInNewTab);
document.getElementById("toggle-fs-btn").addEventListener("click", toggleGraphFullScreen);

function resetSimulation() {
  document.getElementById("riskPerTrade").value = "";
  document.getElementById("numTrades").value = "";
  document.getElementById("losePct").value = "";
  
  updateWinTypes();
  const winTypeCount = parseInt(document.getElementById("winTypeCount").value);
  for (let i = 1; i <= winTypeCount; i++) {
    document.getElementById(`winSize${i}`).value = "";
    document.getElementById(`winPct${i}`).value = "";
  }
  
  document.getElementById("alert").style.display = "none";
  // Hide the output and chart containers after reset
  document.getElementById("output").style.display = "none";
  document.getElementById("output").innerHTML = "";
  document.getElementById("chart-container").style.display = "none";
}

// --- Theme Toggle Functionality using a slider ---

// Set the theme by adding the corresponding class to the body and saving it
function setTheme(theme) {
  document.body.classList.remove("dark-theme", "light-theme");
  document.body.classList.add(theme + "-theme");
  localStorage.setItem("theme", theme);
}

function toggleTheme() {
  const toggle = document.getElementById("theme-toggle");
  // Here, when checked we set dark theme; adjust as desired.
  const newTheme = toggle.checked ? "dark" : "light";
  setTheme(newTheme);
}

document.addEventListener("DOMContentLoaded", () => {
  // Change default to light theme if no theme is stored.
  const storedTheme = localStorage.getItem("theme") || "light";
  setTheme(storedTheme);
  // Set checkbox state: if stored theme is dark, checkbox is checked.
  document.getElementById("theme-toggle").checked = storedTheme === "dark";
  document.getElementById("theme-toggle").addEventListener("change", toggleTheme);
});
