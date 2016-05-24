'use strict';

let mongoose = require('mongoose');
let expect = require('chai').expect;
let mongoosePaginate = require('../index');

let MONGO_URI = 'mongodb://127.0.0.1/mongoose_paginate_test';

let AuthorSchema = new mongoose.Schema({ name: String });
let Author = mongoose.model('Author', AuthorSchema);

let BookSchema = new mongoose.Schema({
  title: String,
  date: Date,
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'Author'
  }
});

BookSchema.plugin(mongoosePaginate);

let Book = mongoose.model('Book', BookSchema);

describe('mongoose-paginate', function() {

  before(function(done) {
    mongoose.connect(MONGO_URI, done);
  });

  before(function(done) {
    mongoose.connection.db.dropDatabase(done);
  });

  before(function() {
    let book, books = [];
    let date = new Date();
    return Author.create({ name: 'Arthur Conan Doyle' }).then(function(author) {
      for (let i = 1; i <= 100; i++) {
        book = new Book({
          title: 'Book #' + i,
          date: new Date(date.getTime() + i),
          author: author._id
        });
        books.push(book);
      }
      return Book.create(books);
    });
  });

  afterEach(function() {
    delete mongoosePaginate.paginate.options;
  });

  it('returns promise', function() {
    let promise = Book.paginate();
    expect(promise.then).to.be.an.instanceof(Function);
  });

  it('calls callback', function(done) {
    Book.paginate({}, {}, function(err, result) {
      expect(err).to.be.null;
      expect(result).to.be.an.instanceOf(Object);
      done();
    });
  });

  describe('paginates', function() {
    it('with criteria', function() {
      return Book.paginate({ title: 'Book #10' }).then((result) => {
        
        expect(result.data).to.have.length(1);
        expect(result.data[0].title).to.equal('Book #10');
      });
    });
    it('with default options (page=1, limit=10, lean=false)', function() {
      return Book.paginate().then(function(result) {
        
        expect(result.data).to.have.length(10);
        expect(result.paging).to.be.an.instanceOf(Object);
        expect(result.data[0]).to.be.an.instanceof(mongoose.Document);
        expect(result.paging.totalItems).to.equal(100);
        expect(result.paging.itemsPerPage).to.equal(10);
        expect(result.paging.currentPage).to.equal(1);
        expect(result.paging.totalPages).to.equal(10);
        expect(result.paging.currentStartIndex).to.equal(0);
      });
    });
    it('with custom default options', function() {
      mongoosePaginate.paginate.options = {
        limit: 20,
        lean: true
      };
      return Book.paginate().then(function(result) {
        expect(result.data).to.have.length(20);
        expect(result.paging.itemsPerPage).to.equal(20);
        expect(result.data[0]).to.not.be.an.instanceof(mongoose.Document);
      });
    });
    it('with offset and limit', function() {
      return Book.paginate({}, { offset: 30, limit: 20 }).then(function(result) {
        expect(result.data).to.have.length(20);
        expect(result.paging.totalItems).to.equal(100);
        expect(result.paging.itemsPerPage).to.equal(20);
        expect(result.paging.currentStartIndex).to.equal(30);
        expect(result).to.not.have.property('currentPage');
        expect(result).to.not.have.property('totalPages');
      });
    });
    it('with page and limit', function() {
      return Book.paginate({}, { page: 1, limit: 20 }).then(function(result) {
        expect(result.data).to.have.length(20);
        expect(result.paging.totalItems).to.equal(100);
        expect(result.paging.itemsPerPage).to.equal(20);
        expect(result.paging.currentPage).to.equal(1);
        expect(result.paging.totalPages).to.equal(5);
        expect(result.paging).to.not.have.property('currentStartIndex');
      });
    });
    it('with zero limit', function() {
      return Book.paginate({}, { page: 1, limit: 0 }).then(function(result) {
        
        expect(result.data).to.have.length(0);
        expect(result.paging.totalItems).to.equal(100);
        expect(result.paging.itemsPerPage).to.equal(0);
        expect(result.paging.currentPage).to.equal(1);
        expect(result.paging.totalPages).to.equal(Infinity);
      });
    });
    it('with select', function() {
      return Book.paginate({}, { select: 'title' }).then(function(result) {
        expect(result.data[0].title).to.exist;
        expect(result.data[0].date).to.not.exist;
      });
    });
    it('with sort', function() {
      return Book.paginate({}, { sort: { date: -1 } }).then(function(result) {
        expect(result.data[0].title).to.equal('Book #100');
      });
    });
    it('with populate', function() {
      return Book.paginate({}, { populate: 'author' }).then(function(result) {
        expect(result.data[0].author.name).to.equal('Arthur Conan Doyle');
      });
    });
    describe('with lean', function() {
      it('with default leanWithId=true', function() {
        return Book.paginate({}, { lean: true }).then(function(result) {
          console.log(result.data[0]);
          expect(result.data[0]).to.not.be.an.instanceof(mongoose.Document);
          expect(result.data[0].id).to.equal(String(result.data[0]._id));
        });
      });
      it('with leanWithId=false', function() {
        return Book.paginate({}, { lean: true, leanWithId: false }).then(function(result) {
          expect(result.data[0]).to.not.be.an.instanceof(mongoose.Document);
          expect(result.data[0]).to.not.have.property('id');
        });
      });
    });
  });

  after(function(done) {
    mongoose.connection.db.dropDatabase(done);
  });

  after(function(done) {
    mongoose.disconnect(done);
  });

});
