'use strict';
var Promise = require('bluebird');

/**
 * @package mongoose-paginate
 * @param {Object} [query={}]
 * @param {Object} [options={}]
 * @param {Object|String} [options.select]
 * @param {Object|String} [options.sort]
 * @param {Array|Object|String} [options.populate]
 * @param {Boolean} [options.lean=false]
 * @param {Boolean} [options.leanWithId=true]
 * @param {Number} [options.offset=0] - Use offset or page to set skip position
 * @param {Number} [options.page=1]
 * @param {Number} [options.limit=10]
 * @param {Function} [callback]
 * @returns {Promise}
 */

function paginate(query, options, callback) {
  query = query || {};
  options = Object.assign({}, paginate.options, options);
  let select = options.select;
  let sort = options.sort;
  let populate = options.populate;
  let lean = options.lean || false;
  let leanWithId = typeof options.leanWithId == 'undefined' ? true : options.leanWithId;

  
  let limit = options.limit ? options.limit : 10;


  let page, offset, skip, promises;
  if (options.offset) {
    offset = options.offset;
    skip = offset;
  } else if (options.page) {
    page = options.page;
    skip = (page - 1) * limit;
  } else {
    page = 1;
    offset = 0;
    skip = offset;
  }
  if (limit) {
    let docsQuery = this.find(query)
      .select(select)
      .sort(sort)
      .skip(skip)
      .lean(lean);

    if(options.limit !== 0){
      docsQuery.limit(limit)
    }

    if (populate) {
      [].concat(populate).forEach((item) => {
        docsQuery.populate(item);
      });
    }
    promises = {
      count: this.count(query).exec(),
    };

    if(options.limit === 0){
      
      promises.docs = new Promise((resolve, reject) => {
        resolve([]);  
      });

    }else{
      promises.docs = docsQuery.exec()      
    }


    if (lean && leanWithId) {
      promises.docs = promises.docs.then((docs) => {
        docs.forEach((doc) => {
          doc.id = String(doc._id);
        });
        return docs;
      });
    }
  }
  
  return Promise.props(promises).then((data) => {
    
    let result = {
      data: data.docs,
      paging:{
        totalItems: data.count,
        itemsPerPage : options.limit === 0 ? options.limit : limit
      }
      
    };

    

    if (offset !== undefined) {
      result.paging.currentStartIndex = offset;
    }
    if (page !== undefined) {
      result.paging.currentPage = page;
      result.paging.totalPages = Math.ceil(data.count / (options.limit === 0 ? options.limit : limit)) || 1;
    }
    if (typeof callback === 'function') {
      return callback(null, result);
    }

    
    return new Promise((resolve, reject) => {
      resolve(result);  
    });
    
  });
}

/**
 * @param {Schema} schema
 */

module.exports = function(schema) {
  schema.statics.paginate = paginate;
};

module.exports.paginate = paginate;
