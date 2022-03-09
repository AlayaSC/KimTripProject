import { Component } from '@angular/core';
import { NavController, Platform, ModalController} from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';
import { Events } from 'ionic-angular';
import { TabsControllerPage } from '../pages/tabs-controller/tabs-controller';
import { TermsModal } from '../pages/terms-modal/terms-modal';
import { Storage } from '@ionic/storage';
import { LocalNotifications } from '@ionic-native/local-notifications';
import { SurveyModal } from '../pages/survey-modal/survey-modal';
import { NotificationsProvider } from '../providers/notifications/notifications';
import { Http } from '@angular/http';
import moment from 'moment';

declare var sqlitePlugin: any;
declare var plugins: any;

@Component({
  templateUrl: 'app.html'
})
export class MyApp {
  mbtilePath: string;
  rootPage:any;

  constructor(public platform: Platform, public events: Events, private splashScreen: SplashScreen,
  private storage: Storage, public modalCtrl: ModalController, public localNotifications: LocalNotifications,
  public notificationsProvider: NotificationsProvider, public http: Http) {

    platform.ready().then(() => {
		storage.ready().then(() => {
		  storage.get('userData').then((val) => {
		  console.log("Storage Ready: ");
		  console.log(val);
		  if(val == null) {
			this.rootPage = TermsModal;
			  // this.rootPage = TabsControllerPage;
			} else {
			  notificationsProvider.scheduleNotifications();
			  this.rootPage = TabsControllerPage;
			}
		  });
		}).catch((err) => {
			console.log("Cannot Ready Storage: " + err);
		}).finally(() => {
		  if (window.sqlitePlugin) {
			this.mbtilePath = 'map_sample.mbtiles';
			console.log("[App contructor()] Trying to copy mbtiles from ", this.mbtilePath);
			plugins.sqlDB.copy(this.mbtilePath, 0, (res) => {
			  console.log("[App()] Successfully copied database", res);
			  this.events.publish('mapDB:ready', '');
			  this.splashScreen.hide();
			  //this.testDb();
			}, (error) => {
			  console.log("[App()] Error copying database", error);
			  console.log(error);
			  if (error.code === 516) { //Already exists error
				this.events.publish('mapDB:ready', '');
				this.splashScreen.hide();
				// this.testDb();
			  }
			});
		  }
		});
	});
  }

  testDb() {
    let obj = this;
    window.sqlitePlugin.openDatabase({ name: this.mbtilePath, location: "default" },
      function(conn) {
        console.log("[App.testDb()] successfully opened DB, trying to get tables ");
        conn.transaction((tx) => {
          tx.executeSql("SELECT * FROM sqlite_master", [], (tx, res) => {
            console.log("[App.testDb()] Got tables:", res.rows);
            let out = JSON.stringify(res.rows.item(0));
            console.log(out);
          }, (tx, res) => {
            console.log("[App.testDb()] Failed to get tables.", res.toString);
          })
        }, (res) => {
          console.log("[App.testDb()] Transaction failed:");
          console.log(res.toString());
        }) // end transaction
      }, (res) => {
        console.log("[App.testDb()] FAIL failed to open db", res.toString())
      }); // end openDatabase()
  }

}
