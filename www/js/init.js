/* initialization for testing purposes */
/*const studyDb = new PouchDB(
  'https://ulsentlychomestailsompas:452c3ee1c0917721c6adcc60598f237d0b54e029@4f00102d-b5e6-4d9a-a453-f022fd46d21a-bluemix.cloudant.com/oc_canopy_test'  
);*/
const DBHOST  = "http://68.183.114.219:5984";
const STUDYDB = 'oc_pilot_study';
const studyDb = new PouchDB(DBHOST + '/' + STUDYDB, {skip_setup: true});

/* For testing only */

function clearUserDb(userDB){
  userDB.allDocs().
  then(function(docs){
    docs.rows.map(function(x){userDB.remove(x.id, x.value.rev);});
    console.log("userDB has been cleared");
  });
}

function clearIdentifications(){
  studyDb.allDocs({
    startkey: 'p' ,
    endkey:   'p\ufff0',
    include_docs : true,
  }).then(function(docs){
    docs.rows.map(function(x){
      x.doc.identifications = {};
      x.doc.total_ids = 0;
      studyDb.put(x.doc);
    });
    console.log("The study identification have been cleared");
  }).catch(function(err){
      console.log(err);
  });
}

/*
studyDb.init = function(){
  return studyDb.info().then(function (details) {
      if (details.doc_count === 0) {
  
        // initialize sample points
        for (k = 0; k < points.length; k++) {
          studyDb.put(points[k]);
        }
        
        // initialize years
        for (k = 0; k < idyrs.length; k++) {
          studyDb.put(idyrs[k]);
        }
        
    }
    else return details;
  });
};
*/
