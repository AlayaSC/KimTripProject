import { Component } from '@angular/core';
import { NavController, Platform, ViewController } from 'ionic-angular';
import { Geolocation } from '@ionic-native/geolocation';
import { AndroidPermissions } from '@ionic-native/android-permissions';
import { Events } from 'ionic-angular';
import { Diagnostic } from '@ionic-native/diagnostic';
import { ToastController } from 'ionic-angular';
import { AppConfig } from '../../app/app-config.ts';
import { Http } from '@angular/http';
import { forkJoin } from "rxjs/observable/forkJoin";
import { Storage } from '@ionic/storage';
import { Todos } from '../../providers/todos/todos';
import moment from 'moment';

declare var L: any;
declare var sqlitePlugin;

@Component({
  selector: 'map-modal',
  templateUrl: 'map-modal.html'
})

export class MapModal {
  //MAP
  map: any;
  geolocationEnabled: boolean = false;
  
  northEast: any = L.latLng(-10.0000, 135.18564); // North East Kimberley	
  southWest: any = L.latLng(-25.93701, 103.50709); // South West Kimberley
  
  roadLayer: any;
  mappedStreamLayer: any;
  waterFeatureLayer: any;
  locationsLayer: any;

  //DEFAULTS
  currentCoords: any = AppConfig.mapConfig.defaultCoords;
  maxZoom: any = AppConfig.mapConfig.maxZoom;
  minZoom: any = AppConfig.mapConfig.minZoom;
  currentZoom: any = 6;
  geoFinding: boolean = false;

  geolocationWatch: any;

  //GPS COORDINATES
  selectedCoords: any;
  userPositionMarker: any;
  
  //Previous Listener
  previousListener: any = [0, 0];
  placeMarker: boolean = false;
  pinMarker: any;

  constructor(public viewCtrl: ViewController, public navCtrl: NavController, public platform: Platform,
      private geolocation: Geolocation, private androidPermissions: AndroidPermissions,  private storage: Storage,
      public events: Events, private diagnostic: Diagnostic, public toastCtrl: ToastController, public http: Http, public todoService: Todos) {
	
	
	  
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
          });

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
          let layerName = 'Offline Layer 2';
          if (window.sqlitePlugin) {
              this.initializeMbtiles(mbTiles, layerName);
          } else {
              console.log("[MapPage.ngOnInit]Could not find window.sqlitePlugin");
          }
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

  initializeMbtiles(mbtilePath: string, layerName: string) {
      let dbconn;
      console.log("[MapPage.initializeMbtiles()] Going to use local tiles, from ", mbtilePath);
      window.sqlitePlugin.openDatabase({ name: mbtilePath, location: 'default' },
          (dbconn) => {
              console.log("[MapPage.initializeMbtiles] window.sqlitePlugin.openDatabase success");
              var layer = new L.TileLayer.MBTiles('', {
                  maxZoom: this.maxZoom,
                  minZoom: this.minZoom,
                  scheme: 'tms',
                  attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
              }, dbconn);
              var key = layerName;
              layer.addTo(this.map)

          }, (error) => {
              console.log("[initializeMbtiles] Failed to open mbtiles DB");
              console.log(error);
          });
  }

  initGeolocation(locateMap: boolean) {
	  console.log("here a b c");
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
	
		  }	else {
			  this.geoFinding = true;
			  this.initGeolocation(locateMap);
		  }
		  this.geolocationEnabled = false;
		console.log("GeoPositioning Turned Off");
      }
    });
  }

  mapLocate() {
          this.map.setView(this.currentCoords, this.maxZoom, this.minZoom);
  }
  
  gpsLocate() {
	console.log("gpsLocate clicked");
	if(!this.geolocationEnabled) {
		if(this.platform.is('android')) { //Get Android Permissions
			this.androidPermissions.checkPermission(this.androidPermissions.PERMISSION.ACCESS_FINE_LOCATION).then((result) => {
			console.log('Has permission?',result.hasPermission);
			if(result.hasPermission == false) {
				this.androidPermissions.requestPermission(this.androidPermissions.PERMISSION.ACCESS_FINE_LOCATION)
			  .then((success) => this.initGeolocation(true))
			  .catch((err) => console.log('Unable to Request Location Permissions'));
			} else {
				this.initGeolocation(true);
			}
			}).catch((err) => {
			  this.androidPermissions.requestPermission(this.androidPermissions.PERMISSION.ACCESS_FINE_LOCATION)
			  .then((success) => this.initGeolocation(true))
			  .catch((err) => console.log('Unable to Request Location Permissions'));
			});
		} else {
			this.initGeolocation(true);
		}
	} else {
		this.initGeolocation(true);
	}
   }
   
  addRoadData( feature, layer ){ 
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
	//	this.roadLayer.addLayer( layer );
	}
	
  addMappedStreamData( feature, layer ){ 
		if (feature.properties && feature.properties.NAME) {
			let template = "<b class='popupTitle'>" + feature.properties.NAME + "</b><br><i class='popupCoords'>" + feature.properties.FEATTYPE + "</i>";
			layer.bindPopup(template);
		}
	//	this.mappedStreamLayer.addLayer( layer ); 
	}
		
  addWaterHoleData(feature, layer) {
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
	//	this.waterFeatureLayer.addLayer( layer );
	}
	
  addLocationsData( feature, layer ){ 
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
	//	layer.on('click', this.onMapClick());
	//	this.locationsLayer.addLayer( layer );
	}

		
	 onMapClick(e) {
		console.log(e);
		console.log("previous listener" + this.previousListener);

		if(e.latlng && this.previousListener && this.previousListener[0] == e.latlng.lat && this.previousListener[1] == e.latlng.lng) {
			console.log("equal");
			if(e.latlng && this.placeMarker) {
				this.previousListener[0] = e.latlng.lat;
				this.previousListener[1] = e.latlng.lng;
				console.log("placeMarkerIn: " + this.placeMarker);
				this.pinMarker.setLatLng(e.latlng);
				e.layer.closePopup();
			} else {
				console.log("placeMarkerIn: " + this.placeMarker);
			}
		} else {
			console.log("not equal");
			console.log("previous listener" + this.previousListener);
			console.log("e.latlng: " + e.latlng);
			if(e.latlng) {
				this.previousListener[0] = e.latlng.lat;
				this.previousListener[1] = e.latlng.lng;
			}
		}
	}


 ionViewDidLoad() {
		var bounds = L.latLngBounds(this.southWest, this.northEast);
	  
		this.map = new L.map('modalmap', { preferCanvas: true} ).setView(this.currentCoords, this.currentZoom);
		
		this.map.setMaxBounds(bounds);
		
		this.roadLayer = new L.layerGroup(); 
		this.mappedStreamLayer = new L.layerGroup();
		this.waterFeatureLayer = new L.layerGroup();
		this.locationsLayer = new L.layerGroup();

		var roadStyle = {
			"color": "#F7AF99",
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
		
		let getRoads = this.http.get('assets/resources/AU_GA250k_Roads_Kimberley_Cleaned.json').map(response => response.json());
		let getMappedStream = this.http.get('assets/resources/AHGFMappedStream_Kimberley_Major+Named+Perennial.json').map(response => response.json());
		let getWaterHoles = this.http.get('assets/resources/Water_Features.json').map(response => response.json());
		let getLocations = this.http.get('assets/resources/Location_Features.json').map(response => response.json());
		let getStaticLocations = this.http.get('assets/resources/Static_Locations.json').map(response => response.json());
	
		forkJoin([getRoads, getMappedStream, getWaterHoles, getLocations, getStaticLocations]).subscribe(results => {
			let roadData = results[0];
			let mappedStreamData = results[1];
			let getWaterHolesData = results[2];
			let getLocationsData = results[3];
			let getStaticLocations = results[4];
			
			let roadGeoJSON = new L.geoJSON(roadData, {
				style: roadStyle,
				onEachFeature: this.addRoadData, 
			}).addTo(this.roadLayer);
			
			let mappedStreamGeoJSON = new L.geoJSON(mappedStreamData, {
				style: mappedStreamStyle,
				onEachFeature: this.addMappedStreamData,
			}).addTo(this.mappedStreamLayer);
			
			let waterFeatureGeoJSON = new L.geoJSON(getWaterHolesData, {
				pointToLayer: function(feature, latlng) {
					return L.circleMarker(latlng, waterHoleStyle);
				},
			//	style: mappedStreamStyle,
				onEachFeature: this.addWaterHoleData,
			}).on('click', L.bind(this.onMapClick, this)).addTo(this.waterFeatureLayer);
			
			let locationsGeoJSON = new L.geoJSON(getLocationsData, {
				pointToLayer: function(feature, latlng) {
					return L.circleMarker(latlng, locationsStyle);
				},
				//style: locationsStyle,
				onEachFeature: this.addLocationsData,
			}).on('click', L.bind(this.onMapClick, this)).addTo(this.locationsLayer);
			
			let staticLocationsGeoJSON = new L.geoJSON(getStaticLocations, {
				pointToLayer: function(feature, latlng) {
					return L.circleMarker(latlng, locationsStyle);
				},
				//style: locationsStyle,
				onEachFeature: this.addLocationsData,
			}).on('click', L.bind(this.onMapClick, this)).addTo(this.map);
				
			
			let layerControl = {
				"Roads & Tracks": this.roadLayer,
				"Water": this.mappedStreamLayer,
				"Water Features": this.waterFeatureLayer,
				"Location Features": this.locationsLayer
			};
			
			L.control.layers(null, layerControl, {collapsed: true }).addTo(this.map);
			this.initMap();
		});	

		this.geolocationEnabled = false;

      if (this.platform.is('android')) { //Get Android Permissions
          this.androidPermissions.requestPermission(this.androidPermissions.PERMISSION.ACCESS_FINE_LOCATION)
              .then(success => this.initGeolocation(true),
              err => console.log('Unable to Request Location Permissions')
              );
      }
      else {
          this.initGeolocation(true);
      }

      const toast = this.toastCtrl.create({
        message: 'Tap the pin to plot your coordinates',
        duration: 2500,
        position: 'middle'
      });
      toast.present();
	  
	setTimeout(() => {
		this.initGeolocation(true);
	}, 	2000);

  }

  /*ionViewDidLeave() {
    if(this.map) {
      if(this.geolocationWatch){
        this.geolocationWatch.unsubscribe();
      }
      if(this.map) {
        this.map.off();
        this.map.remove();
      }
    }
	this.viewCtrl.dismiss(this.selectedCoords);
  }*/
  
  getGPS() {
    this.placeMarker = true;
    var newMarker = L.AwesomeMarkers.icon({
        markerColor: 'blue'
    });
    this.pinMarker = L.marker(this.map.getCenter(), {icon: newMarker});
    this.pinMarker.addTo(this.map);

    this.map.on('click', (e) => { //Map Click
      console.log(e);
      if(e && e.latlng) {
        this.pinMarker.setLatLng(e.latlng);
      }
    });
  }

  confirmPlace() {
    console.log(this.pinMarker.getLatLng());
    var coords = this.pinMarker.getLatLng();
    this.selectedCoords = [coords.lat, coords.lng];
    this.viewCtrl.dismiss(this.selectedCoords);
  }

  cancelPlace() {
    this.placeMarker = false;
    if(this.pinMarker) {
      this.map.removeLayer(this.pinMarker); //Remove Marker
    }
  }

  dismiss() {
    if(this.map) {
      if(this.geolocationWatch){
        this.geolocationWatch.unsubscribe(); //Stop watching location
      }
      if(this.map) {
        this.map.off();
        this.map.remove();
      }
    }
    this.viewCtrl.dismiss(this.selectedCoords);
  }
}