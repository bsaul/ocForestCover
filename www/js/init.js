/* initialization for testing purposes */
const db = new PouchDB(
  'https://ulsentlychomestailsompas:452c3ee1c0917721c6adcc60598f237d0b54e029@4f00102d-b5e6-4d9a-a453-f022fd46d21a-bluemix.cloudant.com/oc_canopy_test'  
);

db.init = function(){
  return db.info().then(function (details) {
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
};
