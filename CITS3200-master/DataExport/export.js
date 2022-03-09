var dbURL = 'http://ec2-52-77-211-125.ap-southeast-1.compute.amazonaws.com:5984';

var today = new Date();
document.getElementById('sxls').setAttribute("download", "KimTripSurveyData"+ ("0" + today.getDate()).slice(-2) + ("0" + (today.getMonth()+1)).slice(-2) + today.getFullYear() +".xls");
document.getElementById('scsv').setAttribute("download", "KimTripSurveyData"+ ("0" + today.getDate()).slice(-2) + ("0" + (today.getMonth()+1)).slice(-2) + today.getFullYear() +".csv");
//BUILD TABLE
var xhttp = new XMLHttpRequest();
xhttp.onreadystatechange = function() {
  if (this.readyState == 4 && this.status == 200) {
	document.getElementById("datatable").innerHTML = this.responseText;
  }
};
xhttp.open("GET", dbURL+'/kimberlydb/_design/csv/_list/html/all', true);
xhttp.send();

document.getElementById('uxls').setAttribute("download", "KimTripUserData"+ ("0" + today.getDate()).slice(-2) + ("0" + (today.getMonth()+1)).slice(-2) + today.getFullYear() +".xls");
document.getElementById('ucsv').setAttribute("download", "KimTripUserData"+ ("0" + today.getDate()).slice(-2) + ("0" + (today.getMonth()+1)).slice(-2) + today.getFullYear() +".csv");

//BUILD TABLES
var xhttp = new XMLHttpRequest();
xhttp.onreadystatechange = function() {
  if (this.readyState == 4 && this.status == 200) {
	document.getElementById("datatable").innerHTML = this.responseText;
  }
};
xhttp.open("GET", dbURL+'/kimberlydb/_design/csv/_list/html/all', true);
xhttp.send();

var xhttp2 = new XMLHttpRequest();
xhttp2.onreadystatechange = function() {
  if (this.readyState == 4 && this.status == 200) {
	document.getElementById("datatable2").innerHTML = this.responseText;
  }
};
xhttp2.open("GET", dbURL+'/usersdb/_design/csv/_list/html/all', true);
xhttp2.send();
