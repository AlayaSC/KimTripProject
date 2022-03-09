import { Component, ViewChild } from '@angular/core';
import { NavController, Platform, ViewController, NavParams } from 'ionic-angular';
import { Keyboard } from '@ionic-native/keyboard';

@Component({
  selector: 'comment-modal',
  templateUrl: 'comment-modal.html'
})

export class CommentBox {
	
	 @ViewChild('textArea') myInput ;
 
	textValue: any;

	constructor(public viewCtrl: ViewController, public navCtrl: NavController, params: NavParams, private keyboard: Keyboard) {
		this.textValue = params.get('passData');
	}
	
  ionViewDidLoad() {
	  
    setTimeout(() => {
      this.keyboard.show();
      this.myInput.setFocus();
    }, 350);
	
  }
  
	finish() {
		this.viewCtrl.dismiss(this.textValue);
	}
}