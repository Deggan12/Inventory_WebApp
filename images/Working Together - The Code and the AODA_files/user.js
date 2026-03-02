window.InitUserScripts = function()
{
var player = GetPlayer();
var object = player.object;
var once = player.once;
var addToTimeline = player.addToTimeline;
var setVar = player.SetVar;
var getVar = player.GetVar;
var update = player.update;
var pointerX = player.pointerX;
var pointerY = player.pointerY;
var showPointer = player.showPointer;
var hidePointer = player.hidePointer;
var slideWidth = player.slideWidth;
var slideHeight = player.slideHeight;
window.Script1 = function()
{
  var player = GetPlayer(),
    theName = player.GetVar("NameField"),
    enName = encodeURIComponent(theName),
    theDate = player.GetVar("DateValue"),
    urlstring = ("html5/lib/certificate/wrktgthr/en/printCertificate.html?print=" + enName + "&" + theDate);
window.open(urlstring,"_blank","width=960,height=720,menubar=no");

}

window.Script2 = function()
{
  /* set certificate date */
var currentDate = new Date(),
    day = ("0" + currentDate.getDate()).slice(-2),
    month = ("0" + (currentDate.getMonth() + 1)).slice(-2),
    year = currentDate.getFullYear(),
    player = GetPlayer(),
    newDate = year + "-" + month + "-" + day;
player.SetVar("DateValue", newDate);
}

};
