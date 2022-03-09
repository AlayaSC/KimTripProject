import { NgModule, ErrorHandler } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { Validators, FormBuilder, FormGroup } from '@angular/forms';
import { IonicApp, IonicModule, IonicErrorHandler } from 'ionic-angular';
import { MyApp } from './app.component';
import { MapPage } from '../pages/map/map';
import { TabsControllerPage } from '../pages/tabs-controller/tabs-controller';
import { DiaryPage } from '../pages/diary/diary';
import { HelpPage } from '../pages/help/help';
import { SettingsPage } from '../pages/settings/settings';
import { InformationPage } from '../pages/information/information';
import { InstructionsPage } from '../pages/instructions/instructions';
import { ContactPage } from '../pages/contact/contact';
import { Geolocation } from '@ionic-native/geolocation';
import { AndroidPermissions } from '@ionic-native/android-permissions';
import { Diagnostic } from '@ionic-native/diagnostic';
import { Todos } from '../providers/todos/todos.ts';
import { ReplicateUser } from '../providers/replicate-user/replicate-user.ts';
import { HttpModule } from '@angular/http';
import { SurveyModal } from '../pages/survey-modal/survey-modal';
import { MapModal } from '../pages/map-modal/map-modal';
import { TermsModal } from '../pages/terms-modal/terms-modal';
import { SplashScreen } from '@ionic-native/splash-screen';
import { IonicStorageModule } from '@ionic/storage';
import { LocalNotifications } from '@ionic-native/local-notifications';
import { NotificationsProvider } from '../providers/notifications/notifications';
import { SocialSharingProvider } from '../providers/social-sharing/social-sharing';
import { ImagePicker } from '@ionic-native/image-picker';
import { SocialSharing } from '@ionic-native/social-sharing';
import { FileTransfer, FileUploadOptions, FileTransferObject } from '@ionic-native/file-transfer';
import { File } from '@ionic-native/file';
import { Md5 } from 'ts-md5/dist/md5';
import { StatusBar } from '@ionic-native/status-bar';
import { Camera, CameraOptions } from '@ionic-native/camera';
import { FileOpener } from '@ionic-native/file-opener';
import { Network } from '@ionic-native/network';
import { CommentBox } from '../pages/comment-modal/comment-modal';
import { Keyboard } from '@ionic-native/keyboard';
import { TabindexDirective } from '../directives/tabindex.directive';

@NgModule({
  declarations: [
    MyApp,
    MapPage,
    TabsControllerPage,
    DiaryPage,
    HelpPage,
    SettingsPage,
    SurveyModal,
    MapModal,
    TermsModal,
    InformationPage,
    InstructionsPage,
    ContactPage,
	CommentBox
  ],
  imports: [
    BrowserModule,
	HttpModule,
    IonicModule.forRoot(MyApp),
    IonicStorageModule.forRoot()
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
    MapPage,
    TabsControllerPage,
    DiaryPage,
    HelpPage,
    SettingsPage,
    SurveyModal,
    MapModal,
    TermsModal,
    InformationPage,
    InstructionsPage,
    ContactPage,
	CommentBox
  ],
  providers: [
    {provide: ErrorHandler, useClass: IonicErrorHandler},
    Geolocation,
    AndroidPermissions,
    Diagnostic,
    Todos,
    ReplicateUser,
    SplashScreen,
    LocalNotifications,
    SplashScreen,
    NotificationsProvider,
    SocialSharingProvider,
    ImagePicker,
    SocialSharing,
    FileTransfer,
    FileTransferObject,
    File,
    StatusBar,
	Camera,
	FileOpener,
	Network,
	Keyboard
  ]
})
export class AppModule {}
