/********** Setup ********************/
var userList = [];
var sessionUser = "";
var userDiv = document.getElementById("userDiv");
var mapDiv  = document.getElementById("mapDiv");
var userSamples = [];
var map = L.map('map', {zoomControl: false, dragging: false});


/********* Database setup *************/
/* initialization is for testing purposes */
var db = new PouchDB('http://localhost:5984/canopy');

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

//var usersTemp = ["U1", "U2"];
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
};

/******* Selection of samples to ID for user  *******/
// Find sample/years already completed
retrieveUserIDs = function(){
  db.allDocs({
    startkey: 'id_' + sessionUser + '_s',
    endkey: 'id_' + sessionUser + '_s\ufff0'
  }).then(function(docs){
    userSamples = docs.rows;
  });
};

var sampleYears = [];
var sampleIDs = [];
var years = [];
// Find all available sample/years 
retrieveAllSamples = function(){
  db.allDocs({
    startkey: 's' ,
    endkey: 's\ufff0'
  }).then(function(docs){
    for(var i = 0; i < docs.rows.length; i++){
      sampleIDs.push(docs.rows[i].id);
    }
  });
};


retrieveAllYears = function(){
  db.allDocs({
    startkey: 'y' ,
    endkey: 'y\ufff0'
  }).then(function(docs){
    for(var i = 0; i < docs.rows.length; i++){
      years.push(docs.rows[i].id);
    }
  });
};

retrieveAllSamples();
retrieveAllYears(); 

createAllSampleYears = function(){

  for(var i = 0; i < sampleIDs.length; i++){
    for(var j = 0; j < years.length; j++){
      sampleYears.push(sampleIDs[i] + '_' + years[j]);
    }
  }
};

/* 
 console.log(sampleIDs[0]);
 
 db.allDocs({

  }).then(function(docs){
    for(var i = 0; i < docs.rows.length; i++){
      years.push(docs.rows[i].year);
      console.log(sampleIDs);
    }
  });
  
  console.log(years);
  

};
*/
// Find all sample/years complete by any user
// Find the anti-join of user sample/years and all available?

/******* Mapping functionality *******/

// TODO: preload images
// TODO: update addIdentification

function showMap(latlon) {
  //var latlon = [points[i].y, points[i].x];
  map.setView(latlon, 18);
  
  // TODO: swap out icon 
  var marker = L.marker(latlon).addTo(map);
  // load a tile layer
  // TODO: Use year database item
  L.tileLayer.wms('https://services.nconemap.gov/secure/services/Imagery/Orthoimagery_2017/ImageServer/WMSServer', {
        version: '1.3.0',
        layers: '0',
        format: 'image/png',
        crs: L.CRS.EPSG4326,
        attribution: "OrthoImagery from <a href='http://data.nconemap.com/geoportal/'>NC OneMap</a>"
  }).addTo(map);

  L.control.scale().addTo(map);
  //L.control.attribution({prefix: false}).addTo(map2);
}

db.get('s00002').then(function(doc){
  showMap(doc.latlon);
});


/*
var j = 0;
function addIdentification(ID){
  //var ID = document.getElementById("IDTree").value;
  db.get('test').then(function (doc) {
  // update ID
  doc.identifications[j] = {"year" : "2017", "user" : "me", "timestamp" : Date.now(), "value" : ID };
  // put them back
  return db.put(doc);
  });
  ++j;
}


function revertImage() { 
  --i;
  map.setView(latlon, 18);
  var marker = L.marker(latlon).addTo(map);
}

function advanceImage() { 
  ++i;
  map.setView(latlon, 18);
  var marker = L.marker(latlon).addTo(map);
}
*/

