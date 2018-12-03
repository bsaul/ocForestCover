/********** Setup ********************/
const mapDiv = document.getElementById("mapDiv");
var addIdentification = null;
var pointsToDo = [];
var user = null;
var zoom = 18;
var preloaded = false;
var preloadCount = 1; // number of points to preload maps for 
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

// Find sample/years already completed by userID
function getUserIdentifications(userDB){
  return userDB.allDocs({
    include_docs : true,
    startkey: 'id',
    endkey: 'id\ufff0'
  }).then(function(docs){
    return docs.rows;
    //return docs.rows.map(function(x){ return x.id.substring(x.id.length - 12, x.id.length);});
  });
}

/******* Mapping functionality *******/
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

function buildMap(sample, year, mapName){
	console.log("buildMap",sample,year);
	var WMS = null;
	//var wms;
	studyDb.get(year).then(function(doc){
		return L.tileLayer.wms(doc.wms_server, {
			version: doc.version,
			layers: doc.layer,
			format: 'image/png',
			crs: L.CRS.EPSG4326,
			attribution: "OrthoImagery from <a href='http://data.nconemap.com/geoportal/'>NC OneMap</a>"
		});
	}).then(function(wms){
		console.log(wms);
		//console.log(doc);
		WMS = wms;
		WMS.on("loading",function() { console.log("start loading") });

		// get latlon of sampleID
		return studyDb.get(sample).then(function(doc){ return doc.latlon; });
	}).then(function(latlon){
		showMap(latlon, WMS, mapName);
	});
}


function mapView(userDB, pointsToDo){
  //console.log("mapView");

	pointsToDo.then(function(x){
		//console.log("pointsToDo");
		console.log(x);
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

				//console.log(preloaded);
				if (preloaded == false) {
					//NEEDS WORK
					//On first load, preload all maps up to a certain point so images stored in browser
					for (i = 1; i <= preloadCount; i++) { 
						pointsPreload(x[i]);
					 }
				 } else {
					//NEEDS WORK
					//if everything's been preloaded then load the single next map after the shift happened
					if (x.length > preloadCount) {
					  //console.log(x.length);
					  //pointsPreload(x[preloadCount]);
					  //console.log("load next");
				  }
				}
				preloaded = true;
				
			} else {
			  console.log("else doIT");
			  mapView(userDB, pointsToDo);
			}
		}); // end checkToDos
		x.shift(); // remove the sample just done from the ToDo array
	} //end else x.length
  }); //end pointsToDo.then
}

/*map.whenReady(function (e) {
	console.log('ready');
	console.log(document.getElementById("map_load").getElementsByTagName("img"));
});

*/
/*
map.whenReady(function () {
	console.log('ready0');
});
map_load.whenReady(function (e) {
	console.log(e);
	console.log('ready');
	var imgList = document.getElementById("map_load").getElementsByClassName("leaflet-tile");
	console.log(imgList.length);
});
*/
/*map.on("load",function() {
	console.log('loaded0');
});

map_load.on("load",function() {
	console.log("loaded") 
	console.log(document.getElementById("map_load"));
	var imgList = document.getElementById("map_load").getElementsByClassName("leaflet-tile");
	console.log(imgList.length);
});

console.log(typeof map_load);
map_load.on('load', function(ev) {
    console.log(ev); //
});
*/
document.getElementById("map_load")

function pointsPreload(point){
	console.log("pointsPreload", point);
	var s = point.substring(0, 7);
	var y = point.substring(8, 13);

	buildMap(s, y, map_load);

	//console.log(map.getPanes());
	//console.log(map.tileload());
	//console.log(map.tileloadstart());
	//map_load.on("load",function(e) {
		//map.whenReady(function (e) {
			//map_load.whenReady(function (e) {
				//console.log(e);
				//document.getElementById("map_load").innerHTML += point;
				//var imgList = document.getElementById("map_load").getElementsByTagName("img");
				var imgList = document.getElementById("map_load").getElementsByClassName("leaflet-tile");
				console.log(imgList);
				console.log(document.getElementById("map_load"));
				console.log(imgList.length);
				for (var k in imgList) {
					//console.log('for',k);
					//console.log(imgList);
					//console.log(imgList[k].src);
					if (imgList[k].src) preloadImage(imgList[k].src);
				}
			//});
		//});
	//});
}

function preloadImage(url) {
	console.log('preloadImage', url);
	new Image().src = url;
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

