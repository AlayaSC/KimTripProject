import { Component } from '@angular/core';
import { NavController, ModalController } from 'ionic-angular';
import { DiaryPage } from '../diary/diary';
import { MapPage } from '../map/map';
import { HelpPage } from '../help/help';
import { SettingsPage } from '../settings/settings';

@Component({
  selector: 'page-tabs-controller',
  templateUrl: 'tabs-controller.html'
})
export class TabsControllerPage {
  // this tells the tabs component which Pages
  // should be each tab's root Page

  tab1Root: any = MapPage;
  tab3Root: any = DiaryPage;
  tab4Root: any = HelpPage;
  tab5Root: any = SettingsPage;
  constructor(public navCtrl: NavController, public modalCtrl: ModalController) {

  }
}
