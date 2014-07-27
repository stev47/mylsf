var express = require('express'),
    request = require('request'),
    cheerio = require('cheerio'),
    fs = require('fs'),
    Q = require('q');

var harvester = require('./harvester');
var app = express();

var MongoClient = require('mongodb').MongoClient;
MongoClient.connect("mongodb://localhost:27017/mylsf", function (err, db) {

    if (err) throw err;

    app.get('/test', function (req, res) {




    });

    app.get('/test2', function (req, res) {

        /*
        harvester.courseFetchById(24).done(function (course) {
            console.log(course);
            res.send();
        });*/
    });

    app.listen(3000);

});



