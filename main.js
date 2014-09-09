var dt_majors, dt_lectures;

$(function () {
    dt_majors = $('#majors').DataTable({
        dom: 'ft',
        autoWidth: false,
        columns: [
            { data: 'lsf_num', title: 'Nummer' },
            { data: 'name', title: 'Studienfach' },
        ],
        ajax: {
            url: '/majors',
            dataSrc: '',
        },
        pageLength: -1,
    });
    dt_lectures = $('#lectures').DataTable({
        dom: 't',
        autoWidth: false,
        columns: [
            { data: 'lsf_id', title: 'id' },
            { title: 'Nummer', render: function (data, type, row) { return row.degreeNum + row.majorNum } },
            { data: 'name', title: 'Name' },
            { data: 'degreeName', title: 'Abschluss' },
            { data: 'erVer', title: 'Prüfungsordnung' },
        ],
        ajax: {
            url: '/major/0/lectures',
            dataSrc: '',
        },
        pageLength: -1,
    });
    $('#majors').on('click', 'tr', function () {
        $(dt_majors.rows().nodes()).removeClass('selected');
        $(this).addClass('selected');

        var data = dt_majors.row(this).data();

        dt_lectures.ajax.url('/major/' + data.lsf_num + '/courses');
        dt_lectures.ajax.reload();

        console.log(data);
    })


    Q($.getJSON('/majors')).then(function (data) {
        var majors = new Bloodhound({
            datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            local: data,
        });
        majors.initialize();

        $('#search').typeahead({

        }, {
            name: 'majors',
            displayKey: 'name',
            source: majors.ttAdapter(),
        });

        $('#search').on('typeahead:selected', function (e, obj, category) {
            $('#lectures').DataTable().ajax.url('/major/' + obj.lsf_num + '/lectures').load();

        });
    });
});
