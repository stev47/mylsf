var request = require('request'),
    cheerio = require('cheerio'),
    Q = require('q'),
    log = require('npmlog'),
    moment = require('moment');


var harvest = exports;

harvest.logLevel = log.level;
harvest.semester = '20141';

/* Harvest shorthand func */
harvest.harvest = function (url, fn) {
    log.verbose('harvest', 'Requesting "%s" …', url);
    return Q.nfcall(request, url)
    .then(function(res) {
        var $ = cheerio.load(res[1], {
            normalizeWhitespace: true
        });
        log.verbose('harvest', 'Processing data from "%s" …', url);
        return Q.try(fn.bind(null, $))
        .then(function (res) {
            log.verbose('harvest', 'Harvest sucessful: ', res);
            return res;
        }, function (err) {
            log.error('harvest', 'Harvest failed for "%s"', url);
            log.error('harvest', $.html());
            throw err;
        });
    });
}



/*
* Course harvesting
*/

harvest.courseFetchIds = function () {
    var url = 'https://lsf.uni-stuttgart.de/qisserver/rds?state=verpublish&publishContainer=stgPlanList';
    return harvest.harvest(url, function ($) {
        return Q($('.divcontent table tbody td:first-child a').get().map(function(a) {
            return {
                lsf_id: parseInt($(a).attr('href').match(/publishid=(\d+)/)[1])
            };
        }));
    });
}

harvest.courseFetchById = function (lsf_id) {
    var url = 'https://lsf.uni-stuttgart.de/qisserver/rds?state=verpublish&publishContainer=stgContainer&publishid=' + lsf_id;

    return harvest.harvest(url, function ($) {
        var tds = $('.divcontent table td:nth-of-type(2n)').get()
                    .map(function (td) { return $(td).text().trim() });

        var degreeNum = tds[8].match(/^(\d+)/) ? tds[8].match(/^(\d+)/)[1] : null;
        var degreeName = tds[8].match(/^\d*\s*(.*)$/)[1];
        var majorNum = tds[1].match(/^(\d+)/) ? tds[1].match(/^(\d+)/)[1] : null;
        var majorName = tds[1].match(/^\d*\s*(.*)$/)[1];
        var erVer = tds[7].match(/^(\d+)/) ? tds[7].match(/^(\d+)/)[1] : null;

        //if (!degreeNum || !majorNum)
        //    throw {type: 1, message: 'missing degreeNum and/or majorNum'};

        var course = {
            lsf_id: lsf_id,
            name: tds[6],
            degreeNum: degreeNum,
            degreeName: degreeName,
            majorNum: majorNum,
            majorName: majorName,
            erVer: erVer,
            timeHarvest: moment().toDate(),
        }

        return Q(course);
    });
}

/*
* Module harvesting
*/

harvest.moduleFetchIds = function () {
    var url = 'https://lsf.uni-stuttgart.de/qisserver/rds?state=change&type=3&moduleParameter=pordpos&nextdir=change&next=TableSelect.vm&subdir=pord&P_start=0&P_anzahl=9999';

    return harvest.harvest(url, function ($) {
        return Q($('.divcontent table > tbody > tr:nth-child(n+2) > td:nth-child(3) > a').get().map(function(a) {
            return {
                lsf_id: parseInt($(a).attr('href').match(/publishid=(\d+)/)[1])
            };
        }));
    });
}

harvest.moduleFetchById = function (lsf_id) {
    var url = 'https://lsf.uni-stuttgart.de/qisserver/rds?state=verpublish&status=init&moduleCall=mhbHTMLDetail&publishConfFile=mhbdetail&publishSubDir=mhb&publishid=' + lsf_id;

    return harvest.harvest(url, function ($) {
        var trs = $('.divcontent table table tr').get();
        var infoTable = {};
        trs.map(function (tr, i, arr) {
            infoTable[$('td:nth-child(1)', tr).text().replace(/\s/, '').toString()] = $('td:nth-child(3)', tr);
        });

        // walk through lectures (we need to harvest those links to get the correct lsf_id's ...)
        var lecturePromises = $('li a', infoTable['15']).get().map(function (el) {
            return harvest.lectureFetchIdsBySearchUrl($(el).attr('href'))
            .then(function (lectures) {
                return lectures.map(function (lec) { return lec.lsf_id; });
            });
        });

        return Q.all(lecturePromises).then(function (lectures_chunks) {
            lectures = [].concat.apply([], lectures_chunks);
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
                lsf_lectures: lectures,
                timeHarvest: moment().toDate(),
            }

            return Q(module);
        });

    });

};

/*
* Lecture harvesting
*/

harvest.lectureFetchCount = function () {
    var url = 'https://lsf.uni-stuttgart.de/qisserver/rds?state=wsearchv&search=1&subdir=veranstaltung&veranstaltung.semester=' + harvest.semester + '&P_start=0&P_anzahl=100';

    return harvest.harvest(url, function ($) {
        return Q($('.divcontent .InfoLeiste').text().match(/(\d+) Treffer/)[1]);
    });
}

harvest.lectureFetchIdsByRange = function (start, length) {
    var url = 'https://lsf.uni-stuttgart.de/qisserver/rds?state=wsearchv&search=1&subdir=veranstaltung&veranstaltung.semester=' + harvest.semester + '&P_start=' + start + '&P_anzahl=' + length;

    return harvest.lectureFetchIdsBySearchUrl(url).then(function (lectures) {
        return lectures.map(function (lecture) {
            lecture.semester = harvest.semester;
            return lecture;
        });
    });
}

harvest.lectureFetchIdsBySearchUrl = function (url) {
    return harvest.harvest(url, function ($) {
        return Q($('.divcontent table tr:nth-child(n+2)').get().map(function (tr) {
            return {
                lsf_id: parseInt($('td:nth-child(2) a:nth-child(1)', tr).attr('href').match(/publishid=(\d+)/)[1]),
            };
        }));
    });
}

/*
harvest.lectureFetchIdsByCourseId = function (course_id) {
    var url = 'https://lsf.uni-stuttgart.de/qisserver/rds?state=wsearchv&search=1&subdir=veranstaltung&k_abstgv.abstgvnr=' + course_id + '&veranstaltung.semester=' + harvest.semester + '&P_start=0&P_anzahl=9999'

    return harvest.lectureFetchIdsBySearchUrl(url).then(function (lectures) {
        return lectures.map(function (lecture) {
            // Add information about the course these lectures belong to
            lecture.lsf_courses = [course_id];
            lecture.semester = harvest.semester;
            return lecture;
        });
    });
}*/

harvest.lectureFetchById = function (lsf_id) {
    var url = 'https://lsf.uni-stuttgart.de/qisserver/rds?state=verpublish&publishid=' + lsf_id + '&moduleCall=webInfo&publishConfFile=webInfo&publishSubDir=veranstaltung';

    return harvest.harvest(url, function ($) {

        var tds = $('.divcontent form table[summary*="Grunddaten"] td').contents();

        var type_lecture    = 1 << 0;
        var type_tutorial   = 1 << 1;
        var type_seminar    = 1 << 2;
        var type_practicum  = 1 << 3;
        var type_remedial   = 1 << 4;
        var type_task       = 1 << 5;
        var type_other      = 1 << 6;

        var type_map = {
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
            'Mentorat': type_remedial,
            // task
            'Entwürfe': type_task,
            'Bachelorarbeit': type_task,
            'Masterarbeit': type_task,
            // other
            'Blockveranstaltung': type_other,
            'Zusatzveranstaltung': type_other,
            'Sonderbelegung': type_other,
            // combinations
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
            if (!times) return []; // no time specified, useless event for us
            var timeStart = moment.duration(times[0]),
                timeEnd = moment.duration(times[1]);

            var dates = $('td:nth-child(5)', el).text().match(/\d{2}.\d{2}.\d{4}/g);
            if (!dates) return []; // no date specified, useless event for us
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

        var semester = tds[3].data.match(/(\d{4})/)[1] + (tds[3].data.match(/SoSe/) ? '1' : '2');

        var module = {
            lsf_id: lsf_id,
            name: $('.divcontent form h1').text().replace(/ - Einzelansicht\s*$/, ''),
            lecNum: tds[1].data,
            type: type_map[tds[0].data],
            creditHours: parseInt(tds[2].data),
            semester: semester,
            lsf_courses: lsf_courses,
            lsf_modules: lsf_modules,
            lsf_tutorials: lsf_tutorials,
            events: events,
            timeHarvest: moment().toDate(),
        }

        return Q(module);

    });
}

/*
 * Location harvesting
 */

harvest.locationFetchById = function (lsf_id) {
    var room_url = 'https://lsf.uni-stuttgart.de/qisserver/rds?state=verpublish&moduleCall=webInfo&publishConfFile=webInfoRaum&publishSubDir=raum&raum.rgid=' + lsf_id;

    return harvest.harvest(room_url, function ($) {
        var building_url = $('.divcontent table[summary*="Grunddaten"] td:nth-of-type(2) a').attr('href');

        var room_data = $('.divcontent table[summary*="Grunddaten"] td').get()
                .map(function (td) { return $(td).text().trim(); });

        return harvest.harvest(building_url, function ($) {
            return Q($('.divcontent table[summary*="Grunddaten"] td').get()
                    .map(function (td) { return $(td).text().trim(); }));
        }).then(function (building_data) {
            return {
                lsf_id: lsf_id,
                type: 0,
                name: "",
                campus: building_data[1],
                address: building_data[2],
                address_short: building_data[0],
                address_misc: building_data[4],
                room: room_data[0],
                room_short: room_data[2],
                room_misc: room_data[4],
                timeHarvest: moment().toDate(),
            };
        });

    });
}
