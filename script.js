const apiKey = '482adb12c18eaf2ee9c6a2dac8e6c7b3';
const defaultCity = 'Moscow, RU';

const weatherCache = {
    data: new Map(),
    timestamp: new Map(),
    maxAge: 10 * 60 * 1000,

    set(key, value) {
        this.data.set(key, value);
        this.timestamp.set(key, Date.now());
    },

    get(key) {
        const data = this.data.get(key);
        const timestamp = this.timestamp.get(key);
        
        if (!data || !timestamp) return null;
        if (Date.now() - timestamp > this.maxAge) {
            this.data.delete(key);
            this.timestamp.delete(key);
            return null;
        }
        return data;
    }
};

const elements = {
    searchInput: document.getElementById('searchInput'),
    currentWeatherIcon: document.getElementById('currentWeatherIcon'),
    currentTemperature: document.getElementById('currentTemperature'),
    currentCity: document.getElementById('currentCity'),
    currentDate: document.getElementById('currentDate'),
    currentWeatherDescription: document.getElementById('currentWeatherDescription'),
    currentWindSpeed: document.getElementById('currentWindSpeed'),
    currentHumidity: document.getElementById('currentHumidity'),
    currentPressure: document.getElementById('currentPressure'),
    sunrise: document.getElementById('sunrise'),
    sunset: document.getElementById('sunset'),
    uvIndex: document.getElementById('uvIndex'),
    visibility: document.getElementById('visibility'),
    feelsLike: document.getElementById('feelsLike'),
    forecastCards: document.getElementById('forecastCards'),
    hourlyForecast: document.getElementById('hourlyForecast')
};

const UNSPLASH_ACCESS_KEY = 'd43hJZMhSo9rDBPuPkXA5jY3_wG0B017X1mQf5MGCKY';

async function getCityImage(cityName) {
    try {
        const response = await fetch(`https://api.unsplash.com/search/photos?query=${cityName}+city+landscape&per_page=1`, {
            headers: {
                'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`
            }
        });
        const data = await response.json();
        return data.results[0]?.urls?.regular || 'https://images.unsplash.com/photo-1514924013411-cbf25faa35bb';
    } catch (error) {
        console.error('Error fetching city image:', error);
        return 'https://images.unsplash.com/photo-1514924013411-cbf25faa35bb';
    }
}

const cityMapping = {
    'москва': 'Moscow, RU',
    'санкт-петербург': 'Saint Petersburg, RU',
    'спб': 'Saint Petersburg, RU',
    'питер': 'Saint Petersburg, RU'
};

async function getWeatherData(city) {
    try {
        loader.show();
        
        const normalizedCity = city.toLowerCase().trim();
        const mappedCity = cityMapping[normalizedCity] || city;
        
        const cachedData = weatherCache.get(mappedCity);
        if (cachedData) {
            updateUI(cachedData);
            loader.hide();
            return;
        }

        const geoResponse = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${mappedCity}&limit=1&appid=${apiKey}`);
        const geoData = await geoResponse.json();

        if (!geoData.length) {
            throw new Error('Город не найден. Попробуйте ввести название на английском языке или проверьте правильность написания.');
        }

        const { lat, lon, name } = geoData[0];
        elements.currentCity.textContent = name;

        const [currentWeather, forecast] = await Promise.all([
            fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=ru&appid=${apiKey}`).then(r => r.json()),
            fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=ru&appid=${apiKey}`).then(r => r.json())
        ]);

        const weatherData = { currentWeather, forecast, name };
        weatherCache.set(mappedCity, weatherData);
        updateUI(weatherData);
        
    } catch (error) {
        showError(error.message);
    } finally {
        loader.hide();
    }
}

function updateUI({ currentWeather, forecast, name }) {
    updateCurrentWeather(currentWeather, name);
    updateForecast(forecast);
    updateHourlyForecast(forecast);
}

async function updateCurrentWeather(currentWeather, cityName) {
    const sunrise = new Date(currentWeather.sys.sunrise * 1000);
    const sunset = new Date(currentWeather.sys.sunset * 1000);
    
    const cityImage = await getCityImage(cityName);
    document.querySelector('.city-background').style.backgroundImage = `url(${cityImage})`;
    
    elements.currentTemperature.textContent = `${Math.round(currentWeather.main.temp)}°C`;
    elements.currentCity.textContent = cityName;
    elements.currentDate.textContent = formatDate(new Date());
    elements.currentWeatherDescription.textContent = capitalizeFirstLetter(currentWeather.weather[0].description);
    elements.currentWindSpeed.textContent = `${Math.round(currentWeather.wind.speed)} м/с`;
    elements.currentHumidity.textContent = `${currentWeather.main.humidity}%`;
    elements.currentPressure.textContent = `${Math.round(currentWeather.main.pressure * 0.750062)} мм`;
    elements.sunrise.textContent = formatTime(sunrise);
    elements.sunset.textContent = formatTime(sunset);
    elements.visibility.textContent = `${(currentWeather.visibility / 1000).toFixed(1)} км`;
    elements.feelsLike.textContent = `${Math.round(currentWeather.main.feels_like)}°C`;
    
    try {
        const uvResponse = await fetch(`https://api.openweathermap.org/data/2.5/uvi?lat=${currentWeather.coord.lat}&lon=${currentWeather.coord.lon}&appid=${apiKey}`);
        const uvData = await uvResponse.json();
        elements.uvIndex.textContent = Math.round(uvData.value);
    } catch (error) {
        elements.uvIndex.textContent = 'N/A';
    }

    const weatherIcon = document.getElementById('currentWeatherIcon');
    weatherIcon.style.opacity = '0';
    setTimeout(() => {
        weatherIcon.src = `https://openweathermap.org/img/wn/${currentWeather.weather[0].icon}@4x.png`;
        weatherIcon.style.opacity = '1';
    }, 300);
}

function updateForecast(data) {
    elements.forecastCards.innerHTML = '';
    
    const dailyForecasts = new Map();
    
    data.list.forEach(forecast => {
        const date = new Date(forecast.dt * 1000);
        const day = date.toLocaleDateString('ru-RU', { weekday: 'short', month: 'short', day: 'numeric' });
        
        if (!dailyForecasts.has(day)) {
            dailyForecasts.set(day, {
                temps: [],
                icons: new Set(),
                descriptions: new Set(),
                windSpeeds: [],
                humidity: [],
                precipitation: [],
                pressure: [],
                feelsLike: [],
                visibility: [],
                sunrise: null,
                sunset: null
            });
        }
        
        const dayData = dailyForecasts.get(day);
        dayData.temps.push(forecast.main.temp);
        dayData.icons.add(forecast.weather[0].icon);
        dayData.descriptions.add(forecast.weather[0].description);
        dayData.windSpeeds.push(forecast.wind.speed);
        dayData.humidity.push(forecast.main.humidity);
        dayData.precipitation.push(forecast.pop * 100);
        dayData.pressure.push(forecast.main.pressure);
        dayData.feelsLike.push(forecast.main.feels_like);
        dayData.visibility.push(forecast.visibility);
    });

    let index = 0;
    dailyForecasts.forEach((forecast, day) => {
        if (index >= 7) return; // Показываем только 7 дней

        const minTemp = Math.round(Math.min(...forecast.temps));
        const maxTemp = Math.round(Math.max(...forecast.temps));
        const avgWind = Math.round(forecast.windSpeeds.reduce((a, b) => a + b) / forecast.windSpeeds.length);
        const avgHumidity = Math.round(forecast.humidity.reduce((a, b) => a + b) / forecast.humidity.length);
        const maxPrecip = Math.round(Math.max(...forecast.precipitation));
        const avgPressure = Math.round(forecast.pressure.reduce((a, b) => a + b) / forecast.pressure.length * 0.750062);
        const avgFeelsLike = Math.round(forecast.feelsLike.reduce((a, b) => a + b) / forecast.feelsLike.length);
        const avgVisibility = (forecast.visibility.reduce((a, b) => a + b) / forecast.visibility.length / 1000).toFixed(1);
        const icon = Array.from(forecast.icons)[0];
        const description = Array.from(forecast.descriptions)[0];

        const card = document.createElement('div');
        card.className = 'forecast-card';
        card.innerHTML = `
            <div class="forecast-header">
                <h3>${day}</h3>
                <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${description}">
            </div>
            <div class="forecast-temp">
                <span class="max-temp">${maxTemp}°</span>
                <span class="min-temp">${minTemp}°</span>
            </div>
            <div class="forecast-details">
                <div class="detail-row">
                    <span>💨 Ветер</span>
                    <span>${avgWind} м/с</span>
                </div>
                <div class="detail-row">
                    <span>💧 Влажность</span>
                    <span>${avgHumidity}%</span>
                </div>
                <div class="detail-row">
                    <span>🌧️ Осадки</span>
                    <span>${maxPrecip}%</span>
                </div>
                <div class="detail-row">
                    <span>🌡️ Давление</span>
                    <span>${avgPressure} мм</span>
                </div>
                <div class="detail-row">
                    <span>🌡️ Ощущается</span>
                    <span>${avgFeelsLike}°</span>
                </div>
                <div class="detail-row">
                    <span>👁️ Видимость</span>
                    <span>${avgVisibility} км</span>
                </div>
                <div class="detail-row description">
                    <span>${capitalizeFirstLetter(description)}</span>
                </div>
            </div>
        `;
        
        elements.forecastCards.appendChild(card);
        index++;
    });
}

function updateHourlyForecast(data) {
    const hourlyContainer = document.getElementById('hourlyForecast');
    hourlyContainer.innerHTML = '';

    // Берем следующие 24 часа прогноза
    const hourlyData = data.list.slice(0, 8);

    hourlyData.forEach(hour => {
        const date = new Date(hour.dt * 1000);
        const temp = Math.round(hour.main.temp);
        const icon = hour.weather[0].icon;
        const windSpeed = Math.round(hour.wind.speed);
        const humidity = hour.main.humidity;
        const description = hour.weather[0].description;

        const hourCard = document.createElement('div');
        hourCard.className = 'hourly-card';
        hourCard.innerHTML = `
            <div class="hour">${date.getHours()}:00</div>
            <img src="https://openweathermap.org/img/wn/${icon}.png" alt="${description}" class="weather-icon">
            <div class="temp">${temp}°</div>
            <div class="details">
                <div class="wind">${windSpeed} м/с</div>
                <div class="humidity">${humidity}%</div>
            </div>
        `;
        hourlyContainer.appendChild(hourCard);
    });
}

function showError(message) {
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
        setTimeout(() => {
            errorElement.classList.add('hidden');
        }, 5000);
    }
}

const loader = {
    element: document.querySelector('.loader-container'),
    show() {
        if (this.element) {
            this.element.classList.remove('hidden');
        }
    },
    hide() {
        if (this.element) {
            this.element.classList.add('hidden');
        }
    }
};

function formatTime(date) {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date) {
    return date.toLocaleDateString('ru-RU', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

class WeatherFactsSlider {
    constructor() {
        if (!this.validateElements()) return;
        
        this.currentSlide = 0;
        this.slidesPerView = this.calculateSlidesPerView();
        this.totalSlides = this.slides.length;
        this.isAnimating = false;
        this.autoplayInterval = null;
        
        this.init();
    }

    validateElements() {
        this.track = document.querySelector('.slider-track');
        this.slides = document.querySelectorAll('.fact-slide');
        this.dotsContainer = document.querySelector('.slider-dots');
        this.prevButton = document.querySelector('.slider-button.prev');
        this.nextButton = document.querySelector('.slider-button.next');

        if (!this.track || !this.slides.length || !this.dotsContainer || 
            !this.prevButton || !this.nextButton) {
            console.error('Slider: Required elements not found');
            return false;
        }

        return true;
    }

    calculateSlidesPerView() {
        const width = window.innerWidth;
        if (width <= 768) return 1;
        if (width <= 1024) return 2;
        return 3;
    }

    init() {
        this.updateSlidesWidth();
        
        this.createDots();
        
        this.updateSlider();
        
        this.setupEventListeners();
        
        this.startAutoplay();
    }

    updateSlidesWidth() {
        const slideWidth = (100 / this.slidesPerView);
        const marginWidth = 20;
        
        this.slides.forEach(slide => {
            slide.style.flex = `0 0 calc(${slideWidth}% - ${marginWidth}px)`;
        });
    }

    setupEventListeners() {
        this.prevButton.addEventListener('click', () => {
            if (!this.isAnimating) this.slide('prev');
        });
        
        this.nextButton.addEventListener('click', () => {
            if (!this.isAnimating) this.slide('next');
        });

        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                const newSlidesPerView = this.calculateSlidesPerView();
                if (newSlidesPerView !== this.slidesPerView) {
                    this.slidesPerView = newSlidesPerView;
                    this.updateSlidesWidth();
                    if (this.currentSlide > this.totalSlides - this.slidesPerView) {
                        this.currentSlide = Math.max(0, this.totalSlides - this.slidesPerView);
                    }
                    this.updateSlider();
                    this.recreateDots();
                }
            }, 250);
        });

        this.track.parentElement.addEventListener('mouseenter', () => this.stopAutoplay());
        this.track.parentElement.addEventListener('mouseleave', () => this.startAutoplay());

        let touchStartX = 0;
        let touchEndX = 0;

        this.track.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            this.stopAutoplay();
        }, { passive: true });

        this.track.addEventListener('touchmove', (e) => {
            touchEndX = e.touches[0].clientX;
        }, { passive: true });

        this.track.addEventListener('touchend', () => {
            const diff = touchStartX - touchEndX;
            if (Math.abs(diff) > 50) { 
                if (diff > 0) {
                    this.slide('next');
                } else {
                    this.slide('prev');
                }
            }
            this.startAutoplay();
        });
    }

    recreateDots() {
        this.dotsContainer.innerHTML = '';
        this.createDots();
    }

    createDots() {
        const dotsCount = Math.max(1, this.totalSlides - this.slidesPerView + 1);
        for (let i = 0; i < dotsCount; i++) {
            const dot = document.createElement('div');
            dot.className = 'slider-dot' + (i === 0 ? ' active' : '');
            dot.addEventListener('click', () => {
                if (!this.isAnimating) {
                    this.currentSlide = i;
                    this.updateSlider();
                }
            });
            this.dotsContainer.appendChild(dot);
        }
    }

    updateSlider() {
        this.isAnimating = true;
        
        const slideWidth = (100 / this.slidesPerView);
        const marginOffset = (20 * this.currentSlide) / this.slidesPerView;
        const offset = -(this.currentSlide * slideWidth) - marginOffset;
        this.track.style.transform = `translateX(${offset}%)`;
        
        this.prevButton.style.opacity = this.currentSlide === 0 ? '0.5' : '1';
        this.prevButton.style.pointerEvents = this.currentSlide === 0 ? 'none' : 'auto';
        
        const lastPossibleSlide = this.totalSlides - this.slidesPerView;
        this.nextButton.style.opacity = this.currentSlide >= lastPossibleSlide ? '0.5' : '1';
        this.nextButton.style.pointerEvents = this.currentSlide >= lastPossibleSlide ? 'none' : 'auto';
        
        const dots = this.dotsContainer.children;
        Array.from(dots).forEach((dot, index) => {
            dot.classList.toggle('active', index === this.currentSlide);
        });

        setTimeout(() => {
            this.isAnimating = false;
        }, 500);
    }

    slide(direction) {
        if (this.isAnimating) return;

        const lastPossibleSlide = this.totalSlides - this.slidesPerView;

        if (direction === 'prev' && this.currentSlide > 0) {
            this.currentSlide--;
        } else if (direction === 'next' && this.currentSlide < lastPossibleSlide) {
            this.currentSlide++;
        }
        
        this.updateSlider();
    }

    startAutoplay() {
        if (this.autoplayInterval) this.stopAutoplay();
        
        this.autoplayInterval = setInterval(() => {
            const lastPossibleSlide = this.totalSlides - this.slidesPerView;
            if (this.currentSlide >= lastPossibleSlide) {
                this.currentSlide = 0;
            } else {
                this.currentSlide++;
            }
            this.updateSlider();
        }, 5000);
    }

    stopAutoplay() {
        if (this.autoplayInterval) {
            clearInterval(this.autoplayInterval);
            this.autoplayInterval = null;
        }
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

elements.searchInput.addEventListener('input', debounce(async (event) => {
    const query = event.target.value.trim();
    
    if (query.length < 2) {
        document.getElementById('searchSuggestions').style.display = 'none';
        return;
    }
    
    const cities = await searchCities(query);
    displaySearchResults(cities);
}, 300));

elements.searchInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        getWeatherData(elements.searchInput.value);
    }
});

async function searchCities(query) {
    try {
        const response = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${apiKey}`);
        const data = await response.json();
        return data.map(city => ({
            name: city.local_names?.ru || city.name,
            fullName: `${city.name}, ${city.country}`,
            lat: city.lat,
            lon: city.lon,
            country: city.country
        }));
    } catch (error) {
        console.error('Error searching cities:', error);
        return [];
    }
}

function displaySearchResults(cities) {
    const suggestions = document.getElementById('searchSuggestions');
    suggestions.innerHTML = '';
    
    if (cities.length === 0) {
        suggestions.style.display = 'none';
        return;
    }

    cities.forEach(city => {
        const div = document.createElement('div');
        div.className = 'search-suggestion';
        div.textContent = `${city.name}, ${city.country}`;
        div.addEventListener('click', () => {
            elements.searchInput.value = city.name;
            suggestions.style.display = 'none';
            getWeatherData(city.fullName);
        });
        suggestions.appendChild(div);
    });
    
    suggestions.style.display = 'block';
}

document.addEventListener('click', (event) => {
    const suggestions = document.getElementById('searchSuggestions');
    if (!event.target.closest('.search-container')) {
        suggestions.style.display = 'none';
    }
});

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translate(-50%, -100%); opacity: 0; }
        to { transform: translate(-50%, 0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translate(-50%, 0); opacity: 1; }
        to { transform: translate(-50%, -100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', (e) => {
        document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active'));
        link.classList.add('active');

        if (link.getAttribute('href') !== '#') {
            e.preventDefault();
            const targetId = link.getAttribute('href').slice(1);
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth' });
            }
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
});

window.addEventListener('scroll', () => {
    const sections = ['about'];
    let currentSection = '';

    sections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) {
            const rect = section.getBoundingClientRect();
            if (rect.top <= 150 && rect.bottom >= 150) {
                currentSection = sectionId;
            }
        }
    });

    document.querySelectorAll('.nav-links a').forEach(link => {
        const href = link.getAttribute('href').slice(1);
        if ((currentSection === '' && href === '') || href === currentSection) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const slider = new WeatherFactsSlider();
        getWeatherData(defaultCity);
});
