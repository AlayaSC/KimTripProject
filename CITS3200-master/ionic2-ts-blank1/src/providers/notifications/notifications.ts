import { Injectable } from '@angular/core';
import { Http } from '@angular/http';
import { LocalNotifications } from '@ionic-native/local-notifications';
import { Platform } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import moment from 'moment';
import 'rxjs/add/operator/map';

@Injectable()
export class NotificationsProvider {

  timePeriods: any = 5; //'Buffers' multiple future notifications. 5 Days for now.
  notificationsAvailable: any = false;

  constructor(public localNotifications: LocalNotifications, public platform: Platform,
    private storage: Storage) {
    if(this.platform.is('android') || this.platform.is('ios')) { //Notifications can be enabled
      this.notificationsAvailable = true;
    } else {
      this.notificationsAvailable = false; //Not available on Platform
    }
  }

  scheduleNotifications() {
    if(this.notificationsAvailable) { //Ensure notifications are available
      this.checkEnabled().then((enabled) => {
        if(enabled) {
            this.removeNotifications().then((result) => {
              var times = this.getNextTimes();
                for(var i = 0; i < times.length; i++) { //Schedule multiple days in advance
                  this.localNotifications.schedule({
                     id: i + 1,
                     text: "Click here to start today's travel survey",
                     trigger: {at: new Date(times[i])}, //At 7pm the next day
                     icon: "res://icon.png",
                     smallIcon:"res://icon.png"
                  });
              console.log('Notifications Enabled');
            }
          });
        }
      });
    }
  }

  checkEnabled() {
    return new Promise((resolve) => {
      this.storage.get('notificationsEnabled').then((result) => { //Check Settings Storage
          console.log('NOTIFICATIONS ENABLED', result);
          if(result != null) {
            resolve(result);
          } else {
            this.storage.set('notificationsEnabled', true); //On by default
            resolve(true);
          }
      });
    });
  }

  getNextTimes() { //Get next notification times
    var times = []; 
    var scheduledTime = moment('18:00:00', 'HH:mm:ss');
    if(moment().isBefore(scheduledTime)) { //Before 7pm. Schedule for today.
      var next = moment().set({h: 18, m: 0, s: 0});
      times.push(next);
    }

    for(var i = 1; i <= this.timePeriods; i++) { //For n days in advance
      var next = moment().add(i, 'days');
      next.set({h: 18, m: 0, s: 0});
      times.push(next);
    }
    return times;
  }

  removeNotifications() {
    return new Promise((resolve) => {
      if(this.notificationsAvailable) { //Don't have to be enabled to clear
        return this.localNotifications.clearAll().then(() => {
          this.localNotifications.cancelAll().then(() => { //Clear to prevent duplicates
            console.log('Notifications Successfully Cleared');
            resolve();
          });
        });
      }
    });
  }

}
