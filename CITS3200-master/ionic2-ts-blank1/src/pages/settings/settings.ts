import { Component } from "@angular/core";
import { App, NavController, AlertController } from 'ionic-angular';
import { Todos } from '../../providers/todos/todos';
import { ReplicateUser } from '../../providers/replicate-user/replicate-user';
import { Storage } from '@ionic/storage';
import { NotificationsProvider } from '../../providers/notifications/notifications';
import { TermsModal } from '../terms-modal/terms-modal';

@Component({
  selector: 'page-settings',
  templateUrl: 'settings.html'
})
export class SettingsPage {
 
  geolocationEnabled: any;
  notificationsEnabled: any;
  
      //USER
    user: any;
 
  constructor(public appCtrl: App, public navCtrl: NavController, public todoService: Todos, public alertCtrl: AlertController,
  	private storage: Storage, public notificationsProvider: NotificationsProvider, public replicateUserService: ReplicateUser) {
  }
 
  ionViewDidLoad(){
	this.setNotifications();
  }
  
  ionViewWillEnter() {
	this.setNotifications();
  }
  
  setNotifications() {
    //NOTIFICATIONS
    this.storage.get('notificationsEnabled').then((result) => {
        if(result != null) {
            this.notificationsEnabled = result;
        }
    }).catch((err) => console.log(err));
  }
  
  ngOnInit() {

	this.storage.get('userData').then((user) => {					
		if(user != null) {
			this.user = user._id;
			console.log(this.user);
		}
	}).catch((err) => console.log(err));
 }

  updateNotifications() {
  	this.storage.set('notificationsEnabled', this.notificationsEnabled);
    console.log(this.notificationsEnabled);
  	if(this.notificationsEnabled == true) {
  		this.notificationsProvider.scheduleNotifications();
  	} else {
  		this.notificationsProvider.removeNotifications().then(() => {}).catch((err) => console.log(err));
  	}
  }

  resetUserData() {
    const alert = this.alertCtrl.create({
      title: 'Clear all User Data',
      message: 'Are you sure you want to clear all User Data? This cannot be reversed.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          handler: () => {
            console.log('Cancel clicked');
          }
        },
        {
          text: 'Yes',
          handler: () => {
              this.todoService.markAsDeleted(); //Delete all diary entries
              this.replicateUserService.markAsDeleted();
            this.storage.remove('notificationsEnabled'); //Delete Settings
            this.storage.remove('userData');
			this.storage.clear();
            this.notificationsProvider.removeNotifications().then(() => {}).catch((err) => console.log(err)); //Remove Notifications
            this.appCtrl.getRootNav().setRoot(TermsModal); //Return to Initial Survey
          }
        }
      ]
    });
    alert.present();
  }
}