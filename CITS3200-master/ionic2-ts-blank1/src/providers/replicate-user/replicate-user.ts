import { Injectable } from '@angular/core';
import { AppConfig } from '../../app/app-config.ts';
import PouchDB from 'pouchdb';
 
@Injectable()
export class ReplicateUser {
 
  data: any;
  db: any;
  remote: any;
 
  constructor() {
 
    this.db = new PouchDB(AppConfig.serverConfig.userDBName, {adapter: 'websql'}); 
 
    this.remote = AppConfig.serverConfig.dbURL + '/' + AppConfig.serverConfig.userDBName;
 
    let options = {
      live: true,
      retry: true,
      continuous: true,
      filter: "filters/noDeleted"
    };

    this.db.get('_design/filters').catch((err) => {
        this.db.put(
            {
                "_id": "_design/filters",
                "filters": {
                    "noDeleted": "function(doc, req) { return !doc._deleted; }"
                }
            }
        )
    }); 
 
    this.db.replicate.to(this.remote, options);
 
  }
 
  getReplicateUser() {
 
  if (this.data) {
    return Promise.resolve(this.data);
  }
 
  return new Promise(resolve => {
 
    this.db.allDocs({
 
      include_docs: true
 
    }).then((result) => {
 
      this.data = [];
 
      let docs = result.rows.map((row) => {
          if (row.doc._id != '_design/filters') {
              this.data.push(row.doc);
          }
      });
        
      resolve(this.data);
 
      this.db.changes({live: true, since: 'now', include_docs: true}).on('change', (change) => {
        this.handleChange(change);
      }); 
    }).catch((error) => { 
      console.log(error); 
    });  
  }); 
}
 
createReplicate(todo){
  return this.db.post(todo);
}
 
updateReplicate(todo){
return this.db.put(todo);
}
 
deleteReplicate(todo){
this.db.remove(todo);
}

getID(todo) {
    return this.db.get(todo);
    }
 
  handleChange(change){
 
  let changedDoc = null;
  let changedIndex = null;
 
  this.data.forEach((doc, index) => {
 
    if(doc._id === change.id){
      changedDoc = doc;
      changedIndex = index;
    }
 
  });
 
  //A document was deleted
  if(change.deleted){
    this.data.splice(changedIndex, 1);
  } 
  else {
 
    //A document was updated
    if(changedDoc){
      this.data[changedIndex] = change.doc;
    } 
 
    //A document was added
    else {
      this.data.push(change.doc); 
    }
 
  }
 
}

markAsDeleted() {
    this.getReplicateUser().then((data) => {
        for (var i = 0; i < data.length; i++) {
            if (data[i]._id != '_design/filters') {
                data[i]._deleted = true;
                this.db.put(data[i]);
            }
        }
    });
}

clearAll() {
    this.getReplicateUser().then((data) => {
    for(var i = 0; i < data.length; i++) {
      this.db.remove(data[i]);
    }
  });
}
 
}