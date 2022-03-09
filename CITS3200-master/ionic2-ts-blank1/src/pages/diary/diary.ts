import { Component } from '@angular/core';
import { NavController, ModalController, Events, Tabs, Platform } from 'ionic-angular';
import { File } from '@ionic-native/file';
import { FileTransfer, FileUploadOptions, FileTransferObject } from '@ionic-native/file-transfer';
import { AlertController } from 'ionic-angular';
import { Todos } from '../../providers/todos/todos';
import { SurveyModal } from '../survey-modal/survey-modal'
import { SocialSharingProvider } from '../../providers/social-sharing/social-sharing';
import 'rxjs/add/operator/map';
import b64toBlob from 'b64-to-blob';
import moment from 'moment';
import { images } from '../../providers/images/images.ts';
import { FileOpener } from '@ionic-native/file-opener';
import { Network } from '@ionic-native/network';
import { NotificationsProvider } from '../../providers/notifications/notifications';
import { Storage } from '@ionic/storage';
import { ToastController } from 'ionic-angular';
import { Http } from '@angular/http';
import { background } from '../../providers/background/background.ts';
import { LoadingController } from 'ionic-angular';

declare var cordova: any;

@Component({
  selector: 'page-diary',
  templateUrl: 'diary.html'
})

export class DiaryPage {
  myParam = '';
  diaryEntries: any;
  diaryEntriesLocal: any;
  items: any = [];
 // notificationsEnabled: any;
 
  backgroundImage: any;

  
  constructor(public navCtrl: NavController, public todoService: Todos, public modalCtrl: ModalController, public notificationsProvider: NotificationsProvider, private storage: Storage,
    public socialSharing: SocialSharingProvider, public events: Events, private file: File, public platform: Platform, private transfer: FileTransfer, private fileOpener: FileOpener,
	private network: Network, public alertCtrl: AlertController,  public http: Http, public toastCtrl: ToastController, public loadingCtrl: LoadingController) {

  }

  ionViewDidLoad() {
    this.sortDiary();
  }
  
  ionViewWillEnter() {
	  this.sortDiary();
  } 
  
  finaliseSurvey() {
	  console.log('Finalised Clicked');
	this.todoService.replicate().then((result) => {
		console.log('Finalised Success');
		console.log(result);
		this.notificationsProvider.removeNotifications();
		this.storage.set('notificationsEnabled', false);
		console.log('Notifications set to false');
		let alert = this.alertCtrl.create({
			title: 'Survey has been finalised.',
			message: 'Thank you for participating!',
			buttons: [
				{
					text: 'Okay',
					handler: () => {
						console.log('Okay clicked');
					}
				}
			]
		});
		alert.present();
	}).catch((err) => {
		console.log('Finalised Failure');
		console.log(err);	
		let alert = this.alertCtrl.create({
			title: 'Please try again with an internet connection',
			buttons: [
				{
					text: 'Okay',
					handler: () => {
						console.log('Okay clicked');
					}
				}
			]
		});
		alert.present();
	});	
  }

  sortDiary() {
    this.todoService.getTodos().then((data) => {
      data.sort(function (a, b) { //SHOW MOST RECENT FIRST
        let dateA = new Date(a.date).getTime();
        let dateB = new Date(b.date).getTime();
        if (dateA > dateB) {
          return -1;
        }
        else if (dateA < dateB) {
          return 1;
        }
        else {
          return 0;
        }
      });
      this.diaryEntries = data;
	  for(let i = 0; i < this.diaryEntries.length; i++) {
		let id = "_local/" + this.diaryEntries[i]._id;
		console.log(id);
		console.log("__1");
		this.todoService.getID(id).then((entry) => {
			console.log(entry);
			
			console.log("here?");
			if(entry.tonight && entry.tonight.attachedPicture) {
				this.diaryEntries[i].thumbNail = entry.tonight.attachedPicture;
				console.log("here?1");
			} else if (entry.today && entry.today.attachedPicture) {
				this.diaryEntries[i].thumbNail = entry.today.attachedPicture;
				console.log("here?2");
			}
		}).catch((err) => { console.log(err); }); 
	  }
    }).catch((err) => {
		
	});
  }

  viewOnMap(data: any) {
    var t: Tabs = this.navCtrl.parent; //Switch to Map Page
    t.select(0).then(() => { 
		console.log("ViewOnMap Is Firing this");
		/** OLD: When the marker button is clicked -> go to day site if exists **/
		/*if (data.gpsLocationDay && data.gpsLocationDay.length != 0) {
		  this.events.publish('map:viewEntry', { 'entry': data.gpsLocationDay });
		} else {
		  this.events.publish('map:viewEntry', { 'entry': data.gpsLocationNight });
		}*/
		/** New: When the marker button is clicked -> always go to night site **/
		if (data.gpsLocationNight && data.gpsLocationNight.length != 0) {
		  this.events.publish('map:viewEntry', { 'entry': data.gpsLocationNight });
		  console.log("event published ? " + data.gpsLocationNight); 
		} else {
		  this.events.publish('map:viewEntry', { 'entry': data.gpsLocationDay });
		  console.log("event published ? " + data.gpsLocationDay); 
		}
	}).catch((err) => console.log(err));
  }

  createEntry(){
    let myModal = this.modalCtrl.create(SurveyModal);
    myModal.present(); 
    myModal.onDidDismiss((data) => {
		setTimeout(() => {
		this.sortDiary(); }, 250);
    });
  }

  editEntry(data: any){
    let myModal = this.modalCtrl.create(SurveyModal, {'diaryData': data, 'allowSlide': true});
    console.log(data);
    myModal.present();
	myModal.onDidDismiss((data) => {
		setTimeout(() => {
		this.sortDiary(); }, 250);
    });
  } 

  shareEntry(diary: any) {
    if(diary.gpsLocationDay != []) {
      this.socialSharing.share(diary.gpsLocationDay);
    } else if(diary.gpsLocationNight != []) {
      this.socialSharing.share(diary.gpsLocationNight);
    } else {
      console.log('No Coordinates to Share');
    }
  }
  

  
  getEntryInformation() {
 
  var htmlCode = [];
  var promises = [];
  let resolveCounter: number = 0;
 
  var promise1 = new Promise(resolve => {
		this.todoService.getTodos().then((data) => {
				//for(let i = 0; i < data.length; i++) {
				  for(let i = data.length - 1; i >= 0; i--) {
					var internalPromise = new Promise(resolve2 => {
					console.log("current i = " + i);
					console.log("current date: " + data[i].date);

				//	if(data[i]._id.substring(0, 7) != "_local/") {
						var currentEntry = data[i];
						console.log("currentEntry = " + currentEntry);
						
						console.log("date1: " + data[i].date);

				//		var localID = '_local/' + currentEntry._id;
						this.todoService.getID('_local/' + data[i]._id).then((local) => {
							console.log("date2: " + currentEntry.date + " from ID: " + currentEntry._id);
							console.log(local);
							let dayPicture = null;
							let nightPicture = null;
							if(local.today && local.today.attachedPicture) {
								dayPicture = local.today.attachedPicture;
							}
							if(local.tonight && local.tonight.attachedPicture) {
								nightPicture = local.tonight.attachedPicture;
							}			
							let diaryCode = '';
							console.log("this is: " + currentEntry); 
							console.log("the date is: " + currentEntry.date);
							diaryCode += '<h1>'+ moment(currentEntry.date).format("Do MMM YYYY") +'</h1>';
							diaryCode += '<table padding=2px border=0 width=\"100%\" >';
							diaryCode += '<tr>';
							let sameDate = false;
							if(currentEntry.gpsLocationDay && currentEntry.gpsLocationNight && currentEntry.gpsLocationDay[0] && currentEntry.gpsLocationDay[0] === currentEntry.gpsLocationNight[0] && currentEntry.gpsLocationDay[1] === currentEntry.gpsLocationNight[1]) {
								sameDate = true;
							}
							if(currentEntry.gpsLocationDay && currentEntry.gpsLocationDay[1]) {	
								diaryCode += '<td valign=top width=260px style=\"max-width:260px\">';		
								diaryCode += sameDate ?'<h2> Spent the day and night here: </h2>' : '<h2> Spent the day here: </h2>';;
								diaryCode += (currentEntry.gpsLocationDay && currentEntry.gpsLocationDay[2]) ? '<p>'+ currentEntry.gpsLocationDay[2] + '</p>' : '';
								diaryCode += currentEntry.today.comments ?'<p>' + currentEntry.today.comments + '</p>' : "";
								let icon = "";
							//	 icon = this["images."+currentEntry.today.newsite];
								switch (currentEntry.today.newsite) {
									case "scenicbeauty":
										icon = images.sunrise;
									break;
									case "recreationactivities":
										icon = images.hiking;
									break;
									case "itsisolation":
										icon = images.camping;
									break;
									case "aboriginalculture":
										icon = images.kangaroo; 
									break;
									case "europeanheritage":
										icon = images.classic;
									break;
									case "maintenancesupplies":
										icon = images.shopping;
									break;
									case "goodfacilities":
										icon = images.toilet;
									break;
									case "friendsstayinghere":
										icon = images.manwoman;
									break;
									case "other":
										icon = images.question;
									break;
								}
								
								diaryCode += '<div align="right">';
								diaryCode += '<img  align="left" width=16px src="'+icon+'" /> ';
								if(currentEntry.today.newsite == "other") {
									diaryCode+='<p>'+currentEntry.today.newsite_other+'</p>';
								}
								for(let star = 1; star <= currentEntry.today.rating; star++) {
									diaryCode += '<img src="'+images.starImg+'" />'; 
								}
								for(let star = 0; star < 7-currentEntry.today.rating; star++) {
									diaryCode += '<img src="'+ images.fadedStarImg+'" />'; 
								}
								diaryCode += '&nbsp&nbsp&nbsp&nbsp&nbsp</div>';
								diaryCode += '</td>';
							} else {
								diaryCode += '<td><h2>Travelled all day!</h2></td>';
							}
							diaryCode += '<td valign=top width=260px style=\"max-width:260px\">';
							diaryCode += '<div class=\rightSide\">';
							diaryCode += sameDate ? '' : '<h2 class=\"rightSide\"> Spent the night here: </h2>';
							diaryCode += (currentEntry.gpsLocationNight && currentEntry.gpsLocationNight[2]) ? '<p class=\"rightSide\">'+ currentEntry.gpsLocationNight[2] + '</p>' : '';
							diaryCode += currentEntry.tonight.comments ? '<p class=\"rightSide\">' + currentEntry.tonight.comments + '</p>' : "";
							let iconN = "";
						//	 icon = this["images."+currentEntry.today.newsite];
							switch (currentEntry.tonight.newsite) {
								case "nostops_night":
									iconN = images.car;
								break;
								case "scenicbeauty_night":
									iconN = images.sunrise;
								break;
								case "recreationactivities_night":
									iconN = images.hiking;
								break;
								case "itsisolation_night":
									iconN = images.camping;
								break;
								case "aboriginalculture_night":
									iconN = images.kangaroo;
								break;
								case "europeanheritage_night":
									iconN = images.classic;
								break;
								case "goodfacilities_night":
									iconN = images.toilet;
								break;
								case "friendsstayinghere_night":
									iconN = images.manwoman;
								break;
								case "other_night":
									iconN = images.question;
								break;
							}
							diaryCode += '<div align="right">';
							diaryCode += '<img align="left" class=\"rightSide\" width=16px src="'+iconN+'" /> ';
							if(currentEntry.tonight.newsite == "other") {
								diaryCode+='<p align="left">'+currentEntry.tonight.newsite_other+'</p>';
							}
							for(let star = 0; star < 7-currentEntry.tonight.rating; star++) {
								diaryCode += '<img align="right" src="'+ images.fadedStarImg+'" />'; 
							}
							for(let star = 1; star <= currentEntry.tonight.rating; star++) {
								diaryCode += '<img align="right" src="'+ images.starImg+'" />'; 
							}
							diaryCode += '</div>';
							diaryCode += '</span></td>';
							diaryCode += '</div>';
							diaryCode += '</tr>';
							diaryCode += '<tr>';
					
							diaryCode += '<td width=265px style=\"max-width:265px\" style=\"max-height:265px\">'; 
							diaryCode += (dayPicture != null) ? '<div  align="center" ><img class=\"picture\" style=\"max-height:325px\" src="' + dayPicture + '" /></div>' : '';
							diaryCode += '</td>';
							
							diaryCode += '<td width=265px style=\"max-width:265px\" style=\"max-height:265px\">';
							diaryCode += (nightPicture != null) ? '<div  align="center" ><img class=\"picture\" style=\"max-height:325px\" align=\"right\" src="' + nightPicture + '" /></div>' : '';
							diaryCode += '</td>'; 
							
							diaryCode += '</tr>';
							diaryCode += '</table>';
							//console.log("what is the code3: " + diaryCode);
							
							htmlCode.push(diaryCode);
							console.log("Loop Number: " + i + " of " + data.length);
							resolveCounter++;
							if(resolveCounter == data.length) { 
								console.log("Resolve Counter = " + resolveCounter + ", Data.Length = " + data.length);
								resolve(htmlCode);
							}
							console.log("i: " + i);
							console.log("resolveCounter:" + resolveCounter);
							console.log("data.length:" + data.length);
							
							resolve2();
						}).catch((err) => { 
							console.log("what err" + err);
						}).finally(() => 
						{
							
							//resolve2();
						});
				//	}
					});
				}
			}).catch((err) => console.log(err));	
    }).catch((error) => {
      console.log(error);
    }); 
	htmlCode.join("");
	console.log(promise1);
	console.log("here556:" + htmlCode);
	return promise1;
  }
 
  createPDF() {
	const loader = this.loadingCtrl.create({
	  content: "Please wait...",
	});
	loader.present();
	var localImageLocation = this.fetchImage().then((mapURL) => { //Create Map Image
		console.log(mapURL);
		this.getEntryInformation().then((htmlCode) => {
		console.log("Final Code: " + htmlCode);  
		cordova.plugins.pdf.htmlToPDF({//<div class=\"page-break\"></div>
				data: "<html> \
				<style> \
					.page-break	{ display: block; page-break-after: always; } \
					.rightSide { padding-left: 25px; }\
					.picture { max-width: 500px; max-height:500px; }\
					h1 { \
						text-align: center; \
						font-family: \"Palatino Linotype\", \"Book Antiqua\", Palatino, serif; \
						font-size:42.0pt; \
					} \
					background-image: url('https://s3-ap-southeast-2.amazonaws.com/kimtripapp/faded2.jpg') !important; \
					background-repeat: no-repeat; \
					background-origin: content-box; \
					background-attachment: fixed; \
					background-size:100%;\
					.avoid-break { \
						page-break-inside: avoid; \
					} \
				</style>  \
				<h1>My Kimberley Trip</h1> \
				<br/><img src="+mapURL+"></img> \
				<div style=\"font-size:15.0pt\"> \
				<br/> \
				<span style=\"font-size:22.0pt\"><b>LEGEND</b></span> \
				<p><img width=16px src="+images.sunrise+" /> This site was very scenic</p> \
				<p><img width=16px src="+images.hiking+" /> Good recreation activities such as fishing, boating and hiking</p> \
				<p><img width=16px src="+images.camping+" /> Very isolated site</p> \
				<p><img width=16px src="+images.kangaroo+" /> Aboriginal heritage at this site</p> \
				<p><img width=16px src="+images.classic+" /> European heritage at this site</p> \
				<p><img width=16px src="+images.shopping+" /> Stop for maintenance and supplies</p> \
				<p><img width=16px src="+images.toilet+" /> Good facilities at the site (barbeques, toilets, signs, etc.)</p> \
				<p><img width=16px src="+images.manwoman+" /> Friends staying here</p> \
				<p><img width=16px src="+images.question+" />Other</p> \
				</div> \
				<div class=\"page-break\"></div> \
				"+htmlCode+"</html>",
				documentSize: "A4",
				landscape: "portrait",
				type: "base64"
			},
			(sucess) => {
				console.log('sucess: ', sucess);
				var contentType = 'application/pdf';
			//	var blob = b64toBlob(sucess, contentType);

				//Determine a native file path to save to
				let fileName = "MyKimTripDiary.pdf";
				let filePath = (this.platform.is('android')) ? this.file.externalRootDirectory : this.file.cacheDirectory;
				console.log("before writeFile");
				//Write the file
				this.file.writeFile(filePath, fileName, b64toBlob(sucess, contentType), { replace: true }).then(output => {
					console.log(output);
					console.log("writeFile");
					this.fileOpener.open(filePath+'/'+fileName, 'application/pdf')
					.then(() => {
						console.log('File is opened');
						loader.dismiss();
					})
					.catch(e => {
						loader.dismiss();
						console.log('Error opening file', e);
						let alert = this.alertCtrl.create({
							title: 'Error',
							subTitle: e,
							buttons: ['Dismiss']
						});
						alert.present();
					});
				}).catch((err) => {
					console.log(err);
					console.log("Error above");
					loader.dismiss();
					let alert = this.alertCtrl.create({
						title: 'Error',
						subTitle: err,
						buttons: ['Dismiss']
					});
					alert.present();
				});
			},
			(error) => {
				console.log('error:', error);
				loader.dismiss();
			});
		}).catch((err) => {
			console.log(err);
			loader.dismiss();
		});	
  }).catch((err) => {
	loader.dismiss();
	const toast = this.toastCtrl.create({
		message: 'Unable to access the internet',
		duration: 2000,
		position: 'top'
	});
	toast.present();
  });
  }
  
  fetchImage() {
  	return new Promise((resolve, reject) => {
	  	const fileTransfer: FileTransferObject = this.transfer.create();
	  	var centerString = "-17.1899666,125.5577951";
		//var centerString = "-31.97605,115.81581";
	  	var mapZoom = 6; 
		
		var markers = '';
		this.todoService.getTodos().then((data) => {
			for(var i = 0; i < data.length; i++) {
				markers += 'color:red%7Csize:large%7C'+data[i].gpsLocationNight[0] + ',' + data[i].gpsLocationNight[1]+'|';
			}
		}).then(() => {
			var googleStaticMapURL = 'https://maps.googleapis.com/maps/api/staticmap?size=640x480&center='+centerString+'&zoom=' + mapZoom + '&scale=4&markers='+markers;
			fileTransfer.download(googleStaticMapURL, this.file.cacheDirectory + '/pdf.png', true ).then((entry) => {
				resolve(entry.toURL());
			}).catch(error => {
				console.log('Error: ', JSON.stringify(error));
				reject(error);
			});
			
		}).catch((err) => console.log(err));	
  	});
  }
  
  

  
}
