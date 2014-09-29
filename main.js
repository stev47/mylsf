var dt_majors, dt_lectures;

$(function () {
    dt_majors = $('#majors')
        .on('init.dt', function () {
            $('#majors_filter input')
                .on('keydown', function (event) {
                    switch (event.key) {
                        case 'Down':
                            if ($('#majors tbody tr.selected').length) {
                                $('#majors tbody tr.selected').removeClass('selected').next().addClass('selected');
                            } else {
                                $('#majors tbody tr:first-of-type').addClass('selected');
                            }
                            break;
                        case 'Up':
                            if ($('#majors tbody tr.selected').length) {
                                $('#majors tbody tr.selected').removeClass('selected').prev().addClass('selected');
                            } else {
                                $('#majors tbody tr:last-of-type').addClass('selected');
                            }
                            break;
                        default:
                            return true;
                    }
                    return false;
                })
                .focus();
        })
        .DataTable({
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
            preDrawCallback: function () {
                // remove searchbox label text
                $('#majors_filter label')
                    .contents()
                    .filter(function () { return this.nodeType == 3; })
                    .remove();

            },
            rowCallback: function (row) {
                $(row).removeClass('selected');
            },
            drawCallback: function () {
                if ($('#majors tbody tr').length == 1) {
                    $('#majors tbody tr').addClass('selected');
                }
            }
        });

    dt_lectures = $('#lectures')
        .DataTable({
            dom: 't',
            autoWidth: false,
            columns: [
                { data: 'lsf_id', title: 'id' },
                //{ title: 'Nummer', render: function (data, type, row) { return row.degreeNum + row.majorNum } },
                { data: 'name', title: 'Name' },
                //{ data: 'degreeName', title: 'Abschluss' },
                //{ data: 'erVer', title: 'Prüfungsordnung' },
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

        dt_lectures.ajax.url('/major/' + data.lsf_num + '/lectures');
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
