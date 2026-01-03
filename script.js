// Weather App - script.js
// Add your OpenWeatherMap API key below
const API_KEY = '4434953bc908e1365669f049e1886ab6'; // API key inserted per user request

const refs = {
  searchInput: document.getElementById('searchInput'),
  searchBtn: document.getElementById('searchBtn'),
  cityEl: document.querySelector('.city'),
  datetimeEl: document.querySelector('.datetime'),
  tempEl: document.querySelector('.temp'),
  condIcon: document.querySelector('.cond-icon'),
  condText: document.querySelector('.cond-text'),
  feelsEl: document.querySelector('.feels'),
  humidityEl: document.querySelector('.humidity'),
  windEl: document.querySelector('.wind'),
  pressureEl: document.querySelector('.pressure'),
  sunriseEl: document.querySelector('.sunrise'),
  sunsetEl: document.querySelector('.sunset'),
  forecastCards: document.getElementById('forecastCards'),
  loading: document.getElementById('loading'),
  error: document.getElementById('error')
};

// Helper: show/hide loading
function showLoading(){ refs.loading.classList.remove('hidden'); }
function hideLoading(){ refs.loading.classList.add('hidden'); }

function showError(msg){ refs.error.textContent = msg; refs.error.classList.remove('hidden'); setTimeout(()=> refs.error.classList.add('hidden'), 3500); }

// Format unix timestamp to local time string
function formatTime(unix, timezoneOffsetSeconds = 0){
  const date = new Date((unix + timezoneOffsetSeconds) * 1000);
  return date.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
}

function formatDateTime(unix, timezoneOffsetSeconds = 0){
  const date = new Date((unix + timezoneOffsetSeconds) * 1000);
  return date.toLocaleString([], {weekday:'short', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'});
}

// Fetch by city name -> get coords then use /weather and /forecast (free endpoints)
async function fetchWeatherByCity(city){
  if(!API_KEY || API_KEY === 'YOUR_API_KEY_HERE'){
    showError('Please set your OpenWeatherMap API key in script.js');
    return;
  }

  try{
    showLoading();
    // 1) Current weather (also provides coords + timezone)
    const weatherRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`);
    if(!weatherRes.ok) throw new Error('City not found');
    const weatherData = await weatherRes.json();

    const { coord: {lat, lon}, name, sys, timezone } = weatherData;

    // 2) Forecast (3-hourly) -> group into daily max/min for next 5 days
    const forecastRes = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`);
    if(!forecastRes.ok) throw new Error('Forecast fetch failed');
    const forecastData = await forecastRes.json();

    renderCurrentFromWeather(name, sys.country, weatherData, timezone);
    renderForecastFromForecastData(forecastData, timezone);
  }catch(err){
    showError(err.message || 'Failed to fetch weather');
  }finally{
    hideLoading();
  }
}

// Render current weather using /weather response
function renderCurrentFromWeather(city, country, weatherData, tzOffset){
  refs.cityEl.textContent = `${city}, ${country}`;
  refs.datetimeEl.textContent = formatDateTime(weatherData.dt, tzOffset);
  refs.tempEl.textContent = `${Math.round(weatherData.main.temp)}°C`;
  refs.condText.textContent = weatherData.weather[0].description.replace(/\b\w/g, l => l.toUpperCase());
  refs.condIcon.src = `https://openweathermap.org/img/wn/${weatherData.weather[0].icon}@2x.png`;
  refs.condIcon.alt = weatherData.weather[0].description;

  refs.feelsEl.textContent = `${Math.round(weatherData.main.feels_like)}°C`;
  refs.humidityEl.textContent = `${weatherData.main.humidity}%`;
  refs.windEl.textContent = `${weatherData.wind.speed} m/s`;
  refs.pressureEl.textContent = `${weatherData.main.pressure} hPa`;
  refs.sunriseEl.textContent = formatTime(weatherData.sys.sunrise, tzOffset);
  refs.sunsetEl.textContent = formatTime(weatherData.sys.sunset, tzOffset);
}

// Render 5-day forecast using /forecast grouped by day
function renderForecastFromForecastData(forecastData, tzOffset){
  refs.forecastCards.innerHTML = '';
  // Group by local date (yyyy-mm-dd)
  const groups = {};
  forecastData.list.forEach(item =>{
    const local = new Date((item.dt + tzOffset) * 1000);
    const key = local.toISOString().slice(0,10);
    if(!groups[key]) groups[key] = [];
    groups[key].push(item);
  });

  // Create array of days sorted, skip today
  const keys = Object.keys(groups).sort();
  // take next 5 days excluding today
  const todayKey = new Date((forecastData.list[0].dt + tzOffset) * 1000).toISOString().slice(0,10);
  const dayKeys = keys.filter(k => k !== todayKey).slice(0,5);

  dayKeys.forEach(key =>{
    const items = groups[key];
    // compute max/min temps and pick an icon (midday or first)
    let max = -Infinity, min = Infinity;
    const iconCounts = {};
    items.forEach(it =>{
      const t = it.main.temp;
      if(t > max) max = t;
      if(t < min) min = t;
      const ic = it.weather[0].icon;
      iconCounts[ic] = (iconCounts[ic]||0) + 1;
    });
    // choose most frequent icon
    const icon = Object.keys(iconCounts).sort((a,b)=> iconCounts[b]-iconCounts[a])[0];

    const dt = new Date(key + 'T00:00:00');
    const dayName = dt.toLocaleDateString([], {weekday:'short'});

    const card = document.createElement('div');
    card.className = 'forecast-card';
    card.innerHTML = `
      <div class="forecast-day">${dayName}</div>
      <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="">
      <div class="forecast-temp">${Math.round(max)}° / ${Math.round(min)}°</div>
    `;
    refs.forecastCards.appendChild(card);
  });
}

// Event handlers
function init(){
  refs.searchBtn.addEventListener('click', ()=>{
    const q = refs.searchInput.value.trim();
    if(q) fetchWeatherByCity(q);
  });

  refs.searchInput.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter'){
      const q = refs.searchInput.value.trim();
      if(q) fetchWeatherByCity(q);
    }
  });

  // Load a default city
  fetchWeatherByCity('New York');
}

// Init on DOM ready
document.addEventListener('DOMContentLoaded', init);

// Comments: All API calls use async/await, errors are displayed, timestamps converted with timezone offset.
