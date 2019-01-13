/********** Setup ********************/
const mapDiv = document.getElementById("mapDiv");
const loadingDiv = document.getElementById("loadingDiv");
//const mapDiv = document.getElementsByClassName("content-maparea");
//console.log(mapDiv);
var addIdentification = null;
var pointsToDo = [];
var user = null;
var userDb = null;
var zoom = 18;
var preloaded = false;
var preloadLoaded = 0;
var preloadMap = 0;
var preloadCount = 30; // number of points to preload maps for 
/* Map setup */
var map = L.map('map', {zoomControl: false, dragging: false, attributionControl: false});
//var map_load0 = L.map('map_load0', {zoomControl: false, dragging: false, attributionControl: false});
//var map_load1 = L.map('map_load1', {zoomControl: false, dragging: false, attributionControl: false});
L.control.scale({position: 'topleft', updateWhenIdle: 'false'}).addTo(map);


/********* Setup Map Preload Div *************/

var map_load = [];

for (var i = 0; i <= preloadCount; i++) {
	//console.log(mapWidth,mapHeight);
	var newElem = document.createElement('div');
	newElem.setAttribute("id", "map_load"+i);
	newElem.setAttribute("class", "map-preload");
	document.getElementById('preloadDiv').appendChild(newElem);
    map_load[i] = L.map('map_load'+i, {zoomControl: false, dragging: false, attributionControl: false});
}

window.onload = function(){
	setTimeout(function(){ mapHeight(); }, 1000);
};

window.addEventListener("resize", onResize);
function onResize() {
	mapHeight();
}

function mapHeight() {
	var mapWidth = document.getElementById("map").offsetWidth;
	var mapHeight = document.getElementById("map").offsetHeight;
	//console.log(mapWidth,mapHeight);
	for (var i = 0; i < preloadCount; i++) {
		document.getElementById("map_load"+i).setAttribute("style","width:"+mapWidth+"px; height:"+mapHeight+"px");
	}
}

/********* Database/Study setup *************/
//studyDb.init();

const study_settings= studyDb.get("study_settings");

var study_id = null; 
study_settings.then(doc => {study_id = doc.study_id;});

var overlap_prob = null;
study_settings.
then(doc => {overlap_prob = doc.overlap_probability}).
catch(err => {overlap_prob = 1; console.log("overlap_prob set to 1");});

const allTimes      = getAllTimes(studyDb);
const allPointTimes = getAllPointTimes(getAllPoints(studyDb), allTimes);

/********* User Handling *************/

// Bind to events
netlifyIdentity.on('init', user => console.log('init', user));

netlifyIdentity.on('login', function(){
	loadingDiv.style.display = "block";
  netlifyIdentity.close();
  // Get the current user:
  netUser = netlifyIdentity.currentUser();
  
  // Login into the studyDb 
  studyDb.logIn(netUser.email, netUser.id).
  then(function(){
    userDb = createUserDb(netUser.email, netUser.id);
    // Launch the application
    app(userDb);

  }).
  catch(function (err) {
    if(err.name === 'unauthorized' || err.name === 'forbidden') {
       studyDb.signUp(netUser.email, netUser.id).then(function(x){
         studyDb.logIn(netUser.email, netUser.id);
       }).
       then(function(){
         userDb = createUserDb(netUser.email, netUser.id);
         // Launch the application
         app(userDb);
       });
     }
  });
});

function createUserDb(email, id){
  // Login into the userDb 
      return new PouchDB(DBHOST + 'userdb-' + _convertToHex(email),{
        auth: {
            username: email,
            password: id
        },
        skip_setup: true
      });
}   

netlifyIdentity.on('logout', function() {
  appOff();
  netlifyIdentity.close();
  userDb.logout();
  studyDb.logout(); // logout current db user
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

/********* Session Setup *************/
var currentIdNum = null;

/******** Find all available sample/years  ****************/
function getAllPoints(db){
  return db.allDocs({
    startkey: 'p' ,
    endkey:   'p\ufff0'
  }).then(function(docs){
    return docs.rows;
  });
}

function getAllTimes(db){
  return db.get("study_settings").then(function(doc){
    return doc.times;
  });
}

function getTime(time_id){
  
  function getElement(e){ return e._id == time_id}
  
  return allTimes.
  then(function(a){
    return a.find(getElement);
  });  
}

function getAllPointTimes(samples, times){
  
  return Promise.all([samples, times]).then(function(x){
    var out = [];
    
    for(var i = 0; i < x[0].length; i++){
      for(var j = 0; j < x[1].length; j++){
        out.push(x[0][i].id + '_' + x[1][j]._id);
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

function getStartingIDnum(userDB){
  getUserIdentifications(userDB).
  then(function(docs){ currentIdNum =  docs.length + 1});
}


/******* Setup Click Events *******/

var mapActions = Array.from(document.getElementsByClassName("btn-action"));

setupMapActions(mapActions);

function setupMapActions(mapActions) {	
	mapActions.forEach(mapAction => {
		mapAction.onclick = function () {
			//console.log("click");
			if (!(mapAction.classList.contains('disabled'))) {
				addIdentification(mapAction.value);
				mapActions.forEach(mapAction => {
					mapAction.classList.add('disabled');
				});
			}
		}
	});
}
/******* Mapping functionality *******/

// Find the point-times that a user can do 
// i.e. the set difference getUserIdentifications and allPointTimes
// returns a randomly shuffled (promise) array of point-years; e.g
// [p######-y####, p######-y####, ...]
function getPointsToDo(userDB, allPointTimes){
  return getUserIdentifications(userDB).then(function(ids){
    return allPointTimes.then(function(x) { 
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
	wms.addTo(mapName);
	L.control.attribution({position: 'topright'}).addTo(mapName);
	//wms.on("load",function() {
		//console.log('load2-works');
	//});

}


// returns the leaflet tilelayer for a time doc
function appTileLayer(doc){
	//console.log(doc);
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
  return studyDb.get(point).then(function(doc){
	  //console.log(doc.latlon);
  	return doc.latlon;
  });
}


function buildMap(point, time, mapName){
	
	console.log("buildMap", point, time);
	//console.log(mapName);
	var WMS = null;
	
	//studyDb.get(year)
	getTime(time).then(function(doc){
    	// Set up the wms tilelayer
		return appTileLayer(doc) ;
	}).then(function(wms){
		WMS = wms;
		// get latlon of point
    	return getLatLon(point);
	}).then(function(latlon){
		WMS.on("load",function() {
			console.log('loaded',point,time);
			//console.log(preloadLoaded,preloadCount);
			if (preloadLoaded >= preloadCount) {
				preloaded = true;
				mapActions.forEach(mapAction => {
					mapAction.classList.remove('disabled');
				});
				loadingDiv.style.display = "none";
			}
			preloadLoaded++
		});
		showMap(latlon, WMS, mapName);
	});
}


function mapView(userDB, pointsToDo){
	pointsToDo.then(function(x){

		if(x.length === 0){
		  alert("Congrats. You've completed all your identifications!");
		  appOff();
		} else {
		  var s = x[0].substring(0, 7);
		  var y = x[0].substring(8, 13);

		//where to find image tiles map .leaflet-tile-container	  
		checkToDo(s, y).then(function(doIt){
			if(doIt){
				//remove layers on main map
				map.eachLayer(function (layer) {
					map.removeLayer(layer);
				});
				var m = map;
				buildMap(s, y, m);
				addIdentification = makeIDfun(userDB, s, y);
				
			} else {
			  mapView(userDB, pointsToDo);
			}
		}).then(function(){
			if (preloaded === false) {
				//On first load, preload all maps up to a certain point so images stored in browser
				for (i = 0; i <= preloadCount; i++) { 
					//if (isEven(i)) mapName = map_load+i
					//else  mapName = map_load+i
					mapName = map_load[i];
					pointsPreload(x[i],mapName);
				 }
			 } else {
				//if everything's been preloaded then load the single next map after the shift happened
				if (x.length > preloadCount) {
				  pointsPreload(x[preloadCount],map_load[preloadMap]);
				  preloadMap++;
				  if (preloadMap > preloadCount) preloadMap = 0;
			  }
			}
		});
		x.shift(); // remove the sample just done from the ToDo array
	} //end else x.length
  }); //end pointsToDo.then
}

function isEven(value) {
	if (value%2 === 0)	{
	  return true;
	}	else {
	  return false;
	}
}

function pointsPreload(point,mapName){
	//console.log("pointsPreload", point);
	var s = point.substring(0, 7);
	var y = point.substring(8, 13);
	buildMap(s, y, mapName);

}

/*
function preloadImage(url) {
	//console.log('preloadImage', url);
	var image = new Image();
	image.src = url;
	var prependElement = document.getElementById("image_preload");
	//console.log(image);
	//console.log(prependElement);
	prependElement.appendChild(image);
}
*/

function checkToDo(sample, year){
  /* 
    Check whether this sample/year has been ID'ed before. 
   * if yes, return true with probability .1; false else
   * if no, return true 
  */
  return studyDb.get(sample).then(function(doc){
    if (typeof doc.identifications[year] === "undefined") {
      return true;
    } else if(doc.identifications[year] > 0 & Math.random() <= overlap_prob) {
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
    console.log(err);
    if(err.error === 'not_found'){
      userDB.put({
        "_id"       : "stats",
        "total_ids" : 1
      });
    }
  });
}

function makeIDfun(userDB, point, year){
	//console.log("makeIDfun",point,year);
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
       "_id" : "id" + zeroFill(currentIdNum, 8) + "_" + point + "_" + year,
      "value" : ID,
      "study_id" : study_id,
      "timestamp": new Date()
    }).then(function(doc){
      currentIdNum++;
      //console.log(netUser.email + " identified " + point + " as " + ID + " for " + year);
      mapView(userDB, pointsToDo);
    });
    
    // update user stats
    updateUserStats(userDB);
  };
}

function app(userDB){
	mapDiv.style.display = "block";
	pointsToDo = getPointsToDo(userDB, allPointTimes);
	getStartingIDnum(userDB);
	mapView(userDB, pointsToDo);	
	var elems = document.querySelectorAll(".show");
	[].forEach.call(elems, function(el) {
		el.classList.remove("show");
	});
}

function appOff(){
	mapDiv.style.display = "none";
	var elemsShow = document.querySelectorAll(".show");
	[].forEach.call(elemsShow, function(el) {
		el.classList.remove("show");
	});
	var elems = document.querySelectorAll(".content-about");
	console.log(elems);
	[].forEach.call(elems, function(el) {
		el.classList.add("show");
	});
}
