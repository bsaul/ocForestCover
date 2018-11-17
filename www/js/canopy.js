/********** Setup ********************/
var userList = [];
var sessionUser = "";
const userDiv = document.getElementById("userDiv");
const mapDiv  = document.getElementById("mapDiv");
var userExistingIDs = [];
var userSamples = [];
var addIdentification;
var samplesToDo =[];

/* Map setup */
var map = L.map('map', {zoomControl: false, dragging: false});
L.control.scale().addTo(map);

/********* Database setup *************/
const db = new PouchDB('http://localhost:5984/test_canopy');


/* initialization for testing purposes */
db.info().then(function (details) {
    if (details.doc_count === 0) {
      // initialize users
      for (k = 0; k < users.length; k++) {
        db.put(users[k]);
      }

      // initialize sample points
      for (k = 0; k < points.length; k++) {
        db.put(points[k]);
      }
      
      // initialize years
      for (k = 0; k < idyrs.length; k++) {
        db.put(idyrs[k]);
      }
      
      // initialize identifications
      for (k = 0; k < identifications.length; k++) {
        db.put(identifications[k]);
      }
  }
  else return details;
});


/******** Find all available sample/years  ****************/
allSamples = function(){
  return db.allDocs({
    startkey: 's' ,
    endkey: 's\ufff0'
  }).then(function(docs){
    return(docs.rows);
  });
};

allYears = function(){
  return db.allDocs({
    startkey: 'y' ,
    endkey: 'y\ufff0'
  }).then(function(docs){
    return(docs.rows);
  });
};

allSampleYears = function(){
  var samples = allSamples();
  var years   = allYears();
  
  return Promise.all([samples, years]).then(function(x){
    var out = [];
    
    for(var i = 0; i < x[0].length; i++){
      for(var j = 0; j < x[1].length; j++){
        out.push(x[0][i].id + '_' + x[1][j].id);
      }
    }
    return out;
  });

};

/******** Choose user ****************/

db.allDocs({
  include_docs: true,
  startkey: 'u',
  endkey: 'u\ufff0'
}).then(function(result){
  //var userList = [];
  for(var i = 0; i < result.rows.length; i++){
    //console.log(result.rows[i]);
      userList[i] = result.rows[i].doc;
  }
  
  createUserSelect(userList);

}).catch(function(err){
  console.log(err);
});

addUserOption = function(selectList, name, value){
      var option = document.createElement("option");
      option.setAttribute("value", value);
      option.text = name;
      selectList.appendChild(option);
};

createUserSelect = function(users){
  //Create and append select list
  var selectList = document.createElement("select");
  selectList.setAttribute("id", "userSelect");
  userDiv.insertBefore(selectList, userDiv.firstChild);

  //Create and append the options
  for (var i = 0; i < users.length; i++) {
    var uname = users[i].name;
    var uid   = users[i],_id;
    addUserOption(selectList, uname, uid);
  }
};

chooseUser = function(){
  var uls = document.getElementById("userSelect");
  sessionUser = userList[uls.selectedIndex]._id;
  userDiv.style.display = "none";
  mapDiv.style.display = "block";
  retrieveUserIDs();
  
  samplesToDo = allSampleYears().then(function(x) { 
    return shuffle(antisection(x, userSamples));
  });
  
  setTimeout(mapView(), 1000);
};

/******* Selection of samples to ID for user  *******/
// Find sample/years already completed
retrieveUserIDs = function(){
  db.allDocs({
    include_docs : true,
    startkey: 'id_' + sessionUser + '_s',
    endkey: 'id_' + sessionUser + '_s\ufff0'
  }).then(function(docs){
    userExistingIDs = docs.rows;
  }).then(function(){
    userSamples = userExistingIDs.map(function(x){ return x.id.substring(9, 21);});
  });
};


intersection = function(a, b){
  var t;
  if (b.length > a.length) t = b, b = a, a = t; // indexOf to loop over shorter
  return a.filter(function (e) {
      return b.indexOf(e) > -1;
  });
};

antisection = function(a, b){
  var t;
  if (b.length > a.length) t = b, b = a, a = t; // indexOf to loop over shorter
  return a.filter(function (e) {
      return b.indexOf(e) == -1;
  });
};

//Taken from : https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

// TODO: Find all sample/years complete by any user

/******* Mapping functionality *******/

// TODO: preload images
// TODO: update addIdentification

function showMap(latlon, wms) {
  map.setView(latlon, 18);
  // TODO: swap out icon 
  var marker = L.marker(latlon).addTo(map);
  wms.addTo(map);

  //L.control.attribution({prefix: false}).addTo(map2);
}

buildMap = function(sample, year){
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
};

mapView = function(){
  
  samplesToDo.then(function(x){
    
    if(x.length === 0){
      alert("Congrats. You've completed all your identifications!");
    } else {
      var s = x[0].substring(0, 6);
      var y = x[0].substring(7, 12);
      
      checkToDo(s, y).then(function(doIt){
        if(doIt){
          buildMap(s, y);
          addIdentification = makeIDfun(s, y);
        } else {
          mapView();
        }
      });
      
      x.shift(); // remove the sample just done from the ToDo array
    }
  });
};

checkToDo = function(sample, year){
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
  
};

makeIDfun = function(sample, year){
  return function addIDtoDb(ID){
    
    // increment number of identifications for sample
    db.get(sample).then(function(doc){
      
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
       "_id" : "id" + "_" + sessionUser + "_" + sample + "_" + year,
      "value" : ID
    }).then(function(doc){
      console.log(sessionUser + " identified " + sample + " as " + ID + " for " + year);
      mapView();
    });
  };
};








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
