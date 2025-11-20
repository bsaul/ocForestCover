/* initialization for testing purposes */

const DBHOST  = "https://ocforestcover.fly.dev/";
const STUDYDB = 'oc_pilot_study_2025';
const studyDb = new PouchDB(DBHOST + '/' + STUDYDB,
    { 
      skip_setup: true,
        auth: {
          username: 'observer',
          password: 'cfe2025'
      }
      // ,
      // ajax: {
      //   rejectUnauthorized: false,
      //   requestCert: true,
      //   agent: false
      // }
    });

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
