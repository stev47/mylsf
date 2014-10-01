var dt_majors, dt_lectures;


function dt_init () {
    var dt = $(this).DataTable();
    var tbody_el = dt.table().body();
    var table_el = dt.table().node();

    // remove searchbox label text
    $(this).parents('.dataTables_wrapper').find('.dataTables_filter label')
        .contents()
        .filter(function () { return this.nodeType == 3; })
        .remove();

    // key-handling for search bar
    $(this).parents('.dataTables_wrapper').find('.dataTables_filter input')
        .on('keydown', function (event) {
            switch (event.key) {
                case 'Down':
                    $('tr.selected', tbody_el).removeClass('selected')
                        .next().addClass('selected');
                    if (!$('tr.selected', tbody_el).length) {
                        $('tr', tbody_el).removeClass('selected');
                        $('tr:first-of-type', tbody_el).addClass('selected');
                    }

                    $(table_el).trigger('row-selected', [dt.row('.selected')]);

                    break;
                case 'Up':
                    $('tr.selected', tbody_el).removeClass('selected')
                        .prev().addClass('selected');
                    if (!$('tr.selected', tbody_el).length) {
                        $('tr', tbody_el).removeClass('selected');
                        $('tr:last-of-type', tbody_el).addClass('selected');
                    }

                    $(table_el).trigger('row-selected', [dt.row('.selected')]);

                    break;
                case 'Enter':
                    if ($('tr.selected', tbody_el).length)
                        $(table_el).trigger('focus-next', [dt.row('.selected')]);

                    break;
                default:
                    return true;
            }
            return false;
        });

    // row-click handling
    $(this).on('click', 'tr', function () {
        var dt = $(this).parents('table').DataTable();
        $(this).siblings().removeClass('selected');
        $(this).addClass('selected');
        $(dt.table().node()).trigger('row-selected', [dt.row(this)]);
        $(dt.table().node()).trigger('focus-next', [dt.row(this)]);
    })

    // table was invisible initially
    $(this).parents('.dataTables_wrapper').css('visibility', 'visible');
}

$.extend($.fn.dataTable.defaults, {
    autoWidth: false,
    dom: 'ft',
    ajax: {
        dataSrc: '',
        cache: true,
    },
    pageLength: -1
});

jQuery.extend(jQuery.fn.dataTableExt.oSort, {
    'lecture-type': function (a, b) {
        return (order[a] < order[b]) ? 1 : ((order[a] > order[b]) ? -1 : 0);
    }
});

$(function () {
    dt_majors = $('#majors')
        .on('init.dt', dt_init)
        .on('init.dt', function () {
            $('#majors_filter input').attr('tabindex', 1).focus();
        })
        .on('row-selected', function (event, row) {
            dt_lectures.ajax.url('/major/' + row.data().lsf_num + '/lectures');
            dt_lectures.ajax.reload();
        })
        .DataTable({
            columns: [
                { data: 'lsf_num', title: 'Nummer' },
                { data: 'name', title: 'Studienfach' },
            ],
            ajax: {
                url: '/majors',
            },
            rowCallback: function (row) {
                $(row).removeClass('selected');
            },
            drawCallback: function () {
                var dt = this.api();
                if (dt.rows({search: 'applied'}).data().length == 1) {
                    var row_el = dt.row({search: 'applied'}).node();
                    $(row_el).siblings().removeClass('selected');
                    $(row_el).addClass('selected');
                    $(dt.table().node()).trigger('row-selected', [dt.row(row_el)]);
                }
            }
        });

    dt_lectures = $('#lectures')
        .on('init.dt', dt_init)
        .on('init.dt', function () {
            $('#lectures_filter input').attr('tabindex', 2);
            $(this).DataTable().order([2, 'asc'], [1, 'asc']).draw();
        })
        .on('focus-next', function (event, row) {
            var lsf_id = row.data().lsf_id;
            var url = 'https://lsf.uni-stuttgart.de/qisserver/rds?state=verpublish&publishid=' + lsf_id + '&moduleCall=webInfo&publishConfFile=webInfo&publishSubDir=veranstaltung';
            window.open(url, '_blank');
        })
        .DataTable({
            columns: [
                { data: 'lecNum', title: 'Nummer' },
                { data: 'name', title: 'Name' },
                {
                    data: 'type',
                    title: 'Art',
                    //visible: false,
                    orderDataType: 'lecture-type',
                    render: function (data, type, row) {
                        switch (type) {
                            case 'display':
                            case 'filter':
                                var map = {
                                    1: 'Vorlesung',
                                    2: 'Übung',
                                    4: 'Seminar',
                                }
                                return map[data] || 'Sonstiges';
                            break;
                            case 'sort':
                                var order = {
                                    1: 1,
                                    3: 2,
                                    4: 3,
                                    2: 4,
                                }
                                return order[data] || 47;
                            default:
                                return data;
                        }
                    }
                },
            ],
            ajax: {
                url: '/major/0/lectures',
            },
            preDrawCallback: function () {
                // remove searchbox label text
                $('#lectures_filter label')
                    .contents()
                    .filter(function () { return this.nodeType == 3; })
                    .remove();
                $('#lectures_filter input').attr('tabindex', 2);

            },
        });



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
