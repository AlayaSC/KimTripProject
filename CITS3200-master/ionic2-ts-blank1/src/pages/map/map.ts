import { Component, ElementRef} from '@angular/core';
import { NavController, Platform, ModalController, NavParams, Events, AlertController } from 'ionic-angular';
import { Geolocation } from '@ionic-native/geolocation';
import { AndroidPermissions } from '@ionic-native/android-permissions';
import { Diagnostic } from '@ionic-native/diagnostic';
import { SurveyModal } from '../survey-modal/survey-modal'
import { Todos } from '../../providers/todos/todos';
import { SocialSharingProvider } from '../../providers/social-sharing/social-sharing';
import { Storage } from '@ionic/storage';
import { StatusBar } from '@ionic-native/status-bar';
import { AppConfig } from '../../app/app-config.ts';
import { Http } from '@angular/http';
import { SplashScreen } from '@ionic-native/splash-screen';
import moment from 'moment';
import leafletImage from 'leaflet-image';
import { forkJoin } from "rxjs/observable/forkJoin";
import { ToastController } from 'ionic-angular';

declare var L: any;
declare var sqlitePlugin;

@Component({
  selector: 'page-map',
  templateUrl: 'map.html'
})
export class MapPage {

  map: any;
  geolocationEnabled: boolean = false;
  currentMarkers: any = [];
  userPositionMarker: any;

  //Map Layers
  globalTileLayer: any;
  northEast: any = L.latLng(-10.0000, 135.18564); // North East Kimberley
  southWest: any = L.latLng(-25.93701, 103.50709); // South West Kimberley

  //Geolocation
  geoData: any;
  getLastGeoLocation: any;
  geoFinding: boolean = false;

  //DEFAULTS
  currentCoords: any = AppConfig.mapConfig.defaultCoords;
  maxZoom: any = AppConfig.mapConfig.maxZoom;
  minZoom: any = AppConfig.mapConfig.minZoom;
  currentZoom: any = 6;

  //USER
  user: any;

  geolocationWatch: any;

  diaryData: any; //Stores all current diary entries

  //Database
  sqldb:any = null;

  constructor(public navCtrl: NavController, public platform: Platform,
    private geolocation: Geolocation, private androidPermissions: AndroidPermissions,
    public events: Events, private diagnostic: Diagnostic, public modalCtrl: ModalController,
    public todoService: Todos, public socialSharing: SocialSharingProvider, public params: NavParams,
    private elementRef: ElementRef, public alertCtrl: AlertController, private storage: Storage,
    private statusBar: StatusBar, public http: Http, public toastCtrl: ToastController,  private splashScreen: SplashScreen) {
  }

  ngOnInit() {
	this.storage.ready().then(() => {
		this.storage.get('latestDiary').then((val) => {
			if(val) {
				this.todoService.getID(val).then((doc) => {
				  if(doc.gpsLocationNight != []) {
					this.currentCoords = doc.gpsLocationNight;
				  }
				}).catch((err) => { console.log(err); });
			}
		}).catch((err) => console.log(err));
	}).catch((err) => console.log(err));
    if(this.platform.is('ios')) { //Hide Statusbar for iOS
      this.statusBar.hide();
    }
  }

  initMap() {
    return new Promise((resolve) => {
      L.TileLayer.MBTiles = L.TileLayer.extend({
        mbTilesDB: null,

        initialize: function(url, options, db) {
          this.mbTilesDB = db;
          L.Util.setOptions(this, options);
        },

        createTile: function (coords, done) {
          var tile = document.createElement('img');

          if (this.options.crossOrigin) {
            tile.crossOrigin = '';
          }
          tile.alt = '';
          tile.setAttribute('role', 'presentation');

          // In TileLayer.MBTiles, the getTileUrl() method can only be called when
          // the database has already been loaded.
          L.DomEvent.on(tile, 'load', L.bind(this._tileOnLoad, this, done, tile));
          L.DomEvent.on(tile, 'error', L.bind(this._tileOnError, this, done, tile));

          var error;
          this.getTileUrl(coords).then(function(newTile) {
            tile.src = newTile;
            done(error, tile);
            // console.log(newTile);
          }).catch((err) => console.log(err));

          return tile;
        },

        getTileUrl: function(coords) {
          return new Promise((newTile) => {
            var z = this._getZoomForUrl();
            z = Math.round(z);
            var x = coords.x;
            var y = coords.y;
            y = Math.pow(2, z) - y - 1;
            var base64Prefix = 'data:image/png;base64,'; //Images will be displayed in Base64
            this.mbTilesDB.transaction(tx => {
              console.log(`[MapPage.getTileUrl] SELECT tile_data FROM tiles WHERE zoom_level = ${z} AND tile_column = ${x} AND tile_row = ${y};` );
              tx.executeSql("SELECT BASE64(tile_data) AS tile_d FROM tiles WHERE zoom_level = ? AND tile_column = ? AND tile_row = ?;", [z, x, y], (tx, res) => {
                // console.log(base64Prefix + res.rows.item(0).tile_d);
                newTile(base64Prefix + res.rows.item(0).tile_d);
              }, (err, msg) => {
                console.log('[MapPage.getTileUrl] error with executeSql', err);
                console.log('[MapPage.getTileUrl] message ', msg);
              });
            }, (err, msg) => {
              console.log("[MapPage.getTileUrl] Transaction err:", err);
              console.log(err);
            });
          });
        },

      });

      this.platform.ready().then(() => {
        let mbTiles = 'map_sample.mbtiles';
        let layerName = 'Offline Layer';
        if (window.sqlitePlugin) {
          this.initializeMbtiles(mbTiles, layerName);
        } else {
          console.log("[MapPage.ngOnInit]Could not find window.sqlitePlugin");
        }
		// Start of legend
		var legend = L.control({position: 'bottomleft'});
		legend.onAdd = function (map) {
			var div = L.DomUtil.create('div', 'info legend');
			div.innerHTML += '<i style="background: #f03b20"></i> Day<br><br>';
			div.innerHTML += '<i style="background: #2b8cbe"></i> Night';
			return div;
		};

		legend.addTo(this.map);
		// End of legend
      }).catch((err) => console.log(err));
    });
  }

  getLastDiary() {
	 let latestDiary = null;
	 this.todoService.getTodos().then((doc) => {
       for(let i = 0; i < doc.length; i++) {
		   if(i > 0) {
			if(moment(latestDiary.date) < moment(doc[i].date)) {
				latestDiary = doc[i];
			}
		   } else {
				latestDiary = doc[i];
			}
	   }
	  if(latestDiary.gpsLocationNight != []) {
		this.currentCoords = latestDiary.gpsLocationNight;
		this.mapLocate();
		const toast = this.toastCtrl.create({
			message: moment(latestDiary.date).format('MMMM Do YYYY'),
			duration: 2000,
			position: 'top'
		});
	  toast.present();
	  } else if (latestDiary.gpsLocationDay != []) {
		this.currentCoords = latestDiary.gpsLocationDay;
		this.mapLocate();
		const toast = this.toastCtrl.create({
			message: moment(latestDiary.date).format('MMMM Do YYYY'),
			duration: 2000,
			position: 'top'
		});
	  toast.present();
	  } else {
		  console.log("Unable to find last nights location coordinates.");
	  }
	 }).catch((err) => {
		 console.log(err);
		const toast = this.toastCtrl.create({
			message: 'Latest Diary Entry Not Found',
			duration: 2000,
			position: 'top'
		});
		toast.present();
	});
  }

  ionViewDidLoad() {

	this.storage.ready().then(() => {
		this.storage.get('userData').then((user) => {
		  if(user != null) {
			this.user = user.id;
		  }
		});
	}).catch((err) => console.log(err));

	// GeoPositioning
	//this.initGeolocation();

	var bounds = L.latLngBounds(this.southWest, this.northEast);

    this.map = L.map('map', { preferCanvas: true} ).setView(this.currentCoords, this.currentZoom);
	this.map.setMaxBounds(bounds);

	let roadLayer = L.layerGroup();
	let mappedStreamLayer = L.layerGroup();
	let waterHoleLayer = L.layerGroup();
	let locationsLayer = L.layerGroup();
	let placeNameLayer = L.layerGroup();

	function addRoadData( feature, layer ){
		if (feature.properties.CLASS === "Secondary Road") {
			layer.setStyle({
				weight: 1.5,
				color: '#F9D181',
				fillOpacity: 1
			});
		}
		if (feature.properties.CLASS === "Minor Road") {
			layer.setStyle({
				weight: 1.5,
				color: '#EAD2B2',
				fillOpacity: 1
			});
		}
		if (feature.properties.CLASS === "Track") {
			layer.setStyle({
				"color": "#D3D2D0",
			"weight": 1.5,
			"opacity": 1
			});
		}
		if (feature.properties && feature.properties.NAME) {
			let template = "<b class='popupTitle'>" + feature.properties.NAME + "</b><br><i class='popupCoords'>" + feature.properties.FEATTYPE + "</i>";
			layer.bindPopup(template);
		}
		roadLayer.addLayer( layer )
	};

	function addMappedStreamData( feature, layer ){
		if (feature.properties && feature.properties.NAME) {
			let template = "<b class='popupTitle'>" + feature.properties.NAME + "</b><br><i class='popupCoords'>" + feature.properties.FEATTYPE + "</i>";
			layer.bindPopup(template);
		}
		mappedStreamLayer.addLayer( layer );
	};

	function addWaterHoleData(feature, layer) {
		if (feature.properties && feature.properties.NAME) {
			let template = "<b class='popupTitle'>" + feature.properties.NAME + "</b><br><i class='popupCoords'>" + feature.properties.FEATTYPE + "</i>";
			layer.bindPopup(template);
		}
		switch(feature.properties.FEATTYPE) {
			case "Waterhole":
				layer.setStyle({
					radius: 8,
					fillColor: "#0043ff",
					color: "#000",
					weight: 1,
					opacity: 1,
					fillOpacity: 0.8
				});
				break;
			case "Waterfall Point":
				layer.setStyle({
					radius: 8,
					fillColor: "#64aaf4",
					color: "#000",
					weight: 1,
					opacity: 1,
					fillOpacity: 0.8
				});
				break;
			case "Spring":
				layer.setStyle({
					radius: 8,
					fillColor: "#84f8ff",
					color: "#000",
					weight: 1,
					opacity: 1,
					fillOpacity: 0.8
				});
				break;
		}
		waterHoleLayer.addLayer( layer );
	}
	function addLocationsData( feature, layer ){
		if (feature.properties && feature.properties.NAME) {
			let template = "<b class='popupTitle'>" + feature.properties.NAME + "</b><br><i class='popupCoords'>" + feature.properties.FEATTYPE + "</i>";
			layer.bindPopup(template);
		}
		switch(feature.properties.FEATTYPE) {
			case "Homestead":
				layer.setStyle({
					radius: 8,
					fillColor: "#af7500",
					color: "#000",
					weight: 1,
					opacity: 1,
					fillOpacity: 0.8
				});
				break;
			case "Populated Place":
				layer.setStyle({
					radius: 8,
					fillColor: "#e2e200",
					color: "#000",
					weight: 1,
					opacity: 1,
					fillOpacity: 0.8
				});
				break;
			case "Town":
				layer.setStyle({
					radius: 8,
					fillColor: "#e2d600",
					color: "#000",
					weight: 1,
					opacity: 1,
					fillOpacity: 0.8
				});
				break;
			case "Mountain":
				layer.setStyle({
					radius: 8,
					fillColor: "#634300",
					color: "#000",
					weight: 1,
					opacity: 1,
					fillOpacity: 0.8
				});
				break;
			case "Bay":
				layer.setStyle({
					radius: 8,
					fillColor: "#ffbc66",
					color: "#000",
					weight: 1,
					opacity: 1,
					fillOpacity: 0.8
				});
				break;
			case "Cape":
				layer.setStyle({
					radius: 8,
					fillColor: "#ff9366",
					color: "#000",
					weight: 1,
					opacity: 1,
					fillOpacity: 0.8
				});
				break;
			case "Pass":
				layer.setStyle({
					radius: 8,
					fillColor: "#e5ff66",
					color: "#000",
					weight: 1,
					opacity: 1,
					fillOpacity: 0.8
				});
				break;
			case "Gorge":
				layer.setStyle({
					radius: 8,
					fillColor: "#94af28",
					color: "#000",
					weight: 1,
					opacity: 1,
					fillOpacity: 0.8
				});
				break;
		}
		locationsLayer.addLayer( layer );
	};
	function addPlaceNameData( feature, layer ){
		if (feature.properties && feature.properties.NAME) {
			let template = "<b class='popupTitle'>" + feature.properties.NAME + "</b><br><i class='popupCoords'>" + feature.properties.FEATTYPE + "</i>";
			layer.bindPopup(template);
		}
		placeNameLayer.addLayer( layer );
	};

	function addLakeToMappedStreamData( feature, layer ){
		if (feature.properties && feature.properties.NAME) {
			layer.bindPopup(feature.properties.NAME);
		}
		mappedStreamLayer.addLayer( layer );
	};

	var roadStyle = {
		"color": "#F7AF99",
		"weight": 1.5,
		"opacity": 1
	};

	var trackStyle = {
		"color": "#D3D2D0",
		"weight": 1,
		"opacity": 1
	};

	var lakeStyle = {
		"color": "#00abff",
		"weight": 2,
		"opacity": 1
	};

	var waterCourseStyle = {
		"color": "#add8e6",
		"weight": 1.5,
		"opacity": 1
	};

	var mappedStreamStyle = {
		"color": "#AAD3DF",
		"weight": 1.5,
		"opacity": 1
	};

	var waterHoleStyle = {
		radius: 8,
		fillColor: "#0078ff",
		color: "#000",
		weight: 1,
		opacity: 1,
		fillOpacity: 0.8
	};

	var locationsStyle = {
		radius: 8,
		fillColor: "#ff7800",
		color: "#000",
		weight: 1,
		opacity: 1,
		fillOpacity: 0.8
	};

	var placeNameStyle = {
		radius: 8,
		fillColor: "#78ff00",
		color: "#000",
		weight: 1,
		opacity: 1,
		fillOpacity: 0.8
	};

	let getRoads = this.http.get('assets/resources/AU_GA250k_Roads_Kimberley_Cleaned.json').map(response => response.json());
	let getMappedStream = this.http.get('assets/resources/AHGFMappedStream_Kimberley_Major+Named+Perennial.json').map(response => response.json());
	let getWaterHoles = this.http.get('assets/resources/Water_Features.json').map(response => response.json());
	let getLocations = this.http.get('assets/resources/Location_Features.json').map(response => response.json());
	//let getPlaceNames = this.http.get('assets/resources/Aus_250K_Vector_PlaceNames_Kimberley.json').map(response => response.json());
	let getStaticLocations = this.http.get('assets/resources/Static_Locations.json').map(response => response.json());
		
	forkJoin([getRoads, getMappedStream, getWaterHoles, getLocations, getStaticLocations]).subscribe(results => {
		let roadData = results[0];
		let mappedStreamData = results[1];
		let getWaterHoles = results[2];
		let getLocations = results[3];
		let getStaticLocations = results[4];

		var roadLayer = L.geoJSON(roadData, {
			style: roadStyle,
			onEachFeature: addRoadData,
		});

		var mappedStreamLayer = L.geoJSON(mappedStreamData, {
			style: mappedStreamStyle,
			onEachFeature: addMappedStreamData,
		});

		var waterFeatureLayer = L.geoJSON(getWaterHoles, {
			pointToLayer: function(feature, latlng) {
				return L.circleMarker(latlng, waterHoleStyle);
			},
		//	style: mappedStreamStyle,
			onEachFeature: addWaterHoleData,
		});

		var locationsLayer = L.geoJSON(getLocations, {
			pointToLayer: function(feature, latlng) {
				return L.circleMarker(latlng, locationsStyle);
			},
			//style: locationsStyle,
			onEachFeature: addLocationsData,
		});

		let staticLocationsGeoJSON = new L.geoJSON(getStaticLocations, {
			pointToLayer: function(feature, latlng) {
				return L.circleMarker(latlng, locationsStyle);
			},
			onEachFeature: addLocationsData,
		}).addTo(this.map);
		
		let layerControl = {
			"Roads & Tracks": roadLayer,
			"Water": mappedStreamLayer,
			"Water Features": waterFeatureLayer,
			"Location Features": locationsLayer
		};

		L.control.layers(null, layerControl, {collapsed: true }).addTo(this.map);
		
		this.initMap().then(()=>{

		}).catch((err) => console.log(err));
	});

	this.geolocationEnabled = false;
    if(this.platform.is('android')) { //Get Android Permissions
      this.androidPermissions.requestPermission(this.androidPermissions.PERMISSION.ACCESS_FINE_LOCATION)
      .then((success) => this.initGeolocation(true))
	  .catch((err) => console.log('Unable to Request Location Permissions'));
    }
  }

  ionViewDidEnter() {
    this.refreshMarkers();

    this.geolocationWatch = this.geolocation.watchPosition({timeout: 10000}) //Start Watching Location
    .subscribe((data) => {
      if(data.coords) {
        console.log(data.coords);
    		//northEast: any = L.latLng(-10.0000, 135.18564); // North East Kimberley
    		//southWest: any = L.latLng(-25.93701, 103.50709); // South West Kimberley
    		//console.log("Checking: Data " + data.coords.latitude + " NorthEastLat " + this.northEast.lat);
    		if(data.coords.latitude < this.northEast.lat && data.coords.longitude < this.northEast.lng
        && data.coords.latitude > this.southWest.lat && data.coords.longitude > this.southWest.lng) {
    			this.currentCoords = [data.coords.latitude, data.coords.longitude];
    		}
        this.userPositionMarker.setLatLng([data.coords.latitude, data.coords.longitude]);
      } else {
        this.geolocationEnabled = false;
		    console.log("GeoPositioning Turned Off (Via ionViewDidEnter)");
    		this.initGeolocation(false);
      }
    });
    this.events.subscribe('map:viewEntry', (data) => {
      console.log("Event Subscriber:");
      console.log(data);
      if (data.entry && data.entry.length != 0) {
		  console.log("Current Coords: " + this.currentCoords + ", data.entry + " + data.entry);
        this.currentCoords = data.entry;
        this.currentZoom = this.maxZoom;
        this.mapLocate();
		console.log("is this firing");
      }
    });
  }

  ionViewDidLeave() {
    if(this.geolocationWatch) {
      this.geolocationWatch.unsubscribe(); //Stop watching
    }
  }

  ionViewWillUnload() {
    this.events.unsubscribe('map:viewEntry');
  }

  ionViewWillLeave() {
	 // console.log("map.ts ionViewWillLeave");
  }

  initGeolocation(locateMap: boolean) {
 //   this.geolocation.getCurrentPosition({ maximumAge: 5000, timeout: 8000}).then((resp) => { //Tests if Location can be retrieved
    this.geolocationWatch = this.geolocation.watchPosition({timeout: 10000}) //Start Watching Location
	.subscribe((resp) => {
      if(resp.coords) {
        this.geolocationEnabled = true;
		//console.log("Checking: Data " + resp.coords.latitude + " NorthEastLat " + this.northEast.lat);
        this.userPositionMarker = L.circle([resp.coords.latitude, resp.coords.longitude], 350);
        this.userPositionMarker.addTo(this.map);
		if(resp.coords.latitude < this.northEast.lat && resp.coords.longitude < this.northEast.lng && resp.coords.latitude > this.southWest.lat && resp.coords.longitude > this.southWest.lng) {
			this.currentCoords = [resp.coords.latitude, resp.coords.longitude];
			if(locateMap === true) {
				this.mapLocate(); //Start on Current Location
			}
		}
		this.geoFinding = false;
      } else {
		  if(!this.geoFinding) {

		  } else {
		  this.geoFinding = true;
		  this.initGeolocation(locateMap);
		  }
		  this.geolocationEnabled = false;
		console.log("GeoPositioning Turned Off");

      }
    });
  }

  /**
   * @async
   * This function opens the Sqlite database and passes the connection on
   * to the L.TileLayer.MBTiles for initialization.
   * It also adds the layer to the baseLayers array
   */
   initializeMbtiles(mbtilePath: string, layerName: string) {
     let dbconn;
     this.sqldb = window.sqlitePlugin.openDatabase({ name: mbtilePath, location: 'default' });
	 this.globalTileLayer = new L.TileLayer.MBTiles('', {
	   maxZoom: this.maxZoom,
	   minZoom: this.minZoom,
	   scheme: 'tms',
	   attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'}, this.sqldb);
	 var key = layerName;
	 this.globalTileLayer.addTo(this.map);
	 this.initDiaryMarkers();
   }

   mapLocate() {
    // if(this.geolocationEnabled == true) {
       this.map.setView(this.currentCoords, this.maxZoom, this.minZoom);
    // }
   }

   gpsLocate() {
	console.log("gpsLocate clicked");
	if(!this.geolocationEnabled) {
		if(this.platform.is('android')) { //Get Android Permissions
			this.androidPermissions.checkPermission(this.androidPermissions.PERMISSION.ACCESS_FINE_LOCATION).then((result) => {
			console.log('Has permission?',result.hasPermission);
			if(result.hasPermission == false) {
				this.androidPermissions.requestPermission(this.androidPermissions.PERMISSION.ACCESS_FINE_LOCATION)
			  .then(success => this.initGeolocation(true))
			  .catch((err) => console.log('Unable to Request Location Permissions'));
			} else {
				this.initGeolocation(true);
			}
			}).catch((err) => {
			  this.androidPermissions.requestPermission(this.androidPermissions.PERMISSION.ACCESS_FINE_LOCATION)
			  .then(success => this.initGeolocation(true))
			  .catch((err) => console.log('Unable to Request Location Permissions'));
			});
		} else {
			this.initGeolocation(true);
		}
	} else {
		this.initGeolocation(true);
	/*	if(this.geolocationWatch) {
		  this.geolocationWatch.unsubscribe(); //Stop watching
		  this.geolocationEnabled = false;
		}*/
	}

   }

   initDiaryMarkers() {
     //Load from DB
     this.todoService.getTodos().then((doc) => {
       this.diaryData = doc;
       for(var i = 0; i < doc.length; i++) {
         this.createMarker(doc[i]);
       }
     })
	 .then(() => {
	 this.map._onResize();
	 this.map.invalidateSize();
	 })
	 .catch((err) => {
       console.log('Unable to Fetch Diary Entries: ', err);
		let alert = this.alertCtrl.create({
			title: 'Unable to Fetch Diary Entries',
			buttons: [
				{
					text: err,
					handler: () => {
						console.log('Okay clicked');
					}
				}
			]
		});
		alert.present();
     });
   }

   createMarker(Diary: any) {
     //DAY MARKER
    // if(Diary.gpsLocationDay && Diary.gpsLocationDay.length != 0) { // OLD
	if (Diary.gpsLocationDay[0] && ((Diary.gpsLocationNight.length == 0 ) || JSON.stringify(Diary.gpsLocationNight) != JSON.stringify(Diary.gpsLocationDay))) {
       console.log("Loading Day Marker: " + Diary.gpsLocationDay);
       var diaryMarker = L.AwesomeMarkers.icon({
         markerColor: 'red'
       });
       var template = this.buildPopupTemplate(Diary._id, Diary.date, Diary.gpsLocationDay, true);
       var newMarker = L.marker(Diary.gpsLocationDay, {icon: diaryMarker});
       newMarker.addTo(this.map);
       newMarker.bindPopup(template);
       newMarker.on('click', ()=> { this.onMarkerClicked() }); //Register event
       this.currentMarkers.push(newMarker); //Record all markers
     }

     //NIGHT MARKER
     if(Diary.gpsLocationNight && Diary.gpsLocationNight.length != 0) {
    //   if ((Diary.gpsLocationDay.length == 0 ) || JSON.stringify(Diary.gpsLocationNight) != JSON.stringify(Diary.gpsLocationDay)) { // Night marker does not show if day marker is at same location
         console.log("Loading Night Marker: " + Diary.gpsLocationNight);
         var diaryMarker = L.AwesomeMarkers.icon({
           markerColor: 'blue'
         });
         var template = this.buildPopupTemplate(Diary._id, Diary.date, Diary.gpsLocationNight, false);
         var newMarker = L.marker(Diary.gpsLocationNight, {icon: diaryMarker});
         newMarker.addTo(this.map);
         newMarker.bindPopup(template);
         newMarker.on('click', ()=> { this.onMarkerClicked() }); //Register event
         this.currentMarkers.push(newMarker); //Record all markers
     }
   }

   buildPopupTemplate(ID: any, date: any, Coordinates: any, shareDay: any) {
     //Generates HTML for the Popup
     var markerTime = shareDay ? 'day' : 'night';
     var dateString = "<b class='popupTitle'>" + (Coordinates[2] ? Coordinates[2]+", " : "") + moment(date).format('MMMM Do YYYY') + "</b>";
     var editButton = "<a class='popupButton' type='edit' entryID='" + ID + "'(click)='editDiary();'>Edit</a>";
     var shareButton = "<a class='popupButton' type='share' time=" + markerTime + " entryID='" + ID + "'(click)='shareDiary();'>Share</a>";
     var coordsString = "<i class='popupCoords'>" + Coordinates[0].toFixed(5) + ', ' + Coordinates[1].toFixed(5) + "</i>";

     return dateString + "<br>" + coordsString + "<br><br>" + editButton + shareButton;
   }



   addEvent() {
     let tempDate: Date = new Date();
     let tempID = tempDate.getFullYear() + "/" + (tempDate.getMonth() + 1) + "/" + tempDate.getDate() + "_" + this.user;
     this.todoService.getID(tempID).then((doc) => {
       let alert = this.alertCtrl.create({
         title: 'You’ve already completed a survey today',
         message: 'What would you like to do?',
         buttons: [
         {
           text: 'Retake Survey',
           handler: () => {
             this.accessSurvey();
             console.log('Cancel clicked');
           }
         },
         {
           text: 'Edit Survey',
           handler: () => {
             this.editEvent(doc);
           }
         }
         ]
       });
       alert.present();
     }).catch((err) => {
       this.accessSurvey();
	   console.log(err);
     });
   }

   accessSurvey() {
     let myModal = this.modalCtrl.create(SurveyModal, { showBackdrop: true });
     myModal.onDidDismiss((data) => {
       setTimeout(() => {
	   this.refreshMarkers();
	   console.log("refreshing markers under access survey");
	   }
	   , 500);
     });
	 myModal.present();
   }

   refreshMarkers() {
     //For simplicity, removes all then re-fetches
     if(this.currentMarkers.length > 0) {
       for(var i = 0; i < this.currentMarkers.length; i++) {
         this.map.removeLayer(this.currentMarkers[i]);
       }
       this.currentMarkers = []; //Clear Array
     }
     this.initDiaryMarkers(); //Fetch again
	 this.map.invalidateSize();
   }

   onMarkerClicked() {
     //Add Event Handlers to the all Popup Buttons
     var button = this.elementRef.nativeElement.querySelectorAll(".popupButton");

     console.log(button);
     if(button.length > 0) {
       for(var i = 0; i < button.length; i++) { //Iterate through each
         button[i].addEventListener('click', (event) => this.popupButtonClicked(event));
       }
     }
   }

   popupButtonClicked(e) {
     var attr = e.target.attributes || e.srcElement.attributes || e.currentTarget.attributes;//e.srcElement.attributes;
     var diaryID = attr.entryid.nodeValue; //Retrieve ID value
     console.log(diaryID);
     if(diaryID != undefined) {
       this.todoService.getID(diaryID).then((doc) => { //Fetch corresponding data
         if(attr.type.nodeValue == 'edit') {
           //EDIT clicked
           this.editEvent(doc);
         } else if (attr.type.nodeValue == 'share') {
           //SHARE clicked
           if(attr.time.nodeValue == 'day') {
              this.shareDiary(doc.gpsLocationDay);
           } else if(attr.time.nodeValue == 'night') {
              this.shareDiary(doc.gpsLocationNight);
           } else {
             console.log('Invalid Popup Clicked');
           }
         } else {
           console.log('Unknown button clicked: ', e);
         }
       }).catch((err) => {
         console.log('Unable to Fetch Diary Info: ', err);
       });
     }
   }

   editEvent(document: any) { //Open new Diary Editor
     let myModal = this.modalCtrl.create(SurveyModal, { showBackdrop: true, 'diaryData': document , 'allowSlide': true});
     myModal.onDidDismiss((data) => {
       setTimeout(() => {
	   this.refreshMarkers();
	   console.log("refreshing markers under access survey");
	   }
	   , 500);
     });
	 myModal.present();
   }

   shareDiary(coords: any) {
     this.socialSharing.share(coords);
   }



 }
