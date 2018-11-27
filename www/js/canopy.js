/********** Setup ********************/
const mapDiv = document.getElementById("mapDiv");
var addIdentification = null;
var pointsToDo = [];
var user = null;
/* Map setup */
var map = L.map('map', {zoomControl: false, dragging: false});
L.control.scale().addTo(map);

/********* Database setup *************/
db.init();

const allPointYears = getAllPointYears(getAllPoints(db), getAllYears(db));

/********* User Handling *************/

// Bind to events
netlifyIdentity.on('init', user => console.log('init', user));

netlifyIdentity.on('login', function(){
  netlifyIdentity.close();
  // Get the current user:
  netUser = netlifyIdentity.currentUser();
  user    = netUser.id;
  
  // DLogin into the db
  db.logIn(netUser.email, netUser.id).catch(function (err) {
    if(err.name === 'unauthorized' || err.name === 'forbidden') {
       db.signUp(netUser.email, netUser.id).then(function(x){
         db.logIn(netUser.email, netUser.id);
       });
    }
  });
  
  app(user);
});

netlifyIdentity.on('logout', function() {
  appOff();
  netlifyIdentity.close();
  db.logout(); // logout current db user
  console.log('Logged out');
});
netlifyIdentity.on('error', err => console.error('Error', err));
netlifyIdentity.on('open', () => console.log('Widget opened'));
netlifyIdentity.on('close', () => console.log('Widget closed'));

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
function getUserIdentifications(userID){
  return db.allDocs({
    include_docs : true,
    startkey: 'id_' + userID + '_p',
    endkey: 'id_' + userID + '_p\ufff0'
  }).then(function(docs){
    return docs.rows.map(function(x){ return x.id.substring(x.id.length - 12, x.id.length);});
  });
}

/******* Mapping functionality *******/
function getPointsToDo(userID, allPointYears){
  return getUserIdentifications(userID).then(function(ids){
    return allPointYears.then(function(x) { 
      return shuffle(setdiff(x, ids));
    });
  });
}


function showMap(latlon, wms) {
  map.setView(latlon, 18);
  // TODO: swap out icon 
  var marker = L.marker(latlon).addTo(map);
  wms.addTo(map);
  //L.control.attribution({prefix: false}).addTo(map2);
}

function buildMap(sample, year){
  var WMS = null;
  //var wms;
  db.get(year).then(function(doc){
    return L.tileLayer.wms(doc.wms_server, {
        version: doc.version,
        layers: doc.layer,
        format: 'image/png',
        crs: L.CRS.EPSG4326,
        attribution: "OrthoImagery from <a href='http://data.nconemap.com/geoportal/'>NC OneMap</a>"
    });
  }).then(function(wms){
    WMS = wms;
    // get latlon of sampleID
    return db.get(sample).then(function(doc){ return doc.latlon; });
  }).then(function(latlon){
    showMap(latlon, WMS);
  });
}

function mapView(userID, pointsToDo){
  
  pointsToDo.then(function(x){
    
    if(x.length === 0){
      alert("Congrats. You've completed all your identifications!");
    } else {
      var s = x[0].substring(0, 6);
      var y = x[0].substring(7, 12);
      
      checkToDo(s, y).then(function(doIt){
        if(doIt){
          buildMap(s, y);
          addIdentification = makeIDfun(userID, s, y);
        } else {
          mapView(userID, pointsToDo);
        }
      });
      
      x.shift(); // remove the sample just done from the ToDo array
    }
  });
}

function checkToDo(sample, year){
  /* 
    Check whether this sample/year has been ID'ed before. 
   * if yes, return true with probability .1; false else
   * if no, return true 
  */
  return db.get(sample).then(function(doc){
    if (typeof doc.identifications[year] === "undefined") {
      return true;
    } else if(doc.identifications[year] > 0 & Math.random() < 0.1) {
      return true;
    } else {
      return false;
    }
  });
}

function makeIDfun(userID, point, year){
  return function addIDtoDb(ID){
    
    // increment number of identifications for sample
    db.get(point).then(function(doc){
      
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
      
      db.put(doc);
      
    }).catch(function(err){
      console.log(err);
    });
    
    // add sample/year identification
    db.put({
       "_id" : "id" + "_" + userID + "_" + point + "_" + year,
      "value" : ID
    }).then(function(doc){
      console.log(userID + " identified " + point + " as " + ID + " for " + year);
      mapView(userID, pointsToDo);
    });
  };
}


function app(userID){
  mapDiv.style.display = "block";
  pointsToDo = getPointsToDo(userID, allPointYears);
  mapView(userID, pointsToDo);
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

