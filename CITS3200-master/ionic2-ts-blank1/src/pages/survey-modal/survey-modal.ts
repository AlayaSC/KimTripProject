import { Component, ViewChild } from '@angular/core';
import { NavController, Platform, ModalController, ViewController, Slides, NavParams } from 'ionic-angular';
import { AlertController } from 'ionic-angular';
import { Todos } from '../../providers/todos/todos';
import { MapModal } from '../map-modal/map-modal';
import { CommentBox } from '../comment-modal/comment-modal';
import { Storage } from '@ionic/storage';
import { Camera, CameraOptions } from '@ionic-native/camera';
import { images } from '../../providers/images/images.ts';
import moment from 'moment';


declare var L: any;
declare var sqlitePlugin;

@Component({
    selector: 'survey-modal',
    templateUrl: 'survey-modal.html'
})

export class SurveyModal {

    //EDITING
    editMode: boolean = false;

    //COUCH-POUCH RELATED
    PouchSubmission: any = {};
	PouchLocal: any = {};

    //Questions
    SurveyAnswersToday: any = {};
    SurveyAnswersNight: any = {};

    showMap: boolean = false; // Flag for enabling/disabling map button for Q1
    showMapQ2: boolean = false; // Flag for enabling/disabling map button for Q2
    showCoordinates: boolean = false; // Flag for showing coordinates for Q1
    showCOORDSquestion2: boolean = false; // Flag for showing coordinates for Q2
    showOther: boolean = false;
    showOther2: boolean = false;

	indexAdjust: number = 0;
	q131: boolean = false;
	q132: boolean = false;
	q231: boolean = false;
	q232: boolean = false;

	commentBoxQ1: any;
	commentBoxQ2: any;
	
	submitted: boolean = false;
	
	//PAGE
	footerButtonText: any = "Next";

    //DATE
    surveyDate: string = moment().format("YYYY-MM-DD");
    datePickerMin = "2018"; //TODO: Update

    //GPS
    chosenCoordinates: any = [];
    nightTimeCoordinates: any = [];
    lastNightsCoordinates: any = "Not found";

    //SLIDER
    @ViewChild(Slides) slides: Slides;
    currentIndex: any;
    skipQuestion: boolean = false;

    //USER
    user: any;

	//Image
	dayImage: any = null;
	nightImage: any = null;
	nightThumb: any = null;
	nightThumbSize: any = 0;
	dayThumb: any = null;
	dayThumbSize: any = 0;

	public cameraOptions: CameraOptions = {
        sourceType         : this.camera.PictureSourceType.PHOTOLIBRARY,
        destinationType    : this.camera.DestinationType.DATA_URL,
        encodingType       : this.camera.EncodingType.JPEG,
        mediaType: this.camera.MediaType.PICTURE,
		correctOrientation:	true,
    };

    constructor(public viewCtrl: ViewController, public navCtrl: NavController, public platform: Platform,
        public modalCtrl: ModalController, public params: NavParams, public todoService: Todos,
        private storage: Storage, public alertCtrl: AlertController, private camera: Camera) {

    }

	fillSurveyPage(diaryData) {
		this.storage.get('userData').then((val) => {
			if(val && val.departed) {
				this.datePickerMin = val.installationDate;
			}
		}).catch((err) => console.log(err));
        if(diaryData) {
            //Set User
            //EDITING
            this.editMode = true;
            var toEdit = diaryData;

            this.surveyDate = toEdit.date;
            this.SurveyAnswersToday = toEdit.today;
            this.SurveyAnswersNight = toEdit.tonight;

			// Get Local Data
			var localID = '_local/' + toEdit._id;
			this.todoService.getID(localID).then((doc) => {
				console.log("local doc: " + doc);
				this.PouchLocal = doc;
			}).catch((err) => {
				console.log("Pouch Local Doc Not Found: " + err);
			});
			console.log("LocalID = " + localID);
            this.setLastNightsCoordinates(new Date(this.surveyDate));
			this.chosenCoordinates = toEdit.gpsLocationDay;
			this.nightTimeCoordinates = toEdit.gpsLocationNight;
			this.q1Listener(toEdit.today.initial, 0, true);
			this.q2Listener(toEdit.tonight.initial, 0, true);
			if(toEdit.today.initial != 'travelling') {
				this.q131 = true;
				this.q132 = true;
			}
			if(toEdit.tonight.initial == 'newsite_night') {
				this.q231 = true;
				this.q232 = true;
			}
			if(toEdit.today.comments) {
				this.commentBoxQ1 = toEdit.today.comments;
			}
			if(toEdit.tonight.comments) {
				this.commentBoxQ2 = toEdit.tonight.comments;
			}
			this.allowNextandText();
        } else {
            //NEW SURVEY
            this.setLastNightsCoordinates(new Date());
        }
	}

    ngOnInit() {
		this.storage.get('userData').then((user) => {
			if(user != null) {
				this.user = user._id;
				console.log(this.user);
			}
			this.fillSurveyPage(this.params.data.diaryData);
			this.slides._allowSwipeToNext = this.editMode;
			this.slides._allowSwipeToPrev = false;
		}).catch((err) => console.log(err));
    }

    dateTimeChanged() {
        this.setLastNightsCoordinates(new Date(this.surveyDate));
    }

    setLastNightsCoordinates(temp) {
        temp.setDate(temp.getDate() - 1);
        let yesterdayID = temp.getFullYear() + "/" + (temp.getMonth() + 1) + "/" + temp.getDate() + "_" + this.user;

        this.todoService.getID(yesterdayID).then((doc) => {
            console.log(doc);
            if (doc.gpsLocationNight) { // was Day
                this.lastNightsCoordinates = doc.gpsLocationNight; // was Day
            } else {
                this.lastNightsCoordinates = "Not found";
            }
        }).catch((err) => {
            if (err.name === "not_found") {
                console.log(err);
            }
            this.lastNightsCoordinates = "Not found";
        });
    }

    createEntry() {

        let tempDate: Date = new Date(new Date(this.surveyDate).toString());
        let tempID = tempDate.getFullYear() + "/" + (tempDate.getMonth() + 1) + "/" + tempDate.getDate() + "_" + this.user;
		this.PouchSubmission.date = tempDate.getFullYear() + "/" + (tempDate.getMonth() + 1) + "/" + tempDate.getDate();
        this.PouchSubmission._id = tempID;
		this.PouchSubmission.timeSubmitted = new Date().toString();
		this.PouchSubmission.version = 1;

		// Set Latest Date

		// Adds the GPS Location for the site visited today to Answers.
		if (this.SurveyAnswersToday.initial == "newsite") {
			this.PouchSubmission.gpsLocationDay = this.chosenCoordinates;
		} else if (this.SurveyAnswersToday.initial == "campsite") {
			this.PouchSubmission.gpsLocationDay = this.lastNightsCoordinates;
		} else {
			this.PouchSubmission.gpsLocationDay = [];
		}

		// Adds the GPS Location for the location stayed tonight to the Answers.
		if (this.SurveyAnswersNight.initial == "newsite_night") {
			this.PouchSubmission.gpsLocationNight = this.nightTimeCoordinates;
		} else if (this.SurveyAnswersNight.initial == "campsite_night") {
			this.PouchSubmission.gpsLocationNight = this.lastNightsCoordinates;
		} else {
			this.PouchSubmission.gpsLocationNight = this.chosenCoordinates;
		}

		this.PouchSubmission.today = this.SurveyAnswersToday;
		this.PouchSubmission.today.comments = this.commentBoxQ1;
		this.PouchSubmission.tonight = this.SurveyAnswersNight;
		this.PouchSubmission.tonight.comments = this.commentBoxQ2;
		this.PouchSubmission.user = this.user;

		console.log(this.PouchSubmission);

		//PouchDB Local Information (Pictures)
		this.PouchLocal._id = "_local/" + tempID;

		this.todoService.getID(tempID).then((doc) => {
			console.log(doc);
			this.PouchSubmission._rev = doc._rev;
			this.todoService.updateTodo(this.PouchSubmission).catch((err3) => {
				console.log(err3);
			});
			this.todoService.updateTodo(this.PouchLocal).catch((err3) => {
				console.log(err3);
			});
		}).catch((err) => {
			if (err.name === "not_found") {
				console.log(err);
			}
			this.todoService.createTodo(this.PouchSubmission).catch((err2) => {
				console.log(err2);
			});
			this.todoService.createTodo(this.PouchLocal).catch((err3) => {
				console.log(err3);
			});
		});
		//this.viewCtrl.dismiss(this.chosenCoordinates);
		this.slides._allowSwipeToNext = true;
		this.submitted = true;
    }

	footerButton() { 
		switch(this.footerButtonText) {
			case "Next":
				this.slides.slideNext();
				break;
			case "Submit":
				this.createEntry();
				this.slides.slideNext();
				break;
			case "Finish":
				this.viewCtrl.dismiss();
				break;
		}
	}
	
	allowNextandText() {
		this.footerButtonText = "Next";
		this.slides._allowSwipeToNext = true;
	}
	
	disallowNextandText() {
		this.footerButtonText = "Next";
		this.slides._allowSwipeToNext = false;
	}
	
	setSubmitText() {
		this.footerButtonText = "Submit";
		this.slides._allowSwipeToNext = false;
	}
	
	setFinishText() {
		this.footerButtonText = "Finish";
	}
	
    slideChanged() {
        this.currentIndex = this.slides.getActiveIndex();
        console.log('Current index is', this.currentIndex);
        this.slides.update();

        // Prevents you from swiping to the left on the first page.
        if (this.currentIndex > 0) {
            this.slides._allowSwipeToPrev = true;
        } else {
            this.slides._allowSwipeToPrev = false;
        }

        // Checks to see if you are allowed to swipe past the current page.
        if (this.slides.getActiveIndex() == 0 && this.SurveyAnswersToday.initial) { // Question 1.0 and Radio Button is selected.
            this.allowNextandText();
        } else if (this.slides.getActiveIndex() == 1 && this.SurveyAnswersToday.newsite) { // Question 1.1 and Radio Button is selected.
            this.allowNextandText();
        } else if (this.slides.getActiveIndex() == 2 && this.q131 && this.q132) { // Question 1.2 and Radio Button is selected.
            this.allowNextandText();
        } else if (this.slides.getActiveIndex() == 3) { // Question 1.2 and Radio Button is selected.
            this.allowNextandText();
        } else if ((this.slides.getActiveIndex() == 1+this.indexAdjust) && this.SurveyAnswersNight.initial) { // Question 2.0 and Radio Button is selected.
			if ((this.nightTimeCoordinates && this.nightTimeCoordinates[1])) {
				if(this.SurveyAnswersNight.initial == "newsite_night") {
					this.allowNextandText();
				} else {
					this.setSubmitText();
				}
			} else {
				if(this.SurveyAnswersNight.initial == "newsite_night") {
					this.disallowNextandText();
				} else {
					this.setSubmitText();
				}
			}
        } else if ((this.slides.getActiveIndex() == 2+this.indexAdjust) && this.SurveyAnswersNight.newsite) { // Question 2.1 and Radio Button is selected.
            this.allowNextandText();
        } else if ((this.slides.getActiveIndex() == 3+this.indexAdjust) && this.q231 && this.q232) { // Question 2.2 and Radio Button is selected.
            this.allowNextandText();
        } else if ((this.slides.getActiveIndex() == 4+this.indexAdjust)) { // Question 2.2 and Radio Button is selected.
            this.setSubmitText();
        } else {
            this.slides._allowSwipeToNext = false;
        }
		if(this.slides.isEnd()) {
			this.setFinishText();
		}
    }

    // Q1 Event Listener
    q1Listener(event, index, editing: boolean) {
        if (event == "newsite") {
            this.showMap = true;
			this.indexAdjust = 3;
			if(editing) {
				this.showCoordinates = true;
			} else {
				this.showCoordinates = false;
				this.chosenCoordinates = [];
			}
        } else if (event == "campsite") {
            this.showMap = false;
            this.showCoordinates = true;
			this.chosenCoordinates = this.lastNightsCoordinates;
			this.indexAdjust = 0;
			if(this.SurveyAnswersToday.newsite) {
				delete this.SurveyAnswersToday.newsite; // Destroys bad data from answers being revised.
			}
        } else {
            this.showMap = false;
            this.skipQuestion = false;
            this.showCoordinates = false;
			this.indexAdjust = 0;
			if(this.SurveyAnswersToday.newsite) {
				delete this.SurveyAnswersToday.newsite;
			}
        }
        if (this.chosenCoordinates && this.chosenCoordinates[1]) { // Allows you to progress to the next question
            if(event == "newsite") {
				this.allowNextandText();
			} else {
				this.allowNextandText();
			}
        } else {
            if(event == "newsite") {
				this.disallowNextandText();
			} else {
				this.allowNextandText();
			}
        }

        console.log("Event: " + event + "Index: " + index);
        console.log(this.SurveyAnswersToday);
    }

    // Q1.1 Event Listener
    q1_1Listener(event, index) {
        this.slides._allowSwipeToNext = true;
      //  console.log(this.SurveyAnswersToday);
        if (event == "other") {
            this.showOther = true;
            this.otherPopup(1);
        } else {
            this.showOther = false;
        }
    }

	q131_Listener(event, index) {
		this.q131 = true;
		if(this.q131 && this.q132) {
			this.slides._allowSwipeToNext = true;
		}
	}

	q132_Listener(event, index) {
		this.q132 = true;
		if(this.q131 && this.q132) {
			this.slides._allowSwipeToNext = true;
		}
	}

    // Q2 Event Listener
    q2Listener(event, index, editing: boolean) {
		this.slides.update();
        if (event == "newsite_night") {
            this.showMapQ2 = true;
			if(editing) {
				this.showCOORDSquestion2 = true;
			} else {
				this.showCOORDSquestion2 = false;
				this.nightTimeCoordinates = [];
			}
        } else if (event == "campsite_night") {
			this.showCOORDSquestion2 = true;
			console.log("q2 campsitenight");
			this.nightTimeCoordinates = this.lastNightsCoordinates;
			this.showCOORDSquestion2 = true;
            this.showMapQ2 = false;
            if(this.SurveyAnswersNight.newsite) {
				delete this.SurveyAnswersNight.newsite; // Destroys bad data from answers being revised.
			}
        } else if (event == "today_night") {
			this.nightTimeCoordinates = this.chosenCoordinates;
			this.showCOORDSquestion2 = true;
            this.showMapQ2 = false;
            if(this.SurveyAnswersNight.newsite) {
				delete this.SurveyAnswersNight.newsite;
			}
        }

        if ((this.nightTimeCoordinates && this.nightTimeCoordinates[1])) { // Allows you to progress to the next question
            if(event == "newsite_night") {
				this.allowNextandText();
			} else {
				this.setSubmitText();
			}
        } else {
            if(event == "newsite_night") {
				this.disallowNextandText();
			} else {
				this.setSubmitText();
			}
        }

        console.log("Event: " + event + "Index: " + index);
        console.log(this.SurveyAnswersNight);
    }

    // Q2.1 Event Listener
    q2_1Listener(event, index) {
        this.slides._allowSwipeToNext = true;
        if (event == "other_night") {
            this.showOther2 = true;
       //     console.log(this.showOther);
            this.otherPopup(2);
        } else {
            this.showOther2 = false;
        }
    }

	q231_Listener(event, index) {
		this.q231 = true;
		if(this.q231 && this.q232) {
			this.slides._allowSwipeToNext = true;
		}
	}

	q232_Listener(event, index) {
		this.q232 = true;
		if(this.q231 && this.q232) {
			this.slides._allowSwipeToNext = true;
		}
	}

	otherPopup(question) {
			let alert = this.alertCtrl.create({
			title: 'What lead you to spend time at that site?',
		   // message: 'Enter the Coordinates',
			inputs: [
				{
					name: 'text',
					placeholder: 'Type your response here',
					type: 'text'
				},
			],
			buttons: [
				{
					text: 'Cancel',
					handler: () => {
						console.log('Cancel clicked');
					}
				},
				{
					text: 'Save',
					handler: data => {
						if(question == 1) {
							this.SurveyAnswersToday.newsite_other = data.text;
						} else {
							this.SurveyAnswersNight.newsite_other = data.text;
						}
					}
				}
			]
		});
		alert.present();
    }

    openMap(question) {
        let myModal = this.modalCtrl.create(MapModal, { showBackdrop: true });
        myModal.present();
        myModal.onDidDismiss((data) => {
            if (data && data != []) {
                if (question == "1") {
                    this.chosenCoordinates[0] = data[0];
                    this.chosenCoordinates[1] = data[1];
                    this.namePlace(question);
					this.showCoordinates = true;
					this.slides._allowSwipeToNext = true;
                } else {
					console.log("a)"+this.nightTimeCoordinates[0]);
					console.log("b)"+data[0])
                        this.nightTimeCoordinates[0] = data[0];
                        this.nightTimeCoordinates[1] = data[1];
                        this.namePlace(question);
						this.showCOORDSquestion2 = true;
						this.allowNextandText();
                    }                
            }
        });
    }

	enterComments(question) {
		var passData = null;
		if(question == "1") {
			passData = this.commentBoxQ1;
		} else {
			passData = this.commentBoxQ2
		}
        let myModal = this.modalCtrl.create(CommentBox, { passData: passData }, { showBackdrop: true });
        myModal.present();
        myModal.onDidDismiss((data) => {
			if(question == "1") {
				this.commentBoxQ1 = data;
				console.log("where is the data1:" + data);
				console.log("where is the data1:" + this.commentBoxQ1);
			} else {
				this.commentBoxQ2 = data;
				console.log("where is the data2:" + data);
				console.log("where is the data2:" + this.commentBoxQ2);
			}
        });
	}

    // Name Popup
    namePlace(question) {
        let alert = this.alertCtrl.create({
            title: 'Does this site have a name?',
            message: 'If there is no site name, click no',
            inputs: [
                {
                    name: 'text',
                    placeholder: 'Type the name of the site here',
                    type: 'text'
                },
            ],
            buttons: [
                {
                    text: 'No',
                    handler: () => {
                        console.log('Cancel clicked');
                        if (question == 1) {
                            delete this.chosenCoordinates[2];
                        } else {
                            delete this.nightTimeCoordinates[2];
                        }
                    }
                },
                {
                    text: 'Submit',
                    handler: data => {
                        if (question == 1) {
                            this.chosenCoordinates[2] = data.text;
                        } else {
                            this.nightTimeCoordinates[2] = data.text;
                        }
                    }
                }
            ]
        });
        alert.present();
    }

    openManually(question) {

        let tempCoordinates;
        let alert = this.alertCtrl.create({
            title: 'Enter Coordinates',
           // message: 'Enter the Coordinates',
            inputs: [
                {
                    name: 'x',
                    placeholder: 'Latitude',
					value: '-',
                    type: 'numberSigned'
                },
                {
                    name: 'y',
                    placeholder: 'Longitude',
                    type: 'numberSigned'
                },
            ],
            buttons: [
                {
                    text: 'Cancel',
                    handler: () => {
                        console.log('Cancel clicked');
                    }
                },
                {
                    text: 'Save',
                    handler: data => {
                        if (Number(data.x) && Number(data.y) && data.x >= -90 && data.x <= 90 && data.y >= -180 && data.y <= 180 ) {
                            if(question == "1") {
                                this.chosenCoordinates[0] = Number(data.x);
                                this.chosenCoordinates[1] = Number(data.y);
                                this.namePlace(question);
								this.showCoordinates = true;
								this.slides._allowSwipeToNext = true;
                            } else {
                                this.nightTimeCoordinates[0] = Number(data.x);
                                this.nightTimeCoordinates[1] = Number(data.y);
                                this.namePlace(question);
								this.showCOORDSquestion2 = true;
								this.allowNextandText();
                            }                            
                        }
                        else {
                            console.log('Not a Number');
                        }
                    }
                }
            ]
        });
        alert.present();
    }

	callPicture(daynight) {
		this.camera.getPicture(this.cameraOptions).then((imageData) => {
			 let base64image = 'data:image/jpeg;base64,' + imageData;
			 console.log(daynight);
			 let imageSize = this.getImageSize(base64image);
			 console.log(imageSize);
			 if(daynight == 1) {
				 if(!this.PouchLocal.today) {
					this.PouchLocal.today = {};
				 }
				 this.generateFromImage(base64image, 700, 700, 0.92, data => {
						this.PouchLocal.today.attachedPicture = data;
				 });
		//		 this.PouchLocal.today.attachedPicture = base64image;
				 this.PouchLocal.today.attachedThumbnail = this.createThumbnail(base64image);
				 console.log("?12");
			 } else {
				 if(!this.PouchLocal.tonight) {
					 this.PouchLocal.tonight = {}
				 }
				 this.generateFromImage(base64image, 700, 700, 0.92, data => {
						this.PouchLocal.tonight.attachedPicture = data;
				 });
				// this.PouchLocal.tonight.attachedPicture = base64image;
				 this.PouchLocal.tonight.attachedThumbnail = this.createThumbnail(base64image);
				 console.log("?2");
			 }
		 }).catch((err) => {
			console.log(err);
		});
	}

  createThumbnail(image) {
    this.generateFromImage(image, 200, 200, 0.5, data => {
      let thumbNail = data;
      //this.dayThumbSize = this.getImageSize(this.dayThumb);
	  console.log("crt thumb");
	  return thumbNail;
    });
  }

 generateFromImage(img, MAX_WIDTH: number = 700, MAX_HEIGHT: number = 700, quality: number = 1, callback) {
    var canvas: any = document.createElement("canvas");
    var image = new Image();

    image.onload = () => {
      var width = image.width;
      var height = image.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }
      canvas.width = width;
      canvas.height = height;
      var ctx = canvas.getContext("2d");

	  ctx.drawImage(image, 0, 0, width, height);
      // IMPORTANT: 'jpeg' NOT 'jpg'
      var dataUrl = canvas.toDataURL('image/jpeg', quality);

      callback(dataUrl)
    }
    image.src = img;
  }

  getImageSize(data_url) {
    var head = 'data:image/jpeg;base64,';
    return ((data_url.length - head.length) * 3 / 4 / (1024*1024)).toFixed(4);
  }

    formatDate(date) {
        return moment(date).format('DD MMMM YYYY');
    }

    dismiss() {
        this.viewCtrl.dismiss();
    }
}
