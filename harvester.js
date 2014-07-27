var request = require('request'),
    cheerio = require('cheerio'),
    Q = require('q');

var semester = '20141';

exports.harvest = function (url) {
    return Q.nfcall(request, url)
    .then(function (res) {
        var $ = cheerio.load(res[1], {
            normalizeWhitespace: true
        });
        return Q($);
    });
}

exports.courseFetchIds = function () {
    var url = 'https://lsf.uni-stuttgart.de/qisserver/rds?state=verpublish&publishContainer=stgPlanList';
    return exports.harvest(url).then(function ($) {
        var courses = [];
        $('.divcontent table tbody td:first-child a').each(function() {
            courses.push({
                lsf_id: parseInt($(this).attr('href').match(/publishid=(\d+)/)[1])
            });
        });
        return Q(courses);
    });
};

exports.courseFetchById = function (lsf_id) {
    var url = 'https://lsf.uni-stuttgart.de/qisserver/rds?state=verpublish&publishContainer=stgContainer&publishid=' + lsf_id;

    return exports.harvest(url).then(function ($) {
        var tds = $('.divcontent table td').get();

        var degree = $(tds[17]).text().trim();
        var major = $(tds[3]).text().trim();

        var course = {
            lsf_id: lsf_id,
            name: $(tds[13]).text().trim(),
            degree: degree.match(/^(\d+)/)[1],
            degreeName: degree.match(/^\d+\s*(.*)$/)[1],
            major: major.match(/^(\d+)/)[1],
            majorName: major.match(/^\d+\s*(.*)$/)[1],
            erVer: $(tds[15]).text().trim().match(/^(\d+)/)[1]
        }
        return Q(course);
    });
}

exports.moduleFetchIds = function () {
    var url = 'https://lsf.uni-stuttgart.de/qisserver/rds?state=change&type=3&moduleParameter=pordpos&nextdir=change&next=TableSelect.vm&subdir=pord&P_start=0&P_anzahl=9999';

    return exports.harvest(url).then(function ($) {
        var courses = [];
        $('.divcontent table tbody tr:nth-child(n+2) td:nth-child(3) a').each(function() {
            courses.push({
                lsf_id: parseInt($(this).attr('href').match(/publishid=(\d+)/)[1])
            });
        });
        return Q(courses);
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
        var lectureIds = [];
        var lecturePromises = $('li a', infoTable['15']).get().map(function (el) {
            return exports.lectureFetchIdsBySearchUrl($(el).attr('href'))
            .then(function (lectures) {
                lectureIds = lectureIds.concat(lectures);
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
                lsf_lectureIds: lectureIds
            }

            return module;
        });

    });

};

exports.lectureFetchIdsBySearchUrl = function (url) {
    return exports.harvest(url).then(function ($) {
        var lectures = [];
        $('.divcontent table tr:nth-child(n+2)').each(function () {
            lectures.push({
                lsf_id: parseInt($('td:nth-child(2) a:nth-child(1)', this).attr('href').match(/publishid=(\d+)/)[1]),
            });
        });
        return lectures;
    });
}

exports.lectureFetchIdsByCourseId = function (course_id) {
    var url = 'https://lsf.uni-stuttgart.de/qisserver/rds?state=wsearchv&search=1&subdir=veranstaltung&k_abstgv.abstgvnr=' + course_id + '&veranstaltung.semester=' + semester + '&P_start=0&P_anzahl=9999'

    return exports.lectureFetchIdsBySearchUrl(url);
}
