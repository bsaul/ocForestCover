/********** Setup ********************/
const mapDiv = document.getElementById("mapDiv");
var addIdentification = null;
var pointsToDo = [];
var user = null;
var zoom = 18;
var preloaded = false;
var preloadCount = 3; // number of points to preload maps for 
/* Map setup */
var map = L.map('map', {zoomControl: false, dragging: false, attributionControl: false});
var map_load = L.map('map_load', {zoomControl: false, dragging: false, attributionControl: false});
L.control.scale({position: 'topleft', updateWhenIdle: 'false'}).addTo(map);

/********* Database setup *************/
studyDb.init();

const allPointYears = getAllPointYears(getAllPoints(studyDb), getAllYears(studyDb));

/********* User Handling *************/

// Bind to events
netlifyIdentity.on('init', user => console.log('init', user));

netlifyIdentity.on('login', function(){
  netlifyIdentity.close();
  // Get the current user:
  netUser = netlifyIdentity.currentUser();
  
  // Login into the studyDb 
  studyDb.logIn(netUser.email, netUser.id).catch(function (err) {
    if(err.name === 'unauthorized' || err.name === 'forbidden') {
       studyDb.signUp(netUser.email, netUser.id).then(function(x){
         studyDb.logIn(netUser.email, netUser.id);
       });
    }
  });
  
  // Login into the userDb 
  userDb = new PouchDB(DBHOST + 'userdb-' + _convertToHex(netUser.email),{
    auth: {
        username: netUser.email,
        password: netUser.id
    },
    skip_setup: true
  });
 
  // Launch the application
  app(userDb);
});

netlifyIdentity.on('logout', function() {
  appOff();
  netlifyIdentity.close();
  studyDb.logout(); // logout current db user
  userDb.logout();
  console.log('Logged out');
});

netlifyIdentity.on('error', err => console.error('Error', err));
netlifyIdentity.on('open', () => console.log('Widget opened'));
netlifyIdentity.on('close', () => console.log('Widget closed'));

function _convertToHex(str) {
    var hex = '';
    for (var i = 0; i < str.length; i++) {
        hex += '' + str.charCodeAt(i).toString(16);
    }
    return hex;
}



/******** Find all available sample/years  ****************/
function getAllPoints(db){
  return db.allDocs({
    startkey: 'p' ,
    endkey:   'p\ufff0'
  }).then(function(docs){
    return docs.rows;
  });
}

function getAllYears(db){
  return db.allDocs({
    startkey: 'y' ,
    endkey:   'y\ufff0'
  }).then(function(docs){
    return docs.rows;
  });
}

function getAllPointYears(samples, years){
  
  return Promise.all([samples, years]).then(function(x){
    var out = [];
    
    for(var i = 0; i < x[0].length; i++){
      for(var j = 0; j < x[1].length; j++){
        out.push(x[0][i].id + '_' + x[1][j].id);
      }
    }
    return out;
  });
}

/******* Selection of samples to ID for user  *******/

// Returns the identifications already recorded in userDB
function getUserIdentifications(userDB){
  return userDB.allDocs({
    include_docs : true,
    startkey: 'id',
    endkey: 'id\ufff0'
  }).then(function(docs){
    return docs.rows;
  });
}

/******* Mapping functionality *******/

// Find the point-times that a user can do 
// i.e. the set difference getUserIdentifications and allPointYears
// returns a randomly shuffled (promise) array of point-years; e.g
// [p######-y####, p######-y####, ...]
function getPointsToDo(userDB, allPointYears){
  return getUserIdentifications(userDB).then(function(ids){
    return allPointYears.then(function(x) { 
      return shuffle(setdiff(x, ids));
    });
  });
}


function showMap(latlon, wms, mapName) {
  //console.log("showMap");
  mapName.setView(latlon, zoom);
  var myIcon = L.icon({
	iconUrl: 'mapicon.png',
	iconSize: [20, 20],
	iconAnchor: [10, 10],
  });
  var marker = L.marker(latlon, {icon: myIcon}).addTo(mapName);
  //console.log(map);
  //console.log(map._panes.tilePane);
  wms.addTo(mapName);
  L.control.attribution({position: 'topright'}).addTo(mapName);
}


// returns the leaflet tilelayer for a time doc
function appTileLayer(doc){
  return L.tileLayer.wms(doc.wms_server, {
        version: doc.version,
        layers: doc.layer,
        format: 'image/png',
        crs: L.CRS.EPSG4326,
        attribution: "OrthoImagery from <a href='http://data.nconemap.com/geoportal/'>NC OneMap</a>"
    });
}

// returns latlon (promise) for a point
function getLatLon(point){
  return studyDb.get(point).then(function(doc){ return doc.latlon; });
}


function buildMap(point, year, mapName){

	console.log("buildMap",point,year);
	var WMS = null;
	studyDb.get(year).then(function(doc){
    // Set up the wms tilelayer
    return appTileLayer(doc) ;
	}).then(function(wms){
		//console.log(wms);
		//console.log(doc);
		WMS = wms;
		WMS.on("load",function() {
			console.log('load',point,year);
			var imgList = document.getElementById("map_load").getElementsByClassName("leaflet-tile");
			//console.log(imgList);
			//console.log(document.getElementById("map_load"));
			//console.log(imgList.length);
			for (var k in imgList) {
				//console.log('for',k);
				//console.log(imgList);
				//console.log(imgList[k].src);
				if (imgList[k].src) preloadImage(imgList[k].src);
			}
			
		});

		// get latlon of point
    return getLatLon(point);
	}).then(function(latlon){
		showMap(latlon, WMS, mapName);
	});
}


function mapView(userDB, pointsToDo){
	//console.log("mapView");
	pointsToDo.then(function(x){
		//console.log("pointsToDo");
		//console.log(x);
		//console.log(x.length);

		if(x.length === 0){
		  alert("Congrats. You've completed all your identifications!");
		} else {
		  var s = x[0].substring(0, 7);
		  var y = x[0].substring(8, 13);
		  //console.log("pointsToDo",s,y);
		  //console.log("next",x[1].substring(0, 7),x[1].substring(8, 13));

		//where to find image tiles map .leaflet-tile-container	  
		checkToDo(s, y).then(function(doIt){
			if(doIt){
				//console.log("if doIT");
				var m = map;
				buildMap(s, y, m);
				addIdentification = makeIDfun(userDB, s, y);

				console.log(preloaded,preloadCount);
				if (preloaded == false) {
					console.log("preloaded false");
					//On first load, preload all maps up to a certain point so images stored in browser
					for (i = 1; i <= preloadCount; i++) { 
						pointsPreload(x[i]);
					 }
				 } else {
					console.log("preloaded true");
					//if everything's been preloaded then load the single next map after the shift happened
					if (x.length > preloadCount) {
					  //console.log(x.length);
					  pointsPreload(x[preloadCount]);
					  //console.log("load next");
				  }
				}
				preloaded = true;
				
			} else {
			  //console.log("else doIT");
			  mapView(userDB, pointsToDo);
			}
		}); // end checkToDos
		x.shift(); // remove the sample just done from the ToDo array
	} //end else x.length
  }); //end pointsToDo.then
}


function pointsPreload(point){
	console.log("pointsPreload", point);
	var s = point.substring(0, 7);
	var y = point.substring(8, 13);

	buildMap(s, y, map_load);

}

function preloadImage(url) {
	//console.log('preloadImage', url);
	var image = new Image();
	image.src = url;
	var prependElement = document.getElementById("image_preload");
	//console.log(image);
	//console.log(prependElement);
	prependElement.appendChild(image);
}


function checkToDo(sample, year){
  /* 
    Check whether this sample/year has been ID'ed before. 
   * if yes, return true with probability .1; false else
   * if no, return true 
  */
  return studyDb.get(sample).then(function(doc){
    if (typeof doc.identifications[year] === "undefined") {
      return true;
    } else if(doc.identifications[year] > 0 & Math.random() < 0.1) {
      return true;
    } else {
      return false;
    }
  });
}

function updateUserStats(userDB){
  userDB.get('stats').then(function(doc){
    doc.total_ids = doc.total_ids + 1;
    userDB.put(doc);
  }).catch(function(err){
    if(err.reason == 'missing'){
      userDB.put({
        "_id" : "stats",
        "total_ids" : 1
      });
    }
  });
}

function makeIDfun(userDB, point, year){
	console.log("makeIDfun",point,year);
  return function addIDtoDb(ID){
    
    // increment number of identifications for sample
    studyDb.get(point).then(function(doc){
      
      if (typeof doc.total_ids === "undefined") {
        doc.total_ids = 1;
      } else {
        doc.total_ids = doc.total_ids + 1;
      }
      
      if (typeof doc.identifications[year] === "undefined") {
        doc.identifications[year] = 1;
      } else {
        doc.identifications[year] = doc.identifications[year] + 1;
      }
      
      studyDb.put(doc);
      
    }).catch(function(err){
      console.log(err);
    });
    
    // add sample/year identification
    userDB.put({
      // TODO add a zerofill integer to this _id
       "_id" : "id_" + point + "_" + year,
      "value" : ID,
      "timestamp": new Date()
    }).then(function(doc){
      console.log(netUser.email + " identified " + point + " as " + ID + " for " + year);
      mapView(userDB, pointsToDo);
    });
    
    // update user stats
    updateUserStats(userDB);
  };
}


function app(userDB){
  mapDiv.style.display = "block";
  pointsToDo = getPointsToDo(userDB, allPointYears);
  mapView(userDB, pointsToDo);
}

function appOff(){
  mapDiv.style.display = "none";
}


/*
function revertImage() { 
  --i;
  map.setView(latlon, 18);
  var marker = L.marker(latlon).addTo(map);
}
*/
/*
function advanceImage() { 
  ++i;
  map.setView(latlon, 18);
  var marker = L.marker(latlon).addTo(map);
}
*/

