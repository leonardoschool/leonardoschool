// modal wallpaper
var modal = document.getElementById("myModal");
var img = document.getElementsByClassName("myImg");
var modalImg = document.getElementById("img01");
var captionText = document.getElementById("caption");

 for(var i=0;i< img.length;i++){    
    img[i].onclick = function(i){
      modal.style.display = "block";
      modalImg.src = this.src;
      captionText.innerHTML = this.alt;
    }
}
var button = document.getElementsByClassName("infoPhoto")
for(let i=0;i<button.length;i++){
  button[i].onclick= function(){
    img[i].onclick(i);
  }
}


var span = document.getElementsByClassName("modal")[0];
span.onclick = function() { 
   modal.style.display = "none";
}