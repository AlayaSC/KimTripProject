import { Injectable } from '@angular/core';
import { Http } from '@angular/http';
import { ImagePicker } from '@ionic-native/image-picker';
import { SocialSharing } from '@ionic-native/social-sharing';
import { AlertController } from 'ionic-angular';
import { FileTransfer, FileUploadOptions, FileTransferObject } from '@ionic-native/file-transfer';
import { File } from '@ionic-native/file';
import { LoadingController } from 'ionic-angular';
import { AppConfig } from '../../app/app-config.ts';
import 'rxjs/add/operator/map';

/*
  A provider for Social Sharing
*/
@Injectable()
export class SocialSharingProvider {

  constructor(public http: Http, public imagePicker: ImagePicker,
  	private socialSharing: SocialSharing, public alertCtrl: AlertController,
  	public transfer: FileTransfer, public file: File,
  	public loadingCtrl: LoadingController) {
    
  }

  share(coords: any) {
  	const loading = this.loadingCtrl.create({
	    spinner: 'crescent',
	    content: 'Loading...'
	});

  	loading.present();

  	var localImageLocation = this.fetchImage(coords).then((mapURL) => { //Create Map Image
		console.log(mapURL);
	  	this.socialSharing.shareWithOptions(this.getOptions(coords, mapURL)).then(() => {
		    console.log("Shared to app");
		    loading.dismiss();
		}).catch((err) => {
			console.log("Sharing failed with message: " + err);
			loading.dismiss();
		});
  	}).catch((err) => {
  		loading.dismiss();
  		var errMsg ='';
  		if(err.code == 3) {
  			errMsg = 'You are currently not connected to the internet';
  		} else {
  			errMsg = 'An unknown error occurred';
  		}
		const alert = this.alertCtrl.create({
			title: 'Cannot Share!',
			subTitle: errMsg,
			buttons: ['Dismiss']
		});
		alert.present();
  		console.log('An Error Occured when sharing: ', err);
  	});

  }

  getOptions(coords: any, url: any) {
  	if(coords != []) {
		var options = {
		  message: 'Out and about in the Kimberley, WA!',
		  subject: 'New Update from: Kimberley Trip Diary',
		  files: [url]
		}
		return options;
	}    
  }

  fetchImage(coords: any) { //Downloads and Saves the Map for sharing
  	return new Promise((resolve, reject) => {
	  	const fileTransfer: FileTransferObject = this.transfer.create();
	  	var coordsString = coords[0]+','+coords[1];
	  	var mapZoom = AppConfig.socialSharingConfig.googleZoom;
	  	var googleStaticMapURL = 'https://maps.googleapis.com/maps/api/staticmap?size=640x640&center='+coordsString+'&zoom=' + mapZoom + '&scale=4&markers=color:red%7Csize:large%7C'+coordsString;
	    fileTransfer.download(googleStaticMapURL, this.file.cacheDirectory + '/diary.png', true ).then((entry) => {
	        resolve(entry.toURL());
	      }).catch(error => {
	        console.log('Error: ', JSON.stringify(error));
	        reject(error);
	      });
  	});
  }

}
