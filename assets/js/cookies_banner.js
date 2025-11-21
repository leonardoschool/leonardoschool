const cookieContainer = document.querySelector(".cookie-container");
const cookieButton = document.querySelector(".cookie-btn");
//const banner_ = document.querySelector(".banner")

cookieButton.addEventListener("click", () => {
  cookieContainer.classList.remove("active");
  Cookies.set("cookies_banner", "true",{expires: 14});
});

setTimeout(() => {
  if(!Cookies.get("cookies_banner")){
    cookieContainer.classList.add("active");
  }
}, 3000);

/*setTimeout(()=>{
    if(!Cookies.get("banner_courses")){
        banner_.style.display = "block"
        Cookies.set("banner_courses", "true", {expires: 3})
    }
},15000)
*/
