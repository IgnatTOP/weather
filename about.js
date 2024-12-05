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
        this.slides = document.querySelectorAll('.fact-card');
        this.dotsContainer = document.querySelector('.slider-dots');
        this.prevButton = document.querySelector('.slider-button.prev');
        this.nextButton = document.querySelector('.slider-button.next');

        if (!this.track || !this.slides.length || !this.prevButton || !this.nextButton) {
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

document.addEventListener('DOMContentLoaded', () => {
    new WeatherFactsSlider();
});
