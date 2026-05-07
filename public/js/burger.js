// Бургер-меню
console.log('Burger menu script loaded');

// Обернем в try-catch для предотвращения ошибок
try {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM loaded');
        
        const burgerMenu = document.getElementById('burgerMenu');
        const navLinks = document.getElementById('navLinks');
        
        console.log('Burger menu:', burgerMenu);
        console.log('Nav links:', navLinks);
        
        if (burgerMenu && navLinks) {
            console.log('Adding event listeners');
            
            burgerMenu.addEventListener('click', function(e) {
                e.stopPropagation();
                console.log('Burger clicked');
                navLinks.classList.toggle('active');
            });
            
            // Закрытие меню при клике вне его
            document.addEventListener('click', function(e) {
                try {
                    if (navLinks.classList.contains('active') && 
                        burgerMenu && navLinks &&
                        !burgerMenu.contains(e.target) && 
                        !navLinks.contains(e.target)) {
                        navLinks.classList.remove('active');
                    }
                } catch (error) {
                    console.log('Error in document click handler:', error);
                }
            });
            
            // Закрытие меню при изменении размера экрана
            window.addEventListener('resize', function() {
                try {
                    if (window.innerWidth > 768) {
                        navLinks.classList.remove('active');
                    }
                } catch (error) {
                    console.log('Error in resize handler:', error);
                }
            });
        } else {
            console.log('Elements not found');
        }
    });
} catch (error) {
    console.log('Error initializing burger menu:', error);
}
