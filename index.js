var express = require('express'),
    request = require('request'),
    cheerio = require('cheerio'),
    fs = require('fs'),
    Q = require('q');

var app = express();

// template engine
app.engine('jade', require('jade').__express);
app.set('views', 'views');
app.set('view engine', 'jade');
app.set('view options', {pretty: true});

// serve static documents
app.use(express.static('public'));

var MongoClient = require('mongodb').MongoClient;
MongoClient.connect("mongodb://localhost:27017/mylsf", function (err, db) {

    if (err) throw err;

    app.get('/', function (req, res) {

        res.render('index');



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



