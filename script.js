// API ключ для OpenWeatherMap
const apiKey = '482adb12c18eaf2ee9c6a2dac8e6c7b3';

// Город по умолчанию
const defaultCity = 'Moscow, RU';

// Кэш для хранения данных о погоде
const weatherCache = {
    data: new Map(), // Хранит данные о погоде
    timestamp: new Map(), // Хранит временные метки для данных о погоде
    maxAge: 10 * 60 * 1000, // Максимальное время жизни данных в кэше (10 минут)

    // Метод для сохранения данных в кэше
    set(key, value) {
        this.data.set(key, value);
        this.timestamp.set(key, Date.now());
    },

    // Метод для получения данных из кэша
    get(key) {
        const data = this.data.get(key);
        const timestamp = this.timestamp.get(key);

        // Если данные или временная метка отсутствуют, возвращаем null
        if (!data || !timestamp) return null;

        // Если данные устарели, удаляем их из кэша и возвращаем null
        if (Date.now() - timestamp > this.maxAge) {
            this.data.delete(key);
            this.timestamp.delete(key);
            return null;
        }

        // Возвращаем данные
        return data;
    }
};

// Элементы DOM
const elements = {
    searchInput: document.getElementById('searchInput'), // Поле ввода для поиска города
    currentWeatherIcon: document.getElementById('currentWeatherIcon'), // Иконка текущей погоды
    currentTemperature: document.getElementById('currentTemperature'), // Текущая температура
    currentCity: document.getElementById('currentCity'), // Текущий город
    currentDate: document.getElementById('currentDate'), // Текущая дата
    currentWeatherDescription: document.getElementById('currentWeatherDescription'), // Описание текущей погоды
    currentWindSpeed: document.getElementById('currentWindSpeed'), // Скорость ветра
    currentHumidity: document.getElementById('currentHumidity'), // Влажность
    currentPressure: document.getElementById('currentPressure'), // Давление
    sunrise: document.getElementById('sunrise'), // Время восхода солнца
    sunset: document.getElementById('sunset'), // Время заката солнца
    uvIndex: document.getElementById('uvIndex'), // УФ индекс
    visibility: document.getElementById('visibility'), // Видимость
    feelsLike: document.getElementById('feelsLike'), // Ощущается как
    forecastCards: document.getElementById('forecastCards'), // Карточки прогноза
    hourlyForecast: document.getElementById('hourlyForecast') // Почасовой прогноз
};

// API ключ для Unsplash
const UNSPLASH_ACCESS_KEY = 'd43hJZMhSo9rDBPuPkXA5jY3_wG0B017X1mQf5MGCKY';

// Функция для получения изображения города с Unsplash
async function getCityImage(cityName) {
    try {
        // Запрос к API Unsplash
        const response = await fetch(`https://api.unsplash.com/search/photos?query=${cityName}+city+landscape&per_page=1`, {
            headers: {
                'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`
            }
        });
        const data = await response.json();

        // Возвращаем URL изображения или изображение по умолчанию, если не найдено
        return data.results[0]?.urls?.regular || 'https://images.unsplash.com/photo-1514924013411-cbf25faa35bb';
    } catch (error) {
        console.error('Error fetching city image:', error);
        return 'https://images.unsplash.com/photo-1514924013411-cbf25faa35bb';
    }
}

// Словарь для маппинга русских названий городов на английские
const cityMapping = {
    'москва': 'Moscow, RU',
    'санкт-петербург': 'Saint Petersburg, RU',
    'спб': 'Saint Petersburg, RU',
    'питер': 'Saint Petersburg, RU'
};

// Функция для получения данных о погоде
async function getWeatherData(city) {
    try {
        loader.show(); // Показываем лоадер

        // Нормализуем название города
        const normalizedCity = city.toLowerCase().trim();
        const mappedCity = cityMapping[normalizedCity] || city;

        // Проверяем кэш
        const cachedData = weatherCache.get(mappedCity);
        if (cachedData) {
            updateUI(cachedData);
            loader.hide();
            return;
        }

        // Запрос к API OpenWeatherMap для получения геоданных
        const geoResponse = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${mappedCity}&limit=1&appid=${apiKey}`);
        const geoData = await geoResponse.json();

        // Если город не найден, выбрасываем ошибку
        if (!geoData.length) {
            throw new Error('Город не найден. Попробуйте ввести название на английском языке или проверьте правильность написания.');
        }

        // Получаем координаты города
        const { lat, lon, name } = geoData[0];
        elements.currentCity.textContent = name;

        // Параллельные запросы для получения текущей погоды и прогноза
        const [currentWeather, forecast] = await Promise.all([
            fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=ru&appid=${apiKey}`).then(r => r.json()),
            fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=ru&appid=${apiKey}`).then(r => r.json())
        ]);

        // Сохраняем данные в кэше и обновляем UI
        const weatherData = { currentWeather, forecast, name };
        weatherCache.set(mappedCity, weatherData);
        updateUI(weatherData);

    } catch (error) {
        showError(error.message); // Показываем ошибку
    } finally {
        loader.hide(); // Скрываем лоадер
    }
}

// Функция для обновления UI
function updateUI({ currentWeather, forecast, name }) {
    updateCurrentWeather(currentWeather, name); // Обновляем текущую погоду
    updateForecast(forecast); // Обновляем прогноз
    updateHourlyForecast(forecast); // Обновляем почасовой прогноз
}

// Функция для обновления текущей погоды
async function updateCurrentWeather(currentWeather, cityName) {
    const sunrise = new Date(currentWeather.sys.sunrise * 1000); // Время восхода солнца
    const sunset = new Date(currentWeather.sys.sunset * 1000); // Время заката солнца

    // Получаем изображение города
    const cityImage = await getCityImage(cityName);
    document.querySelector('.city-background').style.backgroundImage = `url(${cityImage})`;

    // Обновляем элементы UI
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
        // Получаем УФ индекс
        const uvResponse = await fetch(`https://api.openweathermap.org/data/2.5/uvi?lat=${currentWeather.coord.lat}&lon=${currentWeather.coord.lon}&appid=${apiKey}`);
        const uvData = await uvResponse.json();
        elements.uvIndex.textContent = Math.round(uvData.value);
    } catch (error) {
        elements.uvIndex.textContent = 'N/A';
    }

    // Обновляем иконку погоды
    const weatherIcon = document.getElementById('currentWeatherIcon');
    weatherIcon.style.opacity = '0';
    setTimeout(() => {
        weatherIcon.src = `https://openweathermap.org/img/wn/${currentWeather.weather[0].icon}@4x.png`;
        weatherIcon.style.opacity = '1';
    }, 300);
}

// Функция для обновления прогноза
function updateForecast(data) {
    elements.forecastCards.innerHTML = ''; // Очищаем контейнер прогноза

    const dailyForecasts = new Map(); // Создаем карту для хранения данных прогноза

    data.list.forEach(forecast => {
        const date = new Date(forecast.dt * 1000); // Получаем дату прогноза
        const day = date.toLocaleDateString('ru-RU', { weekday: 'short', month: 'short', day: 'numeric' }); // Форматируем дату

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

        const dayData = dailyForecasts.get(day); // Получаем данные для текущего дня
        dayData.temps.push(forecast.main.temp); // Добавляем температуру
        dayData.icons.add(forecast.weather[0].icon); // Добавляем иконку
        dayData.descriptions.add(forecast.weather[0].description); // Добавляем описание
        dayData.windSpeeds.push(forecast.wind.speed); // Добавляем скорость ветра
        dayData.humidity.push(forecast.main.humidity); // Добавляем влажность
        dayData.precipitation.push(forecast.pop * 100); // Добавляем вероятность осадков
        dayData.pressure.push(forecast.main.pressure); // Добавляем давление
        dayData.feelsLike.push(forecast.main.feels_like); // Добавляем ощущаемую температуру
        dayData.visibility.push(forecast.visibility); // Добавляем видимость
    });

    let index = 0;
    dailyForecasts.forEach((forecast, day) => {
        if (index >= 7) return; // Показываем только 7 дней

        const minTemp = Math.round(Math.min(...forecast.temps)); // Минимальная температура
        const maxTemp = Math.round(Math.max(...forecast.temps)); // Максимальная температура
        const avgWind = Math.round(forecast.windSpeeds.reduce((a, b) => a + b) / forecast.windSpeeds.length); // Средняя скорость ветра
        const avgHumidity = Math.round(forecast.humidity.reduce((a, b) => a + b) / forecast.humidity.length); // Средняя влажность
        const maxPrecip = Math.round(Math.max(...forecast.precipitation)); // Максимальная вероятность осадков
        const avgPressure = Math.round(forecast.pressure.reduce((a, b) => a + b) / forecast.pressure.length * 0.750062); // Среднее давление
        const avgFeelsLike = Math.round(forecast.feelsLike.reduce((a, b) => a + b) / forecast.feelsLike.length); // Средняя ощущаемая температура
        const avgVisibility = (forecast.visibility.reduce((a, b) => a + b) / forecast.visibility.length / 1000).toFixed(1); // Средняя видимость
        const icon = Array.from(forecast.icons)[0]; // Иконка
        const description = Array.from(forecast.descriptions)[0]; // Описание

        const card = document.createElement('div'); // Создаем карточку прогноза
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

        elements.forecastCards.appendChild(card); // Добавляем карточку в контейнер
        index++;
    });
}

// Функция для обновления почасового прогноза
function updateHourlyForecast(data) {
    const hourlyContainer = document.getElementById('hourlyForecast'); // Контейнер для почасового прогноза
    hourlyContainer.innerHTML = ''; // Очищаем контейнер

    // Берем следующие 24 часа прогноза
    const hourlyData = data.list.slice(0, 8);

    hourlyData.forEach(hour => {
        const date = new Date(hour.dt * 1000); // Получаем дату прогноза
        const temp = Math.round(hour.main.temp); // Температура
        const icon = hour.weather[0].icon; // Иконка
        const windSpeed = Math.round(hour.wind.speed); // Скорость ветра
        const humidity = hour.main.humidity; // Влажность
        const description = hour.weather[0].description; // Описание

        const hourCard = document.createElement('div'); // Создаем карточку часа
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
        hourlyContainer.appendChild(hourCard); // Добавляем карточку в контейнер
    });
}

// Функция для отображения ошибки
function showError(message) {
    const errorElement = document.getElementById('error-message'); // Элемент для отображения ошибки
    if (errorElement) {
        errorElement.textContent = message; // Устанавливаем текст ошибки
        errorElement.classList.remove('hidden'); // Показываем элемент
        setTimeout(() => {
            errorElement.classList.add('hidden'); // Скрываем элемент через 5 секунд
        }, 5000);
    }
}

// Лоадер
const loader = {
    element: document.querySelector('.loader-container'), // Элемент лоадера
    show() {
        if (this.element) {
            this.element.classList.remove('hidden'); // Показываем лоадер
        }
    },
    hide() {
        if (this.element) {
            this.element.classList.add('hidden'); // Скрываем лоадер
        }
    }
};

// Функция для форматирования времени
function formatTime(date) {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

// Функция для форматирования даты
function formatDate(date) {
    return date.toLocaleDateString('ru-RU', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Функция для заглавного регистра первой буквы
function capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Класс для слайдера фактов о погоде
class WeatherFactsSlider {
    constructor() {
        if (!this.validateElements()) return; // Проверяем наличие необходимых элементов

        this.currentSlide = 0; // Текущий слайд
        this.slidesPerView = this.calculateSlidesPerView(); // Количество слайдов на экране
        this.totalSlides = this.slides.length; // Общее количество слайдов
        this.isAnimating = false; // Флаг анимации
        this.autoplayInterval = null; // Интервал автопрокрутки

        this.init(); // Инициализируем слайдер
    }

    // Проверка наличия необходимых элементов
    validateElements() {
        this.track = document.querySelector('.slider-track'); // Трек слайдера
        this.slides = document.querySelectorAll('.fact-slide'); // Слайды
        this.dotsContainer = document.querySelector('.slider-dots'); // Контейнер для точек
        this.prevButton = document.querySelector('.slider-button.prev'); // Кнопка "Назад"
        this.nextButton = document.querySelector('.slider-button.next'); // Кнопка "Вперед"

        if (!this.track || !this.slides.length || !this.dotsContainer ||
            !this.prevButton || !this.nextButton) {
            console.error('Slider: Required elements not found');
            return false;
        }

        return true;
    }

    // Расчет количества слайдов на экране
    calculateSlidesPerView() {
        const width = window.innerWidth; // Ширина экрана
        if (width <= 768) return 1; // 1 слайд на экранах до 768px
        if (width <= 1024) return 2; // 2 слайда на экранах до 1024px
        return 3; // 3 слайда на экранах шире 1024px
    }

    // Инициализация слайдера
    init() {
        this.updateSlidesWidth(); // Обновляем ширину слайдов

        this.createDots(); // Создаем точки

        this.updateSlider(); // Обновляем слайдер

        this.setupEventListeners(); // Устанавливаем обработчики событий

        this.startAutoplay(); // Запускаем автопрокрутку
    }

    // Обновление ширины слайдов
    updateSlidesWidth() {
        const slideWidth = (100 / this.slidesPerView); // Ширина слайда
        const marginWidth = 20; // Ширина отступа

        this.slides.forEach(slide => {
            slide.style.flex = `0 0 calc(${slideWidth}% - ${marginWidth}px)`;
        });
    }

    // Установка обработчиков событий
    setupEventListeners() {
        this.prevButton.addEventListener('click', () => {
            if (!this.isAnimating) this.slide('prev'); // Переход на предыдущий слайд
        });

        this.nextButton.addEventListener('click', () => {
            if (!this.isAnimating) this.slide('next'); // Переход на следующий слайд
        });

        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                const newSlidesPerView = this.calculateSlidesPerView(); // Расчитываем новое количество слайдов на экране
                if (newSlidesPerView !== this.slidesPerView) {
                    this.slidesPerView = newSlidesPerView;
                    this.updateSlidesWidth(); // Обновляем ширину слайдов
                    if (this.currentSlide > this.totalSlides - this.slidesPerView) {
                        this.currentSlide = Math.max(0, this.totalSlides - this.slidesPerView);
                    }
                    this.updateSlider(); // Обновляем слайдер
                    this.recreateDots(); // Пересоздаем точки
                }
            }, 250);
        });

        this.track.parentElement.addEventListener('mouseenter', () => this.stopAutoplay()); // Останавливаем автопрокрутку при наведении
        this.track.parentElement.addEventListener('mouseleave', () => this.startAutoplay()); // Запускаем автопрокрутку при уходе

        let touchStartX = 0;
        let touchEndX = 0;

        this.track.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            this.stopAutoplay(); // Останавливаем автопрокрутку при касании
        }, { passive: true });

        this.track.addEventListener('touchmove', (e) => {
            touchEndX = e.touches[0].clientX;
        }, { passive: true });

        this.track.addEventListener('touchend', () => {
            const diff = touchStartX - touchEndX;
            if (Math.abs(diff) > 50) {
                if (diff > 0) {
                    this.slide('next'); // Переход на следующий слайд
                } else {
                    this.slide('prev'); // Переход на предыдущий слайд
                }
            }
            this.startAutoplay(); // Запускаем автопрокрутку
        });
    }

    // Пересоздание точек
    recreateDots() {
        this.dotsContainer.innerHTML = ''; // Очищаем контейнер точек
        this.createDots(); // Создаем точки
    }

    // Создание точек
    createDots() {
        const dotsCount = Math.max(1, this.totalSlides - this.slidesPerView + 1); // Количество точек
        for (let i = 0; i < dotsCount; i++) {
            const dot = document.createElement('div'); // Создаем точку
            dot.className = 'slider-dot' + (i === 0 ? ' active' : ''); // Устанавливаем класс активной точки
            dot.addEventListener('click', () => {
                if (!this.isAnimating) {
                    this.currentSlide = i; // Устанавливаем текущий слайд
                    this.updateSlider(); // Обновляем слайдер
                }
            });
            this.dotsContainer.appendChild(dot); // Добавляем точку в контейнер
        }
    }

    // Обновление слайдера
    updateSlider() {
        this.isAnimating = true; // Устанавливаем флаг анимации

        const slideWidth = (100 / this.slidesPerView); // Ширина слайда
        const marginOffset = (20 * this.currentSlide) / this.slidesPerView; // Смещение отступа
        const offset = -(this.currentSlide * slideWidth) - marginOffset; // Смещение трека
        this.track.style.transform = `translateX(${offset}%)`;

        this.prevButton.style.opacity = this.currentSlide === 0 ? '0.5' : '1'; // Обновляем кнопку "Назад"
        this.prevButton.style.pointerEvents = this.currentSlide === 0 ? 'none' : 'auto';

        const lastPossibleSlide = this.totalSlides - this.slidesPerView; // Последний возможный слайд
        this.nextButton.style.opacity = this.currentSlide >= lastPossibleSlide ? '0.5' : '1'; // Обновляем кнопку "Вперед"
        this.nextButton.style.pointerEvents = this.currentSlide >= lastPossibleSlide ? 'none' : 'auto';

        const dots = this.dotsContainer.children; // Получаем точки
        Array.from(dots).forEach((dot, index) => {
            dot.classList.toggle('active', index === this.currentSlide); // Обновляем активную точку
        });

        setTimeout(() => {
            this.isAnimating = false; // Снимаем флаг анимации
        }, 500);
    }

    // Переход на следующий/предыдущий слайд
    slide(direction) {
        if (this.isAnimating) return; // Если идет анимация, выходим

        const lastPossibleSlide = this.totalSlides - this.slidesPerView; // Последний возможный слайд

        if (direction === 'prev' && this.currentSlide > 0) {
            this.currentSlide--; // Переход на предыдущий слайд
        } else if (direction === 'next' && this.currentSlide < lastPossibleSlide) {
            this.currentSlide++; // Переход на следующий слайд
        }

        this.updateSlider(); // Обновляем слайдер
    }

    // Запуск автопрокрутки
    startAutoplay() {
        if (this.autoplayInterval) this.stopAutoplay(); // Останавливаем текущую автопрокрутку

        this.autoplayInterval = setInterval(() => {
            const lastPossibleSlide = this.totalSlides - this.slidesPerView; // Последний возможный слайд
            if (this.currentSlide >= lastPossibleSlide) {
                this.currentSlide = 0; // Переход на первый слайд
            } else {
                this.currentSlide++; // Переход на следующий слайд
            }
            this.updateSlider(); // Обновляем слайдер
        }, 5000);
    }

    // Остановка автопрокрутки
    stopAutoplay() {
        if (this.autoplayInterval) {
            clearInterval(this.autoplayInterval); // Останавливаем автопрокрутку
            this.autoplayInterval = null;
        }
    }
}

// Функция для задержки выполнения
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

// Обработчик события ввода в поле поиска
elements.searchInput.addEventListener('input', debounce(async (event) => {
    const query = event.target.value.trim(); // Получаем значение поля ввода

    if (query.length < 2) {
        document.getElementById('searchSuggestions').style.display = 'none'; // Скрываем подсказки
        return;
    }

    const cities = await searchCities(query); // Поиск городов
    displaySearchResults(cities); // Отображение результатов поиска
}, 300));

// Обработчик события нажатия клавиши в поле поиска
elements.searchInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        getWeatherData(elements.searchInput.value); // Получение данных о погоде
    }
});

// Функция для поиска городов
async function searchCities(query) {
    try {
        const response = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${apiKey}`); // Запрос к API OpenWeatherMap
        const data = await response.json();
        return data.map(city => ({
            name: city.local_names?.ru || city.name, // Название города
            fullName: `${city.name}, ${city.country}`, // Полное название города
            lat: city.lat, // Широта
            lon: city.lon, // Долгота
            country: city.country // Страна
        }));
    } catch (error) {
        console.error('Error searching cities:', error);
        return [];
    }
}

// Функция для отображения результатов поиска
function displaySearchResults(cities) {
    const suggestions = document.getElementById('searchSuggestions'); // Контейнер для подсказок
    suggestions.innerHTML = ''; // Очищаем контейнер

    if (cities.length === 0) {
        suggestions.style.display = 'none'; // Скрываем контейнер, если нет результатов
        return;
    }

    cities.forEach(city => {
        const div = document.createElement('div'); // Создаем элемент подсказки
        div.className = 'search-suggestion';
        div.textContent = `${city.name}, ${city.country}`;
        div.addEventListener('click', () => {
            elements.searchInput.value = city.name; // Устанавливаем значение поля ввода
            suggestions.style.display = 'none'; // Скрываем контейнер
            getWeatherData(city.fullName); // Получение данных о погоде
        });
        suggestions.appendChild(div); // Добавляем элемент в контейнер
    });

    suggestions.style.display = 'block'; // Показываем контейнер
}

// Обработчик события клика по документу
document.addEventListener('click', (event) => {
    const suggestions = document.getElementById('searchSuggestions'); // Контейнер для подсказок
    if (!event.target.closest('.search-container')) {
        suggestions.style.display = 'none'; // Скрываем контейнер, если клик был вне поля поиска
    }
});

// Создание стилей для анимации
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

// Обработчики событий для навигационных ссылок
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', (e) => {
        document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active')); // Убираем активный класс у всех ссылок
        link.classList.add('active'); // Добавляем активный класс текущей ссылке

        // Если это не внешняя ссылка (about.html), то предотвращаем действие по умолчанию
        if (link.getAttribute('href') === '#') {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' }); // Плавная прокрутка вверх
        }
    });
});

// Обработчик события прокрутки
window.addEventListener('scroll', () => {
    const sections = ['about']; // Список секций
    let currentSection = ''; // Текущая секция

    sections.forEach(sectionId => {
        const section = document.getElementById(sectionId); // Получаем секцию
        if (section) {
            const rect = section.getBoundingClientRect(); // Получаем координаты секции
            if (rect.top <= 150 && rect.bottom >= 150) {
                currentSection = sectionId; // Устанавливаем текущую секцию
            }
        }
    });

    document.querySelectorAll('.nav-links a').forEach(link => {
        const href = link.getAttribute('href').slice(1); // Получаем href ссылки
        if ((currentSection === '' && href === '') || href === currentSection) {
            link.classList.add('active'); // Добавляем активный класс
        } else {
            link.classList.remove('active'); // Убираем активный класс
        }
    });
});

// Обработчик события загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    const slider = new WeatherFactsSlider(); // Создаем слайдер
    getWeatherData(defaultCity); // Получение данных о погоде для города по умолчанию
});
