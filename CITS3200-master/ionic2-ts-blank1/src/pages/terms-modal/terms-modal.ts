import { Component, ViewChild } from '@angular/core';
import { NavController, Platform, ViewController } from 'ionic-angular';
import { Slides } from 'ionic-angular';
import { Validators, FormBuilder, FormGroup } from '@angular/forms';
import { Http } from '@angular/http';
import { Storage } from '@ionic/storage';
import { TabsControllerPage } from '../tabs-controller/tabs-controller';
import { NotificationsProvider } from '../../providers/notifications/notifications';
import { DateOfBirthValidator } from '../../validators/dateOfBirth';
import { ReplicateUser } from '../../providers/replicate-user/replicate-user';
import { Md5 } from 'ts-md5/dist/md5';
import moment from 'moment';


@Component({
    selector: 'terms-modal',
    templateUrl: 'terms-modal.html'
})

export class TermsModal {

    completed: boolean = false;
    currentIndex: any = 0;

    sliderLocked: any = false; //Fix for freezing glitch

    currentDate: any = moment().format("YYYY-MM-DD");

    user = { '_id': "N/A", 'departed': this.currentDate, 'installationDate': this.currentDate, 'country': "N/A", 'postcode': "N/A", 'toServerDate': "" };
    userForm: FormGroup;

    footerButtonText: any = 'Next';

    countryList: any;

    @ViewChild(Slides) slides: Slides;
    @ViewChild('nav') nav: NavController

    constructor(public viewCtrl: ViewController, public navCtrl: NavController,
        public platform: Platform, private formBuilder: FormBuilder, public http: Http,
        private storage: Storage, public notificationsProvider: NotificationsProvider, public replicateService: ReplicateUser) {

        this.http.get('assets/resources/countries.json') //Fetch list of countries
            .map(response => response.json())
            .subscribe(
            data => this.countryList = data,
            error => console.log(error)
            );

        this.userForm = this.formBuilder.group({ //Implement form validation
            dob: [this.currentDate, Validators.compose([DateOfBirthValidator.isValid, Validators.required])],
            country: ['', Validators.compose([Validators.required, Validators.pattern('[a-zA-Z,\'\. ]+')])],
            postcode: ['', Validators.compose([Validators.pattern('[0-9]{4}')])],
            departDate: [this.currentDate] //Today by default
        });

        this.userForm.get('country').valueChanges.subscribe(data => this.postCodeUpdate(data));
		

		
    }

    postCodeUpdate(newValue: any) { //Fixes 'required' issue for countries other than Australia
        let postCodeControl = this.userForm.get('postcode');
        console.log(newValue);
        if (newValue == 'Australia') {
            postCodeControl.setValidators([Validators.pattern('[0-9]{4}'), Validators.required]);
        } else {
            postCodeControl.reset(); //Clear Value
            postCodeControl.setValidators([Validators.pattern('[0-9]{4}')]);
        }
        postCodeControl.updateValueAndValidity();
    }

    ngOnInit() { //Cannot swipe left or right
        this.slides._allowSwipeToNext = false;
        this.slides._allowSwipeToPrev = false;
    }

    next() {
        if (!this.sliderLocked) { //Prevent double tap glitching
            this.slides._allowSwipeToNext = true;
            this.sliderLocked = true;
            this.slides.slideTo(this.currentIndex + 1, 800);
            setTimeout(() => {
                this.sliderLocked = false;
                this.slides._allowSwipeToNext = false;
            }, 1000);
        }
    }

    slideChanged() {
        this.currentIndex = this.slides.getActiveIndex();
        //Update Button text
        if (this.currentIndex == 1) {
            this.footerButtonText = 'Agree';
        } else {
            this.footerButtonText = 'Next';
        }
    }

    submitDetails() {
        if (this.user) {
            this.storage.get('userData').then((val) => { //Already exists?
                if (val) {
                    console.log('User Data already present');
                } else {
                    this.user.toServerDate = new Date().toISOString();
                    this.user._id = Md5.hashStr(this.user.installationDate + this.user.departed + this.user.country + this.user.postcode + this.user.toServerDate).toString();

                    this.replicateService.createReplicate(this.user).then((data) => {
                        console.log(this.user);
                        this.storage.set('userData', this.user);
                    }).catch((err2) => {
                        console.log(err2);
                    });
 
                    this.notificationsProvider.scheduleNotifications(); //Prepare notifications
                    this.navCtrl.push(TabsControllerPage); //Navigate to Main App
                }
            }).catch((err) => console.log(err));
        }
        console.log(this.user);
    }

}