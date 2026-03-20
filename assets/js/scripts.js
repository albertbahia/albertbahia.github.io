/***************** Navigation + UX ******************/

$(document).ready(function() {
    var currentYear = new Date().getFullYear();
    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function setNavState(isOpen) {
        $('.flip-nav').toggleClass('open', isOpen);
        $('#nav-toggle').toggleClass('active', isOpen).attr('aria-expanded', isOpen ? 'true' : 'false');
    }

    $('#nav-toggle').on('click', function() {
        setNavState(!$('.flip-nav').hasClass('open'));
    });

    $('.top-nav a').on('click', function() {
        setNavState(false);
    });

    $('a[href*="#"]:not([href="#"]):not([data-toggle])').on('click', function() {
        if (location.pathname.replace(/^\//, '') !== this.pathname.replace(/^\//, '') || location.hostname !== this.hostname) {
            return;
        }

        var target = $(this.hash);
        target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
        if (!target.length) {
            return;
        }

        if (prefersReducedMotion) {
            window.location.hash = this.hash;
            return false;
        }

        $('html,body').animate({
            scrollTop: target.offset().top
        }, 500);
        return false;
    });

    $('#footer-copyright').html('&copy; ' + currentYear + ' albertbahia.ai');
});



