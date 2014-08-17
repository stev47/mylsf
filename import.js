var argv = require('optimist').argv,
    Q = require('q');
var harvester = require('./harvester');

Q.longStackSupport = true;

var MongoClient = require('mongodb').MongoClient;
MongoClient.connect("mongodb://localhost:27017/mylsf", function (err, db) {

    /*
    * Upsert functions
    */

    function upsertDegree (degree) {
        return Q.ninvoke(db.collection('degrees'), 'update', {lsf_num: degree.lsf_num}, {
            $set: degree
        }, {upsert: true});
    }
    function upsertMajor (major) {
        return Q.ninvoke(db.collection('majors'), 'update', {lsf_num: major.lsf_num}, {
            $set: major,
        }, {upsert: true});
    }
    function upsertCourse (course) {
        // sets to be appended, delete from object containing the properties to set
        var lsf_modules = course.lsf_modules || [];
        var lsf_lectures = course.lsf_lectures || [];
        delete course.lsf_modules;
        delete course.lsf_lectures;
        // actual upsert
        return Q.ninvoke(db.collection('courses'), 'update', {lsf_id: course.lsf_id}, {
            $addToSet: {
                lsf_modules: { $each: lsf_modules },
                lsf_lectures: { $each: lsf_lectures }
            },
            $set: course
        }, {upsert: true});
    }
    function upsertModule (module) {
        // sets to be appended, delete from object containing the properties to set
        var lsf_courses = module.lsf_courses || [];
        var lsf_lectures = module.lsf_lectures || [];
        delete module.lsf_courses;
        delete module.lsf_lectures;
        // actual upsert
        return Q.ninvoke(db.collection('modules'), 'update', {lsf_id: module.lsf_id}, {
            $addToSet: {
                lsf_courses: { $each: lsf_courses },
                lsf_lectures: { $each: lsf_lectures }
            },
            $set: module
        }, {upsert: true});
    }
    function upsertLecture (lecture) {
        // sets to be appended, delete from object containing the properties to set
        var lsf_courses = lecture.lsf_courses || [];
        var lsf_modules = lecture.lsf_modules || [];
        delete lecture.lsf_courses;
        delete lecture.lsf_modules;
        // actual upsert
        return Q.ninvoke(db.collection('lectures'), 'update', {lsf_id: lecture.lsf_id}, {
            $addToSet: {
                lsf_courses: { $each: lsf_courses },
                lsf_modules: { $each: lsf_modules }
            },
            $set: lecture
        }, {upsert: true});
    }
    function upsertEvent (event) {
        return Q.ninvoke(db.collection('events'), 'update', event, event, {upsert: true});
    }





    function updateCourse(course) {
        var courses_col = db.collection('courses');

        return [
            harvester.courseFetchById.bind(null, course.lsf_id),
            function (courseData) {
                return Q.all([
                    upsertCourse(courseData),
                    upsertDegree({
                        lsf_num: courseData.degree,
                        name: courseData.degreeName
                    }),
                    upsertMajor({
                        lsf_num: courseData.major,
                        name: courseData.majorName
                    })
                ]).thenResolve(courseData);
            }
        ].reduce(Q.when, Q())
        .then(function (course) {
            console.log(course);
        }, function (err) {
            if (err.type) {
                return Q.ninvoke(courses_col, 'remove', course).then(function () {
                    console.log('removed', course, 'due to error', err);
                });
            } else {
                throw err;
            }
        })
    }

    function updateModule(module) {
        var col = db.collection('modules');

        return harvester.moduleFetchById(module.lsf_id)
        .then(function (moduleData) {
            return Q.all([].concat(
                // Update references in other collections
                moduleData.lsf_lectures.map(function (lecture_id) {
                    return upsertLecture({
                        lsf_id: lecture_id,
                        lsf_modules: [module.lsf_id]
                    });
                }),
                upsertModule(moduleData)
            )).thenResolve(moduleData);
        })
        .then(function (moduleData) {
            console.log(moduleData);
        });
    }

    function updateLecture(lecture) {
        var col = db.collection('lectures');

        return harvester.lectureFetchById(lecture.lsf_id)
        .then(function (lectureData) {
            var events = lectureData.events;
            // events should not go to lectures collection
            delete lectureData.events;

            return Q.all([].concat(
                // Update references in other collections
                lectureData.lsf_courses.map(function (course_id) {
                    return upsertCourse({
                        lsf_id: course_id,
                        lsf_lectures: [lecture.lsf_id]
                    });
                }),
                lectureData.lsf_modules.map(function (module_id) {
                    return upsertModule({
                        lsf_id: module_id,
                        lsf_lectures: [lecture.lsf_id]
                    });
                }),
                upsertModule(lectureData),
                events.map(upsertEvent) // insert events for this lecture
            )).thenResolve({
                lecture: lectureData,
                events: events
            });

        })
        .then(function (res) {
            console.log(res.lecture);
            console.log('Added ' + res.events.length + ' Events for this lecture');
            return res.lecture;
        });
    }

    switch (argv._[0]) {
        case 'courseList':
            var col = db.collection('courses');

            Q.ninvoke(col, 'drop').then(Q, Q)
            .then(harvester.courseFetchIds)
            .then(function (courses) {
                return Q.all(courses.map(upsertCourse)).thenResolve(courses);
            }).done(function (courses) {
                console.log(courses.length + ' course ids imported.');
                process.exit();
            });
            break;

        case 'courseData':
            var col = db.collection('courses');

            Q.ninvoke(col.find().sort({lsf_id: 1}), 'toArray').then(function (res) {
                return res.map(function (course) {
                    return updateCourse.bind(null, course)
                }).reduce(Q.when, Q());
            }).done(function () {
                console.log('course data updated!');
                process.exit();
            });
            break;

        case 'moduleList':
            var col = db.collection('modules');

            Q.ninvoke(col, 'drop').then(Q, Q)
            .then(harvester.moduleFetchIds)
            .then(function (modules) {
                return Q.all(modules.map(upsertModule)).thenResolve(modules);
            })
            .done(function (modules) {
                console.log(modules.length + ' module ids imported.');
                process.exit();
            });
            break;

        case 'moduleData':
            var col = db.collection('modules');

            Q.ninvoke(col.find().sort({lsf_id: 1}), 'toArray').then(function (modules) {
                return modules.map(function (module) {
                    return updateModule.bind(null, module);
                }).reduce(Q.when, Q());
            }).done(function () {
                console.log('module data updated!');
                process.exit();
            });
            break;

        case 'lectureList':
            var col = db.collection('lectures');

            Q.ninvoke(col, 'drop').then(Q, Q)
            .then(function () {
                return Q.ninvoke(db.collection('courses').find(), 'toArray').then(function (courses) {
                    return courses.map(function (course) {
                        return function () {
                            return harvester.lectureFetchIdsByCourseId(course.lsf_id).then(function (lectures) {
                                console.log(lectures);
                                return Q.all(lectures.map(upsertLecture));
                            });
                        }
                        //return lecturesForCourse.bind(null, course.lsf_id);
                    }).reduce(Q.when, Q());
                });
            }).done(function () {
                console.log('Finished import!');
                process.exit();
            });

            break;

        case 'lectureData':
            var col = db.collection('lectures');

            Q.ninvoke(col.find().sort({lsf_id: 1}), 'toArray').then(function (lectures) {
                return lectures.map(function (lecture) {
                    return updateLecture.bind(null, lecture);
                }).reduce(Q.when, Q());
            }).done(function () {
                console.log('lecture data updated');
                process.exit();
            });
            break;

        case 'test':
            harvester.lectureFetchById(149122).then(updateLecture).done(function (res) {
                console.log(res);
                process.exit();
            });
            break;

    }

});
