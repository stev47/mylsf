var request = require('request'),
    cheerio = require('cheerio'),
    Q = require('q'),
    moment = require('moment');

var semester = '20141';

/* Harvest shorthand func */
exports.harvest = function (url) {
    return Q.nfcall(request, url)
    .then(function (res) {
        var $ = cheerio.load(res[1], {
            normalizeWhitespace: true
        });
        return $;
    });
}


/*
* Course harvesting
*/

exports.courseFetchIds = function () {
    var url = 'https://lsf.uni-stuttgart.de/qisserver/rds?state=verpublish&publishContainer=stgPlanList';
    return exports.harvest(url).then(function ($) {
        var courses = [];
        $('.divcontent table tbody td:first-child a').each(function() {
            courses.push({
                lsf_id: parseInt($(this).attr('href').match(/publishid=(\d+)/)[1])
            });
        });
        return courses;
    }).catch(function (err) {
        console.error('failed to parse url ' + url);
        throw err;
    });
};

exports.courseFetchById = function (lsf_id) {
    var url = 'https://lsf.uni-stuttgart.de/qisserver/rds?state=verpublish&publishContainer=stgContainer&publishid=' + lsf_id;

    return exports.harvest(url).then(function ($) {
        var tds = $('.divcontent table td:nth-of-type(2n)').get()
                    .map(function (td) { return $(td).text().trim() });

        var degreeNum = tds[8].match(/^(\d+)/) ? tds[8].match(/^(\d+)/)[1] : null;
        var degreeName = tds[8].match(/^\d*\s*(.*)$/)[1];
        var majorNum = tds[1].match(/^(\d+)/) ? tds[1].match(/^(\d+)/)[1] : null;
        var majorName = tds[6];
        var erVer = tds[7].match(/^(\d+)/) ? tds[7].match(/^(\d+)/)[1] : null;

        if (!degreeNum || !majorNum)
            throw {type: 1, message: 'missing degreeNum and/or majorNum'};

        var course = {
            lsf_id: lsf_id,
            name: tds[6],
            degreeNum: degreeNum,
            degreeName: degreeName,
            majorNum: majorNum,
            majorName: majorName,
            erVer: erVer,
        }

        return course;
    }).catch(function (err) {
        console.error('failed to parse url ' + url);
        throw err;
    });
}

/*
* Module harvesting
*/

exports.moduleFetchIds = function () {
    var url = 'https://lsf.uni-stuttgart.de/qisserver/rds?state=change&type=3&moduleParameter=pordpos&nextdir=change&next=TableSelect.vm&subdir=pord&P_start=0&P_anzahl=9999';

    return exports.harvest(url).then(function ($) {
        var courses = [];
        $('.divcontent table tbody tr:nth-child(n+2) td:nth-child(3) a').each(function() {
            courses.push({
                lsf_id: parseInt($(this).attr('href').match(/publishid=(\d+)/)[1])
            });
        });
        return courses;
    }).catch(function (err) {
        console.error('failed to parse url ' + url);
        throw err;
    });
}

exports.moduleFetchById = function (lsf_id) {
    var url = 'https://lsf.uni-stuttgart.de/qisserver/rds?state=verpublish&status=init&moduleCall=mhbHTMLDetail&publishConfFile=mhbdetail&publishSubDir=mhb&publishid=' + lsf_id;

    return exports.harvest(url).then(function ($) {
        var trs = $('.divcontent table table tr').get();
        var infoTable = {};
        trs.map(function (tr, i, arr) {
            infoTable[$('td:nth-child(1)', tr).text().replace(/\s/, '').toString()] = $('td:nth-child(3)', tr);
        });

        // walk through lectures (we need to harvest those links to get the correct lsf_id's ...)
        var lectures = [];
        var lecturePromises = $('li a', infoTable['15']).get().map(function (el) {
            return exports.lectureFetchIdsBySearchUrl($(el).attr('href'))
            .then(function (lectures) {
                lectures_tmp = lectures.map(function (lec) { return lec.lsf_id; });
                lectures = lectures.concat(lectures_tmp);
            });
        });

        return Q.all(lecturePromises).then(function () {
            var module = {
                lsf_id: lsf_id,
                name: infoTable['1a'].text().trim(),
                active: (infoTable['1c'].text().trim() == 'aktiv')? true : false,
                modId: infoTable['2a'].text().trim(),
                modNum: infoTable['2b'].text().trim(),
                credits: parseInt(infoTable['3'].text().trim()),
                creditHours: parseInt(infoTable['4'].text().trim()),
                duration: parseInt(infoTable['5'].text().trim()),
                //rotationCycle:
                //lectures: $('li a', infoTable['15']).attr('href'), // TODO
                lsf_lectures: lectures
            }

            return module;
        });

    }).catch(function (err) {
        console.error('failed to parse url ' + url);
        throw err;
    });

};

/*
* Lecture harvesting
*/

exports.lectureFetchIdsBySearchUrl = function (url) {
    return exports.harvest(url).then(function ($) {
        var lectures = [];
        $('.divcontent table tr:nth-child(n+2)').each(function () {
            lectures.push({
                lsf_id: parseInt($('td:nth-child(2) a:nth-child(1)', this).attr('href').match(/publishid=(\d+)/)[1]),
            });
        });
        return lectures;
    }).catch(function (err) {
        console.error('failed to parse url ' + url);
        throw err;
    });
}

exports.lectureFetchIdsByCourseId = function (course_id) {
    var url = 'https://lsf.uni-stuttgart.de/qisserver/rds?state=wsearchv&search=1&subdir=veranstaltung&k_abstgv.abstgvnr=' + course_id + '&veranstaltung.semester=' + semester + '&P_start=0&P_anzahl=9999'

    return exports.lectureFetchIdsBySearchUrl(url).then(function (lectures) {
        // Add information about the course these lectures belong to
        return lectures.map(function (lecture) {
            lecture.lsf_courses = [course_id];
            return lecture
        });
    });
}

exports.lectureFetchById = function (lsf_id) {
    var url = 'https://lsf.uni-stuttgart.de/qisserver/rds?state=verpublish&publishid=' + lsf_id + '&moduleCall=webInfo&publishConfFile=webInfo&publishSubDir=veranstaltung';

    return exports.harvest(url).then(function ($) {

        var tds = $('.divcontent form table[summary*="Grunddaten"] td').contents();

        var type_lecture    = 1 << 0;
        var type_tutorial   = 1 << 1;
        var type_seminar    = 1 << 2;
        var type_practicum  = 1 << 3;
        var type_remedial   = 1 << 4;
        var type_task       = 1 << 5;

        var type_map = {
            'Blockveranstaltung': 0,
            // lecture
            'Vorlesung': type_lecture,
            'Vortragsreihe': type_lecture,
            // tutorial
            'Übung': type_tutorial,
            'Fachdidaktische Übung': type_tutorial,
            'Tutorium': type_tutorial,
            'Grundkurs': type_tutorial,
            'Kurs': type_tutorial,
            'Lektürekurs': type_tutorial,
            'Workshop': type_tutorial,
            // seminar
            'Hauptseminar': type_seminar,
            'Proseminar': type_seminar,
            'Seminar': type_seminar,
            'Kompaktseminar': type_seminar,
            'Oberseminar': type_seminar,
            'Projektseminar': type_seminar,
            'Kolloquium': type_seminar,
            // practicum
            'Praktikum': type_practicum,
            'Exkursion': type_practicum,
            'Arbeitskreis': type_practicum,
            // remedial
            'Propädeutikum': type_remedial,
            'Repetitorium': type_remedial,
            'Zusatzveranstaltung': type_remedial,
            'Sonderbelegung': type_remedial,
            'Mentorat': type_remedial,
            // task
            'Entwürfe': type_task,
            'Bachelorarbeit': type_task,
            'Masterarbeit': type_task,
            // other
            'Vorlesung + Übung': type_lecture | type_tutorial,
            'Vortragsübung': type_lecture | type_tutorial | type_remedial,
            'Anleitung zum wiss. Arbeiten': type_lecture | type_tutorial | type_remedial,
            'Seminaristische Übung': type_tutorial | type_seminar,
            'Vorlesung und Projekt': type_lecture | type_task,
            'Vorlesung + Praktikum': type_lecture | type_practicum,
            'Praxisseminar': type_seminar | type_practicum,
        }

        if (!(tds[0].data in type_map))
            throw new Error('Unknown lecture type "' + tds[0].data + '" in ' + url);

        var lsf_courses = $('.divcontent form table[summary*="Studiengänge"] td a').get().map(function (el) {
            return parseInt($(el).attr('href').match(/k_abstgv.abstgvnr=(\d+)/)[1]);
        });
        var lsf_modules = $('.divcontent form table[summary*="Prüfungen"] td a').get().map(function (el) {
            return parseInt($(el).attr('href').match(/publishid=(\d+)/)[1]);
        });
        var lsf_tutorials = $('.divcontent form table[summary*="Übungen"] td a').get().map(function (el) {
            return parseInt($(el).attr('href').match(/publishid=(\d+)/)[1]);
        });
        var events = [].concat.apply([], $('.divcontent form table[summary*="Veranstaltungstermine"] tr:nth-of-type(n+2)').get().map(function (el) {

            var times = $('td:nth-child(3)', el).text().match(/\d{2}:\d{2}/g);
            if (!times) // no time specified, useless event for us
                return [];
            var timeStart = moment.duration(times[0]),
                timeEnd = moment.duration(times[1]);

            var dates = $('td:nth-child(5)', el).text().match(/\d{2}.\d{2}.\d{4}/g);
            if (!dates) // no date specified, useless event for us
                return [];
            var date = moment(dates[0], 'DD.MM.YYYY'),
                dateEnd = moment(dates[1], 'DD.MM.YYYY');


            var rhythm = $('td:nth-child(4)', el).text();

            var events = [];
            while (!date.isAfter(dateEnd)) {
                var locLink = $('td:nth-child(6) a', el).attr('href');
                events.push({
                    timeBegin: moment(date).add(timeStart).toDate(),
                    timeEnd: moment(date).add(timeEnd).toDate(),
                    lsf_location: (locLink)? parseInt(locLink.match(/raum\.rgid=(\d+)/)[1]) : null,
                    lsf_lecture: lsf_id,
                });
                date.add((rhythm.match(/14t/) ? 2 : 1), 'weeks');
            }
            return events;
        }));

        var module = {
            lsf_id: lsf_id,
            name: $('.divcontent form h1').text().replace(/ - Einzelansicht\s*$/, ''),
            lecNum: tds[1].data,
            type: type_map[tds[0].data],
            creditHours: parseInt(tds[2].data),
            lsf_courses: lsf_courses,
            lsf_modules: lsf_modules,
            lsf_tutorials: lsf_tutorials,
            events: events
        }

        return module;

    }).catch(function (err) {
        console.error('failed to parse url ' + url);
        throw err;
    });
}
