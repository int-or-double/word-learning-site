// Простой и надежный бургер-меню скрипт
document.addEventListener('DOMContentLoaded', function() {
    const burgerMenu = document.getElementById('burgerMenu');
    const navLinks = document.getElementById('nav-Links')|| document.querySelector('.nav-links');
    
    console.log('Burger menu elements:', { burgerMenu, navLinks });
    
    if (burgerMenu && navLinks) {
        burgerMenu.addEventListener('click', function(e) {
            e.stopPropagation();
            navLinks.classList.toggle('active');
            console.log('Menu toggled, active:', navLinks.classList.contains('active'));
        });
        
        document.addEventListener('click', function(e) {
            if (navLinks.classList.contains('active') && 
                !burgerMenu.contains(e.target) && 
                !navLinks.contains(e.target)) {
                navLinks.classList.remove('active');
            }
        });
        
        window.addEventListener('resize', function() {
            if (window.innerWidth > 768) {
                navLinks.classList.remove('active');
            }
        });
    }
});
