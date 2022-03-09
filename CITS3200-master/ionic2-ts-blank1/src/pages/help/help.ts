import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { InformationPage } from '../information/information';
import { InstructionsPage } from '../instructions/instructions';
import { ContactPage } from '../contact/contact';

@Component({
  selector: 'page-help',
  templateUrl: 'help.html'
})
export class HelpPage {
  //Page is Static
  tab1Root = InstructionsPage;
  tab2Root = ContactPage;
  tab3Root = InformationPage;

  constructor(public navCtrl: NavController) {
  }
  
}
