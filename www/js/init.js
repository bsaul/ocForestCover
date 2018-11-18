/* initialization for testing purposes */
const db = new PouchDB('http://localhost:5984/test_canopy');

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
