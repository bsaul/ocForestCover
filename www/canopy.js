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
      
            // initialize users
      for (k = 0; k < years.length; k++) {
        db.put(years[k]);
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
  startkey: 'user',
  endkey: 'user\ufff0'
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
  retrieveUserSamples();
};

/******* Seelction of samples to ID for user  *******/


// Find completed
retrieveUserSamples = function(){
  db.allDocs({
    startkey: 'id_' + sessionUser + '_sample',
    endkey: 'id_' + sessionUser + '_sample\ufff0'
  }).then(function(docs){
    console.log(docs.rows);
    userSamples = docs.rows;
  });
};



/******* Mapping functionality *******/


function showMap(latlon) {
  //var latlon = [points[i].y, points[i].x];
  map.setView(latlon, 18);
  var marker = L.marker(latlon).addTo(map);
  // load a tile layer
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

db.get('sample_00002').then(function(doc){
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

