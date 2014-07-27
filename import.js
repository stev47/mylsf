var argv = require('optimist').argv,
    Q = require('q');
var harvester = require('./harvester');

Q.longStackSupport = true;

var MongoClient = require('mongodb').MongoClient;
MongoClient.connect("mongodb://localhost:27017/mylsf", function (err, db) {

    function upsertDegree(degree) {
        return Q.ninvoke(db.collection('degrees'), 'update', {lsf_num: degree.lsf_num}, degree, {upsert: true});
    }
    function upsertMajor(major) {
        return Q.ninvoke(db.collection('majors'), 'update', {lsf_num: major.lsf_num}, major, {upsert: true});
    }

    function updateCourse(course) {
        var courses_col = db.collection('courses');

        return harvester.courseFetchById(course.lsf_id)
        .then(function (courseData) {
            return Q.ninvoke(courses_col, 'update', course, courseData)
            .then(upsertDegree.bind(null, {
                lsf_num: courseData.degree,
                name: courseData.degreeName
            }))
            .then(upsertMajor.bind(null, {
                lsf_num: courseData.major,
                name: courseData.majorName
            }))
            .then(function () {
                console.log('updated', courseData);
            });
        }, function (err) {
            return Q.ninvoke(courses_col, 'remove', course)
            .then(function () {
                console.log('removed', course.lsf_id);
            });
        });
    }

    function updateModule(module) {
        var col = db.collection('modules');

        return harvester.moduleFetchById(module.lsf_id)
        .then(function (moduleData) {
            return Q.ninvoke(col, 'update', module, moduleData)
            .then(function () {
                console.log(moduleData);
            });
        }, function (err) {
            console.log('ERROR!', module.lsf_id);
            throw err;
            /*return Q.ninvoke(col, 'remove', course)
            .then(function () {
                console.log('removed', course.lsf_id);
            });*/
        });
    }

    switch (argv._[0]) {
        case 'courses':
            var col = db.collection('courses');

            Q().then( function () {
                return Q().then(function () {
                    Q.ninvoke(col, 'drop').then(Q, Q)
                }).then(function () {
                    return harvester.courseFetchIds();
                }).then( function (courses) {
                    return Q.ninvoke(col, 'insert', courses)
                }).then(function () {
                    console.log('imported course ids!');
                });
            }).then(function () {
                return Q.ninvoke(col.find().sort({lsf_id: 1}), 'toArray').then(function (res) {
                    var funcs = [];
                    res.forEach(function (course) {
                        funcs.push(updateCourse.bind(null, course));
                    });

                    return funcs.reduce(Q.when, Q());
                });

            }).done(function () {;
                console.log('Finished import!');
                process.exit();
            });


            break;

        case 'moduleList':
            var col = db.collection('modules');

            Q().then( function () {
                return Q().then(function () {
                    Q.ninvoke(col, 'drop').then(Q, Q)
                }).then(function () {
                    return harvester.moduleFetchIds();
                }).then( function (modules) {
                    return Q.ninvoke(col, 'insert', modules)
                }).done(function () {
                    console.log('imported module ids!');
                    process.exit();
                });
            });

            break;

        case 'moduleData':
            var col = db.collection('modules');

            Q().then(function () {
                return Q.ninvoke(col.find({name: {$exists: false}}).sort({lsf_id: 1}), 'toArray').then(function (res) {
                    var funcs = [];
                    res.forEach(function (module) {
                        funcs.push(updateModule.bind(null, module));
                    });

                    return funcs.reduce(Q.when, Q());
                });

            }).done(function () {;
                console.log('Finished import!');
                process.exit();
            });

            break;

        case 'test':
            var col = db.collection('modules');

            harvester.lectureFetchIdsByCourseId(1279).done(function (res) {
                console.log(res);

                Q.ninvoke(col.find({lsf_lectureIds: {$in: res}}), 'toArray').done(function (res2) {
                    console.log(res2);
                    process.exit();
                });

            });


    };

});
