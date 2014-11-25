var argv = require('yargs')
        .boolean('v')
        .argv,
    log = require('npmlog'),
    async = require('async'),
    ProgressBar = require('progress'),
    Q = require('q');
var harvester = require('./harvester');

Q.longStackSupport = true;

// args parsing
if (argv.v) log.level = 'verbose';
var numJobs = argv.j || 5;
harvester.semester = argv.s || '20142';


var Q_all = Q.all;
Q.all = function () {
    var promises = Array.prototype.slice.apply(arguments) // calls slice without args

    // allow nesting of promises inside array, so flatten them
    promises = Array.prototype.concat.apply([], promises);

    return Q_all(promises);
}

Q.sequence = function (tasks, initParam) {
    var res = Q(initParam);
    tasks.forEach(function (task) {
        res = res.then(tasks);
    });
            return res;
}

Q.parallel = function (tasks, numJobs, taskCompleted) {
    numJobs = (typeof numJobs === undefined) ? 5 : numJobs;

    // convert promise returning functions to node-callback functions
    var ntask = function (task, cb) {
        Q.try(task).done(function (res) {
            cb(null, res);
            if (taskCompleted) taskCompleted(res);
        }, function (err) {
            cb(err);
        });
    };
    var tasks = tasks.map(function (task) {
        return ntask.bind(null, task);
    });

    return Q.ninvoke(async, 'parallelLimit', tasks, numJobs);
}

/** Run jobs with progress bar */
var runJobs = function (fns, bar) {
    return Q.parallel(fns, numJobs, bar.tick.bind(bar, 1));
}




Q.nbind = function (fn, thisp) {
    var fnArgs = Array.prototype.slice.call(arguments).slice(2);
    return function () {
        var deferred = Q.defer();
        fnArgs.push(deferred.makeNodeResolver());
        try {
            fn.apply(thisp, fnArgs)
        } catch (e) {
            deferred.reject(e);
        }
        return deferred.promise;
    }
}


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
                lsf_lectures: { $each: lsf_lectures },
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
                lsf_lectures: { $each: lsf_lectures },
            },
            $set: module,
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
                lsf_modules: { $each: lsf_modules },
            },
            $set: lecture
        }, {upsert: true});
    }
    function upsertEvent (event) {
        return Q.ninvoke(db.collection('events'), 'update', event, event, {upsert: true});
    }
    function upsertLocation (location) {
        return Q.ninvoke(db.collection('locations'), 'update', {lsf_id: location.lsf_id}, {
            $set: location
        }, {upsert: true});
    }

    function insertEvents (events) {
        return Q.ninvoke(db.collection('events'), 'insert', events);
    }





    function updateCourse(course) {
        var courses_col = db.collection('courses');

        return [
            harvester.courseFetchById.bind(null, course.lsf_id),
            function (courseData) {
                return Q.all([
                    upsertCourse(courseData),
                    upsertDegree({
                        lsf_num: courseData.degreeNum,
                        name: courseData.degreeName,
                        timeHarvest: courseData.timeHarvest,
                    }),
                    upsertMajor({
                        lsf_num: courseData.majorNum,
                        name: courseData.majorName,
                        timeHarvest: courseData.timeHarvest,
                    })
                ]).thenResolve(courseData);
            }
        ].reduce(Q.when, Q())
        .then(function (course) {
        }, function (err) {
            if (err.type) {
                return Q.ninvoke(courses_col, 'remove', course).then(function () {
                    log.warn('import', 'removed', course, 'due to error', err);
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
                        lsf_modules: [module.lsf_id],
                    });
                }),
                upsertModule(moduleData)
            )).thenResolve(moduleData);
        })
        .then(function (moduleData) {
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
                        lsf_lectures: [lecture.lsf_id],
                    });
                }),
                lectureData.lsf_modules.map(function (module_id) {
                    return upsertModule({
                        lsf_id: module_id,
                        lsf_lectures: [lecture.lsf_id],
                    });
                }),
                upsertLecture(lectureData),
                insertEvents(events) // insert events for this lecture
            )).thenResolve({
                lecture: lectureData,
                events: events,
            });

        })
        .then(function (res) {
            //log.info('import', 'Added %d events for this lecture', res.events.length);
            return res.lecture;
        });
    }

    function updateLocation(location) {
        return harvester.locationFetchById(location.lsf_id)
        .then(function (locationData) {
            return upsertLocation(locationData);
        })
    }

    switch (argv._[0]) {
        case 'courseList':
            var col = db.collection('courses');

            log.info('import', 'Fetching course ids …');
            harvester.courseFetchIds()
            .then(function (courses) {
                return Q.all(courses.map(upsertCourse)).thenResolve(courses);
            }).done(function (courses) {
                log.info('import', '%d course ids imported', courses.length);
                process.exit();
            });
            break;

        case 'courseData':
            var col = db.collection('courses');

            log.info('import', 'Fetching course data …');
            Q.ninvoke(col.find().sort({lsf_id: 1}), 'toArray').then(function (res) {
                var jobs = res.map(function (course) {
                    return updateCourse.bind(null, course);
                });
                var bar = new ProgressBar('ETA :etas [:bar] :percent', {
                    total: jobs.length,
                })
                return runJobs(jobs, bar);
            }).done(function () {
                log.info('import', 'course data updated!');
                process.exit();
            });
            break;

        case 'moduleList':
            var col = db.collection('modules');

            log.info('import', 'Fetching module ids …');
            harvester.moduleFetchIds()
            .then(function (modules) {
                return Q.all(modules.map(upsertModule)).thenResolve(modules);
            })
            .done(function (modules) {
                log.info('import', '%d module ids imported', modules.length);
                process.exit();
            });
            break;

        case 'moduleData':
            var col = db.collection('modules');

            log.info('import', 'Fetching module data …');
            Q.ninvoke(col.find().sort({'lsf_id': 1}), 'toArray').then(function (modules) {
                var jobs = modules.map(function (module) {
                    return updateModule.bind(null, module);
                });
                var bar = new ProgressBar('ETA :etas [:bar] :percent', {
                    total: jobs.length,
                });
                return runJobs(jobs, bar);
            }).done(function () {
                log.info('import', 'module data updated!');
                process.exit();
            });
            break;

        case 'lectureList':
            var col = db.collection('lectures');

            log.info('import', 'Fetching lecture ids …');
            harvester.lectureFetchCount()
            .then(function (count) {
                var p_size = 100; // lsf allows max 100
                var jobs = Array.apply(null, Array(parseInt(count / p_size) + 1)).map(function (v, i) {
                    return function () {
                        return harvester.lectureFetchIdsByRange(i * p_size, p_size)
                        .then(function (lectures) {
                            return Q.all(lectures.map(upsertLecture)).thenResolve(lectures);
                        });
                    }
                });
                var bar = new ProgressBar('ETA :etas [:bar] :percent', {
                    total: jobs.length,
                });
                return runJobs(jobs, bar)
                .then(function (lecture_chunks) {
                    return [].concat.apply([], lecture_chunks);
                });
            })
            .done(function (res) {
                log.info('import', '%d lecture ids imported!', res.length);
                process.exit();
            });

            break;

        case 'lectureData':
            var col = db.collection('lectures');

            log.info('import', 'Fetching lecture data …');
            Q.ninvoke(col.find().sort({lsf_id: 1}), 'toArray').then(function (lectures) {
                var jobs = lectures.map(function (lecture) {
                    return updateLecture.bind(null, lecture);
                });
                var bar = new ProgressBar('ETA :etas [:bar] :percent', {
                    total: jobs.length,
                });
                return runJobs(jobs, bar);
            }).done(function () {
                log.info('import', 'lecture data updated');
                process.exit();
            });
            break;

        case 'locationData':
            var col = db.collection('lectures');

            log.info('import', 'Fetching location data …');

            Q.ninvoke(db.collection('events'), 'distinct', 'lsf_location').then( function (res) {
                var jobs = res.filter(function (v) { return v; }).map(function (lsf_id) {
                    return updateLocation.bind(null, {lsf_id: lsf_id});
                });
                var bar = new ProgressBar('ETA :etas [:bar] :percent', {
                    total: jobs.length,
                });
                return runJobs(jobs, bar);
            }).done(function (res) {
                log.info('import', '%d rooms imported!', res.length);
                process.exit();
            });

            break;

        case 'courseDrop':
            Q.ninvoke(db.collection('courses'), 'drop')
            .then(Q.nbind(db.collection('majors').drop, db.collection('majors')))
            .then(Q.nbind(db.collection('degrees').drop, db.collection('degrees')))
            .then(Q, Q)
            .done(function () {
                log.info('import', 'courses/majors/degrees dropped');
                process.exit();
            });
            break;
        case 'moduleDrop':
            Q.ninvoke(db.collection('modules').drop()).then(Q, Q).done(function () {
                log.info('import', 'modules dropped');
                process.exit();
            });
            break;
        case 'lectureDrop':
            Q.ninvoke(db.collection('lectures').drop()).then(Q, Q).done(function () {
                log.info('import', 'lectures dropped');
                process.exit();
            });
            break;

        case 'clear':
            Q.all([].concat(
                Q.ninvoke(db.collection('majors'), 'drop'),
                Q.ninvoke(db.collection('degrees'), 'drop'),
                Q.ninvoke(db.collection('courses'), 'drop'),
                Q.ninvoke(db.collection('modules'), 'drop'),
                Q.ninvoke(db.collection('lectures'), 'drop'),
                Q.ninvoke(db.collection('locations'), 'drop'),
                Q.ninvoke(db.collection('events'), 'drop')
            )).then(Q, Q).done(function () {
                log.info('import', 'cleared database');
                process.exit();
            });
            break;

        case 'test':
            harvester.locationFetchById(2308).done(function (res) {
                console.log(res);
                process.exit();
            });
            break;

        default:
            log.info('import', 'Nothing to be done');
            process.exit();

    }

});
