/* initialization for testing purposes */
/*const studyDb = new PouchDB(
  'https://ulsentlychomestailsompas:452c3ee1c0917721c6adcc60598f237d0b54e029@4f00102d-b5e6-4d9a-a453-f022fd46d21a-bluemix.cloudant.com/oc_canopy_test'  
);*/
const DBHOST  = "http://68.183.114.219:5984";
const STUDYDB = 'oc_canopy_test';
const studyDb = new PouchDB(DBHOST + '/' + STUDYDB, {skip_setup: true});

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
