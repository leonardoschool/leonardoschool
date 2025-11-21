var isStarted = false
$(window).scroll(function(){
    counterStart()
});

function counterStart(){
    if($("#counter_results").isInViewport() ){
        if(isStarted) return
        else isStarted = true
        let valueDisplays = document.querySelectorAll(".num");
        let interval = 2000;
    
        valueDisplays.forEach((valueDisplays)=>{
            let startValue = 0;
            let endValue = parseInt(valueDisplays.getAttribute("data-val"));
            if(endValue == 4000) startValue = 3650;
            let duration = Math.floor(interval / endValue);
            let counter = setInterval(() => {
                startValue+= 1;
                valueDisplays.textContent = startValue;
                if(startValue == endValue) clearInterval(counter)
            }, duration);
        })
    }
}

$.fn.isInViewport = function () {
    let elementTop = $(this).offset().top;
    let elementBottom = elementTop + $(this).outerHeight();

    let viewportTop = $(window).scrollTop();
    let viewportBottom = viewportTop + $(window).height();
    return elementBottom > viewportTop && elementTop < viewportBottom;
};